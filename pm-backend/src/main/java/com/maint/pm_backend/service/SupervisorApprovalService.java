package com.maint.pm_backend.service;

import com.maint.pm_backend.config.AppWorkflowProperties;
import com.maint.pm_backend.dto.DeviationTaskProjection;
import com.maint.pm_backend.dto.EmployeeTaskProjection;
import com.maint.pm_backend.dto.EmployeeTaskSummaryDto;
import com.maint.pm_backend.dto.SupervisorApprovalRequest;
import com.maint.pm_backend.dto.SupervisorApprovalResponse;
import com.maint.pm_backend.entity.Employee;
import com.maint.pm_backend.entity.PmScheduleApproval;
import com.maint.pm_backend.entity.PmScheduleExecution;
import com.maint.pm_backend.entity.enums.TaskApprovalStatus;
import com.maint.pm_backend.entity.enums.TaskExecutionStatus;
import com.maint.pm_backend.repository.EmployeeRepository;
import com.maint.pm_backend.repository.PmScheduleApprovalRepository;
import com.maint.pm_backend.repository.PmScheduleExecutionRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.temporal.TemporalAdjusters;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

/**
 * Handles all supervisor-level approval actions:
 *  - Listing open deviation tasks
 *  - Task list per employee
 *  - Employee summary list
 *  - Approving a task (advancing the workflow to next level, or completing it)
 *  - Rejecting a task (marking rejected + creating a rescheduled execution)
 */
@Service
@RequiredArgsConstructor
public class SupervisorApprovalService {

    private final PmScheduleExecutionRepository executionRepository;
    private final PmScheduleApprovalRepository approvalRepository;
    private final EmployeeRepository employeeRepository;
    private final AppWorkflowProperties workflowProperties;

    // ─── Guards ───────────────────────────────────────────────────────────────

    private Employee requireSupervisor(Long supervisorId) {
        Employee supervisor = employeeRepository.findById(supervisorId)
                .orElseThrow(() -> new RuntimeException("Supervisor not found: " + supervisorId));
        if (supervisor.getRoleId() == null || supervisor.getRoleId() != 3L) {
            throw new RuntimeException("Access denied: only supervisors can perform this action");
        }
        return supervisor;
    }

    // ─── Deviation list ───────────────────────────────────────────────────────

    /**
     * Returns all executions with deviation_flag=true that are still in review
     * and whose level-1 approver is this supervisor.
     */
    public List<DeviationTaskProjection> getOpenDeviations(Long supervisorId) {
        requireSupervisor(supervisorId);
        return approvalRepository.findOpenDeviationTasks(supervisorId);
    }


    // ─── Employee task list ───────────────────────────────────────────────────

    /**
     * Returns all task executions for a given employee that fall under this supervisor's scope,
     * filtered by the specified time period.
     */
    public List<EmployeeTaskProjection> getTasksByEmployee(Long supervisorId, Long employeeId, String period) {
        requireSupervisor(supervisorId);

        String normalised = (period == null || period.isBlank()) ? "CURRENT_MONTH" : period.toUpperCase();
        LocalDate fromDate = switch (normalised) {
            case "LAST_2_MONTHS" -> LocalDate.now().minusMonths(2).with(TemporalAdjusters.firstDayOfMonth());
            case "QUARTER"       -> LocalDate.now().minusMonths(3).with(TemporalAdjusters.firstDayOfMonth());
            case "YEAR"          -> LocalDate.now().minusYears(1).with(TemporalAdjusters.firstDayOfMonth());
            default              -> LocalDate.now().with(TemporalAdjusters.firstDayOfMonth()); // CURRENT_MONTH
        };

        // Note: You will need to update the repository method to accept this 3rd parameter.
        return approvalRepository.findTasksByEmployeeForSupervisor(
                supervisorId, 
                employeeId, 
                fromDate.atStartOfDay()
        );
    }

    // ─── Employee summary list ────────────────────────────────────────────────

