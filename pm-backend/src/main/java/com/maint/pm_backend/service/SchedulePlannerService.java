package com.maint.pm_backend.service;

import com.maint.pm_backend.dto.CreatePmScheduleRequest;
import com.maint.pm_backend.dto.LineElementDTO;
import com.maint.pm_backend.dto.LineEquipmentDTO;
import com.maint.pm_backend.dto.LinePartDTO;
import com.maint.pm_backend.dto.SchedulePlannerContextResponse;
import com.maint.pm_backend.dto.SchedulePlannerTaskResponse;
import com.maint.pm_backend.dto.UpdateScheduleAssignmentRequest;
import com.maint.pm_backend.entity.Employee;
import com.maint.pm_backend.entity.PmScheduleApproval;
import com.maint.pm_backend.entity.PmScheduleExecution;
import com.maint.pm_backend.entity.PmStdTask;
import com.maint.pm_backend.entity.PmTaskSchedule;
import com.maint.pm_backend.entity.enums.TaskApprovalStatus;
import com.maint.pm_backend.entity.enums.TaskExecutionStatus;
import com.maint.pm_backend.repository.EmployeeRepository;
import com.maint.pm_backend.repository.PmScheduleApprovalRepository;
import com.maint.pm_backend.repository.PmScheduleExecutionRepository;
import com.maint.pm_backend.repository.PmStdTaskRepository;
import com.maint.pm_backend.repository.PmTaskScheduleRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

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
import java.util.Objects;

@Service
@RequiredArgsConstructor
public class SchedulePlannerService {

    private static final long MAINTENANCE_MANAGER_ROLE_ID = 1L;
    private static final long LINE_MANAGER_ROLE_ID = 2L;
    private static final long SUPERVISOR_ROLE_ID = 3L;
    private static final long PLANT_ADMIN_ROLE_ID = 11L;
    private static final List<Long> ASSIGNABLE_ROLE_IDS = List.of(4L, 5L, 6L, 7L);

    private final EmployeeRepository employeeRepository;
    private final PmStdTaskRepository stdTaskRepository;
    private final PmTaskScheduleRepository taskScheduleRepository;
    private final PmScheduleExecutionRepository executionRepository;
    private final PmScheduleApprovalRepository approvalRepository;
    private final NamedParameterJdbcTemplate jdbcTemplate;

    public SchedulePlannerContextResponse getContext(Long actorId, Long lineId, String expertise) {
        Employee actor = getPlanner(actorId);
        List<SchedulePlannerContextResponse.LineOption> lines = fetchLines(actor);
        Long effectiveLineId = resolveEffectiveLineId(lines, lineId);

        return SchedulePlannerContextResponse.builder()
                .lines(lines)
                .equipments(fetchEquipmentHierarchy(actor, effectiveLineId))
                .assignableEmployees(fetchEmployees(actor, effectiveLineId, expertise, false))
                .supervisors(fetchEmployees(actor, effectiveLineId, expertise, true))
                .approvalWorkflows(fetchApprovalWorkflows())
                .spareParts(fetchSpareParts(actor))
                .build();
    }

    private Long resolveEffectiveLineId(List<SchedulePlannerContextResponse.LineOption> lines, Long requestedLineId) {
        if (requestedLineId != null && lines.stream().anyMatch(line -> line.getLineId().equals(requestedLineId))) {
            return requestedLineId;
        }
        if (lines.size() == 1) {
            return lines.get(0).getLineId();
        }
        return null;
    }

