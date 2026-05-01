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
                        "  NULL AS scheduleApprovalId, " +
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
                        "  emp.full_name AS employeeName, " +
                        "  se.deviation_flag AS deviationFlag, " +
                        "  CASE WHEN f.flag_status IS NOT NULL AND f.flag_status != 'CLOSED' THEN true ELSE false END AS hasActiveFlag, " +
                        "  f.flag_status AS activeFlagStatus, " +
                        "  se.reschedule_flag AS rescheduleFlag, " +
                        "  se.parent_schedule_execution_id AS parentScheduleExecutionId " +
                        "FROM pm_schedule_execution se " +
                        "JOIN pm_task_schedules ts ON se.task_schedule_id = ts.task_schedule_id " +
                        "JOIN pm_std_tasks st ON ts.std_task_id = st.std_task_id " +
                        "LEFT JOIN employees emp ON se.employee_id = emp.employee_id " +
                        "LEFT JOIN equipment_element ee ON st.element_id = ee.element_id " +
                        "LEFT JOIN equipments eq ON ee.equipment_id = eq.equipment_id " +
                        "LEFT JOIN equipment_parts ep ON st.part_id = ep.part_id " +
                        "LEFT JOIN lines l ON eq.line_id = l.line_id " +
                        "LEFT JOIN issue_flags f ON se.schedule_execution_id = f.schedule_execution_id " +
                        "WHERE se.employee_id = :employeeId " +
                        "  AND se.status IN ('ASSIGNED', 'IN_PROGRESS') " +
                        "  AND CAST(se.due_date AS DATE) = :dueDate", nativeQuery = true)
        List<com.maint.pm_backend.dto.TaskDetailsProjection> findTasksForTodayNative(
                        @Param("employeeId") Long employeeId,
                        @Param("dueDate") java.time.LocalDate dueDate);

        @Query(value = "SELECT " +
                        "  NULL AS scheduleApprovalId, " +
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
                        "  emp.full_name AS employeeName, " +
                        "  se.deviation_flag AS deviationFlag, " +
                        "  CASE WHEN f.flag_status IS NOT NULL AND f.flag_status != 'CLOSED' THEN true ELSE false END AS hasActiveFlag, " +
                        "  f.flag_status AS activeFlagStatus, " +
                        "  se.reschedule_flag AS rescheduleFlag, " +
                        "  se.parent_schedule_execution_id AS parentScheduleExecutionId " +
                        "FROM pm_schedule_execution se " +
                        "JOIN pm_task_schedules ts ON se.task_schedule_id = ts.task_schedule_id " +
                        "JOIN pm_std_tasks st ON ts.std_task_id = st.std_task_id " +
                        "LEFT JOIN employees emp ON se.employee_id = emp.employee_id " +
                        "LEFT JOIN equipment_element ee ON st.element_id = ee.element_id " +
                        "LEFT JOIN equipments eq ON ee.equipment_id = eq.equipment_id " +
                        "LEFT JOIN equipment_parts ep ON st.part_id = ep.part_id " +
                        "LEFT JOIN lines l ON eq.line_id = l.line_id " +
                        "LEFT JOIN issue_flags f ON se.schedule_execution_id = f.schedule_execution_id " +
                        "WHERE se.employee_id = :employeeId " +
                        "  AND se.status IN ('ASSIGNED', 'IN_PROGRESS') " +
                        "  AND CAST(se.due_date AS DATE) < :today", nativeQuery = true)
        List<com.maint.pm_backend.dto.TaskDetailsProjection> findBacklogTasksNative(
                        @Param("employeeId") Long employeeId,
                        @Param("today") java.time.LocalDate today);

        @Query(value = "SELECT " +
                        "  NULL AS scheduleApprovalId, " +
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
                        "  emp.full_name AS employeeName, " +
                        "  se.deviation_flag AS deviationFlag, " +
                        "  CASE WHEN f.flag_status IS NOT NULL AND f.flag_status != 'CLOSED' THEN true ELSE false END AS hasActiveFlag, " +
                        "  f.flag_status AS activeFlagStatus, " +
                        "  se.reschedule_flag AS rescheduleFlag, " +
                        "  se.parent_schedule_execution_id AS parentScheduleExecutionId " +
                        "FROM pm_schedule_execution se " +
                        "JOIN pm_task_schedules ts ON se.task_schedule_id = ts.task_schedule_id " +
                        "JOIN pm_std_tasks st ON ts.std_task_id = st.std_task_id " +
                        "LEFT JOIN employees emp ON se.employee_id = emp.employee_id " +
                        "LEFT JOIN equipment_element ee ON st.element_id = ee.element_id " +
                        "LEFT JOIN equipments eq ON ee.equipment_id = eq.equipment_id " +
                        "LEFT JOIN equipment_parts ep ON st.part_id = ep.part_id " +
                        "LEFT JOIN lines l ON eq.line_id = l.line_id " +
                        "LEFT JOIN issue_flags f ON se.schedule_execution_id = f.schedule_execution_id " +
                        "WHERE se.employee_id = :employeeId " +
                        "  AND se.status IN ('ASSIGNED', 'IN_PROGRESS') " +
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
                        "  sup.full_name AS supervisorName, " +
                        "  curr_sup.full_name AS reviewerName, " +
                        "  CASE se.status " +
                        "    WHEN 'UNDER_SUPERVISOR_REVIEW' THEN 'Supervisor Review' " +
                        "    WHEN 'UNDER_LINE_MANAGER_REVIEW' THEN 'Line Manager Review' " +
                        "    WHEN 'UNDER_MAINT_MANAGER_REVIEW' THEN 'Maintenance Manager Review' " +
                        "    ELSE NULL " +
                        "  END AS reviewType, " +
                        "  se.reschedule_flag AS rescheduleFlag, " +
                        "  se.parent_schedule_execution_id AS parentScheduleExecutionId, " +
                        "  re.schedule_execution_id AS rescheduledExecutionId, " +
                        "  re.status AS rescheduledStatus, " +
                        "  re.due_date AS rescheduledDueDate " +
                        "FROM pm_schedule_execution se " +
                        "JOIN pm_task_schedules ts ON se.task_schedule_id = ts.task_schedule_id " +
                        "JOIN pm_std_tasks st ON ts.std_task_id = st.std_task_id " +
                        "LEFT JOIN equipment_element ee ON st.element_id = ee.element_id " +
                        "LEFT JOIN equipments eq ON ee.equipment_id = eq.equipment_id " +
                        "LEFT JOIN equipment_parts ep ON st.part_id = ep.part_id " +
                        "LEFT JOIN lines l ON eq.line_id = l.line_id " +
                        "LEFT JOIN pm_schedule_approval sa ON se.schedule_execution_id = sa.schedule_execution_id AND sa.approval_level = 1 " +
                        "LEFT JOIN employees sup ON sa.approver_id = sup.employee_id " +
                        "LEFT JOIN pm_schedule_approval curr_sa ON curr_sa.schedule_execution_id = se.schedule_execution_id " +
                        "    AND curr_sa.approval_status = 'APPROVAL_REQUESTED' " +
                        "LEFT JOIN employees curr_sup ON curr_sa.approver_id = curr_sup.employee_id " +
                        "LEFT JOIN pm_schedule_execution re ON re.parent_schedule_execution_id = se.schedule_execution_id " +
                        "WHERE se.employee_id = :employeeId " +
                        "  AND se.status IN ('COMPLETED', 'APPROVED', 'REJECTED', " +
                        "    'UNDER_SUPERVISOR_REVIEW', 'UNDER_LINE_MANAGER_REVIEW', 'UNDER_MAINT_MANAGER_REVIEW')", nativeQuery = true)
        List<com.maint.pm_backend.dto.CompletedTaskProjection> findCompletedTasksNative(
                        @Param("employeeId") Long employeeId);

        @Query(value = "SELECT st.uom AS uom, " +
                        "st.tolerance_min AS toleranceMin, " +
                        "st.tolerance_max AS toleranceMax, " +
                        "st.standard_value AS standardValue " +
                        "FROM pm_schedule_execution se " +
                        "JOIN pm_task_schedules ts ON se.task_schedule_id = ts.task_schedule_id " +
                        "JOIN pm_std_tasks st ON ts.std_task_id = st.std_task_id " +
                        "LEFT JOIN equipment_element ee ON st.element_id = ee.element_id " +
                        "LEFT JOIN equipments eq ON ee.equipment_id = eq.equipment_id " +
                        "LEFT JOIN equipment_parts ep ON st.part_id = ep.part_id " +
                        "WHERE se.employee_id = :employeeId " +
                        "  AND se.schedule_execution_id = :scheduleExecutionId " +
                        "  AND se.status IN ('ASSIGNED', 'IN_PROGRESS') " +
                        "  AND CAST(se.due_date AS DATE) <= :endDate " +
                        "  AND eq.equipment_id = :equipmentId " +
                        "  AND ee.element_id = :elementId " +
                        "  AND (:partId IS NULL OR ep.part_id = :partId)", nativeQuery = true)
        java.util.Optional<com.maint.pm_backend.dto.TaskValidationProjection> validateAndFetchTaskMetadata(
                        @Param("scheduleExecutionId") Long scheduleExecutionId,
                        @Param("employeeId") Long employeeId,
                        @Param("equipmentId") Long equipmentId,
                        @Param("elementId") Long elementId,
                        @Param("partId") Long partId,
                        @Param("endDate") java.time.LocalDate endDate);

        @Query(value = "SELECT st.uom AS uom, " +
                        "st.tolerance_min AS toleranceMin, " +
                        "st.tolerance_max AS toleranceMax, " +
                        "st.standard_value AS standardValue, " +
                        "se.actual_value AS actualValue, " +
                        "se.deviation_flag AS deviationFlag, " +
                        "se.time_taken AS timeTaken, " +
                        "se.notes AS notes, " +
                        "st.estimated_req_time AS estimatedReqTime, " +
                        "st.std_task_id AS stdTaskId " +
                        "FROM pm_schedule_execution se " +
                        "JOIN pm_schedule_approval sa ON se.schedule_execution_id = sa.schedule_execution_id " +
                        "JOIN pm_task_schedules ts ON se.task_schedule_id = ts.task_schedule_id " +
                        "JOIN pm_std_tasks st ON ts.std_task_id = st.std_task_id " +
                        "LEFT JOIN equipment_element ee ON st.element_id = ee.element_id " +
                        "LEFT JOIN equipments eq ON ee.equipment_id = eq.equipment_id " +
                        "LEFT JOIN equipment_parts ep ON st.part_id = ep.part_id " +
                        "WHERE sa.approver_id = :supervisorId " +
                        "  AND sa.approval_level = 1 " +
                        "  AND sa.approval_status = 'APPROVAL_REQUESTED' " +
                        "  AND se.schedule_execution_id = :scheduleExecutionId " +
                        "  AND eq.equipment_id = :equipmentId " +
                        "  AND ee.element_id = :elementId " +
                        "  AND (:partId IS NULL OR ep.part_id = :partId)", nativeQuery = true)
        java.util.Optional<com.maint.pm_backend.dto.SupervisorTaskValidationProjection> validateAndFetchSupervisorTaskMetadata(
                        @Param("scheduleExecutionId") Long scheduleExecutionId,
                        @Param("supervisorId") Long supervisorId,
                        @Param("equipmentId") Long equipmentId,
                        @Param("elementId") Long elementId,
                        @Param("partId") Long partId);

        @Query(value = "SELECT st.uom AS uom, " +
                        "st.tolerance_min AS toleranceMin, " +
                        "st.tolerance_max AS toleranceMax, " +
                        "st.standard_value AS standardValue, " +
                        "se.actual_value AS actualValue, " +
                        "se.deviation_flag AS deviationFlag, " +
                        "se.time_taken AS timeTaken, " +
                        "se.notes AS notes, " +
                        "st.estimated_req_time AS estimatedReqTime, " +
                        "st.std_task_id AS stdTaskId " +
                        "FROM pm_schedule_execution se " +
                        "JOIN pm_schedule_approval sa ON se.schedule_execution_id = sa.schedule_execution_id " +
                        "JOIN pm_task_schedules ts ON se.task_schedule_id = ts.task_schedule_id " +
                        "JOIN pm_std_tasks st ON ts.std_task_id = st.std_task_id " +
                        "WHERE sa.approver_id = :supervisorId " +
                        "  AND sa.approval_level = 1 " +
                        "  AND sa.approval_status = 'APPROVAL_REQUESTED' " +
                        "  AND se.schedule_execution_id = :scheduleExecutionId " +
                        "  AND sa.execution_approval_id = :scheduleApprovalId", nativeQuery = true)
        java.util.Optional<com.maint.pm_backend.dto.SupervisorTaskValidationProjection> validateAndFetchSupervisorTaskMetadataByApprovalId(
                        @Param("scheduleExecutionId") Long scheduleExecutionId,
                        @Param("scheduleApprovalId") Long scheduleApprovalId,
                        @Param("supervisorId") Long supervisorId);

        @Query(value = "SELECT st.uom AS uom, " +
                        "st.tolerance_min AS toleranceMin, " +
                        "st.tolerance_max AS toleranceMax, " +
                        "st.standard_value AS standardValue, " +
                        "se.actual_value AS actualValue, " +
                        "se.deviation_flag AS deviationFlag, " +
                        "se.time_taken AS timeTaken, " +
                        "se.notes AS notes, " +
                        "st.estimated_req_time AS estimatedReqTime, " +
                        "st.std_task_id AS stdTaskId " +
                        "FROM pm_schedule_execution se " +
                        "JOIN pm_schedule_approval sa ON se.schedule_execution_id = sa.schedule_execution_id " +
                        "JOIN pm_task_schedules ts ON se.task_schedule_id = ts.task_schedule_id " +
                        "JOIN pm_std_tasks st ON ts.std_task_id = st.std_task_id " +
                        "LEFT JOIN equipment_element ee ON st.element_id = ee.element_id " +
                        "LEFT JOIN equipments eq ON ee.equipment_id = eq.equipment_id " +
                        "LEFT JOIN equipment_parts ep ON st.part_id = ep.part_id " +
                        "WHERE sa.approver_id = :approverId " +
                        "  AND sa.approval_level = :approvalLevel " +
                        "  AND sa.approval_status = 'APPROVAL_REQUESTED' " +
                        "  AND se.schedule_execution_id = :scheduleExecutionId " +
                        "  AND eq.equipment_id = :equipmentId " +
                        "  AND ee.element_id = :elementId " +
                        "  AND (:partId IS NULL OR ep.part_id = :partId)", nativeQuery = true)
        java.util.Optional<com.maint.pm_backend.dto.SupervisorTaskValidationProjection> validateAndFetchApprovalTaskMetadata(
                        @Param("scheduleExecutionId") Long scheduleExecutionId,
                        @Param("approverId") Long approverId,
                        @Param("approvalLevel") Integer approvalLevel,
                        @Param("equipmentId") Long equipmentId,
                        @Param("elementId") Long elementId,
                        @Param("partId") Long partId);

        @Query(value = "SELECT st.uom AS uom, " +
                        "st.tolerance_min AS toleranceMin, " +
                        "st.tolerance_max AS toleranceMax, " +
                        "st.standard_value AS standardValue, " +
                        "se.actual_value AS actualValue, " +
                        "se.deviation_flag AS deviationFlag, " +
                        "se.time_taken AS timeTaken, " +
                        "se.notes AS notes, " +
                        "st.estimated_req_time AS estimatedReqTime, " +
                        "st.std_task_id AS stdTaskId " +
                        "FROM pm_schedule_execution se " +
                        "JOIN pm_schedule_approval sa ON se.schedule_execution_id = sa.schedule_execution_id " +
                        "JOIN pm_task_schedules ts ON se.task_schedule_id = ts.task_schedule_id " +
                        "JOIN pm_std_tasks st ON ts.std_task_id = st.std_task_id " +
                        "WHERE sa.approver_id = :approverId " +
                        "  AND sa.approval_level = :approvalLevel " +
                        "  AND sa.approval_status = 'APPROVAL_REQUESTED' " +
                        "  AND se.schedule_execution_id = :scheduleExecutionId " +
                        "  AND sa.execution_approval_id = :scheduleApprovalId", nativeQuery = true)
        java.util.Optional<com.maint.pm_backend.dto.SupervisorTaskValidationProjection> validateAndFetchApprovalTaskMetadataByApprovalId(
                        @Param("scheduleExecutionId") Long scheduleExecutionId,
                        @Param("scheduleApprovalId") Long scheduleApprovalId,
                        @Param("approverId") Long approverId,
                        @Param("approvalLevel") Integer approvalLevel);

        @Query(value = "SELECT " +
                        "  se.schedule_execution_id AS scheduleExecutionId, " +
                        "  st.method AS taskName, " +
                        "  se.actual_value AS actualValue, " +
                        "  se.deviation_flag AS deviationFlag, " +
                        "  se.time_taken AS timeTaken, " +
                        "  se.notes AS notes, " +
                        "  se.completed_dttm AS completedDate, " +
                        "  se.status AS status, " +
                        "  emp.full_name AS executedBy " +
                        "FROM pm_schedule_execution se " +
                        "JOIN pm_task_schedules ts ON se.task_schedule_id = ts.task_schedule_id " +
                        "JOIN pm_std_tasks st ON ts.std_task_id = st.std_task_id " +
                        "JOIN employees emp ON se.employee_id = emp.employee_id " +
                        "WHERE st.std_task_id = :stdTaskId " +
                        "  AND se.status IN ('COMPLETED', 'APPROVED', 'REJECTED', " +
                        "    'UNDER_SUPERVISOR_REVIEW', 'UNDER_LINE_MANAGER_REVIEW', 'UNDER_MAINT_MANAGER_REVIEW') " +
                        "  AND se.schedule_execution_id != :excludeExecutionId " +
                        "ORDER BY se.completed_dttm DESC " +
                        "LIMIT 5", nativeQuery = true)
        List<com.maint.pm_backend.dto.HistoricalTaskProjection> findHistoricalExecutions(
                        @Param("stdTaskId") Long stdTaskId,
                        @Param("excludeExecutionId") Long excludeExecutionId);

        @Query(value = "SELECT MAX(COALESCE(se.completed_dttm, se.assigned_dttm)) " +
                        "FROM pm_schedule_execution se " +
                        "WHERE se.task_schedule_id = (" +
                        "   SELECT se2.task_schedule_id FROM pm_schedule_execution se2 WHERE se2.schedule_execution_id = :scheduleExecutionId"
                        +
                        ") " +
                        "  AND se.status IN ('IN_PROGRESS', 'COMPLETED', 'APPROVED', 'UNDER_SUPERVISOR_REVIEW', 'UNDER_LINE_MANAGER_REVIEW', 'UNDER_MAINT_MANAGER_REVIEW') "
                        +
                        "  AND se.schedule_execution_id != :scheduleExecutionId", nativeQuery = true)
        java.time.LocalDateTime findLastCompletionDateForScheduleOf(
                        @Param("scheduleExecutionId") Long scheduleExecutionId);

        /**
         * Fallback for QR scan mismatch: returns ALL tasks assigned to the employee for
         * the
         * given equipment that are still ASSIGNED or IN_PROGRESS, ordered by element
         * then part.
         * Scoped to the scanned equipment only — never returns tasks from other
         * equipment.
         */
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
                        "  AND se.status IN ('ASSIGNED', 'IN_PROGRESS') " +
                        "  AND CAST(se.due_date AS DATE) <= :endDate " +
                        "ORDER BY ee.element_id, ep.part_id", nativeQuery = true)
        List<com.maint.pm_backend.dto.QRTaskProjection> findAssignedTasksForEquipment(
                        @Param("employeeId") Long employeeId,
                        @Param("equipmentId") Long equipmentId,
                        @Param("endDate") java.time.LocalDate endDate);

        /**
         * Fetch the data required to construct S3 document paths for a given task
         * execution.
         * Resolves: companyCode, plantCode, machineCode (equipment code), taskRefNo.
         *
         * S3 path pattern:
         * Task SOP : {companyCode}/{plantCode}/{machineCode}/tasks-sop/{taskRefNo}.pdf
         * Manual : {companyCode}/{plantCode}/{machineCode}/manuals/{machineCode}.pdf
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

        /**
         * Fetch all data required to compose the S3 observation image upload path.
         *
         * Path:
         * pm-tasks-observations/{companyCode}/{plantCode}/{equipmentCode}/{elementRefNo}/{partName}/{taskRefNo}_{scheduleId}/{executionId}/{executionId}_{taskRefNo}.jpg
         */
        @Query(value = "SELECT " +
                        "  c.code AS companyCode, " +
                        "  p.code AS plantCode, " +
                        "  eq.code AS machineCode, " +
                        "  ee.ref_no AS elementRefNo, " +
                        "  ep.name AS partName, " +
                        "  se.task_schedule_id AS taskScheduleId, " +
                        "  se.schedule_execution_id AS scheduleExecutionId, " +
                        "  st.task_ref_no AS taskRefNo " +
                        "FROM pm_schedule_execution se " +
                        "JOIN pm_task_schedules ts ON se.task_schedule_id = ts.task_schedule_id " +
                        "JOIN pm_std_tasks st ON ts.std_task_id = st.std_task_id " +
                        "LEFT JOIN equipment_element ee ON st.element_id = ee.element_id " +
                        "LEFT JOIN equipment_parts ep ON st.part_id = ep.part_id " +
                        "LEFT JOIN equipments eq ON ee.equipment_id = eq.equipment_id " +
                        "LEFT JOIN plants p ON eq.plant_id = p.id " +
                        "LEFT JOIN companies c ON p.company_id = c.id " +
                        "WHERE se.schedule_execution_id = :scheduleExecutionId " +
                        "  AND se.employee_id = :employeeId", nativeQuery = true)
        java.util.Optional<com.maint.pm_backend.dto.ObservationPathProjection> findObservationPathDetails(
                        @Param("scheduleExecutionId") Long scheduleExecutionId,
                        @Param("employeeId") Long employeeId);

        @Query("SELECT se FROM PmScheduleExecution se " +
               "WHERE se.taskSchedule.stdTask.partId = :partId " +
               "AND se.status IN ('ASSIGNED', 'IN_PROGRESS') " +
               "ORDER BY se.dueDate ASC")
        List<PmScheduleExecution> findUpcomingForPart(@Param("partId") Long partId);

        @Query("SELECT se FROM PmScheduleExecution se " +
               "WHERE se.taskSchedule.stdTask.partId = :partId " +
               "AND se.status IN ('COMPLETED', 'APPROVED', 'UNDER_SUPERVISOR_REVIEW', 'UNDER_LINE_MANAGER_REVIEW', 'UNDER_MAINT_MANAGER_REVIEW') " +
               "ORDER BY se.completedDttm DESC")
        List<PmScheduleExecution> findPastExecutionsForPart(@Param("partId") Long partId);

        // ─── Line Manager Dashboard Queries ───────────────────────────────────────

        @Query(value =
            "SELECT COUNT(DISTINCT se.schedule_execution_id) " +
            "FROM pm_schedule_execution se " +
            "JOIN pm_task_schedules ts ON se.task_schedule_id = ts.task_schedule_id " +
            "JOIN pm_std_tasks st ON ts.std_task_id = st.std_task_id " +
            "LEFT JOIN equipment_element ee ON st.element_id = ee.element_id " +
            "LEFT JOIN equipments eq ON ee.equipment_id = eq.equipment_id " +
            "LEFT JOIN lines l ON eq.line_id = l.line_id " +
            "WHERE l.line_manager_id = :lineManagerId " +
            "  AND se.status IN ('ASSIGNED', 'IN_PROGRESS')",
            nativeQuery = true)
        int countActiveTasksForLineManager(@Param("lineManagerId") Long lineManagerId);

        @Query(value =
            "SELECT COUNT(DISTINCT se.schedule_execution_id) " +
            "FROM pm_schedule_execution se " +
            "JOIN pm_task_schedules ts ON se.task_schedule_id = ts.task_schedule_id " +
            "JOIN pm_std_tasks st ON ts.std_task_id = st.std_task_id " +
            "LEFT JOIN equipment_element ee ON st.element_id = ee.element_id " +
            "LEFT JOIN equipments eq ON ee.equipment_id = eq.equipment_id " +
            "LEFT JOIN lines l ON eq.line_id = l.line_id " +
            "WHERE l.line_manager_id = :lineManagerId " +
            "  AND se.status IN ('UNDER_SUPERVISOR_REVIEW', 'UNDER_LINE_MANAGER_REVIEW', 'UNDER_MAINT_MANAGER_REVIEW')",
            nativeQuery = true)
        int countPendingReviewTasksForLineManager(@Param("lineManagerId") Long lineManagerId);

        @Query(value =
            "SELECT COUNT(DISTINCT se.schedule_execution_id) " +
            "FROM pm_schedule_execution se " +
            "JOIN pm_task_schedules ts ON se.task_schedule_id = ts.task_schedule_id " +
            "JOIN pm_std_tasks st ON ts.std_task_id = st.std_task_id " +
            "LEFT JOIN equipment_element ee ON st.element_id = ee.element_id " +
            "LEFT JOIN equipments eq ON ee.equipment_id = eq.equipment_id " +
            "LEFT JOIN lines l ON eq.line_id = l.line_id " +
            "WHERE l.line_manager_id = :lineManagerId " +
            "  AND se.status = 'REJECTED' " +
            "  AND NOT EXISTS (" +
            "      SELECT 1 FROM pm_schedule_execution re " +
            "      WHERE re.parent_schedule_execution_id = se.schedule_execution_id " +
            "        AND re.status IN ('COMPLETED', 'APPROVED', 'UNDER_SUPERVISOR_REVIEW', 'UNDER_LINE_MANAGER_REVIEW', 'UNDER_MAINT_MANAGER_REVIEW') " +
            "  )",
            nativeQuery = true)
        int countRejectedTasksForLineManager(@Param("lineManagerId") Long lineManagerId);

        @Query(value =
            "SELECT COUNT(DISTINCT eq.equipment_id) " +
            "FROM equipments eq " +
            "JOIN lines l ON eq.line_id = l.line_id " +
            "WHERE l.line_manager_id = :lineManagerId",
            nativeQuery = true)
        int countTotalMachinesForLineManager(@Param("lineManagerId") Long lineManagerId);

        @Query(value =
            "SELECT COUNT(DISTINCT eq.equipment_id) " +
            "FROM equipments eq " +
            "JOIN lines l ON eq.line_id = l.line_id " +
            "JOIN equipment_element ee ON ee.equipment_id = eq.equipment_id " +
            "JOIN pm_std_tasks st ON st.element_id = ee.element_id " +
            "JOIN pm_task_schedules ts ON ts.std_task_id = st.std_task_id " +
            "JOIN pm_schedule_execution se ON se.task_schedule_id = ts.task_schedule_id " +
            "JOIN issue_flags f ON f.schedule_execution_id = se.schedule_execution_id " +
            "WHERE l.line_manager_id = :lineManagerId " +
            "  AND f.flag_status != 'CLOSED'",
            nativeQuery = true)
        int countUnhealthyMachinesForLineManager(@Param("lineManagerId") Long lineManagerId);

        @Query(value =
            "SELECT COUNT(f.flag_id) " +
            "FROM issue_flags f " +
            "JOIN pm_schedule_execution se ON f.schedule_execution_id = se.schedule_execution_id " +
            "JOIN pm_task_schedules ts     ON se.task_schedule_id = ts.task_schedule_id " +
            "JOIN pm_std_tasks st          ON ts.std_task_id = st.std_task_id " +
            "LEFT JOIN equipment_element ee ON st.element_id = ee.element_id " +
            "LEFT JOIN equipments eq        ON ee.equipment_id = eq.equipment_id " +
            "LEFT JOIN lines l              ON eq.line_id = l.line_id " +
            "WHERE l.line_manager_id = :lineManagerId " +
            "  AND f.flag_status != 'CLOSED'",
            nativeQuery = true)
        int countActiveFlagsForLineManager(@Param("lineManagerId") Long lineManagerId);

        @Query(value =
            "SELECT " +
            "  eq.equipment_id AS equipmentId, " +
            "  eq.name AS equipmentName, " +
            "  ee.element_id AS elementId, " +
            "  ee.element_name AS elementName, " +
            "  ep.part_id AS partId, " +
            "  ep.name AS partName " +
            "FROM equipments eq " +
            "JOIN lines l ON eq.line_id = l.line_id " +
            "LEFT JOIN equipment_element ee ON ee.equipment_id = eq.equipment_id " +
            "LEFT JOIN equipment_parts ep ON ep.equipment_element_id = ee.element_id " +
            "WHERE l.line_manager_id = :lineManagerId " +
            "ORDER BY eq.name, ee.element_name, ep.name",
            nativeQuery = true)
        List<com.maint.pm_backend.dto.EquipmentHierarchyProjection> findEquipmentHierarchyForLineManager(@Param("lineManagerId") Long lineManagerId);

        @Query(value = "SELECT " +
            "  NULL AS scheduleApprovalId, " +
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
            "  emp.full_name AS employeeName, " +
            "  se.deviation_flag AS deviationFlag, " +
            "  CASE WHEN f.flag_status IS NOT NULL AND f.flag_status != 'CLOSED' THEN true ELSE false END AS hasActiveFlag, " +
            "  f.flag_status AS activeFlagStatus, " +
            "  se.status AS executionStatus " +
            "FROM pm_schedule_execution se " +
            "JOIN pm_task_schedules ts ON se.task_schedule_id = ts.task_schedule_id " +
            "JOIN pm_std_tasks st ON ts.std_task_id = st.std_task_id " +
            "LEFT JOIN employees emp ON se.employee_id = emp.employee_id " +
            "LEFT JOIN equipment_element ee ON st.element_id = ee.element_id " +
            "LEFT JOIN equipments eq ON ee.equipment_id = eq.equipment_id " +
            "LEFT JOIN equipment_parts ep ON st.part_id = ep.part_id " +
            "LEFT JOIN lines l ON eq.line_id = l.line_id " +
            "LEFT JOIN issue_flags f ON se.schedule_execution_id = f.schedule_execution_id " +
            "WHERE l.line_manager_id = :lineManagerId " +
            "  AND se.status IN ('ASSIGNED', 'IN_PROGRESS')", nativeQuery = true)
        List<com.maint.pm_backend.dto.TaskDetailsProjection> findActiveTasksListForLineManager(@Param("lineManagerId") Long lineManagerId);

}
