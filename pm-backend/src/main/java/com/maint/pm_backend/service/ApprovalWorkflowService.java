package com.maint.pm_backend.service;

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

import java.time.LocalDateTime;
import java.util.Comparator;
import java.util.List;

@Service
@RequiredArgsConstructor
public class ApprovalWorkflowService {

    private final PmScheduleExecutionRepository executionRepository;
    private final PmScheduleApprovalRepository approvalRepository;
    private final EmployeeRepository employeeRepository;
    private final ConfigParamService configParamService;

    @Transactional
    public SupervisorApprovalResponse processApproval(
            SupervisorApprovalRequest request,
            Long approverId,
            int approvalLevel,
            long requiredRoleId,
            String roleLabel) {

        Employee approver = employeeRepository.findById(approverId)
                .orElseThrow(() -> new RuntimeException(roleLabel + " not found: " + approverId));
        if (approver.getRoleId() == null || approver.getRoleId() != requiredRoleId) {
            throw new RuntimeException("Access denied: only " + roleLabel.toLowerCase() + "s can perform this action");
        }

        if (request.getAction() == null ||
                (!request.getAction().equalsIgnoreCase("APPROVE") &&
                 !request.getAction().equalsIgnoreCase("REJECT"))) {
            throw new RuntimeException("Invalid action: must be 'APPROVE' or 'REJECT'");
        }

        PmScheduleApproval currentApproval = approvalRepository
                .findByScheduleExecution_ScheduleExecutionIdAndApprovalLevel(
                        request.getScheduleExecutionId(), approvalLevel)
                .orElseThrow(() -> new RuntimeException(
                        "No level-" + approvalLevel + " approval row found for execution: " + request.getScheduleExecutionId()));

        if (!currentApproval.getApprover().getEmployeeId().equals(approverId)) {
            throw new RuntimeException("Access denied: you are not the assigned " + roleLabel.toLowerCase() + " for this task");
        }
        if (currentApproval.getApprovalStatus() != TaskApprovalStatus.APPROVAL_REQUESTED) {
            throw new RuntimeException("Approval is not in APPROVAL_REQUESTED state (current: "
                    + currentApproval.getApprovalStatus() + ")");
        }

        PmScheduleExecution execution = executionRepository.findById(request.getScheduleExecutionId())
                .orElseThrow(() -> new RuntimeException("Task execution not found: " + request.getScheduleExecutionId()));

        if (request.getEvidenceRejectedFlag() != null) {
            execution.setEvidenceRejectedFlag(request.getEvidenceRejectedFlag());
        }

        boolean isApprove = request.getAction().equalsIgnoreCase("APPROVE");
        currentApproval.setApprovalStatus(isApprove ? TaskApprovalStatus.APPROVED : TaskApprovalStatus.REJECTED);
        currentApproval.setApprovedDttm(LocalDateTime.now());
        currentApproval.setRemarks(request.getRemarks());
        approvalRepository.save(currentApproval);

        if (!isApprove) {
            return rejectAndReschedule(execution, roleLabel, request.getRemarks());
        }

        return approveAndAdvance(execution, approvalLevel);
    }

