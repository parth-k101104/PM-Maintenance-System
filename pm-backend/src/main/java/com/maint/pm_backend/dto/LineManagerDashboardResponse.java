package com.maint.pm_backend.dto;

import lombok.Data;
import java.util.List;
import java.util.Map;
import lombok.Builder;
import lombok.AllArgsConstructor;
import lombok.NoArgsConstructor;

@Data
public class LineManagerDashboardResponse {
    
    private Integer totalApprovalsToday;
    private Integer backlogApprovals;
    
    // Line health metric: (1 - unhealthy_machines/total_machines) * 100
    private Double lineHealth; 
    
    private Integer totalFlagsRaised;
    
    // Task counts
    private Integer activeTasksToday;      // ASSIGNED, IN_PROGRESS with due_date today
    private Integer pendingReviewTasks;    // UNDER_SUPERVISOR_REVIEW, UNDER_LINE_MANAGER_REVIEW, UNDER_MAINT_MANAGER_REVIEW
    private Integer rejectedTasks;         // REJECTED where rescheduled child is not completed
    
    private Map<Integer, RollingWindowMetrics> rollingWindows;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class RollingWindowMetrics {
        private int windowDays;
        private Double lineHealth;
        private Double pmComplianceRate;
        private Double taskRejectionRate;
        private Double approvalTurnaroundTimeHours;
        private Double evidenceComplianceRate;
    }
}
