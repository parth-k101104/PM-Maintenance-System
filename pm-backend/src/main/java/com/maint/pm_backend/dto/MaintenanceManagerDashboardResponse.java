package com.maint.pm_backend.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;
import java.util.Map;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class MaintenanceManagerDashboardResponse {

    private TaskStatusCounts taskStatusCounts;
    /**
     * PHM prediction coverage: % of tasks the analytics engine evaluated (from
     * phm_health_scores).
     */
    private Double overallPhmCoverageRate;
    /**
     * Operational PM compliance: approved / (approved + rejected + overdue) × 100.
     */
    private Double overallPmComplianceRate;

    // Orange metrics — plant-wide averages from phm_health_scores
    private Double plantRejectionRate;
    private Double plantApprovalTurnaroundTimeHours;
    private Double plantEvidenceComplianceRate;
    private Double plantEmployeeEfficiency;

    private List<LineWiseComplianceData> lineWiseCompliance;
    private Map<Integer, RollingWindowMetrics> rollingWindows;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class RollingWindowMetrics {
        private int windowDays;
        private TaskStatusCounts taskStatusCounts;
        /**
         * PHM prediction coverage: % of tasks the analytics engine evaluated (from
         * phm_health_scores).
         */
        private Double overallPhmCoverageRate;
        /**
         * Operational PM compliance: approved / (approved + rejected + overdue) × 100.
         */
        private Double overallPmComplianceRate;
        private Double plantRejectionRate;
        private Double plantApprovalTurnaroundTimeHours;
        private Double plantEvidenceComplianceRate;
        private Double plantEmployeeEfficiency;
        private List<LineWiseComplianceData> lineWiseCompliance;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class TaskStatusCounts {
        private int inProgress;
        private int underReview;
        private int overdue;
        private int rejected;
        private int approved;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class LineWiseComplianceData {
        private Long lineId;
        private String lineName;
        /** PHM health score for this line (0-100 from phm_health_scores). */
        private Double lineHealthScore;
        /** PHM prediction coverage for this line (from phm_health_scores). */
        private Double phmCoverageRate;
        /**
         * Operational PM compliance for this line: approved / (approved + rejected +
         * overdue) × 100.
         */
        private Double pmComplianceRate;
        // Orange metrics — most recent phm_health_scores entry per line
        private Double rejectionRate;
        private Double approvalTurnaroundTimeHours;
        private Double evidenceComplianceRate;
        private Double employeeEfficiency;
    }
}
