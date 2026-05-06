package com.maint.pm_backend.service;

import com.maint.pm_backend.dto.MaintenanceManagerDashboardResponse;
import com.maint.pm_backend.repository.PmScheduleExecutionRepository;
import com.maint.pm_backend.util.DateUtils;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Service;

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
                .overallPmComplianceRate(selected.getOverallPmComplianceRate())
                .plantRejectionRate(selected.getPlantRejectionRate())
                .plantApprovalTurnaroundTimeHours(selected.getPlantApprovalTurnaroundTimeHours())
                .plantEvidenceComplianceRate(selected.getPlantEvidenceComplianceRate())
                .plantEmployeeEfficiency(selected.getPlantEmployeeEfficiency())
                .lineWiseCompliance(selected.getLineWiseCompliance())
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
        int rejectedCount = pmScheduleExecutionRepository.countTasksByStatusesBetweenDates(List.of("REJECTED"), startDate,
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
                    hs.pm_compliance_rate                              AS pm_compliance,
                    hs.task_rejection_rate                             AS rejection,
                    CAST(NULLIF(REGEXP_REPLACE(hs.approval_turnaround_time, '[^0-9.]', '', 'g'), '') AS NUMERIC)       AS turnaround,
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
        Double plantCompliance = toDouble(plantLatest.get("pm_compliance"));
        Double plantRejectionRate = toDouble(plantLatest.get("rejection"));
        Double plantApprovalTurnaround = toDouble(plantLatest.get("turnaround"));
        Double plantEvidenceComplianceRate = toDouble(plantLatest.get("evidence"));
        Double plantEmployeeEfficiency = toDouble(plantLatest.get("employee_efficiency"));

        String lineHealthSql = """
                SELECT
                    l.line_id,
                    l.line_name,
                    latest.pm_compliance_rate,
                    latest.task_rejection_rate,
                    CAST(NULLIF(REGEXP_REPLACE(latest.approval_turnaround_time, '[^0-9.]', '', 'g'), '') AS NUMERIC) AS approval_turnaround_time,
                    latest.evidence_compliance_rate,
                    latest.employee_efficiency
                FROM lines l
                LEFT JOIN LATERAL (
                    SELECT
                        hs.pm_compliance_rate,
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
                            .complianceRate(round1dp(toDouble(row.get("pm_compliance_rate"))))
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
                .overallPmComplianceRate(round1dp(plantCompliance))
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
        return windowDays == 30 ? endDate.withDayOfMonth(1) : endDate.withDayOfYear(1);
    }

    private LocalDate getWindowEndDate(int windowDays, LocalDate today) {
        return windowDays == 30
                ? today.withDayOfMonth(today.lengthOfMonth())
                : today.withDayOfYear(today.lengthOfYear());
    }

    public List<Map<String, Object>> getPlantComplianceTrend(int windowDays) {
        String sql = """
                    SELECT
                        evaluation_date  AS "evaluationDate",
                        pm_compliance_rate AS "complianceRate"
                    FROM phm_health_scores
                    WHERE entity_type = 'PLANT'
                      AND window_days  = :windowDays
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
}
