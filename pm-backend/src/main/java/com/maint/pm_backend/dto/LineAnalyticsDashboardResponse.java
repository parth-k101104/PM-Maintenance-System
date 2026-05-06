package com.maint.pm_backend.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class LineAnalyticsDashboardResponse {
    private Map<Integer, List<HealthScore>> rollingHealthScores;
    private List<PartPrediction> predictions;
    private List<ActionInsight> actionInsights;

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class HealthScore {
        private Long healthId;
        private LocalDate evaluationDate;
        private String entityType;
        private Long entityId;
        private String entityName;
        private BigDecimal healthScore;
        private Integer criticalFlagsCount;
        private BigDecimal pmComplianceRate;
        private String trend;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class PartPrediction {
        private Long predictionId;
        private Long lineId;
        private String lineName;
        private Long equipmentId;
        private String equipmentName;
        private Long partId;
        private String partName;
        private Long taskScheduleId;
        private LocalDate evaluationDate;
        private BigDecimal currentValue;
        private LocalDate predictedFailureDate;
        private BigDecimal confidenceScore;
        private Integer daysRemaining;
        private BigDecimal degradationVelocity;
        private BigDecimal riskScore;
        private BigDecimal lifecycleRatio;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ActionInsight {
        private Long insightId;
        private Long lineId;
        private Long equipmentId;
        private String equipmentName;
        private Long partId;
        private String partName;
        private String insightType;
        private String insightCode;
        private String severity;
        private String status;
        private LocalDateTime createdAt;
        private String message;
        private BigDecimal currentValue;
        private LocalDate predictedFailureDate;
        private BigDecimal confidenceScore;
        private Integer daysRemaining;
        private BigDecimal riskScore;
        private BigDecimal velocityIncreasePercent;
    }
}
