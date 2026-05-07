package com.maint.pm_backend.service;

import com.maint.pm_backend.dto.LineManagerDashboardResponse;
import com.maint.pm_backend.dto.TaskDetailsProjection;
import com.maint.pm_backend.entity.Employee;
import com.maint.pm_backend.repository.EmployeeRepository;
import com.maint.pm_backend.repository.PmScheduleApprovalRepository;
import com.maint.pm_backend.repository.PmScheduleExecutionRepository;
import lombok.RequiredArgsConstructor;
import com.maint.pm_backend.dto.EquipmentHierarchyProjection;
import com.maint.pm_backend.dto.LineEquipmentDTO;
import com.maint.pm_backend.dto.LineElementDTO;
import com.maint.pm_backend.dto.LinePartDTO;
import com.maint.pm_backend.dto.IssueFlagProjection;
import com.maint.pm_backend.repository.IssueFlagRepository;
import com.maint.pm_backend.dto.LineAnalyticsDashboardResponse;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.sql.Date;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Timestamp;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class LineManagerDashboardService {

    private final EmployeeRepository employeeRepository;
    private final PmScheduleApprovalRepository approvalRepository;
    private final PmScheduleExecutionRepository executionRepository;
    private final IssueFlagRepository issueFlagRepository;
    private final NamedParameterJdbcTemplate jdbcTemplate;
    private final ObjectMapper objectMapper;

    // role_id = 2 -> Line Manager
    private static final long LINE_MANAGER_ROLE_ID = 2L;

    // Use centralized DateUtils instead of hardcoded baseline date
    private static final LocalDate TODAY = com.maint.pm_backend.util.DateUtils.getToday();

    public LineManagerDashboardResponse getDashboard(Long employeeId) {
        validateLineManager(employeeId);

        int totalApprovalsToday = approvalRepository.countTodaysApprovalsForLineManager(employeeId);
        int backlogApprovals = approvalRepository.countBacklogApprovalsForLineManager(employeeId, TODAY);

        int totalFlagsRaised = executionRepository.countActiveFlagsForLineManager(employeeId);
        int activeTasksToday = executionRepository.countActiveTasksForLineManager(employeeId);
        int pendingReviewTasks = executionRepository.countPendingReviewTasksForLineManager(employeeId);
        int rejectedTasks = executionRepository.countRejectedTasksForLineManager(employeeId);

        LineManagerDashboardResponse response = new LineManagerDashboardResponse();
        response.setTotalApprovalsToday(totalApprovalsToday);
        response.setBacklogApprovals(backlogApprovals);
        response.setTotalFlagsRaised(totalFlagsRaised);
        response.setActiveTasksToday(activeTasksToday);
        response.setPendingReviewTasks(pendingReviewTasks);
        response.setRejectedTasks(rejectedTasks);

        Map<Integer, LineManagerDashboardResponse.RollingWindowMetrics> rollingWindows = new LinkedHashMap<>();
        LineManagerDashboardResponse.RollingWindowMetrics thirtyDays = buildRollingWindowMetrics(30, employeeId);
        LineManagerDashboardResponse.RollingWindowMetrics year = buildRollingWindowMetrics(365, employeeId);
        rollingWindows.put(30, thirtyDays);
        rollingWindows.put(365, year);
        response.setRollingWindows(rollingWindows);
        response.setLineHealth(thirtyDays.getLineHealth());

        // Fetch Actionable Insights
        MapSqlParameterSource params = new MapSqlParameterSource("lineManagerId", employeeId);
        List<LineAnalyticsDashboardResponse.ActionInsight> actionInsights = jdbcTemplate.query(
                "SELECT i.insight_id, i.line_id, eq.equipment_id, eq.name AS equipment_name, ep.part_id, ep.name AS part_name, " +
                "i.insight_type, i.insight_code, i.severity, i.status, i.created_at, i.metadata::text AS metadata_json, " +
                "p.current_value, p.predicted_failure_date, p.confidence_score, p.days_remaining, p.risk_score " +
                "FROM phm_action_insights i " +
                "LEFT JOIN equipment_parts ep ON i.part_id = ep.part_id " +
                "LEFT JOIN equipment_element ee ON ep.equipment_element_id = ee.element_id " +
                "LEFT JOIN equipments eq ON ee.equipment_id = eq.equipment_id " +
                "LEFT JOIN LATERAL ( " +
                "    SELECT current_value, predicted_failure_date, confidence_score, days_remaining, risk_score " +
                "    FROM phm_degradation_predictions pred " +
                "    WHERE pred.part_id = i.part_id AND pred.is_active = TRUE " +
                "    ORDER BY pred.created_at DESC LIMIT 1 " +
                ") p ON TRUE " +
                "WHERE i.status = 'UNREAD' AND i.line_id IN (SELECT line_id FROM lines WHERE line_manager_id = :lineManagerId) " +
                " ORDER BY CASE i.severity WHEN 'CRITICAL' THEN 0 WHEN 'WARNING' THEN 1 ELSE 2 END, i.created_at DESC",
                params, this::mapActionInsight);
        response.setActionInsights(actionInsights);

        return response;
    }

    private LineManagerDashboardResponse.RollingWindowMetrics buildRollingWindowMetrics(int windowDays,
            Long employeeId) {
        String sql = """
                SELECT
                    t.entity_id,
                    l.line_name AS entity_name,
                    t.health_score,
                    t.pm_compliance_rate,
                    t.pm_operational_compliance,
                    t.task_rejection_rate,
                    t.approval_turnaround_time,
                    t.evidence_compliance_rate,
                    t.employee_efficiency
                FROM (
                    SELECT
                        hs.entity_id,
                        hs.health_score,
                        hs.pm_compliance_rate,
                        hs.pm_operational_compliance,
                        hs.task_rejection_rate,
                        hs.approval_turnaround_time,
                        hs.evidence_compliance_rate,
                        hs.employee_efficiency,
                        ROW_NUMBER() OVER (PARTITION BY hs.entity_id ORDER BY hs.evaluation_date DESC, hs.health_id DESC) AS rn
                    FROM phm_health_scores hs
                    WHERE hs.entity_type = 'LINE'
                      AND hs.window_days = :windowDays
                      AND hs.entity_id IN (SELECT line_id FROM lines WHERE line_manager_id = :lineManagerId)
                ) t
                JOIN lines l ON l.line_id = t.entity_id
                WHERE t.rn = 1
                """;

        List<Map<String, Object>> rows = jdbcTemplate.queryForList(sql, Map.of(
                "windowDays", windowDays,
                "lineManagerId", employeeId));

        List<LineManagerDashboardResponse.LineBreakdown> lineMetrics = new ArrayList<>();
        double sumHealth = 0, sumPhmCoverage = 0, sumPmCompliance = 0;
        double sumRejection = 0, sumTurnaround = 0, sumEvidence = 0, sumEfficiency = 0;
        int count = rows.size();

        for (Map<String, Object> row : rows) {
            double h = toDouble(row.get("health_score"));
            double phm = toDouble(row.get("pm_compliance_rate"));
            double pm = toDouble(row.get("pm_operational_compliance"));
            double rej = toDouble(row.get("task_rejection_rate"));
            double eff = toDouble(row.get("employee_efficiency"));
            double evid = toDouble(row.get("evidence_compliance_rate"));
            
            // Extract numeric turnaround
            String rawTurnaround = (String) row.get("approval_turnaround_time");
            double turn = 0;
            if (rawTurnaround != null) {
                try {
                    turn = Double.parseDouble(rawTurnaround.replaceAll("[^0-9.]", ""));
                } catch (Exception ignored) {}
            }

            lineMetrics.add(LineManagerDashboardResponse.LineBreakdown.builder()
                    .lineId(toLong(row.get("entity_id")))
                    .lineName((String) row.get("entity_name"))
                    .healthScore(round1dp(h))
                    .phmCoverageRate(round1dp(phm))
                    .pmComplianceRate(round1dp(pm))
                    .taskRejectionRate(round1dp(rej))
                    .approvalTurnaroundTimeHours(round1dp(turn))
                    .evidenceComplianceRate(round1dp(evid))
                    .employeeEfficiency(round1dp(eff))
                    .build());

            sumHealth += h;
            sumPhmCoverage += phm;
            sumPmCompliance += pm;
            sumRejection += rej;
            sumTurnaround += turn;
            sumEvidence += evid;
            sumEfficiency += eff;
        }

        return LineManagerDashboardResponse.RollingWindowMetrics.builder()
                .windowDays(windowDays)
                .lineHealth(count > 0 ? round1dp(sumHealth / count) : null)
                .phmCoverageRate(count > 0 ? round1dp(sumPhmCoverage / count) : null)
                .pmComplianceRate(count > 0 ? round1dp(sumPmCompliance / count) : null)
                .taskRejectionRate(count > 0 ? round1dp(sumRejection / count) : null)
                .approvalTurnaroundTimeHours(count > 0 ? round1dp(sumTurnaround / count) : null)
                .evidenceComplianceRate(count > 0 ? round1dp(sumEvidence / count) : null)
                .employeeEfficiency(count > 0 ? round1dp(sumEfficiency / count) : null)
                .lineMetrics(lineMetrics)
                .build();
    }

    private Double round1dp(Double val) {
        if (val == null) return null;
        return Math.round(val * 10.0) / 10.0;
    }

    private Long toLong(Object val) {
        if (val == null) return null;
        if (val instanceof Number n) return n.longValue();
        try { return Long.parseLong(val.toString()); } catch (Exception e) { return null; }
    }

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

    public List<TaskDetailsProjection> getTodaysApprovalsList(Long employeeId) {
        validateLineManager(employeeId);
        return approvalRepository.findTodaysApprovalsListForLineManager(employeeId);
    }

    public List<TaskDetailsProjection> getBacklogApprovalsList(Long employeeId) {
        validateLineManager(employeeId);
        return approvalRepository.findBacklogApprovalsListForLineManager(employeeId, TODAY);
    }

    public List<TaskDetailsProjection> getActiveTasksList(Long employeeId) {
        validateLineManager(employeeId);
        return executionRepository.findActiveTasksListForLineManager(employeeId);
    }

    public List<IssueFlagProjection> getFlagsList(Long employeeId) {
        validateLineManager(employeeId);
        return issueFlagRepository.findFlagsByLineManagerId(employeeId);
    }

    public List<LineEquipmentDTO> getEquipmentHierarchy(Long employeeId) {
        validateLineManager(employeeId);
        List<EquipmentHierarchyProjection> projections = executionRepository
                .findEquipmentHierarchyForLineManager(employeeId);

        Map<Long, LineEquipmentDTO> equipmentMap = new LinkedHashMap<>();

        for (EquipmentHierarchyProjection p : projections) {
            Long eqId = p.getEquipmentId();
            if (eqId == null)
                continue;

            LineEquipmentDTO eqDto = equipmentMap.computeIfAbsent(eqId, id -> {
                LineEquipmentDTO dto = new LineEquipmentDTO();
                dto.setEquipmentId(id);
                dto.setEquipmentName(p.getEquipmentName());
                dto.setElements(new ArrayList<>());
                return dto;
            });

            Long elId = p.getElementId();
            if (elId != null) {
                LineElementDTO elDto = eqDto.getElements().stream()
                        .filter(e -> e.getElementId().equals(elId))
                        .findFirst()
                        .orElseGet(() -> {
                            LineElementDTO dto = new LineElementDTO();
                            dto.setElementId(elId);
                            dto.setElementName(p.getElementName());
                            dto.setParts(new ArrayList<>());
                            eqDto.getElements().add(dto);
                            return dto;
                        });

                Long partId = p.getPartId();
                if (partId != null) {
                    boolean partExists = elDto.getParts().stream().anyMatch(pt -> pt.getPartId().equals(partId));
                    if (!partExists) {
                        LinePartDTO partDto = new LinePartDTO();
                        partDto.setPartId(partId);
                        partDto.setPartName(p.getPartName());
                        elDto.getParts().add(partDto);
                    }
                }
            }
        }

        return new ArrayList<>(equipmentMap.values());
    }

    private void validateLineManager(Long employeeId) {
        Employee employee = employeeRepository.findById(employeeId)
                .orElseThrow(() -> new RuntimeException("Employee not found"));

        if (employee.getRoleId() == null || employee.getRoleId() != LINE_MANAGER_ROLE_ID) {
            throw new RuntimeException("Access denied: only line managers can access this endpoint");
        }
    }

    private LineAnalyticsDashboardResponse.ActionInsight mapActionInsight(ResultSet rs, int rowNum) throws SQLException {
        Map<String, Object> meta = parseMetadata(rs.getString("metadata_json"));
        BigDecimal velocityIncrease = decimalFrom(meta.get("velocity_increase_percent"));

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
}