    @Transactional
    public SchedulePlannerTaskResponse createTask(Long actorId, CreatePmScheduleRequest request) {
        Employee actor = getPlanner(actorId);
        validateCreateRequest(request);

        TaskLocation location = resolveLocation(request.getElementId(), request.getPartId());
        validateLineScope(actor, location.lineId());
        updateSparePartMappingIfRequested(actor, location, request.getSparePartId());
        Employee assignee = validateAssignee(actor, location.lineId(), request.getAssigneeEmployeeId(), request.getAssigneeRoleId());
        Employee supervisor = validateSupervisor(actor, location.lineId(), request.getSupervisorId());
        long workflowId = request.getApprovalWorkflowId() != null ? request.getApprovalWorkflowId() : 1L;
        int workflowLevels = fetchWorkflowLevelCount(workflowId);

        PmStdTask stdTask = new PmStdTask();
        stdTask.setTaskRefNo(request.getTaskRefNo());
        stdTask.setElementId(request.getElementId());
        stdTask.setPartId(request.getPartId());
        stdTask.setTaskCriticality(request.getTaskCriticality());
        stdTask.setMaintenanceStrategy(request.getMaintenanceStrategy());
        stdTask.setMethod(request.getMethod());
        stdTask.setTools(request.getTools() != null ? request.getTools() : List.of());
        stdTask.setAssigneeRoleId(request.getAssigneeRoleId() != null ? request.getAssigneeRoleId() : assignee.getRoleId());
        stdTask.setEstimatedReqTime(request.getEstimatedReqTime());
        stdTask.setMode(request.getMode());
        stdTask.setFrequency(normalizeFrequency(request.getFrequency()));
        stdTask.setStandardValue(request.getStandardValue());
        stdTask.setToleranceMin(request.getToleranceMin());
        stdTask.setToleranceMax(request.getToleranceMax());
        stdTask.setUom(request.getUom());
        stdTask.setApprovalWorkflowId(workflowId);
        stdTask.setLastUpdatedBy(actor.getEmployeeId());
        stdTask = stdTaskRepository.save(stdTask);

        List<LocalDate> dueDates = buildDueDates(request.getStartDate(), request.getEndDate(), request.getOccurrences(), stdTask.getFrequency());
        PmTaskSchedule schedule = new PmTaskSchedule();
        schedule.setStdTask(stdTask);
        schedule.setLastScheduleDate(null);
        schedule.setNextScheduleDate(dueDates.get(0));
        schedule.setIsActive(true);
        schedule.setLastUpdatedBy(actor.getEmployeeId());
        schedule = taskScheduleRepository.save(schedule);

        List<PmScheduleExecution> executions = new ArrayList<>();
        for (LocalDate dueDate : dueDates) {
            PmScheduleExecution execution = new PmScheduleExecution();
            execution.setTaskSchedule(schedule);
            execution.setEmployee(assignee);
            execution.setAssignedDttm(LocalDateTime.now());
            execution.setDueDate(dueDate.atStartOfDay());
            execution.setStatus(TaskExecutionStatus.ASSIGNED);
            execution.setDeviationFlag(false);
            execution.setRescheduleFlag(false);
            execution.setEvidenceRejectedFlag(false);
            execution = executionRepository.save(execution);
            createApprovalRows(execution, workflowLevels, supervisor, actor, location.lineManagerId());
            executions.add(execution);
        }

        return buildResponse(stdTask, schedule, executions, location, assignee, supervisor);
    }

    public List<SchedulePlannerTaskResponse> listTasks(Long actorId, Long lineId, LocalDate fromDate, LocalDate toDate) {
        Employee actor = getPlanner(actorId);
        validateLineScope(actor, lineId);

        MapSqlParameterSource params = new MapSqlParameterSource()
                .addValue("actorId", actor.getEmployeeId(), java.sql.Types.BIGINT)
                .addValue("roleId", actor.getRoleId(), java.sql.Types.BIGINT)
                .addValue("plantId", actor.getPlantId(), java.sql.Types.BIGINT)
                .addValue("deptId", actor.getDeptId(), java.sql.Types.BIGINT)
                .addValue("lineId", lineId, java.sql.Types.BIGINT)
                .addValue("fromDate", fromDate, java.sql.Types.DATE)
                .addValue("toDate", toDate, java.sql.Types.DATE);

        String sql = """
                SELECT
                    st.std_task_id, ts.task_schedule_id, st.task_ref_no, st.method, st.frequency,
                    l.line_id, l.line_name, eq.equipment_id, eq.name AS equipment_name,
                    ee.element_id, ee.element_name, ep.part_id, ep.name AS part_name,
                    CASE WHEN COUNT(DISTINCT se.employee_id) = 1 THEN MIN(se.employee_id) ELSE NULL END AS employee_id,
                    CASE WHEN COUNT(DISTINCT se.employee_id) = 1 THEN MIN(emp.full_name) ELSE 'Multiple operators' END AS employee_name,
                    MIN(sup.employee_id) AS supervisor_id, MIN(sup.full_name) AS supervisor_name,
                    st.approval_workflow_id,
                    COUNT(se.schedule_execution_id) AS execution_count,
                    MIN(CAST(se.due_date AS DATE)) AS first_due_date,
                    MAX(CAST(se.due_date AS DATE)) AS last_due_date
                FROM pm_std_tasks st
                JOIN pm_task_schedules ts ON ts.std_task_id = st.std_task_id
                JOIN pm_schedule_execution se ON se.task_schedule_id = ts.task_schedule_id
                LEFT JOIN employees emp ON emp.employee_id = se.employee_id
                LEFT JOIN pm_schedule_approval psa ON psa.schedule_execution_id = se.schedule_execution_id AND psa.approval_level = 1
                LEFT JOIN employees sup ON sup.employee_id = psa.approver_id
                JOIN equipment_element ee ON ee.element_id = st.element_id
                JOIN equipments eq ON eq.equipment_id = ee.equipment_id
                JOIN lines l ON l.line_id = eq.line_id
                LEFT JOIN equipment_parts ep ON ep.part_id = st.part_id
                WHERE (:lineId IS NULL OR l.line_id = :lineId)
                  AND (:fromDate IS NULL OR CAST(se.due_date AS DATE) >= :fromDate)
                  AND (:toDate IS NULL OR CAST(se.due_date AS DATE) <= :toDate)
                  AND (
                    (:roleId = 2 AND (l.line_manager_id = :actorId OR (l.plant_id = :plantId AND l.dept_id = :deptId)))
                    OR (:roleId IN (1, 11) AND (:plantId IS NULL OR l.plant_id = :plantId))
                  )
                GROUP BY st.std_task_id, ts.task_schedule_id, st.task_ref_no, st.method, st.frequency,
                         l.line_id, l.line_name, eq.equipment_id, eq.name, ee.element_id, ee.element_name,
                         ep.part_id, ep.name, st.approval_workflow_id
                ORDER BY MAX(ts.created_at) DESC NULLS LAST, st.std_task_id DESC, first_due_date DESC
                """;

        return jdbcTemplate.query(sql, params, (rs, rowNum) -> {
            Long taskScheduleId = rs.getLong("task_schedule_id");
            return SchedulePlannerTaskResponse.builder()
                .stdTaskId(rs.getLong("std_task_id"))
                .taskScheduleId(taskScheduleId)
                .taskRefNo(rs.getString("task_ref_no"))
                .taskName(rs.getString("method"))
                .frequency(rs.getString("frequency"))
                .lineId(rs.getLong("line_id"))
                .lineName(rs.getString("line_name"))
                .equipmentId(rs.getLong("equipment_id"))
                .equipmentName(rs.getString("equipment_name"))
                .elementId(rs.getLong("element_id"))
                .elementName(rs.getString("element_name"))
                .partId(getNullableLong(rs, "part_id"))
                .partName(rs.getString("part_name"))
                .assigneeEmployeeId(getNullableLong(rs, "employee_id"))
                .assigneeName(rs.getString("employee_name"))
                .supervisorId(getNullableLong(rs, "supervisor_id"))
                .supervisorName(rs.getString("supervisor_name"))
                .approvalWorkflowId(getNullableLong(rs, "approval_workflow_id"))
                .executionCount(rs.getInt("execution_count"))
                .firstDueDate(toLocalDate(rs.getDate("first_due_date")))
                .lastDueDate(toLocalDate(rs.getDate("last_due_date")))
                .executions(fetchExecutionSummaries(taskScheduleId))
                .build();
        });
    }

