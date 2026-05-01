package com.maint.pm_backend.dto;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class SupervisorDashboardResponse {

    /** Level-1 approvals assigned to this supervisor with APPROVAL_REQUESTED status
     *  whose approval_due_date has already passed (overdue approvals). */
    private int backlogApprovals;

    /** Level-1 approvals assigned to this supervisor with APPROVAL_REQUESTED status
     *  whose approval_due_date is today. */
    private int todaysDueApprovals;

    /** All level-1 approval rows that are PENDING or APPROVAL_REQUESTED
     *  and whose due_date falls within the current month (includes today). */
    private int upcomingApprovalsThisMonth;

    /** Active issue flags (not CLOSED) on lines supervised by this supervisor. */
    private int activeFlags;

    /** Tasks assigned to employees under this supervisor that are still
     *  ASSIGNED or IN_PROGRESS — i.e. employee has not performed the task yet. */
    private int pendingEmployeeTasks;

    /** Distinct operators/employees whose tasks this supervisor reviews (level-1 approver). */
    private int supervisedEmployeeCount;

    /** Tasks approved by this supervisor (level-1 APPROVED) that are now
     *  waiting for line manager sign-off (UNDER_LINE_MANAGER_REVIEW). */
    private int approvedUnderLineManagerReview;

    /** Tasks approved by this supervisor (level-1 APPROVED) that have passed
     *  line manager and are now waiting for maintenance manager (UNDER_MAINT_MANAGER_REVIEW). */
    private int approvedUnderMaintManagerReview;
}
