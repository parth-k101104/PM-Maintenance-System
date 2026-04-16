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
            "  se.due_date AS dueDate, " +
            "  st.task_criticality AS taskCriticality " +
            "FROM pm_schedule_execution se " +
            "JOIN pm_task_schedules ts ON se.task_schedule_id = ts.task_schedule_id " +
            "JOIN pm_std_tasks st ON ts.std_task_id = st.std_task_id " +
            "LEFT JOIN equipment_element ee ON st.element_id = ee.element_id " +
            "LEFT JOIN equipments eq ON ee.equipment_id = eq.equipment_id " +
            "LEFT JOIN equipment_parts ep ON st.part_id = ep.part_id " +
            "LEFT JOIN lines l ON eq.line_id = l.line_id " +
            "WHERE se.employee_id = :employeeId " +
            "  AND se.status IN ('ASSIGNED', 'IN-PROGRESS') " +
            "  AND CAST(se.due_date AS DATE) = :dueDate", nativeQuery = true)
    List<com.maint.pm_backend.dto.TaskDetailsProjection> findTasksForTodayNative(
            @Param("employeeId") Long employeeId,
            @Param("dueDate") java.time.LocalDate dueDate);

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
            "  st.task_criticality AS taskCriticality " +
            "FROM pm_schedule_execution se " +
            "JOIN pm_task_schedules ts ON se.task_schedule_id = ts.task_schedule_id " +
            "JOIN pm_std_tasks st ON ts.std_task_id = st.std_task_id " +
            "LEFT JOIN equipment_element ee ON st.element_id = ee.element_id " +
            "LEFT JOIN equipments eq ON ee.equipment_id = eq.equipment_id " +
            "LEFT JOIN equipment_parts ep ON st.part_id = ep.part_id " +
            "LEFT JOIN lines l ON eq.line_id = l.line_id " +
            "WHERE se.employee_id = :employeeId " +
            "  AND se.status IN ('ASSIGNED', 'IN-PROGRESS') " +
            "  AND CAST(se.due_date AS DATE) > :today " +
            "  AND CAST(se.due_date AS DATE) <= :endOfMonth", nativeQuery = true)
    List<com.maint.pm_backend.dto.TaskDetailsProjection> findUpcomingTasksNative(
            @Param("employeeId") Long employeeId,
            @Param("today") java.time.LocalDate today,
            @Param("endOfMonth") java.time.LocalDate endOfMonth);

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
            "  l.line_code AS lineCode, " +
            "  l.line_name AS lineName, " +
            "  st.task_criticality AS taskCriticality, " +
            "  se.status AS status, " +
            "  sup.full_name AS supervisorName " +
            "FROM pm_schedule_execution se " +
            "JOIN pm_task_schedules ts ON se.task_schedule_id = ts.task_schedule_id " +
            "JOIN pm_std_tasks st ON ts.std_task_id = st.std_task_id " +
            "LEFT JOIN equipment_element ee ON st.element_id = ee.element_id " +
            "LEFT JOIN equipments eq ON ee.equipment_id = eq.equipment_id " +
            "LEFT JOIN equipment_parts ep ON st.part_id = ep.part_id " +
            "LEFT JOIN lines l ON eq.line_id = l.line_id " +
            "LEFT JOIN pm_schedule_approval sa ON se.schedule_execution_id = sa.schedule_execution_id AND sa.approval_level = 1 " +
            "LEFT JOIN employees sup ON sa.approver_id = sup.employee_id " +
            "WHERE se.employee_id = :employeeId " +
            "  AND se.status IN ('COMPLETED', 'APPROVAL_PENDING', 'APPROVED', 'REJECTED')", nativeQuery = true)
    List<com.maint.pm_backend.dto.CompletedTaskProjection> findCompletedTasksNative(
            @Param("employeeId") Long employeeId);

    @Query(value = "SELECT st.uom FROM pm_schedule_execution se " +
            "JOIN pm_task_schedules ts ON se.task_schedule_id = ts.task_schedule_id " +
            "JOIN pm_std_tasks st ON ts.std_task_id = st.std_task_id " +
            "WHERE se.employee_id = :employeeId " +
            "  AND se.schedule_execution_id = :scheduleExecutionId " +
            "  AND se.status IN ('ASSIGNED', 'IN-PROGRESS')", nativeQuery = true)
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
            "  AND se.status IN ('ASSIGNED', 'IN-PROGRESS') " +
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

    /**
     * Fetch the data required to construct S3 document paths for a given task execution.
     * Resolves: companyCode, plantCode, machineCode (equipment code), taskRefNo.
     *
     * S3 path pattern:
     *   Task SOP  : {companyCode}/{plantCode}/{machineCode}/tasks-sop/{taskRefNo}.pdf
     *   Manual    : {companyCode}/{plantCode}/{machineCode}/manuals/{machineCode}.pdf
     */
    @Query(value = "SELECT " +
            "  c.code AS companyCode, " +
            "  p.code AS plantCode, " +
            "  eq.code AS machineCode, " +
            "  st.task_ref_no AS taskRefNo " +
            "FROM pm_schedule_execution se " +
            "JOIN pm_task_schedules ts ON se.task_schedule_id = ts.task_schedule_id " +
            "JOIN pm_std_tasks st ON ts.std_task_id = st.std_task_id " +
            "LEFT JOIN equipment_element ee ON st.element_id = ee.element_id " +
            "LEFT JOIN equipments eq ON ee.equipment_id = eq.equipment_id " +
            "LEFT JOIN plants p ON eq.plant_id = p.id " +
            "LEFT JOIN companies c ON p.company_id = c.id " +
            "WHERE se.schedule_execution_id = :scheduleExecutionId " +
            "  AND se.employee_id = :employeeId", nativeQuery = true)
    java.util.Optional<com.maint.pm_backend.dto.DocumentPathProjection> findDocumentPathDetails(
            @Param("scheduleExecutionId") Long scheduleExecutionId,
            @Param("employeeId") Long employeeId);
}