    @Transactional
    public SchedulePlannerTaskResponse updateAssignment(Long actorId, Long taskScheduleId, UpdateScheduleAssignmentRequest request) {
        Employee actor = getPlanner(actorId);
        List<PmScheduleExecution> executions = executionRepository.findByTaskSchedule_TaskScheduleId(taskScheduleId).stream()
                .filter(execution -> execution.getStatus() == TaskExecutionStatus.ASSIGNED || execution.getStatus() == TaskExecutionStatus.IN_PROGRESS)
                .toList();
        if (executions.isEmpty()) {
            throw new RuntimeException("No editable assigned executions found for schedule: " + taskScheduleId);
        }

        PmStdTask stdTask = executions.get(0).getTaskSchedule().getStdTask();
        TaskLocation location = resolveLocation(stdTask.getElementId(), stdTask.getPartId());
        validateLineScope(actor, location.lineId());

        Employee assignee = request.getAssigneeEmployeeId() != null
                ? validateAssignee(actor, location.lineId(), request.getAssigneeEmployeeId(), stdTask.getAssigneeRoleId())
                : executions.get(0).getEmployee();
        Employee supervisor = request.getSupervisorId() != null
                ? validateSupervisor(actor, location.lineId(), request.getSupervisorId())
                : findLevelOneSupervisorOrNull(executions.get(0));

        for (PmScheduleExecution execution : executions) {
            execution.setEmployee(assignee);
            executionRepository.save(execution);
            PmScheduleApproval levelOne = approvalRepository
                    .findByScheduleExecution_ScheduleExecutionIdAndApprovalLevel(execution.getScheduleExecutionId(), 1)
                    .orElseThrow(() -> new RuntimeException("Missing supervisor approval row for execution: " + execution.getScheduleExecutionId()));
            levelOne.setApprover(supervisor);
            approvalRepository.save(levelOne);
        }

        return buildResponse(stdTask, executions.get(0).getTaskSchedule(), executions, location, assignee, supervisor);
    }

    @Transactional
    public SchedulePlannerTaskResponse updateExecutionAssignment(Long actorId, Long scheduleExecutionId, UpdateScheduleAssignmentRequest request) {
        if (request.getAssigneeEmployeeId() == null) {
            throw new RuntimeException("assigneeEmployeeId is required");
        }

        Employee actor = getPlanner(actorId);
        PmScheduleExecution execution = executionRepository.findById(scheduleExecutionId)
                .orElseThrow(() -> new RuntimeException("Schedule execution not found: " + scheduleExecutionId));

        if (execution.getStatus() != TaskExecutionStatus.ASSIGNED && execution.getStatus() != TaskExecutionStatus.IN_PROGRESS) {
            throw new RuntimeException("Only assigned or in-progress schedules can be reassigned");
        }

        PmStdTask stdTask = execution.getTaskSchedule().getStdTask();
        TaskLocation location = resolveLocation(stdTask.getElementId(), stdTask.getPartId());
        validateLineScope(actor, location.lineId());

        Employee assignee = validateAssignee(actor, location.lineId(), request.getAssigneeEmployeeId(), null);
        Employee supervisor = request.getSupervisorId() != null
                ? validateSupervisor(actor, location.lineId(), request.getSupervisorId())
                : findLevelOneSupervisorOrNull(execution);

        execution.setEmployee(assignee);
        executionRepository.save(execution);

        if (request.getSupervisorId() != null) {
            PmScheduleApproval levelOne = approvalRepository
                    .findByScheduleExecution_ScheduleExecutionIdAndApprovalLevel(execution.getScheduleExecutionId(), 1)
                    .orElseThrow(() -> new RuntimeException("Missing supervisor approval row for execution: " + execution.getScheduleExecutionId()));
            levelOne.setApprover(supervisor);
            approvalRepository.save(levelOne);
        }

        List<PmScheduleExecution> executions = executionRepository.findByTaskSchedule_TaskScheduleId(
                execution.getTaskSchedule().getTaskScheduleId());
        return buildResponse(stdTask, execution.getTaskSchedule(), executions, location, assignee, supervisor);
    }

