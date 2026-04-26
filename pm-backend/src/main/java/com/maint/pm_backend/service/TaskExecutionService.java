package com.maint.pm_backend.service;

import com.maint.pm_backend.config.AppWorkflowProperties;
import com.maint.pm_backend.entity.Employee;
import com.maint.pm_backend.repository.EmployeeRepository;
import com.maint.pm_backend.repository.PmScheduleExecutionRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.util.List;

@Service
@RequiredArgsConstructor
public class TaskExecutionService {

    private final PmScheduleExecutionRepository executionRepository;
    private final EmployeeRepository employeeRepository;
    private final com.maint.pm_backend.repository.PmScheduleApprovalRepository approvalRepository;
    private final AwsS3Service awsS3Service;
    private final AppWorkflowProperties workflowProperties;

    public com.maint.pm_backend.dto.QRScanResponse handleQRScan(com.maint.pm_backend.dto.QRScanRequest request, Long employeeId) {
        Employee employee = employeeRepository.findById(employeeId)
                .orElseThrow(() -> new RuntimeException("Employee not found"));

        // Fixed baseline date for 'today' due to static database seeding (Feb 1st, 2026)
        LocalDate today = LocalDate.of(2026, 2, 1);
        LocalDate endOfMonth = today.withDayOfMonth(today.lengthOfMonth());

        // 1. Access Level Check
        boolean isOperator = employee.getRoleId() != null && 
            (employee.getRoleId() == 4 || employee.getRoleId() == 5 || employee.getRoleId() == 7);
        // Let's assume roles 4 (Electrician), 5 (Fitter), 7 (Production Operator) align to Operator Level 1
        // Fallback: Just assume operator flow for now as requested.

        if (request.getScheduleExecutionId() != null && request.getEquipmentId() != null) {
            java.util.Optional<com.maint.pm_backend.dto.TaskValidationProjection> validation = executionRepository.validateAndFetchTaskMetadata(
                    request.getScheduleExecutionId(), employeeId,
                    request.getEquipmentId(),
                    request.getEquipmentElementId(),
                    request.getEquipmentPartId(),
                    endOfMonth);
            if (validation.isPresent()) {
                // Check if the task was recently executed (less than a week ago)
                java.time.LocalDateTime lastCompletion = executionRepository.findLastCompletionDateForScheduleOf(request.getScheduleExecutionId());
                if (lastCompletion != null && lastCompletion.isAfter(today.atStartOfDay().minusDays(7))) {
                    return com.maint.pm_backend.dto.QRScanResponse.builder()
                            .status("recently_completed")
                            .message("Last execution for the scanned task was done recently (less than a week ago).")
                            .build();
                }

                com.maint.pm_backend.dto.TaskValidationProjection data = validation.get();

                // Generate presigned PUT URL for observation image upload
                com.maint.pm_backend.dto.QRScanResponse.QRScanResponseBuilder responseBuilder =
                        com.maint.pm_backend.dto.QRScanResponse.builder()
                                .status("success")
                                .message("Task assigned and verified")
                                .uom(data.getUom())
                                .toleranceMin(data.getToleranceMin())
                                .toleranceMax(data.getToleranceMax())
                                .standardValue(data.getStandardValue());

                executionRepository.findObservationPathDetails(request.getScheduleExecutionId(), employeeId)
                        .ifPresent(obs -> {
                            AwsS3Service.ObservationUploadResult uploadResult =
                                    awsS3Service.generateObservationUploadUrl(
                                            obs.getCompanyCode(), obs.getPlantCode(), obs.getMachineCode(),
                                            obs.getElementRefNo(), obs.getPartName(),
                                            obs.getTaskRefNo(), obs.getTaskScheduleId(),
                                            obs.getScheduleExecutionId());
                            responseBuilder
                                    .observationUploadUrl(uploadResult.presignedUploadUrl())
                                    .observationS3Key(uploadResult.s3Key())
                                    .uploadExpiresInMinutes(uploadResult.expiresInMinutes());
                        });

                return responseBuilder.build();
            }
        }

        // Fallback: return all tasks for this employee on the scanned equipment only
        List<com.maint.pm_backend.dto.QRTaskProjection> assignedTasks =
                executionRepository.findAssignedTasksForEquipment(
                        employeeId, request.getEquipmentId(), endOfMonth);

        if (assignedTasks.isEmpty()) {
            return com.maint.pm_backend.dto.QRScanResponse.builder()
                    .status("not_assigned")
                    .message("No tasks assigned to you for this equipment at all.")
                    .relatedPartTasks(java.util.Collections.emptyList())
                    .relatedMachineTasks(java.util.Collections.emptyList())
                    .build();
        } else {
            return com.maint.pm_backend.dto.QRScanResponse.builder()
                    .status("not_found")
                    .message("The specific task scanned is not assigned to you, but you have other tasks for this equipment. Please select from the list.")
                    .relatedPartTasks(assignedTasks)
                    .relatedMachineTasks(java.util.Collections.emptyList())
                    .build();
        }
    }

