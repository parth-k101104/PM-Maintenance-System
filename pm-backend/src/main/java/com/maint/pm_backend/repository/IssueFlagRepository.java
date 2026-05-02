package com.maint.pm_backend.repository;

import com.maint.pm_backend.dto.IssueFlagProjection;
import com.maint.pm_backend.entity.IssueFlag;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface IssueFlagRepository extends JpaRepository<IssueFlag, Long> {

    List<IssueFlag> findByScheduleExecution_ScheduleExecutionId(Long scheduleExecutionId);

    // ─── Shared SELECT fragment ───────────────────────────────────────────────
    // Columns: flagId, scheduleExecutionId, partId, partName, equipmentId, equipmentName,
    //          location, attendantId, attendantName, status, criticality, dueDate, raisedDttm

    @Query(value =
        "SELECT f.flag_id             AS flagId, " +
        "       se.schedule_execution_id AS scheduleExecutionId, " +
        "       ep.part_id            AS partId, " +
        "       ep.name               AS partName, " +
        "       eq.equipment_id       AS equipmentId, " +
        "       eq.name               AS equipmentName, " +
        "       eq.equipment_location_detail AS location, " +
        "       att.employee_id       AS attendantId, " +
        "       att.full_name         AS attendantName, " +
        "       f.flag_status         AS status, " +
        "       f.criticality         AS criticality, " +
        "       f.due_date            AS dueDate, " +
        "       f.raised_dttm         AS raisedDttm " +
        "FROM issue_flags f " +
        "JOIN pm_schedule_execution se ON f.schedule_execution_id = se.schedule_execution_id " +
        "JOIN pm_task_schedules ts     ON se.task_schedule_id = ts.task_schedule_id " +
        "JOIN pm_std_tasks st          ON ts.std_task_id = st.std_task_id " +
        "LEFT JOIN equipment_parts ep  ON st.part_id = ep.part_id " +
        "LEFT JOIN equipment_element ee ON st.element_id = ee.element_id " +
        "LEFT JOIN equipments eq       ON ee.equipment_id = eq.equipment_id " +
        "LEFT JOIN employees att       ON f.attendant_id = att.employee_id " +
        "WHERE f.attendant_id = :employeeId " +
        "  AND f.flag_status NOT IN ('CLOSED')",
        nativeQuery = true)
    List<IssueFlagProjection> findFlagsByAttendantId(@Param("employeeId") Long employeeId);

    /** Count active (non-closed) flags assigned to this operator — used by dashboard. */
    @Query(value =
        "SELECT COUNT(*) FROM issue_flags f " +
        "WHERE f.attendant_id = :employeeId " +
        "  AND f.flag_status NOT IN ('CLOSED')",
        nativeQuery = true)
    int countActiveFlagsByAttendantId(@Param("employeeId") Long employeeId);

    @Query(value =
        "SELECT f.flag_id             AS flagId, " +
        "       se.schedule_execution_id AS scheduleExecutionId, " +
        "       ep.part_id            AS partId, " +
        "       ep.name               AS partName, " +
        "       eq.equipment_id       AS equipmentId, " +
        "       eq.name               AS equipmentName, " +
        "       eq.equipment_location_detail AS location, " +
        "       att.employee_id       AS attendantId, " +
        "       att.full_name         AS attendantName, " +
        "       f.flag_status         AS status, " +
        "       f.criticality         AS criticality, " +
        "       f.due_date            AS dueDate, " +
        "       f.raised_dttm         AS raisedDttm " +
        "FROM issue_flags f " +
        "JOIN pm_schedule_execution se ON f.schedule_execution_id = se.schedule_execution_id " +
        "JOIN pm_task_schedules ts     ON se.task_schedule_id = ts.task_schedule_id " +
        "JOIN pm_std_tasks st          ON ts.std_task_id = st.std_task_id " +
        "LEFT JOIN equipment_parts ep  ON st.part_id = ep.part_id " +
        "LEFT JOIN equipment_element ee ON st.element_id = ee.element_id " +
        "LEFT JOIN equipments eq       ON ee.equipment_id = eq.equipment_id " +
        "LEFT JOIN employees att       ON f.attendant_id = att.employee_id " +
        "JOIN lines l                  ON eq.line_id = l.line_id " +
        "WHERE l.supervisor_user_id = :supervisorId",
        nativeQuery = true)
    List<IssueFlagProjection> findFlagsBySupervisorId(@Param("supervisorId") Long supervisorId);

    @Query(value =
        "SELECT f.flag_id             AS flagId, " +
        "       se.schedule_execution_id AS scheduleExecutionId, " +
        "       ep.part_id            AS partId, " +
        "       ep.name               AS partName, " +
        "       eq.equipment_id       AS equipmentId, " +
        "       eq.name               AS equipmentName, " +
        "       eq.equipment_location_detail AS location, " +
        "       att.employee_id       AS attendantId, " +
        "       att.full_name         AS attendantName, " +
        "       f.flag_status         AS status, " +
        "       f.criticality         AS criticality, " +
        "       f.due_date            AS dueDate, " +
        "       f.raised_dttm         AS raisedDttm " +
        "FROM issue_flags f " +
        "JOIN pm_schedule_execution se ON f.schedule_execution_id = se.schedule_execution_id " +
        "JOIN pm_task_schedules ts     ON se.task_schedule_id = ts.task_schedule_id " +
        "JOIN pm_std_tasks st          ON ts.std_task_id = st.std_task_id " +
        "LEFT JOIN equipment_parts ep  ON st.part_id = ep.part_id " +
        "LEFT JOIN equipment_element ee ON st.element_id = ee.element_id " +
        "LEFT JOIN equipments eq       ON ee.equipment_id = eq.equipment_id " +
        "LEFT JOIN employees att       ON f.attendant_id = att.employee_id " +
        "JOIN lines l                  ON eq.line_id = l.line_id " +
        "WHERE l.line_manager_id = :lineManagerId " +
        "  AND f.flag_status NOT IN ('CLOSED')",
        nativeQuery = true)
    List<IssueFlagProjection> findFlagsByLineManagerId(@Param("lineManagerId") Long lineManagerId);
}
