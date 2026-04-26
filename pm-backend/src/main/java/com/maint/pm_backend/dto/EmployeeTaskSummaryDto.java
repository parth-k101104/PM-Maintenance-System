package com.maint.pm_backend.dto;

import lombok.Builder;
import lombok.Data;

/**
 * Per-employee task summary shown in the supervisor's employee list.
 * All counts are scoped to tasks whose level-1 approver is this supervisor
 * AND assigned to the specific employee, filtered by the requested time period.
 */
@Data
@Builder
public class EmployeeTaskSummaryDto {

    private Long employeeId;
    private String employeeName;

    /** The time period this summary covers (e.g. "CURRENT_MONTH", "LAST_2_MONTHS", "QUARTER", "YEAR") */
    private String period;

    /** Total task executions in scope (all statuses) */
    private int totalTasks;

    /** Tasks still ASSIGNED or IN_PROGRESS — employee has not submitted yet */
    private int assignedOrInProgress;

    /** Tasks submitted by employee and awaiting THIS supervisor's approval (UNDER_SUPERVISOR_REVIEW) */
    private int pendingSupervisorApproval;

    /** Tasks this supervisor has approved and now waiting for line manager (UNDER_LINE_MANAGER_REVIEW) */
    private int underLineManagerReview;

    /** Tasks past line manager, now awaiting maintenance manager (UNDER_MAINT_MANAGER_REVIEW) */
    private int underMaintManagerReview;

    /**
     * Total tasks actually executed by the employee — submitted for review or fully completed.
     * = COMPLETED + UNDER_SUPERVISOR_REVIEW + UNDER_LINE_MANAGER_REVIEW
     *   + UNDER_MAINT_MANAGER_REVIEW
     */
    private int totalExecuted;

    /** Tasks marked APPROVED (terminal approved state, if used separately from COMPLETED) */
    private int approved;

    /** Tasks REJECTED at any level */
    private int rejected;
}
