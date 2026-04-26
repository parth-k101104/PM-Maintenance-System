package com.maint.pm_backend.repository;

import com.maint.pm_backend.entity.PmScheduleApproval;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import com.maint.pm_backend.dto.DeviationTaskProjection;
import com.maint.pm_backend.dto.EmployeeTaskProjection;

@Repository
public interface PmScheduleApprovalRepository extends JpaRepository<PmScheduleApproval, Long> {

    List<PmScheduleApproval> findByScheduleExecution_ScheduleExecutionId(Long scheduleExecutionId);

    Optional<PmScheduleApproval> findByScheduleExecution_ScheduleExecutionIdAndApprovalLevel(
            Long scheduleExecutionId, Integer approvalLevel);

    // ─── Supervisor Dashboard Queries ─────────────────────────────────────────

    /**
     * Count of level-1 approvals where this supervisor has a pending/approval-requested
     * row with an approval_due_date of today (date portion only).
     */
    @Query(value =
        "SELECT COUNT(*) FROM pm_schedule_approval a " +
        "WHERE a.approver_id = :supervisorId " +
        "  AND a.approval_level = 1 " +
        "  AND a.approval_status = 'APPROVAL_REQUESTED' " +
        "  AND CAST(a.approval_due_date AS DATE) = :today",
        nativeQuery = true)
    int countTodaysDueApprovals(
            @Param("supervisorId") Long supervisorId,
            @Param("today") LocalDate today);

    @Query(value = "SELECT " +
            "  se.schedule_execution_id AS scheduleExecutionId, " +
            "  st.std_task_id AS stdTaskId, " +
            "  st.task_ref_no AS taskRefNo, " +
            "  st.method AS taskName, " +
            "  st.estimated_req_time AS timeRequired, " +
            "  eq.name AS machineName, " +
            "  ee.element_name AS machineElementName, " +
            "  ep.name AS machinePartName, " +
            "  l.zone AS zone, " +
            "  l.block AS block, " +
            "  l.line_name AS lineName, " +
            "  l.line_code AS lineCode, " +
            "  l.line_id AS lineId, " +
            "  se.due_date AS dueDate, " +
            "  st.task_criticality AS taskCriticality, " +
            "  se.time_taken AS timeTaken, " +
            "  emp.full_name AS employeeName " +
            "FROM pm_schedule_approval a " +
            "JOIN pm_schedule_execution se ON a.schedule_execution_id = se.schedule_execution_id " +
            "JOIN pm_task_schedules ts ON se.task_schedule_id = ts.task_schedule_id " +
            "JOIN pm_std_tasks st ON ts.std_task_id = st.std_task_id " +
            "LEFT JOIN employees emp ON se.employee_id = emp.employee_id " +
            "LEFT JOIN equipment_element ee ON st.element_id = ee.element_id " +
            "LEFT JOIN equipments eq ON ee.equipment_id = eq.equipment_id " +
            "LEFT JOIN equipment_parts ep ON st.part_id = ep.part_id " +
            "LEFT JOIN lines l ON eq.line_id = l.line_id " +
            "WHERE a.approver_id = :supervisorId " +
            "  AND a.approval_level = 1 " +
            "  AND a.approval_status = 'APPROVAL_REQUESTED' " +
            "  AND CAST(a.approval_due_date AS DATE) = :today", nativeQuery = true)
    List<com.maint.pm_backend.dto.TaskDetailsProjection> findTodaysDueApprovalsList(
            @Param("supervisorId") Long supervisorId,
            @Param("today") LocalDate today);

    /**
     * Count of schedule executions where deviation_flag = true and the task is still
     * under review at any level (not yet finally APPROVED or REJECTED).
     * Only tasks whose level-1 approver is this supervisor are counted.
     */
    @Query(value =
        "SELECT COUNT(DISTINCT se.schedule_execution_id) " +
        "FROM pm_schedule_execution se " +
        "JOIN pm_schedule_approval a " +
        "  ON a.schedule_execution_id = se.schedule_execution_id " +
        "  AND a.approval_level = 1 " +
        "  AND a.approver_id = :supervisorId " +
        "WHERE se.deviation_flag = TRUE " +
        "  AND se.status IN ('UNDER_SUPERVISOR_REVIEW','UNDER_LINE_MANAGER_REVIEW','UNDER_MAINT_MANAGER_REVIEW')",
        nativeQuery = true)
    int countOpenDeviations(@Param("supervisorId") Long supervisorId);

