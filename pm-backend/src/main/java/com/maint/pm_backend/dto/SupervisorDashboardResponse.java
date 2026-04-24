package com.maint.pm_backend.dto;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class SupervisorDashboardResponse {

    /** Approvals at level 1 whose due date is today (APPROVAL_REQUESTED). */
    private int todaysDueApprovals;

    /** Tasks with deviation_flag = true that are still under any review. */
    private int openDeviations;

    /**
     * All level-1 approval rows that are PENDING or APPROVAL_REQUESTED
     * and whose due_date falls within the current month — i.e. approvals
     * the supervisor still has to action this month.
     */
    private int upcomingApprovalsThisMonth;

    /** Distinct operators/employees whose tasks this supervisor reviews (level-1 approver). */
    private int supervisedEmployeeCount;

    /**
     * Tasks in pipeline:
     *   - approved by supervisor (level-1 APPROVED) but still awaiting higher-level sign-off
     *   - OR rejected by supervisor / rejected at any downstream level
     */
    private int tasksInPipeline;
}
