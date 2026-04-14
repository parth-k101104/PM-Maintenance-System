package com.maint.pm_backend.repository;

import com.maint.pm_backend.entity.PmScheduleExecution;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface PmScheduleExecutionRepository extends JpaRepository<PmScheduleExecution, Long> {

    @Query("SELECT e FROM PmScheduleExecution e " +
           "JOIN FETCH e.taskSchedule ts " +
           "JOIN FETCH ts.stdTask " +
           "WHERE e.employee.employeeId = :employeeId")
    List<PmScheduleExecution> findAllByEmployeeIdWithDetails(@Param("employeeId") Long employeeId);

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
            "  st.task_criticality AS taskCriticality " +
            "FROM pm_schedule_execution se " +
            "JOIN pm_task_schedules ts ON se.task_schedule_id = ts.task_schedule_id " +
            "JOIN pm_std_tasks st ON ts.std_task_id = st.std_task_id " +
            "LEFT JOIN equipment_element ee ON st.element_id = ee.element_id " +
            "LEFT JOIN equipments eq ON ee.equipment_id = eq.equipment_id " +
            "LEFT JOIN equipment_parts ep ON st.part_id = ep.part_id " +
            "LEFT JOIN lines l ON eq.line_id = l.line_id " +
            "WHERE se.employee_id = :employeeId " +
            "  AND CAST(se.due_date AS DATE) = :dueDate", nativeQuery = true)
    List<com.maint.pm_backend.dto.TaskDetailsProjection> findTasksForTodayNative(
            @Param("employeeId") Long employeeId,
            @Param("dueDate") java.time.LocalDate dueDate);

    @Query(value = "SELECT " +
            "  se.schedule_execution_id AS scheduleExecutionId, " +
            "  st.method AS taskName, " +
            "  eq.name AS machineName, " +
            "  ee.element_name AS machineElementName, " +
            "  ep.name AS machinePartName, " +
            "  st.estimated_req_time AS stdAmountOfTime, " +
            "  se.time_taken AS timeTaken, " +
            "  l.zone AS zone, " +
            "  l.block AS block, " +
            "  l.line_id AS lineId, " +
            "  se.status AS status " +
            "FROM pm_schedule_execution se " +
            "JOIN pm_task_schedules ts ON se.task_schedule_id = ts.task_schedule_id " +
            "JOIN pm_std_tasks st ON ts.std_task_id = st.std_task_id " +
            "LEFT JOIN equipment_element ee ON st.element_id = ee.element_id " +
            "LEFT JOIN equipments eq ON ee.equipment_id = eq.equipment_id " +
            "LEFT JOIN equipment_parts ep ON st.part_id = ep.part_id " +
            "LEFT JOIN lines l ON eq.line_id = l.line_id " +
            "WHERE se.employee_id = :employeeId " +
            "  AND se.status IN ('COMPLETED', 'APPROVAL_PENDING', 'APPROVED', 'REJECTED')", nativeQuery = true)
    List<com.maint.pm_backend.dto.CompletedTaskProjection> findCompletedTasksNative(
            @Param("employeeId") Long employeeId);

    @Query(value = "SELECT st.uom FROM pm_schedule_execution se " +
            "JOIN pm_task_schedules ts ON se.task_schedule_id = ts.task_schedule_id " +
            "JOIN pm_std_tasks st ON ts.std_task_id = st.std_task_id " +
            "WHERE se.employee_id = :employeeId " +
            "  AND se.schedule_execution_id = :scheduleExecutionId " +
            "  AND se.status IN ('ASSIGNED', 'IN_PROGRESS')", nativeQuery = true)
    List<String> checkActiveOperatorAssignment(@Param("employeeId") Long employeeId, @Param("scheduleExecutionId") Long scheduleExecutionId);

    @Query(value = "SELECT " +
            "  se.schedule_execution_id AS scheduleExecutionId, " +
            "  st.std_task_id AS stdTaskId, " +
            "  st.task_ref_no AS taskRefNo, " +
            "  st.method AS taskName, " +
            "  st.estimated_req_time AS timeRequired, " +
            "  st.uom AS uom, " +
            "  eq.name AS machineName, " +
            "  ee.element_name AS machineElementName, " +
            "  ep.name AS machinePartName, " +
            "  l.zone AS zone, " +
            "  l.block AS block, " +
            "  se.due_date AS dueDate, " +
            "  l.line_name AS lineName " +
            "FROM pm_schedule_execution se " +
            "JOIN pm_task_schedules ts ON se.task_schedule_id = ts.task_schedule_id " +
            "JOIN pm_std_tasks st ON ts.std_task_id = st.std_task_id " +
            "LEFT JOIN equipment_element ee ON st.element_id = ee.element_id " +
            "LEFT JOIN equipments eq ON ee.equipment_id = eq.equipment_id " +
            "LEFT JOIN equipment_parts ep ON st.part_id = ep.part_id " +
            "LEFT JOIN lines l ON eq.line_id = l.line_id " +
            "WHERE se.employee_id = :employeeId " +
            "  AND st.part_id = :partId " +
            "  AND se.status IN ('ASSIGNED', 'IN_PROGRESS') " +
            "  AND CAST(se.due_date AS DATE) >= :startDate " +
            "  AND CAST(se.due_date AS DATE) <= :endDate", nativeQuery = true)
    List<com.maint.pm_backend.dto.QRTaskProjection> findPendingOperatorTasksByPart(
            @Param("employeeId") Long employeeId, 
            @Param("partId") Long partId, 
            @Param("startDate") java.time.LocalDate startDate, 
            @Param("endDate") java.time.LocalDate endDate);

    @Query(value = "SELECT " +
            "  se.schedule_execution_id AS scheduleExecutionId, " +
            "  st.std_task_id AS stdTaskId, " +
            "  st.task_ref_no AS taskRefNo, " +
            "  st.method AS taskName, " +
            "  st.estimated_req_time AS timeRequired, " +
            "  st.uom AS uom, " +
            "  eq.name AS machineName, " +
            "  ee.element_name AS machineElementName, " +
            "  ep.name AS machinePartName, " +
            "  l.zone AS zone, " +
            "  l.block AS block, " +
            "  se.due_date AS dueDate, " +
            "  l.line_name AS lineName " +
            "FROM pm_schedule_execution se " +
            "JOIN pm_task_schedules ts ON se.task_schedule_id = ts.task_schedule_id " +
            "JOIN pm_std_tasks st ON ts.std_task_id = st.std_task_id " +
            "LEFT JOIN equipment_element ee ON st.element_id = ee.element_id " +
            "LEFT JOIN equipments eq ON ee.equipment_id = eq.equipment_id " +
            "LEFT JOIN equipment_parts ep ON st.part_id = ep.part_id " +
            "LEFT JOIN lines l ON eq.line_id = l.line_id " +
            "WHERE se.employee_id = :employeeId " +
            "  AND eq.equipment_id = :equipmentId " +
            "  AND st.part_id != :partId " +
            "  AND se.status IN ('ASSIGNED', 'IN_PROGRESS') " +
            "  AND CAST(se.due_date AS DATE) >= :startDate " +
            "  AND CAST(se.due_date AS DATE) <= :endDate", nativeQuery = true)
    List<com.maint.pm_backend.dto.QRTaskProjection> findPendingOperatorTasksByEquipmentExcludingPart(
            @Param("employeeId") Long employeeId, 
            @Param("equipmentId") Long equipmentId, 
            @Param("partId") Long partId, 
            @Param("startDate") java.time.LocalDate startDate, 
            @Param("endDate") java.time.LocalDate endDate);
}
