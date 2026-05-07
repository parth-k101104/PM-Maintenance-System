package com.maint.pm_backend.service;

import com.maint.pm_backend.dto.MaintenanceManagerDashboardResponse;
import com.maint.pm_backend.dto.LineAnalyticsDashboardResponse;
import com.maint.pm_backend.repository.PmScheduleExecutionRepository;
import com.maint.pm_backend.util.DateUtils;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Service;

import com.fasterxml.jackson.databind.ObjectMapper;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class MaintenanceManagerDashboardService {

    private final PmScheduleExecutionRepository pmScheduleExecutionRepository;
    private final NamedParameterJdbcTemplate jdbcTemplate;
    private final ObjectMapper objectMapper;

    public MaintenanceManagerDashboardResponse getDashboard(Long employeeId, int windowDays) {
        MaintenanceManagerDashboardResponse.RollingWindowMetrics metrics365 = buildRollingWindowMetrics(365);
        MaintenanceManagerDashboardResponse.RollingWindowMetrics metrics30 = buildRollingWindowMetrics(30);
        Map<Integer, MaintenanceManagerDashboardResponse.RollingWindowMetrics> rollingWindows = new LinkedHashMap<>();
        rollingWindows.put(365, metrics365);
        rollingWindows.put(30, metrics30);

        MaintenanceManagerDashboardResponse.RollingWindowMetrics selected = rollingWindows.getOrDefault(windowDays,
                metrics365);

        return MaintenanceManagerDashboardResponse.builder()
                .taskStatusCounts(selected.getTaskStatusCounts())
                .overallPhmCoverageRate(selected.getOverallPhmCoverageRate())
                .overallPmComplianceRate(selected.getOverallPmComplianceRate())
                .plantRejectionRate(selected.getPlantRejectionRate())
                .plantApprovalTurnaroundTimeHours(selected.getPlantApprovalTurnaroundTimeHours())
                .plantEvidenceComplianceRate(selected.getPlantEvidenceComplianceRate())
                .plantEmployeeEfficiency(selected.getPlantEmployeeEfficiency())
                .lineWiseCompliance(selected.getLineWiseCompliance())
                .actionInsights(fetchPlantActionInsights())
                .rollingWindows(rollingWindows)
                .build();
    }

    private MaintenanceManagerDashboardResponse.RollingWindowMetrics buildRollingWindowMetrics(int windowDays) {
        LocalDate today = DateUtils.getToday();
        LocalDate startDate = getWindowStartDate(windowDays, today);
        LocalDate endDate = getWindowEndDate(windowDays, today);

        int inProgressCount = pmScheduleExecutionRepository
                .countTasksByStatusesBetweenDates(List.of("ASSIGNED", "IN_PROGRESS"), startDate, endDate);
        int underReviewCount = pmScheduleExecutionRepository.countTasksByStatusesBetweenDates(
                List.of("UNDER_SUPERVISOR_REVIEW", "UNDER_LINE_MANAGER_REVIEW", "UNDER_MAINT_MANAGER_REVIEW"),
                startDate, endDate);
        int rejectedCount = pmScheduleExecutionRepository.countTasksByStatusesBetweenDates(List.of("REJECTED"),
                startDate,
                endDate);
        int approvedCount = pmScheduleExecutionRepository
                .countTasksByStatusesBetweenDates(List.of("APPROVED", "COMPLETED", "FLAGGED_AND_COMPLETED"),
                        startDate, endDate);
        int overdueCount = pmScheduleExecutionRepository.countOverdueTasksBetweenDates(startDate, today);

        MaintenanceManagerDashboardResponse.TaskStatusCounts statusCounts = MaintenanceManagerDashboardResponse.TaskStatusCounts
                .builder()
                .inProgress(inProgressCount)
                .underReview(underReviewCount)
                .rejected(rejectedCount)
                .approved(approvedCount)
                .overdue(overdueCount)
                .build();

        String plantLatestSql = """
                SELECT
                    hs.pm_compliance_rate                              AS phm_coverage,
                    hs.pm_operational_compliance                       AS pm_compliance,
                    hs.task_rejection_rate                             AS rejection,
                    CAST(NULLIF(REGEXP_REPLACE(hs.approval_turnaround_time, '[^0-9.]', '', 'g'), '') AS NUMERIC) AS turnaround,
                    hs.evidence_compliance_rate                        AS evidence,
                    hs.employee_efficiency                             AS employee_efficiency
                FROM phm_health_scores hs
                WHERE hs.entity_type = 'PLANT'
                  AND hs.window_days = :windowDays
                ORDER BY hs.evaluation_date DESC
                LIMIT 1
                """;

        List<Map<String, Object>> plantRows = jdbcTemplate.queryForList(plantLatestSql,
                Map.of("windowDays", windowDays));
        Map<String, Object> plantLatest = plantRows.isEmpty() ? Collections.emptyMap() : plantRows.get(0);
        Double plantPhmCoverage = toDouble(plantLatest.get("phm_coverage"));
        Double plantPmCompliance = toDouble(plantLatest.get("pm_compliance"));
        Double plantRejectionRate = toDouble(plantLatest.get("rejection"));
        Double plantApprovalTurnaround = toDouble(plantLatest.get("turnaround"));
        Double plantEvidenceComplianceRate = toDouble(plantLatest.get("evidence"));
        Double plantEmployeeEfficiency = toDouble(plantLatest.get("employee_efficiency"));

        String lineHealthSql = """
                SELECT
                    l.line_id,
                    l.line_name,
                    latest.health_score,
                    latest.pm_compliance_rate,
                    latest.pm_operational_compliance,
                    latest.task_rejection_rate,
                    CAST(NULLIF(REGEXP_REPLACE(latest.approval_turnaround_time, '[^0-9.]', '', 'g'), '') AS NUMERIC) AS approval_turnaround_time,
                    latest.evidence_compliance_rate,
                    latest.employee_efficiency
                FROM lines l
                LEFT JOIN LATERAL (
                    SELECT
                        hs.health_score,
                        hs.pm_compliance_rate,
                        hs.pm_operational_compliance,
                        hs.task_rejection_rate,
                        hs.approval_turnaround_time,
                        hs.evidence_compliance_rate,
                        hs.employee_efficiency
                    FROM phm_health_scores hs
                    WHERE hs.entity_type = 'LINE'
                      AND hs.window_days = :windowDays
                      AND hs.entity_id = l.line_id
                    ORDER BY hs.evaluation_date DESC, hs.health_id DESC
                    LIMIT 1
                ) latest ON TRUE
                ORDER BY l.line_name
                """;

        List<Map<String, Object>> lineHealth = jdbcTemplate.queryForList(lineHealthSql,
                Map.of("windowDays", windowDays));

        List<MaintenanceManagerDashboardResponse.LineWiseComplianceData> lineWiseData = lineHealth.stream()
                .map(row -> {
                    return MaintenanceManagerDashboardResponse.LineWiseComplianceData.builder()
                            .lineId(toLong(row.get("line_id")))
                            .lineName((String) row.get("line_name"))
                            .lineHealthScore(round1dp(toDouble(row.get("health_score"))))
                            .phmCoverageRate(round1dp(toDouble(row.get("pm_compliance_rate"))))
                            .pmComplianceRate(round1dp(toDouble(row.get("pm_operational_compliance"))))
                            .rejectionRate(round1dp(toDouble(row.get("task_rejection_rate"))))
                            .approvalTurnaroundTimeHours(round1dp(toDouble(row.get("approval_turnaround_time"))))
                            .evidenceComplianceRate(round1dp(toDouble(row.get("evidence_compliance_rate"))))
                            .employeeEfficiency(round1dp(toDouble(row.get("employee_efficiency"))))
                            .build();
                })
                .collect(Collectors.toList());

        return MaintenanceManagerDashboardResponse.RollingWindowMetrics.builder()
                .windowDays(windowDays)
                .taskStatusCounts(statusCounts)
                .overallPhmCoverageRate(round1dp(plantPhmCoverage))
                .overallPmComplianceRate(round1dp(plantPmCompliance))
                .plantRejectionRate(round1dp(plantRejectionRate))
                .plantApprovalTurnaroundTimeHours(round1dp(plantApprovalTurnaround))
                .plantEvidenceComplianceRate(round1dp(plantEvidenceComplianceRate))
                .plantEmployeeEfficiency(round1dp(plantEmployeeEfficiency))
                .lineWiseCompliance(lineWiseData)
                .build();
    }

    public java.util.List<com.maint.pm_backend.dto.TaskDetailsProjection> getTasksByStatusGroup(String statusGroup,
            int windowDays) {
        LocalDate today = DateUtils.getToday();
        LocalDate startDate = getWindowStartDate(windowDays, today);
        LocalDate endDate = getWindowEndDate(windowDays, today);

        return switch (statusGroup.toUpperCase()) {
            case "OVERDUE" -> pmScheduleExecutionRepository.findOverdueTasksForMmBetweenDates(startDate, today);
            case "IN_PROGRESS" -> pmScheduleExecutionRepository.findTasksByStatusesBetweenDates(
                    List.of("ASSIGNED", "IN_PROGRESS"), startDate, endDate);
            case "UNDER_REVIEW" -> pmScheduleExecutionRepository.findTasksByStatusesBetweenDates(
                    List.of("UNDER_SUPERVISOR_REVIEW", "UNDER_LINE_MANAGER_REVIEW", "UNDER_MAINT_MANAGER_REVIEW"),
                    startDate, endDate);
            case "REJECTED" ->
                pmScheduleExecutionRepository.findTasksByStatusesBetweenDates(List.of("REJECTED"), startDate, endDate);
            case "APPROVED" -> pmScheduleExecutionRepository.findTasksByStatusesBetweenDates(
                    List.of("APPROVED", "COMPLETED", "FLAGGED_AND_COMPLETED"), startDate, endDate);
            default -> List.of();
        };
    }

    private LocalDate getWindowStartDate(int windowDays, LocalDate endDate) {
        return endDate.minusDays(windowDays);
    }

    private LocalDate getWindowEndDate(int windowDays, LocalDate today) {
        return today;
    }

    public List<Map<String, Object>> getPlantComplianceTrend(int windowDays) {
        String sql = """
                    SELECT
                        evaluation_date         AS "evaluationDate",
                        pm_operational_compliance AS "complianceRate"
                    FROM phm_health_scores
                    WHERE entity_type = 'PLANT'
                      AND window_days  = :windowDays
                      AND pm_operational_compliance IS NOT NULL
                    ORDER BY evaluation_date ASC
                    LIMIT 30
                """;
        return jdbcTemplate.queryForList(sql, Map.of("windowDays", windowDays));
    }

    public List<Map<String, Object>> getPlantEvidenceTrend(int windowDays) {
        String sql = """
                    SELECT
                        evaluation_date          AS "evaluationDate",
                        evidence_compliance_rate AS "evidenceComplianceRate"
                    FROM phm_health_scores
                    WHERE entity_type = 'PLANT'
                      AND window_days  = :windowDays
                      AND evidence_compliance_rate IS NOT NULL
                    ORDER BY evaluation_date ASC
                    LIMIT 30
                """;
        return jdbcTemplate.queryForList(sql, Map.of("windowDays", windowDays));
    }

    public List<Map<String, Object>> getPlantRejectionTrend(int windowDays) {
        String sql = """
                    SELECT
                        evaluation_date      AS "evaluationDate",
                        task_rejection_rate  AS "rejectionRate"
                    FROM phm_health_scores
                    WHERE entity_type = 'PLANT'
                      AND window_days  = :windowDays
                      AND task_rejection_rate IS NOT NULL
                    ORDER BY evaluation_date ASC
                    LIMIT 30
                """;
        return jdbcTemplate.queryForList(sql, Map.of("windowDays", windowDays));
    }

    public List<Map<String, Object>> getPlantApprovalTurnaroundTrend(int windowDays) {
        String sql = """
                    SELECT
                        evaluation_date                         AS "evaluationDate",
                        CAST(NULLIF(REGEXP_REPLACE(approval_turnaround_time, '[^0-9.]', '', 'g'), '') AS NUMERIC) AS "approvalTurnaroundTimeHours"
                    FROM phm_health_scores
                    WHERE entity_type = 'PLANT'
                      AND window_days  = :windowDays
                      AND approval_turnaround_time IS NOT NULL
                    ORDER BY evaluation_date ASC
                    LIMIT 30
                """;
        return jdbcTemplate.queryForList(sql, Map.of("windowDays", windowDays));
    }

    public List<Map<String, Object>> getPlantPhmCoverageTrend(int windowDays) {
        String sql = """
                    SELECT
                        evaluation_date         AS "evaluationDate",
                        pm_compliance_rate      AS "phmCoverageRate"
                    FROM phm_health_scores
                    WHERE entity_type = 'PLANT'
                      AND window_days  = :windowDays
                      AND pm_compliance_rate IS NOT NULL
                    ORDER BY evaluation_date ASC
                    LIMIT 30
                """;
        return jdbcTemplate.queryForList(sql, Map.of("windowDays", windowDays));
    }

    public List<Map<String, Object>> getPlantEmployeeEfficiencyTrend(int windowDays) {
        String sql = """
                    SELECT
                        evaluation_date         AS "evaluationDate",
                        employee_efficiency     AS "efficiencyRate"
                    FROM phm_health_scores
                    WHERE entity_type = 'PLANT'
                      AND window_days  = :windowDays
                      AND employee_efficiency IS NOT NULL
                    ORDER BY evaluation_date ASC
                    LIMIT 30
                """;
        return jdbcTemplate.queryForList(sql, Map.of("windowDays", windowDays));
    }

    // ─── Helpers ───────────────────────────────────────────────────────────────

    private Double toDouble(Object val) {
        if (val == null)
            return null;
        if (val instanceof Number n)
            return n.doubleValue();
        try {
            return Double.parseDouble(val.toString());
        } catch (Exception e) {
            return null;
        }
    }

    private Long toLong(Object val) {
        if (val == null)
            return null;
        if (val instanceof Number n)
            return n.longValue();
        try {
            return Long.parseLong(val.toString());
        } catch (Exception e) {
            return null;
        }
    }

    private Double round1dp(Double val) {
        if (val == null)
            return null;
        return Math.round(val * 10.0) / 10.0;
    }

    private List<LineAnalyticsDashboardResponse.ActionInsight> fetchPlantActionInsights() {
        String sql = """
                SELECT i.insight_id, i.line_id, eq.equipment_id, eq.name AS equipment_name, ep.part_id, ep.name AS part_name,
                       i.insight_type, i.insight_code, i.severity, i.status, i.created_at, i.metadata::text AS metadata_json,
                       p.current_value, p.predicted_failure_date, p.confidence_score, p.days_remaining, p.risk_score
                FROM phm_action_insights i
                LEFT JOIN equipment_parts ep ON i.part_id = ep.part_id
                LEFT JOIN equipment_element ee ON ep.equipment_element_id = ee.element_id
                LEFT JOIN equipments eq ON ee.equipment_id = eq.equipment_id
                LEFT JOIN LATERAL (
                    SELECT current_value, predicted_failure_date, confidence_score, days_remaining, risk_score
                    FROM phm_degradation_predictions pred
                    WHERE pred.part_id = i.part_id AND pred.is_active = TRUE
                    ORDER BY pred.created_at DESC LIMIT 1
                ) p ON TRUE
                WHERE i.status = 'UNREAD'
                ORDER BY CASE i.severity WHEN 'CRITICAL' THEN 0 WHEN 'WARNING' THEN 1 ELSE 2 END, i.created_at DESC
                LIMIT 50
                """;
        return jdbcTemplate.query(sql, Collections.emptyMap(), (rs, rowNum) -> {
            String metadataJson = rs.getString("metadata_json");
            Map<String, Object> metadata = parseMetadata(metadataJson);
            BigDecimal velocityIncrease = decimalFrom(metadata.get("velocity_increase_percent"));
            
            BigDecimal riskScore = rs.getBigDecimal("risk_score");
            BigDecimal confidenceScore = rs.getBigDecimal("confidence_score");
            Integer daysRemaining = rs.getObject("days_remaining", Integer.class);
            LocalDate predictedFailureDate = rs.getDate("predicted_failure_date") != null 
                    ? rs.getDate("predicted_failure_date").toLocalDate() : null;

            String message = buildInsightMessage(
                    rs.getString("insight_code"),
                    rs.getString("severity"),
                    rs.getString("part_name"),
                    rs.getString("equipment_name"),
                    riskScore,
                    confidenceScore,
                    daysRemaining,
                    predictedFailureDate,
                    velocityIncrease);

            return new LineAnalyticsDashboardResponse.ActionInsight(
                    rs.getLong("insight_id"),
                    rs.getObject("line_id", Long.class),
                    rs.getLong("equipment_id"),
                    rs.getString("equipment_name"),
                    rs.getObject("part_id", Long.class),
                    rs.getString("part_name"),
                    rs.getString("insight_type"),
                    rs.getString("insight_code"),
                    rs.getString("severity"),
                    rs.getString("status"),
                    toLocalDateTime(rs.getTimestamp("created_at")),
                    message,
                    rs.getBigDecimal("current_value"),
                    predictedFailureDate,
                    confidenceScore,
                    daysRemaining,
                    riskScore,
                    velocityIncrease
            );
        });
    }

    private String buildInsightMessage(
            String code,
            String severity,
            String partName,
            String equipmentName,
            BigDecimal riskScore,
            BigDecimal confidenceScore,
            Integer daysRemaining,
            LocalDate predictedFailureDate,
            BigDecimal velocityIncreasePercent) {
        String part = partName != null ? partName : "A monitored part";
        String equipment = equipmentName != null ? " on " + equipmentName : "";
        String risk = riskScore != null ? " Risk score " + riskScore.setScale(0, java.math.RoundingMode.HALF_UP) + "%."
                : "";
        String confidence = confidenceScore != null
                ? " Confidence " + confidenceScore.setScale(0, java.math.RoundingMode.HALF_UP) + "%."
                : "";

        if ("DEGRADATION_ANOMALY".equalsIgnoreCase(code) || "ANOMALY_DETECTED".equalsIgnoreCase(code)) {
            String velocity = velocityIncreasePercent != null
                    ? " Degradation velocity is up "
                            + velocityIncreasePercent.setScale(0, java.math.RoundingMode.HALF_UP)
                            + "% versus expected behavior."
                    : " Degradation velocity is above the expected curve.";
            return part + equipment + " is degrading faster than expected." + velocity + risk + confidence;
        }

        if (predictedFailureDate != null || daysRemaining != null) {
            String failure = predictedFailureDate != null ? " Predicted failure date: " + predictedFailureDate + "."
                    : "";
            String remaining = daysRemaining != null ? " Estimated remaining life: " + daysRemaining + " days." : "";
            return part + equipment + " needs maintenance planning." + remaining + failure + risk + confidence;
        }

        return part + equipment + " has an analytics insight marked " + severity + "." + risk + confidence;
    }

    private Map<String, Object> parseMetadata(String metadataJson) {
        if (metadataJson == null || metadataJson.isBlank()) {
            return Map.of();
        }
        try {
            return objectMapper.readValue(metadataJson, new com.fasterxml.jackson.core.type.TypeReference<>() {});
        } catch (Exception ignored) {
            return Map.of();
        }
    }

    private BigDecimal decimalFrom(Object value) {
        if (value == null)
            return null;
        if (value instanceof Number number)
            return BigDecimal.valueOf(number.doubleValue());
        try {
            return new BigDecimal(String.valueOf(value).replace("%", "").trim());
        } catch (NumberFormatException ignored) {
            return null;
        }
    }

    private java.time.LocalDateTime toLocalDateTime(java.sql.Timestamp timestamp) {
        return timestamp != null ? timestamp.toLocalDateTime() : null;
    }
}