    private void createApprovalRows(PmScheduleExecution execution, int workflowLevels, Employee supervisor, Employee actor, Long lineManagerId) {
        for (int level = 1; level <= workflowLevels; level++) {
            Employee approver = switch (level) {
                case 1 -> supervisor;
                case 2 -> employeeRepository.findById(lineManagerId)
                        .orElseThrow(() -> new RuntimeException("Line manager not found for line"));
                case 3 -> resolveMaintenanceManager(actor);
                default -> null;
            };
            if (approver == null) continue;

            PmScheduleApproval approval = new PmScheduleApproval();
            approval.setScheduleExecution(execution);
            approval.setApprovalLevel(level);
            approval.setApprover(approver);
            approval.setApprovalStatus(TaskApprovalStatus.PENDING);
            approvalRepository.save(approval);
        }
    }

    private Employee getPlanner(Long actorId) {
        Employee actor = employeeRepository.findById(actorId)
                .orElseThrow(() -> new RuntimeException("Logged in user not found"));
        if (actor.getRoleId() == null ||
                (actor.getRoleId() != MAINTENANCE_MANAGER_ROLE_ID &&
                 actor.getRoleId() != LINE_MANAGER_ROLE_ID &&
                 actor.getRoleId() != PLANT_ADMIN_ROLE_ID)) {
            throw new RuntimeException("Access denied: only maintenance managers and line managers can use schedule planner");
        }
        return actor;
    }

    private void validateLineScope(Employee actor, Long lineId) {
        if (lineId == null) return;
        if (actor.getRoleId() != null &&
                (actor.getRoleId() == MAINTENANCE_MANAGER_ROLE_ID || actor.getRoleId() == PLANT_ADMIN_ROLE_ID)) {
            Integer exists = jdbcTemplate.queryForObject("""
                    SELECT COUNT(*) FROM lines
                    WHERE line_id = :lineId
                    """, new MapSqlParameterSource("lineId", lineId), Integer.class);
            if (exists != null && exists > 0) {
                return;
            }
        }
        Integer count = jdbcTemplate.queryForObject("""
                SELECT COUNT(*) FROM lines
                WHERE line_id = :lineId
                  AND (
                    (:roleId = 2 AND (line_manager_id = :actorId OR (plant_id = :plantId AND dept_id = :deptId)))
                    OR (:roleId IN (1, 11) AND (:plantId IS NULL OR plant_id = :plantId))
                  )
                """, new MapSqlParameterSource()
                .addValue("lineId", lineId, java.sql.Types.BIGINT)
                .addValue("roleId", actor.getRoleId(), java.sql.Types.BIGINT)
                .addValue("actorId", actor.getEmployeeId(), java.sql.Types.BIGINT)
                .addValue("deptId", actor.getDeptId(), java.sql.Types.BIGINT)
                .addValue("plantId", actor.getPlantId(), java.sql.Types.BIGINT), Integer.class);
        if (count == null || count == 0) {
            throw new RuntimeException("Access denied: line is outside your planner scope");
        }
    }

    private void validateCreateRequest(CreatePmScheduleRequest request) {
        if (request.getElementId() == null) throw new RuntimeException("elementId is required");
        if (request.getAssigneeEmployeeId() == null) throw new RuntimeException("assigneeEmployeeId is required");
        if (request.getSupervisorId() == null) throw new RuntimeException("supervisorId is required");
        if (request.getMethod() == null || request.getMethod().isBlank()) throw new RuntimeException("method is required");
        if (request.getFrequency() == null || request.getFrequency().isBlank()) throw new RuntimeException("frequency is required");
        if (request.getStartDate() == null) throw new RuntimeException("startDate is required");
        if (request.getEndDate() == null && request.getOccurrences() == null) {
            throw new RuntimeException("Either endDate or occurrences is required");
        }
    }

    private Employee validateAssignee(Employee actor, Long lineId, Long assigneeId, Long roleId) {
        Employee assignee = employeeRepository.findById(assigneeId)
                .orElseThrow(() -> new RuntimeException("Assignee not found"));
        if (assignee.getActive() != null && !assignee.getActive()) {
            throw new RuntimeException("Assignee is inactive");
        }
        if (assignee.getPlantId() == null || !assignee.getPlantId().equals(actor.getPlantId())) {
            throw new RuntimeException("Assignee is outside your plant");
        }
        if (roleId != null && !roleId.equals(assignee.getRoleId())) {
            throw new RuntimeException("Assignee role does not match the task role");
        }
        if (roleId == null && !ASSIGNABLE_ROLE_IDS.contains(assignee.getRoleId())) {
            throw new RuntimeException("Assignee must be an operator or technician role");
        }
        validateLineScope(actor, lineId);
        return assignee;
    }