    /**
     * Count of level-1 approval rows for this supervisor that are still actionable
     * (PENDING or APPROVAL_REQUESTED) and have a due-date within the current month.
     * Includes today's due items.
     */
    @Query(value =
        "SELECT COUNT(*) FROM pm_schedule_approval a " +
        "WHERE a.approver_id = :supervisorId " +
        "  AND a.approval_level = 1 " +
        "  AND a.approval_status IN ('PENDING', 'APPROVAL_REQUESTED') " +
        "  AND CAST(a.approval_due_date AS DATE) >= :monthStart " +
        "  AND CAST(a.approval_due_date AS DATE) <= :monthEnd",
        nativeQuery = true)
    int countUpcomingApprovalsThisMonth(
            @Param("supervisorId") Long supervisorId,
            @Param("monthStart") LocalDate monthStart,
            @Param("monthEnd") LocalDate monthEnd);

    /**
     * Distinct count of operators/employees whose tasks this supervisor reviews.
     * Derived from level-1 approval rows whose approver = this supervisor.
     */
    @Query(value =
        "SELECT COUNT(DISTINCT se.employee_id) " +
        "FROM pm_schedule_approval a " +
        "JOIN pm_schedule_execution se " +
        "  ON se.schedule_execution_id = a.schedule_execution_id " +
        "WHERE a.approver_id = :supervisorId " +
        "  AND a.approval_level = 1",
        nativeQuery = true)
    int countSupervisedEmployees(@Param("supervisorId") Long supervisorId);

    /**
     * Count of tasks in the pipeline for this supervisor:
     *   1. Supervisor has already APPROVED (level-1) but the task is still awaiting
     *      higher-level sign-off (UNDER_LINE_MANAGER_REVIEW / UNDER_MAINT_MANAGER_REVIEW).
     *   2. OR task was REJECTED by supervisor (level-1 REJECTED).
     *   3. OR task was rejected at a higher level after supervisor already approved
     *      (task status = REJECTED and level-1 = APPROVED for this supervisor).
     */
    @Query(value =
        "SELECT COUNT(DISTINCT se.schedule_execution_id) " +
        "FROM pm_schedule_approval a " +
        "JOIN pm_schedule_execution se " +
        "  ON se.schedule_execution_id = a.schedule_execution_id " +
        "WHERE a.approver_id = :supervisorId " +
        "  AND a.approval_level = 1 " +
        "  AND (" +
        "    (a.approval_status = 'APPROVED' AND se.status IN ('UNDER_LINE_MANAGER_REVIEW','UNDER_MAINT_MANAGER_REVIEW'))" +
        "    OR a.approval_status = 'REJECTED'" +
        "    OR (a.approval_status = 'APPROVED' AND se.status = 'REJECTED')" +
        "  )",
        nativeQuery = true)
    int countTasksInPipeline(@Param("supervisorId") Long supervisorId);

    // ─── Deviation Tasks List ─────────────────────────────────────────────────

