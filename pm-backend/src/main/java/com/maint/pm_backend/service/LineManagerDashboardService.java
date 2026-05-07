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
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Collections;
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

        return response;
    }

    private LineManagerDashboardResponse.RollingWindowMetrics buildRollingWindowMetrics(int windowDays,
            Long employeeId) {
        String sql = """
                SELECT
                    AVG(t.health_score)                AS avg_health,
                    AVG(t.pm_compliance_rate)          AS avg_phm_coverage,
                    AVG(t.pm_operational_compliance)   AS avg_pm_compliance,
                    AVG(t.task_rejection_rate)         AS avg_rejection,
                    AVG(CAST(NULLIF(REGEXP_REPLACE(t.approval_turnaround_time, '[^0-9.]', '', 'g'), '') AS NUMERIC)) AS avg_turnaround,
                    AVG(t.evidence_compliance_rate)    AS avg_evidence,
                    AVG(t.employee_efficiency)         AS avg_employee_efficiency
                FROM (
                    SELECT
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
                WHERE t.rn = 1
                """;

        List<Map<String, Object>> rows = jdbcTemplate.queryForList(sql, Map.of(
                "windowDays", windowDays,
                "lineManagerId", employeeId));

        Map<String, Object> row = rows.isEmpty() ? Collections.emptyMap() : rows.get(0);

        return LineManagerDashboardResponse.RollingWindowMetrics.builder()
                .windowDays(windowDays)
                .lineHealth(toDouble(row.get("avg_health")))
                .phmCoverageRate(toDouble(row.get("avg_phm_coverage")))
                .pmComplianceRate(toDouble(row.get("avg_pm_compliance")))
                .taskRejectionRate(toDouble(row.get("avg_rejection")))
                .approvalTurnaroundTimeHours(toDouble(row.get("avg_turnaround")))
                .evidenceComplianceRate(toDouble(row.get("avg_evidence")))
                .employeeEfficiency(toDouble(row.get("avg_employee_efficiency")))
                .build();
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
}
