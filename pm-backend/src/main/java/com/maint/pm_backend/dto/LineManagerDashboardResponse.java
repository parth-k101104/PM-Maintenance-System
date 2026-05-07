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
    private List<LineAnalyticsDashboardResponse.ActionInsight> actionInsights;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class RollingWindowMetrics {
        private int windowDays;
        private Double lineHealth;
        /** PHM prediction coverage: % of tasks the analytics engine evaluated (from phm_health_scores). */
        private Double phmCoverageRate;
        /** Operational PM compliance: approved / (approved + rejected + overdue) × 100. */
        private Double pmComplianceRate;
        private Double taskRejectionRate;
        private Double approvalTurnaroundTimeHours;
        private Double evidenceComplianceRate;
        private Double employeeEfficiency;
        
        private List<LineBreakdown> lineMetrics;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class LineBreakdown {
        private Long lineId;
        private String lineName;
        private Double healthScore;
        private Double phmCoverageRate;
        private Double pmComplianceRate;
        private Double taskRejectionRate;
        private Double approvalTurnaroundTimeHours;
        private Double evidenceComplianceRate;
        private Double employeeEfficiency;
    }
}
