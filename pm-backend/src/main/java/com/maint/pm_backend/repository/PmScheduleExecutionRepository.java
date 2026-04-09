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
            "  st.task_ref_no AS taskRefNo, " +
            "  st.method AS taskName, " +
            "  st.estimated_req_time AS timeRequired, " +
            "  eq.name AS machineName, " +
            "  ee.element_name AS machineElementName, " +
            "  ep.name AS machinePartName, " +
            "  l.zone AS zone, " +
            "  l.block AS block, " +
            "  l.line_name AS lineName " +
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
}
