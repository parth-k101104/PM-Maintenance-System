package com.maint.pm_backend.service;

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
    private final ConfigParamService configParamService;
    private final com.maint.pm_backend.repository.IssueFlagRepository issueFlagRepository;

    public com.maint.pm_backend.dto.QRScanResponse handleQRScan(com.maint.pm_backend.dto.QRScanRequest request, Long employeeId) {
        Employee employee = employeeRepository.findById(employeeId)
                .orElseThrow(() -> new RuntimeException("Employee not found"));

        // Use centralized DateUtils instead of hardcoded baseline date
        LocalDate today = com.maint.pm_backend.util.DateUtils.getToday();
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
                long recentDays = configParamService.getTaskRecentCompletionThresholdDays();
                if (lastCompletion != null && lastCompletion.isAfter(today.atStartOfDay().minusDays(recentDays))) {
                    return com.maint.pm_backend.dto.QRScanResponse.builder()
                            .status("recently_completed")
                            .message("Last execution for the scanned task was done recently (less than " + recentDays + " days ago).")
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

        execution.setCompletedDttm(com.maint.pm_backend.util.DateUtils.getNow());
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

        boolean issueFlagged = false;
        String responseMessage = "Task completed and sent for review";

        // --- Handle Issue Flags ---
        
        // 1. Manual Flag (if requested in payload)
        if (request.isManualDeviation() && request.getManualFlagStatus() != null) {
            com.maint.pm_backend.entity.IssueFlag manualFlag = com.maint.pm_backend.entity.IssueFlag.builder()
                    .scheduleExecution(execution)
                    .raisedBy(execution.getEmployee())
                    .raisedDttm(com.maint.pm_backend.util.DateUtils.getNow())
                    .issueDetails(request.getManualIssueDetails())
                    .criticality(com.maint.pm_backend.entity.enums.IssueFlagCriticality.CRITICAL)
                    .flagStatus(com.maint.pm_backend.entity.enums.IssueFlagStatus.fromValue(request.getManualFlagStatus()))
                    .attendant(execution.getEmployee())
                    .build();
            issueFlagRepository.save(manualFlag);
            issueFlagged = true;
            responseMessage = "Issue flagged manually: " + (request.getManualIssueDetails() != null ? request.getManualIssueDetails() : "No details provided");
        }
        // 2. Automated Flag (on deviation)
        else if (isDeviated) {
            com.maint.pm_backend.entity.IssueFlag autoFlag = com.maint.pm_backend.entity.IssueFlag.builder()
                    .scheduleExecution(execution)
                    .raisedBy(null) // Automated, raised by system
                    .raisedDttm(com.maint.pm_backend.util.DateUtils.getNow())
                    .issueDetails("Automated flag: Value " + execution.getActualValue() + " is outside tolerance.")
                    .criticality(com.maint.pm_backend.entity.enums.IssueFlagCriticality.HIGH)
                    .flagStatus(com.maint.pm_backend.entity.enums.IssueFlagStatus.REPLACEMENT_REQUIRED)
                    .attendant(execution.getEmployee())
                    .build();
            issueFlagRepository.save(autoFlag);
            issueFlagged = true;
            responseMessage = "Automated deviation detected: Value " + execution.getActualValue() + " is outside tolerance limits.";
        }
        // 3. Normal Execution - Check for pre-existing flags
        else {
            List<com.maint.pm_backend.entity.IssueFlag> existingFlags = issueFlagRepository.findByScheduleExecution_ScheduleExecutionId(execution.getScheduleExecutionId());
            boolean hasPendingFlag = false;
            for (com.maint.pm_backend.entity.IssueFlag f : existingFlags) {
                if (f.getFlagStatus() != com.maint.pm_backend.entity.enums.IssueFlagStatus.CLOSED) {
                    hasPendingFlag = true;
                    break;
                }
                if (f.getAddressedDttm() == null || !f.getAddressedDttm().toLocalDate().isBefore(com.maint.pm_backend.util.DateUtils.getToday())) {
                    hasPendingFlag = true;
                    break;
                }
            }
            if (hasPendingFlag) {
                issueFlagged = true;
                responseMessage = "Task completed but an associated issue flag is still pending.";
            }
        }

        if (issueFlagged) {
            execution.setStatus(com.maint.pm_backend.entity.enums.TaskExecutionStatus.FLAGGED_AND_COMPLETED);
            executionRepository.save(execution);
            
            java.util.List<com.maint.pm_backend.entity.PmScheduleApproval> approvals = approvalRepository.findByScheduleExecution_ScheduleExecutionId(execution.getScheduleExecutionId());
            for (com.maint.pm_backend.entity.PmScheduleApproval approval : approvals) {
                approval.setApprovalStatus(com.maint.pm_backend.entity.enums.TaskApprovalStatus.DEVIATION_FLAGGED);
                approvalRepository.save(approval);
            }
        } else {
            execution.setStatus(com.maint.pm_backend.entity.enums.TaskExecutionStatus.UNDER_SUPERVISOR_REVIEW);
            executionRepository.save(execution);

            // Update Level 1 Approval only if no issue flagged
            java.util.Optional<com.maint.pm_backend.entity.PmScheduleApproval> approvalOpt =
                    approvalRepository.findByScheduleExecution_ScheduleExecutionIdAndApprovalLevel(execution.getScheduleExecutionId(), 1);

            if (approvalOpt.isPresent()) {
                com.maint.pm_backend.entity.PmScheduleApproval approval = approvalOpt.get();
                approval.setApprovalStatus(com.maint.pm_backend.entity.enums.TaskApprovalStatus.APPROVAL_REQUESTED);
                approval.setApprovalDueDate(com.maint.pm_backend.util.DateUtils.getNow().plusDays(configParamService.getApprovalDueDateOffsetDays()));
                approvalRepository.save(approval);
            }
        }

        return com.maint.pm_backend.dto.TaskCompletionResponse.builder()
                .status("success")
                .message(responseMessage)
                .build();
    }

    public com.maint.pm_backend.dto.SupervisorQRScanResponse handleSupervisorQRScan(com.maint.pm_backend.dto.QRScanRequest request, Long supervisorId) {
        return handleApprovalQRScan(request, supervisorId, 1, 3L, "Supervisor");
    }

    public com.maint.pm_backend.dto.SupervisorQRScanResponse handleApprovalQRScan(
            com.maint.pm_backend.dto.QRScanRequest request,
            Long approverId,
            Integer approvalLevel,
            Long requiredRoleId,
            String roleLabel) {
        Employee approver = employeeRepository.findById(approverId)
                .orElseThrow(() -> new RuntimeException("Supervisor not found"));

        if (approver.getRoleId() == null || !approver.getRoleId().equals(requiredRoleId)) {
            throw new RuntimeException("Access denied: only " + roleLabel.toLowerCase() + "s can access this");
        }

        if (request.getScheduleExecutionId() == null) {
            return com.maint.pm_backend.dto.SupervisorQRScanResponse.builder()
                    .status("error")
                    .message("Missing schedule execution ID.")
                    .build();
        }

        java.util.Optional<com.maint.pm_backend.dto.SupervisorTaskValidationProjection> validation;

        if (request.getScheduleApprovalId() != null) {
            validation = executionRepository.validateAndFetchApprovalTaskMetadataByApprovalId(
                    request.getScheduleExecutionId(),
                    request.getScheduleApprovalId(),
                    approverId,
                    approvalLevel);
        } else if (request.getEquipmentId() != null) {
            validation = executionRepository.validateAndFetchApprovalTaskMetadata(
                    request.getScheduleExecutionId(), approverId, approvalLevel,
                    request.getEquipmentId(),
                    request.getEquipmentElementId(),
                    request.getEquipmentPartId());
        } else {
            // No equipment scan and no approval ID, but we have scheduleExecutionId (SKIP case)
            validation = executionRepository.fetchApprovalTaskMetadataOnly(
                    request.getScheduleExecutionId(), approverId, approvalLevel);
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