    private Employee validateSupervisor(Employee actor, Long lineId, Long supervisorId) {
        Employee supervisor = employeeRepository.findById(supervisorId)
                .orElseThrow(() -> new RuntimeException("Supervisor not found"));
        if (supervisor.getRoleId() == null || supervisor.getRoleId() != SUPERVISOR_ROLE_ID) {
            throw new RuntimeException("Supervisor must have supervisor role");
        }
        if (supervisor.getActive() != null && !supervisor.getActive()) {
            throw new RuntimeException("Supervisor is inactive");
        }
        if (supervisor.getPlantId() == null || !supervisor.getPlantId().equals(actor.getPlantId())) {
            throw new RuntimeException("Supervisor is outside your plant");
        }
        Integer count = jdbcTemplate.queryForObject("""
                SELECT COUNT(*) FROM lines
                WHERE line_id = :lineId
                  AND (supervisor_user_id = :supervisorId OR dept_id = :deptId)
                """, new MapSqlParameterSource()
                .addValue("lineId", lineId)
                .addValue("supervisorId", supervisorId)
                .addValue("deptId", supervisor.getDeptId()), Integer.class);
        if (count == null || count == 0) {
            throw new RuntimeException("Supervisor is not associated with this line or domain");
        }
        return supervisor;
    }

    private List<LocalDate> buildDueDates(LocalDate startDate, LocalDate endDate, Integer occurrences, String frequency) {
        List<LocalDate> dueDates = new ArrayList<>();
        LocalDate cursor = startDate;
        int max = occurrences != null ? occurrences : 370;
        while (dueDates.size() < max && (endDate == null || !cursor.isAfter(endDate))) {
            dueDates.add(cursor);
            cursor = switch (frequency) {
                case "DAILY" -> cursor.plusDays(1);
                case "WEEKLY" -> cursor.plusWeeks(1);
                case "MONTHLY" -> cursor.plusMonths(1);
                default -> throw new RuntimeException("Unsupported frequency: " + frequency);
            };
        }
        if (dueDates.isEmpty()) throw new RuntimeException("No schedule dates generated");
        return dueDates;
    }

    private String normalizeFrequency(String frequency) {
        String normalized = frequency.trim().toUpperCase();
        if (!List.of("DAILY", "WEEKLY", "MONTHLY").contains(normalized)) {
            throw new RuntimeException("frequency must be DAILY, WEEKLY, or MONTHLY");
        }
        return normalized;
    }

    private int fetchWorkflowLevelCount(Long workflowId) {
        Integer count = jdbcTemplate.queryForObject(
                "SELECT jsonb_array_length(levels) FROM pm_approval_workflow WHERE workflow_id = :workflowId",
                new MapSqlParameterSource("workflowId", workflowId),
                Integer.class);
        if (count == null || count < 1) throw new RuntimeException("Approval workflow not found");
        return count;
    }

    private Employee resolveMaintenanceManager(Employee actor) {
        if (actor.getRoleId() != null && actor.getRoleId() == MAINTENANCE_MANAGER_ROLE_ID) {
            return actor;
        }
        List<Employee> managers = employeeRepository.findAll().stream()
                .filter(employee -> employee.getRoleId() != null && employee.getRoleId() == MAINTENANCE_MANAGER_ROLE_ID)
                .filter(employee -> Objects.equals(employee.getPlantId(), actor.getPlantId()))
                .toList();
        if (managers.isEmpty()) {
            throw new RuntimeException("No maintenance manager found for plant");
        }
        return managers.get(0);
    }

    private Employee findLevelOneSupervisorOrNull(PmScheduleExecution execution) {
        return approvalRepository
                .findByScheduleExecution_ScheduleExecutionIdAndApprovalLevel(execution.getScheduleExecutionId(), 1)
                .map(PmScheduleApproval::getApprover)
                .orElse(null);
    }