    private SupervisorApprovalResponse approveAndAdvance(PmScheduleExecution execution, int approvalLevel) {
        Long executionId = execution.getScheduleExecutionId();
        Long workflowId = approvalRepository.findWorkflowIdByExecution(executionId);
        if (workflowId == null) workflowId = 1L;

        int nextLevel = approvalLevel + 1;
        if (workflowId < nextLevel) {
            execution.setStatus(TaskExecutionStatus.APPROVED);
            executionRepository.save(execution);
            return SupervisorApprovalResponse.builder()
                    .status("success")
                    .message("Task approved and closed")
                    .executionStatus("APPROVED")
                    .build();
        }

        Long nextApproverId = resolveNextApprover(executionId, nextLevel);
        PmScheduleApproval nextApproval = approvalRepository
                .findByScheduleExecution_ScheduleExecutionIdAndApprovalLevel(executionId, nextLevel)
                .orElseGet(() -> {
                    PmScheduleApproval newRow = new PmScheduleApproval();
                    newRow.setScheduleExecution(execution);
                    newRow.setApprovalLevel(nextLevel);
                    newRow.setApprovalStatus(TaskApprovalStatus.PENDING);
                    return newRow;
                });

        Employee nextApprover = employeeRepository.findById(nextApproverId)
                .orElseThrow(() -> new RuntimeException("Next approver not found: " + nextApproverId));
        nextApproval.setApprover(nextApprover);
        nextApproval.setApprovalStatus(TaskApprovalStatus.APPROVAL_REQUESTED);
        nextApproval.setApprovalDueDate(LocalDateTime.now().plusDays(configParamService.getApprovalDueDateOffsetDays()));
        approvalRepository.save(nextApproval);

        TaskExecutionStatus nextStatus = nextLevel == 2
                ? TaskExecutionStatus.UNDER_LINE_MANAGER_REVIEW
                : TaskExecutionStatus.UNDER_MAINT_MANAGER_REVIEW;
        execution.setStatus(nextStatus);
        executionRepository.save(execution);

        String nextLabel = nextLevel == 2 ? "Line Manager" : "Maintenance Manager";
        return SupervisorApprovalResponse.builder()
                .status("success")
                .message("Task approved and forwarded to " + nextLabel + " for review")
                .executionStatus(nextStatus.name())
                .nextApproverId(nextApproverId)
                .build();
    }

    private Long resolveNextApprover(Long executionId, int nextLevel) {
        if (nextLevel == 2) {
            Long lineManagerId = approvalRepository.findLineManagerIdByExecution(executionId);
            if (lineManagerId == null) {
                throw new RuntimeException("Cannot advance workflow: no line_manager_id assigned for execution " + executionId);
            }
            return lineManagerId;
        }

        Long maintenanceManagerId = approvalRepository
                .findByScheduleExecution_ScheduleExecutionIdAndApprovalLevel(executionId, nextLevel)
                .map(row -> row.getApprover() != null ? row.getApprover().getEmployeeId() : null)
                .orElse(null);
        if (maintenanceManagerId == null) {
            maintenanceManagerId = approvalRepository.findMaintenanceManagerId();
        }
        if (maintenanceManagerId == null) {
            throw new RuntimeException("Cannot advance workflow: no maintenance manager approver found");
        }
        return maintenanceManagerId;
    }

    private SupervisorApprovalResponse rejectAndReschedule(PmScheduleExecution execution, String roleLabel, String remarks) {
        execution.setStatus(TaskExecutionStatus.REJECTED);
        executionRepository.save(execution);

        PmScheduleExecution rescheduled = new PmScheduleExecution();
        rescheduled.setTaskSchedule(execution.getTaskSchedule());
        rescheduled.setEmployee(execution.getEmployee());
        rescheduled.setAssignedDttm(LocalDateTime.now());
        rescheduled.setDueDate(LocalDateTime.now().plusDays(configParamService.getRescheduleDueDateOffsetDays()));
        rescheduled.setStatus(TaskExecutionStatus.ASSIGNED);
        rescheduled.setRescheduleFlag(true);
        rescheduled.setParentScheduleExecution(execution);
        rescheduled.setNotes("Rescheduled after " + roleLabel + " rejection. Remarks: " + (remarks != null ? remarks : "N/A"));
        executionRepository.save(rescheduled);

        cloneApprovalRows(execution, rescheduled);

        return SupervisorApprovalResponse.builder()
                .status("success")
                .message("Task rejected and rescheduled for the same employee")
                .executionStatus("REJECTED")
                .rescheduledExecutionId(rescheduled.getScheduleExecutionId())
                .build();
    }

    private void cloneApprovalRows(PmScheduleExecution original, PmScheduleExecution rescheduled) {
        List<PmScheduleApproval> originalRows = approvalRepository
                .findByScheduleExecution_ScheduleExecutionId(original.getScheduleExecutionId())
                .stream()
                .sorted(Comparator.comparing(PmScheduleApproval::getApprovalLevel))
                .toList();

        for (PmScheduleApproval originalRow : originalRows) {
            PmScheduleApproval clone = new PmScheduleApproval();
            clone.setScheduleExecution(rescheduled);
            clone.setApprover(originalRow.getApprover());
            clone.setApprovalLevel(originalRow.getApprovalLevel());
            clone.setApprovalStatus(TaskApprovalStatus.PENDING);
            approvalRepository.save(clone);
        }
    }
}