    public com.maint.pm_backend.dto.TaskCompletionResponse completeTask(com.maint.pm_backend.dto.TaskCompletionRequest request, Long employeeId) {
        com.maint.pm_backend.entity.PmScheduleExecution execution = executionRepository.findById(request.getScheduleExecutionId())
                .orElseThrow(() -> new RuntimeException("Task Execution not found"));

        if (!execution.getEmployee().getEmployeeId().equals(employeeId)) {
            throw new RuntimeException("Not authorized to complete this task");
        }

        if (execution.getStatus() != com.maint.pm_backend.entity.enums.TaskExecutionStatus.ASSIGNED &&
            execution.getStatus() != com.maint.pm_backend.entity.enums.TaskExecutionStatus.IN_PROGRESS) {
            throw new RuntimeException("Task is not in a valid state for completion");
        }

        execution.setCompletedDttm(java.time.LocalDateTime.now());
        execution.setTimeTaken(request.getTimeTaken());
        execution.setActualValue(request.getActualValue());
        execution.setNotes(request.getNotes());

        // Check Deviation
        boolean isDeviated = false;
        if (request.getActualValue() != null) {
            com.maint.pm_backend.entity.PmStdTask stdTask = execution.getTaskSchedule().getStdTask();
            if (stdTask.getToleranceMin() != null && stdTask.getToleranceMax() != null) {
                if (request.getActualValue().compareTo(stdTask.getToleranceMin()) < 0 ||
                    request.getActualValue().compareTo(stdTask.getToleranceMax()) > 0) {
                    isDeviated = true;
                }
            }
        }
        execution.setDeviationFlag(isDeviated);
        execution.setStatus(com.maint.pm_backend.entity.enums.TaskExecutionStatus.UNDER_SUPERVISOR_REVIEW);

        executionRepository.save(execution);

        // Update Level 1 Approval
        java.util.Optional<com.maint.pm_backend.entity.PmScheduleApproval> approvalOpt =
                approvalRepository.findByScheduleExecution_ScheduleExecutionIdAndApprovalLevel(execution.getScheduleExecutionId(), 1);

        if (approvalOpt.isPresent()) {
            com.maint.pm_backend.entity.PmScheduleApproval approval = approvalOpt.get();
            approval.setApprovalStatus(com.maint.pm_backend.entity.enums.TaskApprovalStatus.APPROVAL_REQUESTED);
            approval.setApprovalDueDate(java.time.LocalDateTime.now().plusDays(workflowProperties.getApprovalDueDateOffsetDays()));
            approvalRepository.save(approval);
        }

        return com.maint.pm_backend.dto.TaskCompletionResponse.builder()
                .status("success")
                .message("Task completed and sent for review")
                .build();
    }

    public com.maint.pm_backend.dto.SupervisorQRScanResponse handleSupervisorQRScan(com.maint.pm_backend.dto.QRScanRequest request, Long supervisorId) {
        Employee supervisor = employeeRepository.findById(supervisorId)
                .orElseThrow(() -> new RuntimeException("Supervisor not found"));

        if (supervisor.getRoleId() == null || supervisor.getRoleId() != 3L) {
            throw new RuntimeException("Access denied: only supervisors can access this");
        }

        if (request.getScheduleExecutionId() == null) {
            return com.maint.pm_backend.dto.SupervisorQRScanResponse.builder()
                    .status("error")
                    .message("Missing schedule execution ID in QR scan.")
                    .build();
        }

        java.util.Optional<com.maint.pm_backend.dto.SupervisorTaskValidationProjection> validation;

        if (request.getScheduleApprovalId() != null) {
            validation = executionRepository.validateAndFetchSupervisorTaskMetadataByApprovalId(
                    request.getScheduleExecutionId(),
                    request.getScheduleApprovalId(),
                    supervisorId);
        } else {
            if (request.getEquipmentId() == null) {
                return com.maint.pm_backend.dto.SupervisorQRScanResponse.builder()
                        .status("error")
                        .message("Missing equipment ID and schedule approval ID in QR scan.")
                        .build();
            }
            validation = executionRepository.validateAndFetchSupervisorTaskMetadata(
                    request.getScheduleExecutionId(), supervisorId,
                    request.getEquipmentId(),
                    request.getEquipmentElementId(),
                    request.getEquipmentPartId());
        }

        if (validation.isPresent()) {
            com.maint.pm_backend.dto.SupervisorTaskValidationProjection data = validation.get();

            com.maint.pm_backend.dto.SupervisorQRScanResponse.SupervisorQRScanResponseBuilder responseBuilder =
                    com.maint.pm_backend.dto.SupervisorQRScanResponse.builder()
                            .status("success")
                            .message("Task ready for review")
                            .uom(data.getUom())
                            .toleranceMin(data.getToleranceMin())
                            .toleranceMax(data.getToleranceMax())
                            .standardValue(data.getStandardValue())
                            .actualValue(data.getActualValue())
                            .deviationFlag(data.getDeviationFlag())
                            .timeTaken(data.getTimeTaken())
                            .notes(data.getNotes())
                            .estimatedReqTime(data.getEstimatedReqTime());

            // Get historical executions
            List<com.maint.pm_backend.dto.HistoricalTaskProjection> historicalExecutions = executionRepository.findHistoricalExecutions(data.getStdTaskId(), request.getScheduleExecutionId());
            responseBuilder.historicalData(historicalExecutions);

            // Need to get operator's employeeId to resolve S3 path
            com.maint.pm_backend.entity.PmScheduleExecution execution = executionRepository.findById(request.getScheduleExecutionId()).orElse(null);
            if (execution != null) {
                Long operatorId = execution.getEmployee().getEmployeeId();
                executionRepository.findObservationPathDetails(request.getScheduleExecutionId(), operatorId)
                        .ifPresent(obs -> {
                            String url = awsS3Service.generateObservationGetUrl(
                                    obs.getCompanyCode(), obs.getPlantCode(), obs.getMachineCode(),
                                    obs.getElementRefNo(), obs.getPartName(),
                                    obs.getTaskRefNo(), obs.getTaskScheduleId(),
                                    obs.getScheduleExecutionId());
                            responseBuilder.observationPhotoUrl(url);
                        });
            }

            return responseBuilder.build();
        }

        return com.maint.pm_backend.dto.SupervisorQRScanResponse.builder()
                .status("not_found")
                .message("No matching pending approval task found for this equipment.")
                .build();
    }
}