    private TaskLocation resolveLocation(Long elementId, Long partId) {
        List<TaskLocation> locations = jdbcTemplate.query("""
                SELECT l.line_id, l.line_name, l.line_manager_id, eq.equipment_id, eq.name AS equipment_name,
                       ee.element_id, ee.element_name, ep.part_id, ep.name AS part_name
                FROM equipment_element ee
                JOIN equipments eq ON eq.equipment_id = ee.equipment_id
                JOIN lines l ON l.line_id = eq.line_id
                LEFT JOIN equipment_parts ep ON ep.equipment_element_id = ee.element_id
                    AND (:partId IS NULL OR ep.part_id = :partId)
                WHERE ee.element_id = :elementId
                  AND (:partId IS NULL OR ep.part_id = :partId)
                """, new MapSqlParameterSource()
                .addValue("elementId", elementId, java.sql.Types.BIGINT)
                .addValue("partId", partId, java.sql.Types.BIGINT), (rs, rowNum) -> new TaskLocation(
                rs.getLong("line_id"),
                rs.getString("line_name"),
                getNullableLong(rs, "line_manager_id"),
                rs.getLong("equipment_id"),
                rs.getString("equipment_name"),
                rs.getLong("element_id"),
                rs.getString("element_name"),
                getNullableLong(rs, "part_id"),
                rs.getString("part_name")));
        if (locations.isEmpty()) {
            throw new RuntimeException("Element or part not found");
        }
        TaskLocation location = locations.get(0);
        if (location.lineManagerId() == null) {
            throw new RuntimeException("Selected line does not have a line manager");
        }
        return location;
    }

    private void updateSparePartMappingIfRequested(Employee actor, TaskLocation location, Long sparePartId) {
        if (sparePartId == null) return;
        if (location.partId() == null) {
            throw new RuntimeException("partId is required when sparePartId is provided");
        }

        Integer count = jdbcTemplate.queryForObject("""
                SELECT COUNT(*) FROM spare_parts
                WHERE id = :sparePartId
                  AND plant_id = :plantId
                """, new MapSqlParameterSource()
                .addValue("sparePartId", sparePartId)
                .addValue("plantId", actor.getPlantId()), Integer.class);
        if (count == null || count == 0) {
            throw new RuntimeException("Spare part not found for your plant");
        }

        jdbcTemplate.update("""
                UPDATE equipment_parts
                SET spare_part_id = :sparePartId
                WHERE part_id = :partId
                """, new MapSqlParameterSource()
                .addValue("sparePartId", sparePartId)
                .addValue("partId", location.partId()));
    }

    private List<SchedulePlannerContextResponse.LineOption> fetchLines(Employee actor) {
        MapSqlParameterSource params = new MapSqlParameterSource()
                .addValue("roleId", actor.getRoleId(), java.sql.Types.BIGINT)
                .addValue("actorId", actor.getEmployeeId(), java.sql.Types.BIGINT)
                .addValue("deptId", actor.getDeptId(), java.sql.Types.BIGINT)
                .addValue("plantId", actor.getPlantId(), java.sql.Types.BIGINT);

        List<SchedulePlannerContextResponse.LineOption> scopedLines = jdbcTemplate.query("""
                SELECT line_id, line_name, line_code, block, zone
                FROM lines
                WHERE (:roleId = 2 AND (line_manager_id = :actorId OR (plant_id = :plantId AND dept_id = :deptId)))
                   OR (:roleId IN (1, 11) AND (:plantId IS NULL OR plant_id = :plantId))
                ORDER BY line_name
                """, params, this::mapLineOption);

        if (!scopedLines.isEmpty()) {
            return scopedLines;
        }

        if (actor.getRoleId() != null && actor.getRoleId() == LINE_MANAGER_ROLE_ID && actor.getPlantId() != null) {
            List<SchedulePlannerContextResponse.LineOption> plantLines = jdbcTemplate.query("""
                    SELECT line_id, line_name, line_code, block, zone
                    FROM lines
                    WHERE plant_id = :plantId
                    ORDER BY line_name
                    """, params, this::mapLineOption);
            if (!plantLines.isEmpty()) {
                return plantLines;
            }
        }

        if (actor.getRoleId() != null &&
                (actor.getRoleId() == MAINTENANCE_MANAGER_ROLE_ID || actor.getRoleId() == PLANT_ADMIN_ROLE_ID)) {
            return jdbcTemplate.query("""
                    SELECT line_id, line_name, line_code, block, zone
                    FROM lines
                    ORDER BY line_name
                    """, Map.of(), this::mapLineOption);
        }

        return scopedLines;
    }

    private SchedulePlannerContextResponse.LineOption mapLineOption(java.sql.ResultSet rs, int rowNum) throws java.sql.SQLException {
        return SchedulePlannerContextResponse.LineOption.builder()
                .lineId(rs.getLong("line_id"))
                .lineName(rs.getString("line_name"))
                .lineCode(rs.getString("line_code"))
                .block(rs.getString("block"))
                .zone(rs.getString("zone"))
                .build();
    }