    /**
     * Valid period values: CURRENT_MONTH, LAST_2_MONTHS, QUARTER, YEAR.
     * Defaults to CURRENT_MONTH if unknown.
     *
     * Returns aggregated task counts for every employee whose tasks this
     * supervisor reviews, limited to the selected time window.
     */
    public List<EmployeeTaskSummaryDto> getEmployeeSummary(Long supervisorId, String period) {
        requireSupervisor(supervisorId);

        String normalised = (period == null || period.isBlank()) ? "CURRENT_MONTH" : period.toUpperCase();
        LocalDate fromDate = switch (normalised) {
            case "LAST_2_MONTHS" -> LocalDate.now().minusMonths(2).with(TemporalAdjusters.firstDayOfMonth());
            case "QUARTER"       -> LocalDate.now().minusMonths(3).with(TemporalAdjusters.firstDayOfMonth());
            case "YEAR"          -> LocalDate.now().minusYears(1).with(TemporalAdjusters.firstDayOfMonth());
            default              -> LocalDate.now().with(TemporalAdjusters.firstDayOfMonth()); // CURRENT_MONTH
        };

        List<Object[]> rows = approvalRepository.findEmployeeSummaryForSupervisor(
                supervisorId, fromDate.atStartOfDay());

        return rows.stream().map(row -> EmployeeTaskSummaryDto.builder()
                .employeeId(((Number) row[0]).longValue())
                .employeeName((String) row[1])
                .period(normalised)
                .totalTasks(((Number) row[2]).intValue())
                .assignedOrInProgress(((Number) row[3]).intValue())
                .pendingSupervisorApproval(((Number) row[4]).intValue())
                .underLineManagerReview(((Number) row[5]).intValue())
                .underMaintManagerReview(((Number) row[6]).intValue())
                .approved(((Number) row[7]).intValue())
                .rejected(((Number) row[8]).intValue())
                .totalExecuted(((Number) row[9]).intValue())
                .build()
        ).collect(Collectors.toList());
    }

    // ─── Approve / Reject ─────────────────────────────────────────────────────

    /**
     * Processes a supervisor approve-or-reject action on a single task execution.
     *
     * <p><b>APPROVE flow:</b>
     * <ol>
     *   <li>Mark level-1 approval as APPROVED.</li>
     *   <li>If level-2 exists → activate it (APPROVAL_REQUESTED + due date).
     *       <ul>
     *         <li>If level-3 also exists → execution moves to UNDER_LINE_MANAGER_REVIEW
     *             (level-3/maintenance manager approval is pending after line manager).</li>
     *         <li>If no level-3 → same: execution moves to UNDER_LINE_MANAGER_REVIEW
     *             (line manager is final higher approver).</li>
     *       </ul>
     *   </li>
     *   <li>If no level-2 → mark execution COMPLETED (supervisor is final approver).</li>
     * </ol>
     *
     * <p><b>REJECT flow:</b>
     * <ol>
     *   <li>Mark level-1 approval as REJECTED.</li>
     *   <li>Set execution status to REJECTED.</li>
     *   <li>Create a new {@link PmScheduleExecution} assigned to the same employee,
     *       with {@code reschedule_flag=true} and configurable due date.</li>
     * </ol>
     */
    @Transactional
    public SupervisorApprovalResponse processApproval(SupervisorApprovalRequest request, Long supervisorId) {
        requireSupervisor(supervisorId);

        // Validate action
        if (request.getAction() == null ||
                (!request.getAction().equalsIgnoreCase("APPROVE") &&
                 !request.getAction().equalsIgnoreCase("REJECT"))) {
            throw new RuntimeException("Invalid action: must be 'APPROVE' or 'REJECT'");
        }
        boolean isApprove = request.getAction().equalsIgnoreCase("APPROVE");

        // 1. Load and validate the level-1 approval row
        PmScheduleApproval level1 = approvalRepository
                .findByScheduleExecution_ScheduleExecutionIdAndApprovalLevel(
                        request.getScheduleExecutionId(), 1)
                .orElseThrow(() -> new RuntimeException(
                        "No level-1 approval row found for execution: " + request.getScheduleExecutionId()));

        if (!level1.getApprover().getEmployeeId().equals(supervisorId)) {
            throw new RuntimeException("Access denied: you are not the assigned supervisor for this task");
        }
        if (level1.getApprovalStatus() != TaskApprovalStatus.APPROVAL_REQUESTED) {
            throw new RuntimeException("Approval is not in APPROVAL_REQUESTED state (current: "
                    + level1.getApprovalStatus() + ")");
        }

        // 2. Load the execution
        PmScheduleExecution execution = executionRepository.findById(request.getScheduleExecutionId())
                .orElseThrow(() -> new RuntimeException("Task execution not found: "
                        + request.getScheduleExecutionId()));

        // 3. Record the supervisor's decision on level-1
        level1.setApprovalStatus(isApprove ? TaskApprovalStatus.APPROVED : TaskApprovalStatus.REJECTED);
        level1.setApprovedDttm(LocalDateTime.now());
        level1.setRemarks(request.getRemarks());
        approvalRepository.save(level1);

        if (isApprove) {
            return handleApprove(execution);
        } else {
            return handleReject(execution, request.getRemarks());
        }
    }

