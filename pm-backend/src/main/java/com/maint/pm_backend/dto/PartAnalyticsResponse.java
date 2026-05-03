package com.maint.pm_backend.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class PartAnalyticsResponse {

    private Long partId;
    private String partName;
    private Long equipmentId;
    private String equipmentName;
    private String status;

    // Scalar prediction fields
    private BigDecimal currentValue;
    private BigDecimal riskScore;
    private BigDecimal confidenceScore;
    private BigDecimal degradationVelocity;
    private BigDecimal lifecycleRatio;
    private BigDecimal velocityRatio;
    private Integer daysRemaining;
    private LocalDate predictedFailureDate;
    private LocalDate evaluationDate;

    // Thresholds
    private Thresholds thresholds;

    // Cycle series (sourced from the latest job execution payload)
    private List<SeriesPoint> currentCycle;
    private List<HistoricalCycle> historicalCycles;
    private List<SeriesPoint> simulatedFailureCurve;
    private List<SeriesPoint> masterCurve;

    // Part-level action insights
    private List<LineAnalyticsDashboardResponse.ActionInsight> actionInsights;

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class SeriesPoint {
        private int day;
        private LocalDate date;
        private double value;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class HistoricalCycle {
        private int cycleIndex;
        private LocalDate startDate;
        private LocalDate endDate;
        private double velocity;
        private List<SeriesPoint> points;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class Thresholds {
        private BigDecimal standardValue;
        private BigDecimal toleranceMin;
        private BigDecimal toleranceMax;
        private BigDecimal warningValue;
        private String uom;
    }
}