    private List<LineEquipmentDTO> fetchEquipmentHierarchy(Employee actor, Long lineId) {
        MapSqlParameterSource params = new MapSqlParameterSource()
                .addValue("roleId", actor.getRoleId(), java.sql.Types.BIGINT)
                .addValue("actorId", actor.getEmployeeId(), java.sql.Types.BIGINT)
                .addValue("plantId", actor.getPlantId(), java.sql.Types.BIGINT)
                .addValue("deptId", actor.getDeptId(), java.sql.Types.BIGINT)
                .addValue("lineId", lineId, java.sql.Types.BIGINT);
        List<Map<String, Object>> rows = jdbcTemplate.queryForList("""
                SELECT eq.equipment_id, eq.name AS equipment_name, ee.element_id, ee.element_name,
                       ep.part_id, ep.name AS part_name, sp.id AS spare_part_id, sp.name AS spare_part_name
                FROM equipments eq
                JOIN lines l ON l.line_id = eq.line_id
                LEFT JOIN equipment_element ee ON ee.equipment_id = eq.equipment_id
                LEFT JOIN equipment_parts ep ON ep.equipment_element_id = ee.element_id
                LEFT JOIN spare_parts sp ON sp.id = ep.spare_part_id
                WHERE (:lineId IS NULL OR l.line_id = :lineId)
                  AND (
                    (:roleId = 2 AND (l.line_manager_id = :actorId OR (l.plant_id = :plantId AND l.dept_id = :deptId)))
                    OR (:roleId IN (1, 11) AND (:plantId IS NULL OR l.plant_id = :plantId))
                  )
                ORDER BY eq.name, ee.element_name, ep.name
                """, params);
        Map<Long, LineEquipmentDTO> equipmentMap = new LinkedHashMap<>();
        for (Map<String, Object> row : rows) {
            Long equipmentId = toLong(row.get("equipment_id"));
            if (equipmentId == null) continue;
            LineEquipmentDTO equipment = equipmentMap.computeIfAbsent(equipmentId, id -> {
                LineEquipmentDTO dto = new LineEquipmentDTO();
                dto.setEquipmentId(id);
                dto.setEquipmentName((String) row.get("equipment_name"));
                dto.setElements(new ArrayList<>());
                return dto;
            });
            Long elementId = toLong(row.get("element_id"));
            if (elementId == null) continue;
            LineElementDTO element = equipment.getElements().stream()
                    .filter(item -> item.getElementId().equals(elementId))
                    .findFirst()
                    .orElseGet(() -> {
                        LineElementDTO dto = new LineElementDTO();
                        dto.setElementId(elementId);
                        dto.setElementName((String) row.get("element_name"));
                        dto.setParts(new ArrayList<>());
                        equipment.getElements().add(dto);
                        return dto;
                    });
            Long partId = toLong(row.get("part_id"));
            if (partId != null && element.getParts().stream().noneMatch(part -> part.getPartId().equals(partId))) {
                LinePartDTO part = new LinePartDTO();
                part.setPartId(partId);
                part.setPartName((String) row.get("part_name"));
                part.setSparePartId(toLong(row.get("spare_part_id")));
                part.setSparePartName((String) row.get("spare_part_name"));
                element.getParts().add(part);
            }
        }
        return new ArrayList<>(equipmentMap.values());
    }

    private List<SchedulePlannerContextResponse.EmployeeOption> fetchEmployees(Employee actor, Long lineId, String expertise, boolean supervisors) {
        String expertiseFilter = expertise == null || expertise.isBlank() ? null : "%" + expertise.trim().toLowerCase() + "%";
        return jdbcTemplate.query("""
                SELECT e.employee_id, e.full_name, e.role_id, r.name AS role_name, e.expertise,
                       e.performance_score, e.availability_score,
                       CASE
                         WHEN :lineId IS NOT NULL AND l.supervisor_user_id = e.employee_id THEN TRUE
                         WHEN :expertise IS NOT NULL AND LOWER(COALESCE(e.expertise, '')) LIKE :expertise THEN TRUE
                         ELSE FALSE
                       END AS primary_match
                FROM employees e
                JOIN roles r ON r.role_id = e.role_id
                LEFT JOIN lines l ON l.line_id = :lineId
                WHERE COALESCE(e.active, TRUE) = TRUE
                  AND (:plantId IS NULL OR e.plant_id = :plantId)
                  AND ((:supervisors = TRUE AND e.role_id = 3)
                    OR (:supervisors = FALSE AND e.role_id IN (4, 5, 6, 7)))
                ORDER BY primary_match DESC, e.availability_score DESC NULLS LAST, e.performance_score DESC NULLS LAST, e.full_name
                """, new MapSqlParameterSource()
                .addValue("lineId", lineId, java.sql.Types.BIGINT)
                .addValue("plantId", actor.getPlantId(), java.sql.Types.BIGINT)
                .addValue("expertise", expertiseFilter, java.sql.Types.VARCHAR)
                .addValue("supervisors", supervisors, java.sql.Types.BOOLEAN), (rs, rowNum) -> SchedulePlannerContextResponse.EmployeeOption.builder()
                .employeeId(rs.getLong("employee_id"))
                .fullName(rs.getString("full_name"))
                .roleId(rs.getLong("role_id"))
                .roleName(rs.getString("role_name"))
                .expertise(rs.getString("expertise"))
                .performanceScore(rs.getBigDecimal("performance_score"))
                .availabilityScore(rs.getBigDecimal("availability_score"))
                .primaryMatch(rs.getBoolean("primary_match"))
                .build());
    }

    private List<SchedulePlannerContextResponse.ApprovalWorkflowOption> fetchApprovalWorkflows() {
        return jdbcTemplate.query("""
                SELECT workflow_id, workflow_name, description
                FROM pm_approval_workflow
                ORDER BY workflow_id
                """, Map.of(), (rs, rowNum) -> SchedulePlannerContextResponse.ApprovalWorkflowOption.builder()
                .workflowId(rs.getLong("workflow_id"))
                .workflowName(rs.getString("workflow_name"))
                .description(rs.getString("description"))
                .build());
    }

