package com.maint.pm_backend.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.maint.pm_backend.dto.LineAnalyticsDashboardResponse;
import com.maint.pm_backend.dto.PartAnalyticsResponse;
import com.maint.pm_backend.entity.Employee;
import com.maint.pm_backend.repository.EmployeeRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.sql.Date;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Timestamp;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class LineAnalyticsService {

    private static final long LINE_MANAGER_ROLE_ID = 2L;

    private final EmployeeRepository employeeRepository;
    private final NamedParameterJdbcTemplate jdbcTemplate;
    private final ObjectMapper objectMapper;

    public LineAnalyticsDashboardResponse getDashboard(Long lineManagerId) {
        validateLineManager(lineManagerId);
        MapSqlParameterSource params = new MapSqlParameterSource("lineManagerId", lineManagerId);

        Map<Integer, List<LineAnalyticsDashboardResponse.HealthScore>> rollingHealthScores = jdbcTemplate.query(
                """
                        SELECT hs.window_days,
                               hs.health_id,
                               hs.evaluation_date,
                               hs.entity_type,
                               hs.entity_id,
                               CASE
                                   WHEN hs.entity_type = 'LINE' THEN l.line_name
                                   WHEN hs.entity_type = 'EQUIPMENT' THEN eq.name
                                   ELSE hs.entity_type || ' #' || hs.entity_id
                               END AS entity_name,
                               hs.health_score,
                               hs.critical_flags_count,
                               hs.pm_compliance_rate,
                               hs.trend
                        FROM phm_health_scores hs
                        LEFT JOIN lines l ON hs.entity_type = 'LINE' AND hs.entity_id = l.line_id
                        LEFT JOIN equipments eq ON hs.entity_type = 'EQUIPMENT' AND hs.entity_id = eq.equipment_id
                        WHERE hs.window_days IN (30, 365) AND (
                            (hs.entity_type = 'LINE' AND hs.entity_id IN (SELECT line_id FROM lines WHERE line_manager_id = :lineManagerId))
                         OR (hs.entity_type = 'EQUIPMENT' AND hs.entity_id IN (
                                SELECT equipment_id FROM equipments
                                WHERE line_id IN (SELECT line_id FROM lines WHERE line_manager_id = :lineManagerId)
                            ))
                        )
                        ORDER BY hs.window_days, hs.evaluation_date DESC, hs.entity_type, hs.health_score ASC
                        """,
                params, rs -> {
                    Map<Integer, List<LineAnalyticsDashboardResponse.HealthScore>> map = new java.util.HashMap<>();
                    map.put(30, new ArrayList<>());
                    map.put(365, new ArrayList<>());
                    int rowNum = 0;
                    while (rs.next()) {
                        int wd = rs.getInt("window_days");
                        LineAnalyticsDashboardResponse.HealthScore score = mapHealthScore(rs, rowNum++);
                        if (map.containsKey(wd)) {
                            map.get(wd).add(score);
                        }
                    }
                    return map;
                });

        List<LineAnalyticsDashboardResponse.PartPrediction> predictions = jdbcTemplate.query("""
                SELECT p.prediction_id,
                       l.line_id,
                       l.line_name,
                       eq.equipment_id,
                       eq.name AS equipment_name,
                       ep.part_id,
                       ep.name AS part_name,
                       p.task_schedule_id,
                       p.evaluation_date,
                       p.current_value,
                       p.predicted_failure_date,
                       p.confidence_score,
                       p.days_remaining,
                       p.degradation_velocity,
                       p.risk_score,
                       p.lifecycle_ratio
                FROM phm_degradation_predictions p
                JOIN equipment_parts ep ON p.part_id = ep.part_id
                JOIN equipment_element ee ON ep.equipment_element_id = ee.element_id
                JOIN equipments eq ON ee.equipment_id = eq.equipment_id
                JOIN lines l ON eq.line_id = l.line_id
                WHERE l.line_manager_id = :lineManagerId
                  AND p.is_active = TRUE
                ORDER BY p.risk_score DESC NULLS LAST, p.days_remaining ASC NULLS LAST
                """, params, this::mapPrediction);

        List<LineAnalyticsDashboardResponse.ActionInsight> actionInsights = jdbcTemplate.query("""
                SELECT i.insight_id,
                       i.line_id,
                       eq.equipment_id,
                       eq.name AS equipment_name,
                       ep.part_id,
                       ep.name AS part_name,
                       i.insight_type,
                       i.insight_code,
                       i.severity,
                       i.status,
                       i.created_at,
                       i.metadata::text AS metadata_json,
                       p.current_value,
                       p.predicted_failure_date,
                       p.confidence_score,
                       p.days_remaining,
                       p.risk_score
                FROM phm_action_insights i
                LEFT JOIN equipment_parts ep ON i.part_id = ep.part_id
                LEFT JOIN equipment_element ee ON ep.equipment_element_id = ee.element_id
                LEFT JOIN equipments eq ON ee.equipment_id = eq.equipment_id
                LEFT JOIN LATERAL (
                    SELECT current_value, predicted_failure_date, confidence_score, days_remaining, risk_score
                    FROM phm_degradation_predictions pred
                    WHERE pred.part_id = i.part_id
                      AND pred.is_active = TRUE
                    ORDER BY pred.created_at DESC
                    LIMIT 1
                ) p ON TRUE
                WHERE i.status = 'UNREAD'
                  AND i.line_id IN (SELECT line_id FROM lines WHERE line_manager_id = :lineManagerId)
                ORDER BY
                    CASE i.severity WHEN 'CRITICAL' THEN 0 WHEN 'WARNING' THEN 1 ELSE 2 END,
                    i.created_at DESC
                """, params, this::mapActionInsight);

        return new LineAnalyticsDashboardResponse(rollingHealthScores, predictions, actionInsights);
    }

    public PartAnalyticsResponse getPartAnalytics(Long lineManagerId, Long partId) {
        validateLineManager(lineManagerId);

        Integer count = jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM equipment_parts ep" +
                        " JOIN equipment_element ee ON ep.equipment_element_id = ee.element_id" +
                        " JOIN equipments eq ON ee.equipment_id = eq.equipment_id" +
                        " JOIN lines l ON eq.line_id = l.line_id" +
                        " WHERE l.line_manager_id = :lineManagerId AND ep.part_id = :partId",
                new MapSqlParameterSource().addValue("lineManagerId", lineManagerId).addValue("partId", partId),
                Integer.class);
        if (count == null || count == 0) {
            throw new RuntimeException("Access denied: part does not belong to this line manager");
        }

        MapSqlParameterSource params = new MapSqlParameterSource("partId", partId);
        final PartAnalyticsResponse response = new PartAnalyticsResponse();

        jdbcTemplate.query(
                "SELECT ep.part_id, ep.name AS part_name, eq.equipment_id, eq.name AS equipment_name" +
                        " FROM equipment_parts ep" +
                        " JOIN equipment_element ee ON ep.equipment_element_id = ee.element_id" +
                        " JOIN equipments eq ON ee.equipment_id = eq.equipment_id" +
                        " WHERE ep.part_id = :partId LIMIT 1",
                params, rs -> {
                    response.setPartId(rs.getLong("part_id"));
                    response.setPartName(rs.getString("part_name"));
                    response.setEquipmentId(rs.getLong("equipment_id"));
                    response.setEquipmentName(rs.getString("equipment_name"));
                });

        jdbcTemplate.query(
                "SELECT p.current_value, p.predicted_failure_date, p.confidence_score," +
                        " p.days_remaining, p.degradation_velocity, p.risk_score," +
                        " p.lifecycle_ratio, p.evaluation_date" +
                        " FROM phm_degradation_predictions p" +
                        " WHERE p.part_id = :partId AND p.is_active = TRUE ORDER BY p.created_at DESC LIMIT 1",
                params, rs -> {
                    response.setCurrentValue(rs.getBigDecimal("current_value"));
                    response.setPredictedFailureDate(toLocalDate(rs.getDate("predicted_failure_date")));
                    response.setConfidenceScore(rs.getBigDecimal("confidence_score"));
                    response.setDaysRemaining(rs.getObject("days_remaining", Integer.class));
                    response.setDegradationVelocity(rs.getBigDecimal("degradation_velocity"));
                    response.setRiskScore(rs.getBigDecimal("risk_score"));
                    response.setLifecycleRatio(rs.getBigDecimal("lifecycle_ratio"));
                    response.setEvaluationDate(toLocalDate(rs.getDate("evaluation_date")));
                });

        jdbcTemplate.query(
                "SELECT chart_data_payload::text AS payload_text" +
                        " FROM phm_degradation_predictions" +
                        " WHERE part_id = :partId AND is_active = TRUE" +
                        " ORDER BY created_at DESC LIMIT 1",
                params, rs -> {
                    String json = rs.getString("payload_text");
                    if (json == null || json.isBlank())
                        return;
                    try {
                        Map<String, Object> pred = objectMapper.readValue(json, new TypeReference<>() {
                        });
                        if (pred.get("status") != null)
                            response.setStatus(pred.get("status").toString());
                        response.setVelocityRatio(toBigDecimal(pred.get("velocity_ratio")));
                        Map<String, Object> thresh = safeMap(pred.get("thresholds"));
                        response.setThresholds(new PartAnalyticsResponse.Thresholds(
                                toBigDecimal(thresh.get("standard_value")),
                                toBigDecimal(thresh.get("tolerance_min")),
                                toBigDecimal(thresh.get("tolerance_max")),
                                toBigDecimal(thresh.get("warning_value")),
                                thresh.get("uom") != null ? thresh.get("uom").toString() : null));
                        response.setCurrentCycle(parseSeriesPoints(safeList(pred.get("current_cycle"))));
                        response.setHistoricalCycles(parseHistoricalCycles(safeList(pred.get("historical_cycles"))));
                        response.setSimulatedFailureCurve(
                                parseSeriesPoints(safeList(pred.get("simulated_failure_curve"))));
                        response.setMasterCurve(parseSeriesPoints(safeList(pred.get("master_curve"))));
                    } catch (Exception ignored) {
                    }
                });

        List<LineAnalyticsDashboardResponse.ActionInsight> insights = jdbcTemplate.query(
                "SELECT i.insight_id, i.line_id," +
                        " eq.equipment_id, eq.name AS equipment_name, ep.part_id, ep.name AS part_name," +
                        " i.insight_type, i.insight_code, i.severity, i.status, i.created_at," +
                        " i.metadata::text AS metadata_json," +
                        " p.current_value, p.predicted_failure_date, p.confidence_score, p.days_remaining, p.risk_score"
                        +
                        " FROM phm_action_insights i" +
                        " LEFT JOIN equipment_parts ep ON i.part_id = ep.part_id" +
                        " LEFT JOIN equipment_element ee ON ep.equipment_element_id = ee.element_id" +
                        " LEFT JOIN equipments eq ON ee.equipment_id = eq.equipment_id" +
                        " LEFT JOIN LATERAL (" +
                        "   SELECT current_value, predicted_failure_date, confidence_score, days_remaining, risk_score"
                        +
                        "   FROM phm_degradation_predictions pred" +
                        "   WHERE pred.part_id = i.part_id AND pred.is_active = TRUE ORDER BY pred.created_at DESC LIMIT 1"
                        +
                        " ) p ON TRUE" +
                        " WHERE i.part_id = :partId AND i.status = 'UNREAD'" +
                        " ORDER BY CASE i.severity WHEN 'CRITICAL' THEN 0 WHEN 'WARNING' THEN 1 ELSE 2 END, i.created_at DESC",
                params, this::mapActionInsight);
        response.setActionInsights(insights);
        return response;
    }

    @SuppressWarnings("unchecked")
    private List<Map<String, Object>> safeList(Object obj) {
        if (obj instanceof List<?> list)
            return (List<Map<String, Object>>) list;
        return Collections.emptyList();
    }

    @SuppressWarnings("unchecked")
    private Map<String, Object> safeMap(Object obj) {
        if (obj instanceof Map<?, ?> map)
            return (Map<String, Object>) map;
        return Collections.emptyMap();
    }

    private BigDecimal toBigDecimal(Object value) {
        if (value == null)
            return null;
        try {
            return new BigDecimal(value.toString());
        } catch (Exception ignored) {
            return null;
        }
    }

    private List<PartAnalyticsResponse.SeriesPoint> parseSeriesPoints(List<Map<String, Object>> raw) {
        List<PartAnalyticsResponse.SeriesPoint> pts = new ArrayList<>();
        for (Map<String, Object> p : raw) {
            try {
                pts.add(new PartAnalyticsResponse.SeriesPoint(
                        Integer.parseInt(p.get("day").toString()),
                        LocalDate.parse(p.get("date").toString()),
                        Double.parseDouble(p.get("value").toString())));
            } catch (Exception ignored) {
            }
        }
        return pts;
    }

    private List<PartAnalyticsResponse.HistoricalCycle> parseHistoricalCycles(List<Map<String, Object>> raw) {
        List<PartAnalyticsResponse.HistoricalCycle> cycles = new ArrayList<>();
        for (Map<String, Object> c : raw) {
            try {
                cycles.add(new PartAnalyticsResponse.HistoricalCycle(
                        Integer.parseInt(c.get("cycle_index").toString()),
                        LocalDate.parse(c.get("start_date").toString()),
                        c.get("end_date") != null ? LocalDate.parse(c.get("end_date").toString()) : null,
                        Double.parseDouble(c.get("velocity").toString()),
                        parseSeriesPoints(safeList(c.get("points")))));
            } catch (Exception ignored) {
            }
        }
        return cycles;
    }

    @Transactional
    public void acknowledgeInsight(Long lineManagerId, Long insightId) {
        validateLineManager(lineManagerId);
        int updated = jdbcTemplate.update("""
                UPDATE phm_action_insights
                SET status = 'ACKNOWLEDGED'
                WHERE insight_id = :insightId
                  AND line_id IN (SELECT line_id FROM lines WHERE line_manager_id = :lineManagerId)
                """, new MapSqlParameterSource()
                .addValue("insightId", insightId)
                .addValue("lineManagerId", lineManagerId));
        if (updated == 0) {
            throw new RuntimeException("Insight not found for this line manager");
        }
    }

    private LineAnalyticsDashboardResponse.HealthScore mapHealthScore(ResultSet rs, int rowNum) throws SQLException {
        return new LineAnalyticsDashboardResponse.HealthScore(
                rs.getLong("health_id"),
                toLocalDate(rs.getDate("evaluation_date")),
                rs.getString("entity_type"),
                rs.getLong("entity_id"),
                rs.getString("entity_name"),
                rs.getBigDecimal("health_score"),
                rs.getObject("critical_flags_count", Integer.class),
                rs.getBigDecimal("pm_compliance_rate"),
                rs.getString("trend"));
    }

    private LineAnalyticsDashboardResponse.PartPrediction mapPrediction(ResultSet rs, int rowNum) throws SQLException {
        return new LineAnalyticsDashboardResponse.PartPrediction(
                rs.getLong("prediction_id"),
                rs.getLong("line_id"),
                rs.getString("line_name"),
                rs.getLong("equipment_id"),
                rs.getString("equipment_name"),
                rs.getLong("part_id"),
                rs.getString("part_name"),
                rs.getObject("task_schedule_id", Long.class),
                toLocalDate(rs.getDate("evaluation_date")),
                rs.getBigDecimal("current_value"),
                toLocalDate(rs.getDate("predicted_failure_date")),
                rs.getBigDecimal("confidence_score"),
                rs.getObject("days_remaining", Integer.class),
                rs.getBigDecimal("degradation_velocity"),
                rs.getBigDecimal("risk_score"),
                rs.getBigDecimal("lifecycle_ratio"));
    }

    private LineAnalyticsDashboardResponse.ActionInsight mapActionInsight(ResultSet rs, int rowNum)
            throws SQLException {
        String metadataJson = rs.getString("metadata_json");
        Map<String, Object> metadata = parseMetadata(metadataJson);
        BigDecimal velocityIncrease = decimalFrom(metadata.get("velocity_increase_percent"));
        String message = buildInsightMessage(
                rs.getString("insight_code"),
                rs.getString("severity"),
                rs.getString("part_name"),
                rs.getString("equipment_name"),
                rs.getBigDecimal("risk_score"),
                rs.getBigDecimal("confidence_score"),
                rs.getObject("days_remaining", Integer.class),
                toLocalDate(rs.getDate("predicted_failure_date")),
                velocityIncrease);

        return new LineAnalyticsDashboardResponse.ActionInsight(
                rs.getLong("insight_id"),
                rs.getObject("line_id", Long.class),
                rs.getObject("equipment_id", Long.class),
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
                toLocalDate(rs.getDate("predicted_failure_date")),
                rs.getBigDecimal("confidence_score"),
                rs.getObject("days_remaining", Integer.class),
                rs.getBigDecimal("risk_score"),
                velocityIncrease);
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
            return objectMapper.readValue(metadataJson, new TypeReference<>() {
            });
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

    private LocalDate toLocalDate(Date date) {
        return date != null ? date.toLocalDate() : null;
    }

    private LocalDateTime toLocalDateTime(Timestamp timestamp) {
        return timestamp != null ? timestamp.toLocalDateTime() : null;
    }

    private void validateLineManager(Long employeeId) {
        Employee employee = employeeRepository.findById(employeeId)
                .orElseThrow(() -> new RuntimeException("Employee not found"));

        if (employee.getRoleId() == null || employee.getRoleId() != LINE_MANAGER_ROLE_ID) {
            throw new RuntimeException("Access denied: only line managers can access this endpoint");
        }
    }
}