    /**
     * Returns all open executions (not yet APPROVED/REJECTED/COMPLETED) that have
     * deviation_flag = true and whose level-1 approver is this supervisor.
     */
    @Query(value = "SELECT " +
            "  se.schedule_execution_id AS scheduleExecutionId, " +
            "  st.std_task_id AS stdTaskId, " +
            "  st.task_ref_no AS taskRefNo, " +
            "  st.method AS taskName, " +
            "  eq.name AS machineName, " +
            "  ee.element_name AS machineElementName, " +
            "  ep.name AS machinePartName, " +
            "  l.zone AS zone, " +
            "  l.block AS block, " +
            "  l.line_name AS lineName, " +
            "  l.line_code AS lineCode, " +
            "  l.line_id AS lineId, " +
            "  st.task_criticality AS taskCriticality, " +
            "  se.actual_value AS actualValue, " +
            "  se.deviation_flag AS deviationFlag, " +
            "  se.time_taken AS timeTaken, " +
            "  emp.full_name AS employeeName, " +
            "  se.completed_dttm AS completedDate, " +
            "  st.uom AS uom, " +
            "  st.standard_value AS standardValue, " +
            "  st.tolerance_min AS toleranceMin, " +
            "  st.tolerance_max AS toleranceMax " +
            "FROM pm_schedule_execution se " +
            "JOIN pm_schedule_approval a ON a.schedule_execution_id = se.schedule_execution_id " +
            "  AND a.approval_level = 1 AND a.approver_id = :supervisorId " +
            "JOIN pm_task_schedules ts ON se.task_schedule_id = ts.task_schedule_id " +
            "JOIN pm_std_tasks st ON ts.std_task_id = st.std_task_id " +
            "LEFT JOIN employees emp ON se.employee_id = emp.employee_id " +
            "LEFT JOIN equipment_element ee ON st.element_id = ee.element_id " +
            "LEFT JOIN equipments eq ON ee.equipment_id = eq.equipment_id " +
            "LEFT JOIN equipment_parts ep ON st.part_id = ep.part_id " +
            "LEFT JOIN lines l ON eq.line_id = l.line_id " +
            "WHERE se.deviation_flag = TRUE " +
            "  AND se.status IN ('UNDER_SUPERVISOR_REVIEW','UNDER_LINE_MANAGER_REVIEW','UNDER_MAINT_MANAGER_REVIEW') " +
            "ORDER BY se.completed_dttm DESC", nativeQuery = true)
    List<DeviationTaskProjection> findOpenDeviationTasks(@Param("supervisorId") Long supervisorId);

    // ─── Employee Task List ───────────────────────────────────────────────────

    /**
     * All task executions assigned to a specific employee that belong to this
     * supervisor's scope (level-1 approver = supervisorId), filtered from a specific date.
     */
    @Query(value = "SELECT " +
            "  se.schedule_execution_id   AS scheduleExecutionId, " +
            "  st.task_ref_no             AS taskRefNo, " +
            "  st.method                  AS taskName, " +
            "  eq.name                    AS machineName, " +
            "  ee.element_name            AS machineElementName, " +
            "  ep.name                    AS machinePartName, " +
            "  l.zone                     AS zone, " +
            "  l.block                    AS block, " +
            "  l.line_name                AS lineName, " +
            "  l.line_code                AS lineCode, " +
            "  se.due_date                AS dueDate, " +
            "  se.completed_dttm          AS completedDate, " +
            "  st.task_criticality        AS taskCriticality, " +
            "  se.status                  AS executionStatus, " +
            "  se.time_taken              AS timeTaken, " +
            "  se.deviation_flag          AS deviationFlag, " +
            "  se.actual_value            AS actualValue, " +
            "  st.uom                     AS uom, " +
            "  st.standard_value          AS standardValue " +
            "FROM pm_schedule_approval a " +
            "JOIN pm_schedule_execution se ON a.schedule_execution_id = se.schedule_execution_id " +
            "JOIN pm_task_schedules ts     ON se.task_schedule_id = ts.task_schedule_id " +
            "JOIN pm_std_tasks st          ON ts.std_task_id = st.std_task_id " +
            "LEFT JOIN equipment_element ee ON st.element_id = ee.element_id " +
            "LEFT JOIN equipments eq        ON ee.equipment_id = eq.equipment_id " +
            "LEFT JOIN equipment_parts ep   ON st.part_id = ep.part_id " +
            "LEFT JOIN lines l              ON eq.line_id = l.line_id " +
            "WHERE a.approver_id = :supervisorId " +
            "  AND a.approval_level = 1 " +
            "  AND se.employee_id = :employeeId " +
            "  AND se.assigned_dttm >= :fromDate " +
            "ORDER BY se.due_date DESC", nativeQuery = true)
    List<EmployeeTaskProjection> findTasksByEmployeeForSupervisor(
            @Param("supervisorId") Long supervisorId,
            @Param("employeeId") Long employeeId,
            @Param("fromDate") java.time.LocalDateTime fromDate);

            
    /**
     * Aggregated task counts per employee, scoped to this supervisor (level-1 approver)
     * and filtered to executions assigned on or after {@code fromDate}.
     *
     * Columns returned (positional):
     *  0  employeeId
     *  1  employeeName
     *  2  totalTasks
     *  3  assignedOrInProgress      (ASSIGNED | IN_PROGRESS)
     *  4  pendingSupervisorApproval  (UNDER_SUPERVISOR_REVIEW)
     *  5  underLineManagerReview     (UNDER_LINE_MANAGER_REVIEW)
     *  6  underMaintManagerReview    (UNDER_MAINT_MANAGER_REVIEW)
     *  7  approved                   (APPROVED)
     *  8  rejected                   (REJECTED)
     *  9  totalExecuted              (COMPLETED + all under-review statuses)
     */
    @Query(value = "SELECT " +
            "  emp.employee_id                                                                                          AS employeeId, " +
            "  emp.full_name                                                                                            AS employeeName, " +
            "  COUNT(se.schedule_execution_id)                                                                          AS totalTasks, " +
            "  COUNT(se.schedule_execution_id) FILTER (WHERE se.status IN ('ASSIGNED','IN_PROGRESS'))                  AS assignedOrInProgress, " +
            "  COUNT(se.schedule_execution_id) FILTER (WHERE se.status = 'UNDER_SUPERVISOR_REVIEW')                    AS pendingSupervisorApproval, " +
            "  COUNT(se.schedule_execution_id) FILTER (WHERE se.status = 'UNDER_LINE_MANAGER_REVIEW')                  AS underLineManagerReview, " +
            "  COUNT(se.schedule_execution_id) FILTER (WHERE se.status = 'UNDER_MAINT_MANAGER_REVIEW')                 AS underMaintManagerReview, " +
            "  COUNT(se.schedule_execution_id) FILTER (WHERE se.status = 'APPROVED')                                   AS approved, " +
            "  COUNT(se.schedule_execution_id) FILTER (WHERE se.status = 'REJECTED')                                   AS rejected, " +
            "  COUNT(se.schedule_execution_id) FILTER (WHERE se.status IN (" +
            "    'COMPLETED','UNDER_SUPERVISOR_REVIEW','UNDER_LINE_MANAGER_REVIEW'," +
            "    'UNDER_MAINT_MANAGER_REVIEW'))                                                                     AS totalExecuted " +
            "FROM pm_schedule_approval a " +
            "JOIN pm_schedule_execution se ON a.schedule_execution_id = se.schedule_execution_id " +
            "JOIN employees emp             ON se.employee_id = emp.employee_id " +
            "WHERE a.approver_id = :supervisorId " +
            "  AND a.approval_level = 1 " +
            "  AND se.assigned_dttm >= :fromDate " +
            "GROUP BY emp.employee_id, emp.full_name " +
            "ORDER BY emp.full_name", nativeQuery = true)
    List<Object[]> findEmployeeSummaryForSupervisor(
            @Param("supervisorId") Long supervisorId,
            @Param("fromDate") java.time.LocalDateTime fromDate);