    // ─── Private helpers ──────────────────────────────────────────────────────

    private SupervisorApprovalResponse handleApprove(PmScheduleExecution execution) {
        Long executionId = execution.getScheduleExecutionId();

        // 1. Read the workflow for this task
        Long workflowId = approvalRepository.findWorkflowIdByExecution(executionId);
        if (workflowId == null) workflowId = 1L; // default: supervisor only

        // Workflow 1 → supervisor is the final approver
        if (workflowId == 1L) {
            execution.setStatus(TaskExecutionStatus.COMPLETED);
            executionRepository.save(execution);
            return SupervisorApprovalResponse.builder()
                    .status("success")
                    .message("Task approved and marked as completed (single-level workflow)")
                    .executionStatus("COMPLETED")
                    .build();
        }

        // Workflow 2 or 3 → line manager approval is needed next
        Long lineManagerId = approvalRepository.findLineManagerIdByExecution(executionId);
        if (lineManagerId == null) {
            throw new RuntimeException(
                    "Cannot advance workflow: no line_manager_id assigned to the line for execution " + executionId);
        }

        // Find or create the level-2 (line manager) approval row
        PmScheduleApproval level2 = approvalRepository
                .findByScheduleExecution_ScheduleExecutionIdAndApprovalLevel(executionId, 2)
                .orElseGet(() -> {
                    PmScheduleApproval newRow = new PmScheduleApproval();
                    newRow.setScheduleExecution(execution);
                    newRow.setApprovalLevel(2);
                    newRow.setApprovalStatus(TaskApprovalStatus.PENDING);
                    return newRow;
                });

        Employee lineManager = employeeRepository.findById(lineManagerId)
                .orElseThrow(() -> new RuntimeException("Line manager not found: " + lineManagerId));

        level2.setApprover(lineManager);
        level2.setApprovalStatus(TaskApprovalStatus.APPROVAL_REQUESTED);
        level2.setApprovalDueDate(
                LocalDateTime.now().plusDays(workflowProperties.getApprovalDueDateOffsetDays()));
        approvalRepository.save(level2);

        // For workflow 3, level-3 (maintenance manager) row may already exist — leave it PENDING.
        // It will be activated only when the line manager approves.

        execution.setStatus(TaskExecutionStatus.UNDER_LINE_MANAGER_REVIEW);
        executionRepository.save(execution);

        String message = (workflowId == 3L)
                ? "Task approved. Forwarded to Line Manager (Maintenance Manager review will follow after LM approval)"
                : "Task approved and forwarded to Line Manager for review";

        return SupervisorApprovalResponse.builder()
                .status("success")
                .message(message)
                .executionStatus("UNDER_LINE_MANAGER_REVIEW")
                .nextApproverId(lineManagerId)
                .build();
    }

    private SupervisorApprovalResponse handleReject(PmScheduleExecution execution, String remarks) {
        // Mark original execution as REJECTED
        execution.setStatus(TaskExecutionStatus.REJECTED);
        executionRepository.save(execution);

        // Create a rescheduled execution assigned to the same employee
        PmScheduleExecution rescheduled = new PmScheduleExecution();
        rescheduled.setTaskSchedule(execution.getTaskSchedule());
        rescheduled.setEmployee(execution.getEmployee());
        rescheduled.setAssignedDttm(LocalDateTime.now());
        rescheduled.setDueDate(
                LocalDateTime.now().plusDays(workflowProperties.getRescheduleDueDateOffsetDays()));
        rescheduled.setStatus(TaskExecutionStatus.ASSIGNED);
        rescheduled.setRescheduleFlag(true);
        rescheduled.setNotes("Rescheduled after supervisor rejection. Supervisor remarks: "
                + (remarks != null ? remarks : "N/A"));
        executionRepository.save(rescheduled);

        return SupervisorApprovalResponse.builder()
                .status("success")
                .message("Task rejected and rescheduled for the same employee")
                .executionStatus("REJECTED")
                .rescheduledExecutionId(rescheduled.getScheduleExecutionId())
                .build();
    }
}
