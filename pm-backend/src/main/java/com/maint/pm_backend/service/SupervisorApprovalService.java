package com.maint.pm_backend.service;

import com.maint.pm_backend.dto.DeviationTaskProjection;
import com.maint.pm_backend.dto.EmployeeTaskProjection;
import com.maint.pm_backend.dto.EmployeeTaskSummaryDto;
import com.maint.pm_backend.dto.SupervisorApprovalRequest;
import com.maint.pm_backend.dto.SupervisorApprovalResponse;
import com.maint.pm_backend.entity.Employee;
import com.maint.pm_backend.repository.EmployeeRepository;
import com.maint.pm_backend.repository.PmScheduleApprovalRepository;
import com.maint.pm_backend.repository.PmScheduleExecutionRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.temporal.TemporalAdjusters;
import java.util.List;
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
    private final ApprovalWorkflowService approvalWorkflowService;

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
    public List<EmployeeTaskProjection> getTasksByEmployee(Long supervisorId, Long employeeId, Integer month, Integer year, LocalDate startDate, LocalDate endDate) {
        requireSupervisor(supervisorId);

        LocalDate[] dateRange = calculateDateRange(month, year, startDate, endDate);

        return approvalRepository.findTasksByEmployeeForSupervisor(
                supervisorId, 
                employeeId, 
                dateRange[0].atStartOfDay(),
                dateRange[1].atTime(23, 59, 59)
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
    public List<EmployeeTaskSummaryDto> getEmployeeSummary(Long supervisorId, Integer month, Integer year, LocalDate startDate, LocalDate endDate) {
        requireSupervisor(supervisorId);

        LocalDate[] dateRange = calculateDateRange(month, year, startDate, endDate);
        String periodDesc = "Custom Date Range";
        if (startDate == null && endDate == null) {
            if (month != null && year != null) periodDesc = month + "/" + year;
            else if (year != null) periodDesc = String.valueOf(year);
            else periodDesc = "Current Month";
        }

        List<Object[]> rows = approvalRepository.findEmployeeSummaryForSupervisor(
                supervisorId, dateRange[0].atStartOfDay(), dateRange[1].atTime(23, 59, 59), com.maint.pm_backend.util.DateUtils.getToday());

        final String finalPeriodDesc = periodDesc;
        return rows.stream().map(row -> EmployeeTaskSummaryDto.builder()
                .employeeId(((Number) row[0]).longValue())
                .employeeName((String) row[1])
                .period(finalPeriodDesc)
                .totalTasks(((Number) row[2]).intValue())
                .assignedOrInProgress(((Number) row[3]).intValue())
                .backlogTasks(((Number) row[4]).intValue())
                .pendingSupervisorApproval(((Number) row[5]).intValue())
                .underLineManagerReview(((Number) row[6]).intValue())
                .underMaintManagerReview(((Number) row[7]).intValue())
                .approved(((Number) row[8]).intValue())
                .rejected(((Number) row[9]).intValue())
                .totalExecuted(((Number) row[10]).intValue())
                .build()
        ).collect(Collectors.toList());
    }

    private LocalDate[] calculateDateRange(Integer month, Integer year, LocalDate startDate, LocalDate endDate) {
        if (startDate != null && endDate != null) {
            return new LocalDate[]{startDate, endDate};
        } else if (startDate != null) {
            return new LocalDate[]{startDate, startDate.plusYears(100)}; // practically unbounded
        } else if (endDate != null) {
            return new LocalDate[]{LocalDate.of(1970, 1, 1), endDate};
        }

        LocalDate today = com.maint.pm_backend.util.DateUtils.getToday();
        int targetYear = (year != null) ? year : today.getYear();
        
        if (month != null) {
            LocalDate start = LocalDate.of(targetYear, month, 1);
            LocalDate end = start.with(TemporalAdjusters.lastDayOfMonth());
            return new LocalDate[]{start, end};
        } else if (year != null) {
            LocalDate start = LocalDate.of(targetYear, 1, 1);
            LocalDate end = LocalDate.of(targetYear, 12, 31);
            return new LocalDate[]{start, end};
        }
        
        // Default: current month
        LocalDate start = today.with(TemporalAdjusters.firstDayOfMonth());
        LocalDate end = today.with(TemporalAdjusters.lastDayOfMonth());
        return new LocalDate[]{start, end};
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
        return approvalWorkflowService.processApproval(request, supervisorId, 1, 3L, "Supervisor");
    }

}