    // ─── Workflow / Line Manager Lookups ──────────────────────────────────────

    /**
     * Returns the approval_workflow_id of the std task linked to the given execution.
     * workflow_id 1 = supervisor only, 2 = supervisor + line manager, 3 = full chain.
     */
    @Query(value =
        "SELECT st.approval_workflow_id " +
        "FROM pm_schedule_execution se " +
        "JOIN pm_task_schedules ts ON se.task_schedule_id = ts.task_schedule_id " +
        "JOIN pm_std_tasks st      ON ts.std_task_id = st.std_task_id " +
        "WHERE se.schedule_execution_id = :executionId " +
        "LIMIT 1",
        nativeQuery = true)
    Long findWorkflowIdByExecution(@Param("executionId") Long executionId);

    /**
     * Returns the line_manager_id from the lines table for the equipment line
     * of the task in the given execution. Returns null if not set.
     */
    @Query(value =
        "SELECT l.line_manager_id " +
        "FROM pm_schedule_execution se " +
        "JOIN pm_task_schedules ts      ON se.task_schedule_id = ts.task_schedule_id " +
        "JOIN pm_std_tasks st           ON ts.std_task_id = st.std_task_id " +
        "LEFT JOIN equipment_element ee ON st.element_id = ee.element_id " +
        "LEFT JOIN equipments eq        ON ee.equipment_id = eq.equipment_id " +
        "LEFT JOIN lines l              ON eq.line_id = l.line_id " +
        "WHERE se.schedule_execution_id = :executionId " +
        "LIMIT 1",
        nativeQuery = true)
    Long findLineManagerIdByExecution(@Param("executionId") Long executionId);
}
