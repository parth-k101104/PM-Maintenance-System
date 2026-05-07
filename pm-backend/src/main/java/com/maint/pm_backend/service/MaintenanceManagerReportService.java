package com.maint.pm_backend.service;

import com.maint.pm_backend.dto.ReportOptionsResponse;
import com.maint.pm_backend.dto.ReportPeriod;
import com.maint.pm_backend.dto.ReportRequest;
import com.maint.pm_backend.dto.ReportResponse;
import com.maint.pm_backend.dto.ReportScope;
import com.maint.pm_backend.dto.ReportType;
import com.maint.pm_backend.util.DateUtils;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.Month;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class MaintenanceManagerReportService {

    private static final int PERIOD_GRACE_DAYS = 3;
    private static final DateTimeFormatter DATE_LABEL = DateTimeFormatter.ofPattern("MMM d, yyyy");

    private final NamedParameterJdbcTemplate jdbcTemplate;

    public ReportOptionsResponse getOptions() {
        return ReportOptionsResponse.builder()
                .reportTypes(List.of(
                        option(ReportType.OVERALL_MAINTENANCE_PERFORMANCE.name(), "Overall Maintenance Performance",
                                "Plant summary covering PM compliance, task flow, PHM metrics, line performance and flags."),
                        option(ReportType.LINE_WISE_PERFORMANCE.name(), "Line-wise Performance",
                                "Compare PM compliance, rejection, turnaround, evidence, efficiency and flag count by line."),
                        option(ReportType.TASK_STATUS.name(), "Task Status",
                                "Status distribution and task details for the plant or selected line."),
                        option(ReportType.EMPLOYEE_EFFICIENCY.name(), "Employee Efficiency",
                                "Plant or line efficiency from PHM health score snapshots."),
                        option(ReportType.PM_COMPLIANCE_TREND.name(), "PM Compliance Trend",
                                "Evaluation-date trend for operational PM compliance."),
                        option(ReportType.ISSUE_FLAGS_REPLACEMENT.name(), "Issue Flags / Replacement",
                                "Flag criticality, replacement-required counts and completed replacement activity.")))
                .scopes(List.of(
                        option(ReportScope.PLANT.name(), "Entire Plant", "Use all plant lines."),
                        option(ReportScope.LINE.name(), "Selected Line", "Filter data to one line.")))
                .periods(List.of(
                        option(ReportPeriod.LAST_30_DAYS.name(), "30 Days / Monthly", "Rolling 30-day window ending on effective today."),
                        option(ReportPeriod.LAST_365_DAYS.name(), "365 Days / Yearly", "Rolling 365-day window ending on effective today."),
                        option(ReportPeriod.QUARTERLY.name(), "Quarterly", "Q1, Q2, Q3 or Q4 of the effective year."),
                        option(ReportPeriod.HALF_YEARLY.name(), "Half-yearly", "H1 or H2 of the effective year."),
                        option(ReportPeriod.CUSTOM.name(), "Custom", "Exact start and end dates selected by the user.")))
                .formats(List.of(option("PDF", "PDF", "Printable report with tables, descriptions and embedded charts.")))
                .lines(fetchLines())
                .build();
    }

    public ReportResponse generate(ReportRequest request) {
        validateRequest(request);
        PeriodRange range = resolvePeriod(request);
        ReportScope scope = request.getScope() == null ? ReportScope.PLANT : request.getScope();
        String scopeLabel = resolveScopeLabel(scope, request.getLineId());

        List<ReportResponse.SummaryCard> cards = new ArrayList<>();
        List<ReportResponse.ReportSection> sections = new ArrayList<>();
        List<Map<String, Object>> details = List.of();

        Map<String, Object> latestMetrics = fetchLatestMetrics(scope, request.getLineId(), range.startDate, range.endDate);
        Map<String, Object> taskStatus = fetchTaskStatus(scope, request.getLineId(), range.startDate, range.endDate);
        Map<String, Object> flagSummary = fetchFlagSummary(scope, request.getLineId(), range.startDate, range.endDate);

        switch (request.getReportType()) {
            case OVERALL_MAINTENANCE_PERFORMANCE -> {
                cards.add(card("PM Compliance", latestMetrics.get("pmCompliance"), "%", "Approved terminal work as a share of terminal and overdue work.", "success"));
                cards.add(card("Rejection Rate", latestMetrics.get("rejectionRate"), "%", "Rejected tasks from the PHM operational snapshot.", "warning"));
                cards.add(card("Approval Turnaround", latestMetrics.get("approvalTurnaroundHours"), "hrs", "Average review cycle time captured in PHM analytics.", "neutral"));
                cards.add(card("Evidence Compliance", latestMetrics.get("evidenceCompliance"), "%", "Evidence quality/completeness from PHM analytics.", "success"));
                cards.add(card("Employee Efficiency", latestMetrics.get("employeeEfficiency"), "%", "Execution efficiency from PHM analytics.", "success"));
                cards.add(card("Active Flags", flagSummary.get("activeFlags"), "", "Open issue flags in the selected period.", "warning"));
                sections.add(section("Task Status Distribution", "Counts are filtered by task due date within the selected report period.", "bar", mapToRows(taskStatus, "status", "count")));
                sections.add(section("Line-wise Summary", "Each line uses the most recent PHM metric in the selected period. Missing PHM values stay null and render as N/A.", "bar", fetchLineMetrics(range.startDate, range.endDate)));
                sections.add(section("Issue Flags Summary", "Flags are filtered by raised date. Replacement-completed uses replacement completion date.", "bar", mapToRows(flagSummary, "metric", "value")));
            }
            case LINE_WISE_PERFORMANCE -> {
                List<Map<String, Object>> lineMetrics = fetchLineMetrics(range.startDate, range.endDate);
                cards.add(card("Lines Covered", lineMetrics.size(), "", "Total lines included in the comparison.", "neutral"));
                cards.add(card("Avg PM Compliance", average(lineMetrics, "pmCompliance"), "%", "Average of available line PM compliance values.", "success"));
                cards.add(card("Avg Efficiency", average(lineMetrics, "employeeEfficiency"), "%", "Average of available line efficiency values.", "success"));
                sections.add(section("Line Performance Comparison", "PHM values are latest available inside the selected period; blank values mean no PHM metric was found.", "bar", lineMetrics));
                sections.add(section("Flags By Line", "Open and period-raised flags joined to equipment line.", "bar", fetchFlagsByLine(range.startDate, range.endDate)));
            }
            case TASK_STATUS -> {
                cards.add(card("Approved", taskStatus.get("approved"), "", "Approved, completed and flagged-completed tasks.", "success"));
                cards.add(card("In Progress", taskStatus.get("inProgress"), "", "Assigned or in-progress tasks.", "neutral"));
                cards.add(card("Under Review", taskStatus.get("underReview"), "", "Tasks waiting in supervisor, line manager or maintenance manager review.", "warning"));
                cards.add(card("Rejected", taskStatus.get("rejected"), "", "Rejected tasks due in the period.", "danger"));
                cards.add(card("Overdue", taskStatus.get("overdue"), "", "Assigned/in-progress tasks with due date before effective today.", "danger"));
                sections.add(section("Status Distribution", "Task status buckets are grouped for report readability.", "bar", mapToRows(taskStatus, "status", "count")));
                details = fetchTaskRows(scope, request.getLineId(), range.startDate, range.endDate);
                sections.add(section("Detailed Task Rows", "Task rows include machine, line, owner, status, due date, criticality and active-flag state.", "table", details));
            }
            case EMPLOYEE_EFFICIENCY -> {
                cards.add(card("Plant Efficiency", latestMetrics.get("employeeEfficiency"), "%", "Latest plant/line efficiency metric inside the selected period.", "success"));
                List<Map<String, Object>> efficiencyRows = request.getScope() == ReportScope.LINE
                        ? fetchMetricTrend(ReportScope.LINE, request.getLineId(), range.startDate, range.endDate, "employee_efficiency", "employeeEfficiency")
                        : fetchLineMetrics(range.startDate, range.endDate);
                sections.add(section("Employee Efficiency", "Values come from phm_health_scores.employee_efficiency. Missing values display as N/A.", "line", efficiencyRows));
            }
            case PM_COMPLIANCE_TREND -> {
                cards.add(card("Current PM Compliance", latestMetrics.get("pmCompliance"), "%", "Latest PM compliance metric inside the selected period.", "success"));
                List<Map<String, Object>> trendRows = fetchMetricTrend(scope, request.getLineId(), range.startDate, range.endDate, "pm_operational_compliance", "pmCompliance");
                sections.add(section("PM Compliance Trend", "Trend is filtered by evaluation_date between the selected start and end date.", "line", trendRows));
            }
            case ISSUE_FLAGS_REPLACEMENT -> {
                cards.add(card("Active Flags", flagSummary.get("activeFlags"), "", "Flags not closed at generation time.", "warning"));
                cards.add(card("Replacement Required", flagSummary.get("replacementRequired"), "", "Flags currently marked replacement required.", "danger"));
                cards.add(card("Completed Replacements", flagSummary.get("completedReplacements"), "", "Spare part replacements completed in the period.", "success"));
                sections.add(section("Criticality Distribution", "Flags are filtered by raised date and grouped by criticality.", "bar", fetchFlagCriticality(scope, request.getLineId(), range.startDate, range.endDate)));
                sections.add(section("Replacement Activity", "Replacement-required is based on flag status. Completed replacement rows use spare_part_replacements.replacement_dttm.", "bar", mapToRows(flagSummary, "metric", "value")));
                details = fetchFlagRows(scope, request.getLineId(), range.startDate, range.endDate);
                sections.add(section("Issue Flag Details", "Rows show flag, part, equipment, criticality, status and raised date.", "table", details));
            }
        }

        return ReportResponse.builder()
                .reportType(request.getReportType())
                .title(reportTitle(request.getReportType()))
                .subtitle("Maintenance Manager report for " + scopeLabel)
                .generatedAt(DateUtils.getNow())
                .startDate(range.startDate)
                .endDate(range.endDate)
                .periodLabel(range.label)
                .scope(scope)
                .lineId(request.getLineId())
                .scopeLabel(scopeLabel)
                .summaryCards(cards)
                .sections(sections)
                .detailedRows(details)
                .build();
    }

    private void validateRequest(ReportRequest request) {
        if (request == null) {
            throw new IllegalArgumentException("Report request is required.");
        }
        if (request.getReportType() == null) {
            throw new IllegalArgumentException("Please choose a report type.");
        }
        if (request.getPeriod() == null) {
            throw new IllegalArgumentException("Please choose a report period.");
        }
        if (request.getScope() == ReportScope.LINE && request.getLineId() == null) {
            throw new IllegalArgumentException("Please select a line for line-wise report scope.");
        }
    }

    private PeriodRange resolvePeriod(ReportRequest request) {
        LocalDate today = DateUtils.getToday();
        return switch (request.getPeriod()) {
            case LAST_30_DAYS -> new PeriodRange(today.minusDays(30), today, "Last 30 days (" + label(today.minusDays(30)) + " - " + label(today) + ")");
            case LAST_365_DAYS -> new PeriodRange(today.minusDays(365), today, "Last 365 days (" + label(today.minusDays(365)) + " - " + label(today) + ")");
            case QUARTERLY -> resolveQuarter(request.getQuarter(), today);
            case HALF_YEARLY -> resolveHalf(request.getHalf(), today);
            case CUSTOM -> resolveCustom(request.getCustomStartDate(), request.getCustomEndDate(), today);
        };
    }

    private PeriodRange resolveQuarter(Integer quarter, LocalDate today) {
        if (quarter == null || quarter < 1 || quarter > 4) {
            throw new IllegalArgumentException("Please choose Q1, Q2, Q3 or Q4.");
        }
        int startMonth = ((quarter - 1) * 3) + 1;
        LocalDate start = LocalDate.of(today.getYear(), startMonth, 1);
        LocalDate end = start.plusMonths(3).minusDays(1);
        validateFixedPeriodAvailable("Q" + quarter, end, today);
        return new PeriodRange(start, end, "Q" + quarter + " (" + label(start) + " - " + label(end) + ")");
    }

    private PeriodRange resolveHalf(Integer half, LocalDate today) {
        if (half == null || half < 1 || half > 2) {
            throw new IllegalArgumentException("Please choose H1 or H2.");
        }
        LocalDate start = LocalDate.of(today.getYear(), half == 1 ? Month.JANUARY : Month.JULY, 1);
        LocalDate end = half == 1 ? LocalDate.of(today.getYear(), Month.JUNE, 30) : LocalDate.of(today.getYear(), Month.DECEMBER, 31);
        validateFixedPeriodAvailable("H" + half, end, today);
        return new PeriodRange(start, end, "H" + half + " (" + label(start) + " - " + label(end) + ")");
    }

    private PeriodRange resolveCustom(LocalDate start, LocalDate end, LocalDate today) {
        if (start == null || end == null) {
            throw new IllegalArgumentException("Please enter both custom start date and end date.");
        }
        if (start.isAfter(end)) {
            throw new IllegalArgumentException("Start date must be on or before end date.");
        }
        if (end.isAfter(today)) {
            throw new IllegalArgumentException("End date cannot be after effective today (" + today + ").");
        }
        return new PeriodRange(start, end, "Custom (" + label(start) + " - " + label(end) + ")");
    }

    private void validateFixedPeriodAvailable(String periodName, LocalDate end, LocalDate today) {
        if (today.isBefore(end.minusDays(PERIOD_GRACE_DAYS))) {
            throw new IllegalArgumentException(periodName + " is not available yet. Reports open when the period is complete or within " + PERIOD_GRACE_DAYS + " days of completion.");
        }
    }

    private List<ReportOptionsResponse.LineOption> fetchLines() {
        return jdbcTemplate.query("""
                SELECT line_id, line_name, line_code
                FROM lines
                ORDER BY line_name
                """, Map.of(), (rs, rowNum) -> ReportOptionsResponse.LineOption.builder()
                .lineId(rs.getLong("line_id"))
                .lineName(rs.getString("line_name"))
                .lineCode(rs.getString("line_code"))
                .build());
    }

    private String resolveScopeLabel(ReportScope scope, Long lineId) {
        if (scope != ReportScope.LINE) {
            return "Entire Plant";
        }
        List<String> names = jdbcTemplate.queryForList("SELECT line_name FROM lines WHERE line_id = :lineId",
                new MapSqlParameterSource("lineId", lineId), String.class);
        return names.isEmpty() ? "Selected Line" : names.get(0);
    }

    private Map<String, Object> fetchLatestMetrics(ReportScope scope, Long lineId, LocalDate startDate, LocalDate endDate) {
        MapSqlParameterSource params = params(scope, lineId, startDate, endDate);
        String entityFilter = scope == ReportScope.LINE ? "hs.entity_type = 'LINE' AND hs.entity_id = :lineId" : "hs.entity_type = 'PLANT'";
        List<Map<String, Object>> rows = jdbcTemplate.queryForList("""
                SELECT
                    hs.pm_operational_compliance AS "pmCompliance",
                    hs.task_rejection_rate AS "rejectionRate",
                    CAST(NULLIF(REGEXP_REPLACE(hs.approval_turnaround_time, '[^0-9.]', '', 'g'), '') AS NUMERIC) AS "approvalTurnaroundHours",
                    hs.evidence_compliance_rate AS "evidenceCompliance",
                    hs.employee_efficiency AS "employeeEfficiency",
                    hs.pm_compliance_rate AS "phmCoverage"
                FROM phm_health_scores hs
                WHERE %s
                  AND hs.evaluation_date BETWEEN :startDate AND :endDate
                ORDER BY hs.evaluation_date DESC, hs.health_id DESC
                LIMIT 1
                """.formatted(entityFilter), params);
        return rows.isEmpty() ? new LinkedHashMap<>() : rows.get(0);
    }

    private Map<String, Object> fetchTaskStatus(ReportScope scope, Long lineId, LocalDate startDate, LocalDate endDate) {
        String lineFilter = scope == ReportScope.LINE ? " AND l.line_id = :lineId" : "";
        MapSqlParameterSource params = params(scope, lineId, startDate, endDate);
        List<Map<String, Object>> rows = jdbcTemplate.queryForList("""
                SELECT
                  SUM(CASE WHEN se.status IN ('ASSIGNED', 'IN_PROGRESS') THEN 1 ELSE 0 END) AS "inProgress",
                  SUM(CASE WHEN se.status IN ('UNDER_SUPERVISOR_REVIEW', 'UNDER_LINE_MANAGER_REVIEW', 'UNDER_MAINT_MANAGER_REVIEW') THEN 1 ELSE 0 END) AS "underReview",
                  SUM(CASE WHEN se.status = 'REJECTED' THEN 1 ELSE 0 END) AS "rejected",
                  SUM(CASE WHEN se.status IN ('APPROVED', 'COMPLETED', 'FLAGGED_AND_COMPLETED') THEN 1 ELSE 0 END) AS "approved",
                  SUM(CASE WHEN se.status IN ('ASSIGNED', 'IN_PROGRESS') AND CAST(se.due_date AS DATE) < :today THEN 1 ELSE 0 END) AS "overdue"
                FROM pm_schedule_execution se
                JOIN pm_task_schedules ts ON se.task_schedule_id = ts.task_schedule_id
                JOIN pm_std_tasks st ON ts.std_task_id = st.std_task_id
                LEFT JOIN equipment_element ee ON st.element_id = ee.element_id
                LEFT JOIN equipments eq ON ee.equipment_id = eq.equipment_id
                LEFT JOIN lines l ON eq.line_id = l.line_id
                WHERE CAST(se.due_date AS DATE) BETWEEN :startDate AND :endDate
                %s
                """.formatted(lineFilter), params.addValue("today", DateUtils.getToday()));
        Map<String, Object> status = new LinkedHashMap<>();
        status.put("approved", value(rows, "approved"));
        status.put("inProgress", value(rows, "inProgress"));
        status.put("underReview", value(rows, "underReview"));
        status.put("rejected", value(rows, "rejected"));
        status.put("overdue", value(rows, "overdue"));
        return status;
    }

    private Map<String, Object> fetchFlagSummary(ReportScope scope, Long lineId, LocalDate startDate, LocalDate endDate) {
        String lineFilter = scope == ReportScope.LINE ? " AND l.line_id = :lineId" : "";
        MapSqlParameterSource params = params(scope, lineId, startDate, endDate);
        Map<String, Object> summary = new LinkedHashMap<>();
        List<Map<String, Object>> flagRows = jdbcTemplate.queryForList("""
                SELECT
                  SUM(CASE WHEN f.flag_status != 'CLOSED' THEN 1 ELSE 0 END) AS "activeFlags",
                  SUM(CASE WHEN f.flag_status = 'REPLACEMENT_REQUIRED' THEN 1 ELSE 0 END) AS "replacementRequired",
                  COUNT(*) AS "flagsRaised"
                FROM issue_flags f
                JOIN pm_schedule_execution se ON f.schedule_execution_id = se.schedule_execution_id
                JOIN pm_task_schedules ts ON se.task_schedule_id = ts.task_schedule_id
                JOIN pm_std_tasks st ON ts.std_task_id = st.std_task_id
                LEFT JOIN equipment_element ee ON st.element_id = ee.element_id
                LEFT JOIN equipments eq ON ee.equipment_id = eq.equipment_id
                LEFT JOIN lines l ON eq.line_id = l.line_id
                WHERE CAST(f.raised_dttm AS DATE) BETWEEN :startDate AND :endDate
                %s
                """.formatted(lineFilter), params);
        List<Map<String, Object>> replacementRows = jdbcTemplate.queryForList("""
                SELECT COUNT(*) AS "completedReplacements"
                FROM spare_part_replacements r
                JOIN equipment_parts ep ON r.part_id = ep.part_id
                JOIN equipment_element ee ON ep.equipment_element_id = ee.element_id
                JOIN equipments eq ON ee.equipment_id = eq.equipment_id
                LEFT JOIN lines l ON eq.line_id = l.line_id
                WHERE CAST(r.replacement_dttm AS DATE) BETWEEN :startDate AND :endDate
                %s
                """.formatted(lineFilter), params);
        summary.put("activeFlags", value(flagRows, "activeFlags"));
        summary.put("replacementRequired", value(flagRows, "replacementRequired"));
        summary.put("flagsRaised", value(flagRows, "flagsRaised"));
        summary.put("completedReplacements", value(replacementRows, "completedReplacements"));
        return summary;
    }

    private List<Map<String, Object>> fetchLineMetrics(LocalDate startDate, LocalDate endDate) {
        return jdbcTemplate.queryForList("""
                SELECT
                    l.line_id AS "lineId",
                    l.line_name AS "lineName",
                    latest.health_score AS "healthScore",
                    latest.pm_operational_compliance AS "pmCompliance",
                    latest.task_rejection_rate AS "rejectionRate",
                    CAST(NULLIF(REGEXP_REPLACE(latest.approval_turnaround_time, '[^0-9.]', '', 'g'), '') AS NUMERIC) AS "approvalTurnaroundHours",
                    latest.evidence_compliance_rate AS "evidenceCompliance",
                    latest.employee_efficiency AS "employeeEfficiency",
                    COALESCE(flags.active_flags, 0) AS "activeFlags"
                FROM lines l
                LEFT JOIN LATERAL (
                    SELECT *
                    FROM phm_health_scores hs
                    WHERE hs.entity_type = 'LINE'
                      AND hs.entity_id = l.line_id
                      AND hs.evaluation_date BETWEEN :startDate AND :endDate
                    ORDER BY hs.evaluation_date DESC, hs.health_id DESC
                    LIMIT 1
                ) latest ON TRUE
                LEFT JOIN LATERAL (
                    SELECT COUNT(*) AS active_flags
                    FROM issue_flags f
                    JOIN pm_schedule_execution se ON f.schedule_execution_id = se.schedule_execution_id
                    JOIN pm_task_schedules ts ON se.task_schedule_id = ts.task_schedule_id
                    JOIN pm_std_tasks st ON ts.std_task_id = st.std_task_id
                    LEFT JOIN equipment_element ee ON st.element_id = ee.element_id
                    LEFT JOIN equipments eq ON ee.equipment_id = eq.equipment_id
                    WHERE eq.line_id = l.line_id
                      AND f.flag_status != 'CLOSED'
                      AND CAST(f.raised_dttm AS DATE) BETWEEN :startDate AND :endDate
                ) flags ON TRUE
                ORDER BY l.line_name
                """, new MapSqlParameterSource("startDate", startDate).addValue("endDate", endDate));
    }

    private List<Map<String, Object>> fetchMetricTrend(ReportScope scope, Long lineId, LocalDate startDate, LocalDate endDate, String column, String alias) {
        String entityFilter = scope == ReportScope.LINE ? "hs.entity_type = 'LINE' AND hs.entity_id = :lineId" : "hs.entity_type = 'PLANT'";
        return jdbcTemplate.queryForList("""
                SELECT hs.evaluation_date AS "evaluationDate", hs.%s AS "%s"
                FROM phm_health_scores hs
                WHERE %s
                  AND hs.evaluation_date BETWEEN :startDate AND :endDate
                ORDER BY hs.evaluation_date ASC
                """.formatted(column, alias, entityFilter), params(scope, lineId, startDate, endDate));
    }

    private List<Map<String, Object>> fetchTaskRows(ReportScope scope, Long lineId, LocalDate startDate, LocalDate endDate) {
        String lineFilter = scope == ReportScope.LINE ? " AND l.line_id = :lineId" : "";
        return jdbcTemplate.queryForList("""
                SELECT se.schedule_execution_id AS "scheduleExecutionId",
                       st.task_ref_no AS "taskRefNo",
                       st.method AS "taskName",
                       l.line_name AS "lineName",
                       eq.name AS "machineName",
                       ep.name AS "partName",
                       emp.full_name AS "employeeName",
                       se.status AS "status",
                       CAST(se.due_date AS DATE) AS "dueDate",
                       st.task_criticality AS "criticality",
                       CASE WHEN f.flag_status IS NOT NULL AND f.flag_status != 'CLOSED' THEN TRUE ELSE FALSE END AS "hasActiveFlag"
                FROM pm_schedule_execution se
                JOIN pm_task_schedules ts ON se.task_schedule_id = ts.task_schedule_id
                JOIN pm_std_tasks st ON ts.std_task_id = st.std_task_id
                LEFT JOIN employees emp ON se.employee_id = emp.employee_id
                LEFT JOIN equipment_element ee ON st.element_id = ee.element_id
                LEFT JOIN equipments eq ON ee.equipment_id = eq.equipment_id
                LEFT JOIN equipment_parts ep ON st.part_id = ep.part_id
                LEFT JOIN lines l ON eq.line_id = l.line_id
                LEFT JOIN issue_flags f ON se.schedule_execution_id = f.schedule_execution_id
                WHERE CAST(se.due_date AS DATE) BETWEEN :startDate AND :endDate
                %s
                ORDER BY se.due_date DESC
                LIMIT 200
                """.formatted(lineFilter), params(scope, lineId, startDate, endDate));
    }

    private List<Map<String, Object>> fetchFlagCriticality(ReportScope scope, Long lineId, LocalDate startDate, LocalDate endDate) {
        String lineFilter = scope == ReportScope.LINE ? " AND l.line_id = :lineId" : "";
        return jdbcTemplate.queryForList("""
                SELECT COALESCE(f.criticality, 'UNSPECIFIED') AS "criticality", COUNT(*) AS "count"
                FROM issue_flags f
                JOIN pm_schedule_execution se ON f.schedule_execution_id = se.schedule_execution_id
                JOIN pm_task_schedules ts ON se.task_schedule_id = ts.task_schedule_id
                JOIN pm_std_tasks st ON ts.std_task_id = st.std_task_id
                LEFT JOIN equipment_element ee ON st.element_id = ee.element_id
                LEFT JOIN equipments eq ON ee.equipment_id = eq.equipment_id
                LEFT JOIN lines l ON eq.line_id = l.line_id
                WHERE CAST(f.raised_dttm AS DATE) BETWEEN :startDate AND :endDate
                %s
                GROUP BY COALESCE(f.criticality, 'UNSPECIFIED')
                ORDER BY "count" DESC
                """.formatted(lineFilter), params(scope, lineId, startDate, endDate));
    }

    private List<Map<String, Object>> fetchFlagsByLine(LocalDate startDate, LocalDate endDate) {
        return jdbcTemplate.queryForList("""
                SELECT l.line_name AS "lineName",
                       COUNT(f.flag_id) AS "flagCount",
                       SUM(CASE WHEN f.flag_status = 'REPLACEMENT_REQUIRED' THEN 1 ELSE 0 END) AS "replacementRequired"
                FROM lines l
                LEFT JOIN equipments eq ON eq.line_id = l.line_id
                LEFT JOIN equipment_element ee ON ee.equipment_id = eq.equipment_id
                LEFT JOIN pm_std_tasks st ON st.element_id = ee.element_id
                LEFT JOIN pm_task_schedules ts ON ts.std_task_id = st.std_task_id
                LEFT JOIN pm_schedule_execution se ON se.task_schedule_id = ts.task_schedule_id
                LEFT JOIN issue_flags f ON f.schedule_execution_id = se.schedule_execution_id
                    AND CAST(f.raised_dttm AS DATE) BETWEEN :startDate AND :endDate
                GROUP BY l.line_name
                ORDER BY l.line_name
                """, new MapSqlParameterSource("startDate", startDate).addValue("endDate", endDate));
    }

    private List<Map<String, Object>> fetchFlagRows(ReportScope scope, Long lineId, LocalDate startDate, LocalDate endDate) {
        String lineFilter = scope == ReportScope.LINE ? " AND l.line_id = :lineId" : "";
        return jdbcTemplate.queryForList("""
                SELECT f.flag_id AS "flagId",
                       l.line_name AS "lineName",
                       eq.name AS "equipmentName",
                       ep.name AS "partName",
                       f.criticality AS "criticality",
                       f.flag_status AS "status",
                       CAST(f.raised_dttm AS DATE) AS "raisedDate",
                       CAST(f.due_date AS DATE) AS "dueDate",
                       att.full_name AS "attendantName"
                FROM issue_flags f
                JOIN pm_schedule_execution se ON f.schedule_execution_id = se.schedule_execution_id
                JOIN pm_task_schedules ts ON se.task_schedule_id = ts.task_schedule_id
                JOIN pm_std_tasks st ON ts.std_task_id = st.std_task_id
                LEFT JOIN equipment_parts ep ON st.part_id = ep.part_id
                LEFT JOIN equipment_element ee ON st.element_id = ee.element_id
                LEFT JOIN equipments eq ON ee.equipment_id = eq.equipment_id
                LEFT JOIN lines l ON eq.line_id = l.line_id
                LEFT JOIN employees att ON f.attendant_id = att.employee_id
                WHERE CAST(f.raised_dttm AS DATE) BETWEEN :startDate AND :endDate
                %s
                ORDER BY f.raised_dttm DESC
                LIMIT 200
                """.formatted(lineFilter), params(scope, lineId, startDate, endDate));
    }

    private MapSqlParameterSource params(ReportScope scope, Long lineId, LocalDate startDate, LocalDate endDate) {
        MapSqlParameterSource params = new MapSqlParameterSource()
                .addValue("startDate", startDate)
                .addValue("endDate", endDate);
        if (scope == ReportScope.LINE) {
            params.addValue("lineId", lineId);
        }
        return params;
    }

    private List<Map<String, Object>> mapToRows(Map<String, Object> map, String keyName, String valueName) {
        List<Map<String, Object>> rows = new ArrayList<>();
        map.forEach((key, value) -> rows.add(Map.of(keyName, displayLabel(key), valueName, value == null ? 0 : value)));
        return rows;
    }

    private String displayLabel(String key) {
        return switch (key) {
            case "inProgress" -> "In Progress";
            case "underReview" -> "Under Review";
            case "activeFlags" -> "Active Flags";
            case "replacementRequired" -> "Replacement Required";
            case "completedReplacements" -> "Completed Replacements";
            case "flagsRaised" -> "Flags Raised";
            case "pmCompliance" -> "PM Compliance";
            case "employeeEfficiency" -> "Employee Efficiency";
            case "evidenceCompliance" -> "Evidence Compliance";
            case "approvalTurnaroundHours" -> "Approval Turnaround";
            case "rejectionRate" -> "Rejection Rate";
            default -> key.replaceAll("([a-z])([A-Z])", "$1 $2");
        };
    }

    private ReportResponse.ReportSection section(String title, String description, String visualization, List<Map<String, Object>> data) {
        return ReportResponse.ReportSection.builder()
                .title(title)
                .description(description)
                .visualization(visualization)
                .data(data)
                .build();
    }

    private ReportResponse.SummaryCard card(String label, Object value, String unit, String description, String tone) {
        return ReportResponse.SummaryCard.builder()
                .label(label)
                .value(value)
                .unit(unit)
                .description(description)
                .tone(tone)
                .build();
    }

    private ReportOptionsResponse.Option option(String value, String label, String description) {
        return ReportOptionsResponse.Option.builder().value(value).label(label).description(description).build();
    }

    private String reportTitle(ReportType type) {
        return switch (type) {
            case OVERALL_MAINTENANCE_PERFORMANCE -> "Overall Maintenance Performance Report";
            case LINE_WISE_PERFORMANCE -> "Line-wise Performance Report";
            case TASK_STATUS -> "Task Status Report";
            case EMPLOYEE_EFFICIENCY -> "Employee Efficiency Report";
            case PM_COMPLIANCE_TREND -> "PM Compliance Trend Report";
            case ISSUE_FLAGS_REPLACEMENT -> "Issue Flags / Replacement Report";
        };
    }

    private Object value(List<Map<String, Object>> rows, String key) {
        if (rows == null || rows.isEmpty()) {
            return 0;
        }
        Object value = rows.get(0).get(key);
        return value == null ? 0 : value;
    }

    private Double average(List<Map<String, Object>> rows, String key) {
        List<Double> values = rows.stream()
                .map(row -> toDouble(row.get(key)))
                .filter(v -> v != null)
                .toList();
        if (values.isEmpty()) {
            return null;
        }
        double sum = values.stream().mapToDouble(Double::doubleValue).sum();
        return Math.round((sum / values.size()) * 10.0) / 10.0;
    }

    private Double toDouble(Object value) {
        if (value == null) {
            return null;
        }
        if (value instanceof Number number) {
            return number.doubleValue();
        }
        try {
            return Double.parseDouble(value.toString());
        } catch (NumberFormatException ignored) {
            return null;
        }
    }

    private String label(LocalDate date) {
        return date.format(DATE_LABEL);
    }

    private record PeriodRange(LocalDate startDate, LocalDate endDate, String label) {
    }
}