    private List<SchedulePlannerContextResponse.SparePartOption> fetchSpareParts(Employee actor) {
        return jdbcTemplate.query("""
                SELECT id, part_number, name, category, current_stock
                FROM spare_parts
                WHERE (:plantId IS NULL OR plant_id = :plantId)
                ORDER BY name
                """, new MapSqlParameterSource().addValue("plantId", actor.getPlantId(), java.sql.Types.BIGINT), (rs, rowNum) -> SchedulePlannerContextResponse.SparePartOption.builder()
                .sparePartId(rs.getLong("id"))
                .partNumber(rs.getString("part_number"))
                .name(rs.getString("name"))
                .category(rs.getString("category"))
                .currentStock(rs.getObject("current_stock", Integer.class))
                .build());
    }

    private SchedulePlannerTaskResponse buildResponse(PmStdTask stdTask, PmTaskSchedule schedule, List<PmScheduleExecution> executions,
                                                      TaskLocation location, Employee assignee, Employee supervisor) {
        List<SchedulePlannerTaskResponse.ExecutionSummary> executionSummaries = executions.stream()
                .map(execution -> SchedulePlannerTaskResponse.ExecutionSummary.builder()
                        .scheduleExecutionId(execution.getScheduleExecutionId())
                        .dueDate(execution.getDueDate())
                        .status(execution.getStatus().name())
                        .assigneeEmployeeId(execution.getEmployee() != null ? execution.getEmployee().getEmployeeId() : null)
                        .assigneeName(execution.getEmployee() != null ? execution.getEmployee().getFullName() : null)
                        .build())
                .toList();
        return SchedulePlannerTaskResponse.builder()
                .stdTaskId(stdTask.getStdTaskId())
                .taskScheduleId(schedule.getTaskScheduleId())
                .taskRefNo(stdTask.getTaskRefNo())
                .taskName(stdTask.getMethod())
                .frequency(stdTask.getFrequency())
                .lineId(location.lineId())
                .lineName(location.lineName())
                .equipmentId(location.equipmentId())
                .equipmentName(location.equipmentName())
                .elementId(location.elementId())
                .elementName(location.elementName())
                .partId(location.partId())
                .partName(location.partName())
                .assigneeEmployeeId(assignee.getEmployeeId())
                .assigneeName(assignee.getFullName())
                .supervisorId(supervisor != null ? supervisor.getEmployeeId() : null)
                .supervisorName(supervisor != null ? supervisor.getFullName() : null)
                .approvalWorkflowId(stdTask.getApprovalWorkflowId())
                .executionCount(executions.size())
                .firstDueDate(executions.stream().map(PmScheduleExecution::getDueDate).map(LocalDateTime::toLocalDate).min(LocalDate::compareTo).orElse(null))
                .lastDueDate(executions.stream().map(PmScheduleExecution::getDueDate).map(LocalDateTime::toLocalDate).max(LocalDate::compareTo).orElse(null))
                .executions(executionSummaries)
                .build();
    }

    private List<SchedulePlannerTaskResponse.ExecutionSummary> fetchExecutionSummaries(Long taskScheduleId) {
        String sql = """
                SELECT
                    se.schedule_execution_id,
                    se.due_date,
                    se.status,
                    emp.employee_id,
                    emp.full_name AS employee_name
                FROM pm_schedule_execution se
                LEFT JOIN employees emp ON emp.employee_id = se.employee_id
                WHERE se.task_schedule_id = :taskScheduleId
                ORDER BY se.due_date ASC, se.schedule_execution_id ASC
                """;

        return jdbcTemplate.query(sql, new MapSqlParameterSource("taskScheduleId", taskScheduleId), (rs, rowNum) ->
                SchedulePlannerTaskResponse.ExecutionSummary.builder()
                        .scheduleExecutionId(rs.getLong("schedule_execution_id"))
                        .dueDate(toLocalDateTime(rs.getTimestamp("due_date")))
                        .status(rs.getString("status"))
                        .assigneeEmployeeId(getNullableLong(rs, "employee_id"))
                        .assigneeName(rs.getString("employee_name"))
                        .build()
        );
    }

    private Long getNullableLong(ResultSet rs, String column) throws SQLException {
        long value = rs.getLong(column);
        return rs.wasNull() ? null : value;
    }

    private Long toLong(Object value) {
        if (value == null) return null;
        if (value instanceof Number number) return number.longValue();
        return Long.parseLong(value.toString());
    }

    private LocalDate toLocalDate(Date date) {
        return date == null ? null : date.toLocalDate();
    }

    private LocalDateTime toLocalDateTime(Timestamp timestamp) {
        return timestamp == null ? null : timestamp.toLocalDateTime();
    }

    private record TaskLocation(
            Long lineId,
            String lineName,
            Long lineManagerId,
            Long equipmentId,
            String equipmentName,
            Long elementId,
            String elementName,
            Long partId,
            String partName) {
    }
}
