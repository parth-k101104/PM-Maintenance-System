package com.maint.pm_backend.service;

import com.maint.pm_backend.dto.DocumentPathProjection;
import com.maint.pm_backend.dto.DocumentUrlsResponse;
import com.maint.pm_backend.repository.PmScheduleExecutionRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

/**
 * Service responsible for resolving the correct S3 document paths for a given task execution
 * and returning presigned URLs for both the task SOP and machine manual PDFs.
 *
 * S3 path structure:
 *   Task SOP : {companyCode}/{plantCode}/{machineCode}/tasks-sop/{taskRefNo}.pdf
 *   Manual   : {companyCode}/{plantCode}/{machineCode}/manuals/{machineCode}.pdf
 *
 * Example:
 *   AAC/DET-01/EQ-PKG-CONV-01/tasks-sop/PM-CONV-001.pdf
 *   AAC/DET-01/EQ-PKG-CONV-01/manuals/EQ-PKG-CONV-01.pdf
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class DocumentService {

    private final PmScheduleExecutionRepository executionRepository;
    private final AwsS3Service awsS3Service;

    /**
     * Resolves document paths and returns presigned S3 URLs for a given task execution.
     *
     * @param scheduleExecutionId the PM schedule execution ID (from today's or upcoming task list)
     * @param employeeId          the requesting employee's ID (validates ownership)
     * @return {@link DocumentUrlsResponse} with presigned URLs and resolved S3 keys
     * @throws RuntimeException if execution record is not found or belongs to another employee
     */
    public DocumentUrlsResponse getDocumentUrls(Long scheduleExecutionId, Long employeeId) {
        DocumentPathProjection pathData = executionRepository
                .findDocumentPathDetails(scheduleExecutionId, employeeId)
                .orElseThrow(() -> {
                    log.warn("No execution record found for scheduleExecutionId={} employeeId={}",
                            scheduleExecutionId, employeeId);
                    return new RuntimeException(
                            "Task execution not found or not assigned to this employee. " +
                            "ID: " + scheduleExecutionId);
                });

        String companyCode  = pathData.getCompanyCode();
        String plantCode    = pathData.getPlantCode();
        String machineCode  = pathData.getMachineCode();
        String taskRefNo    = pathData.getTaskRefNo();

        log.info("Building S3 paths for execution={} company={} plant={} machine={} task={}",
                scheduleExecutionId, companyCode, plantCode, machineCode, taskRefNo);

        // Build S3 object keys (path within bucket)
        String taskSopKey      = buildTaskSopKey(companyCode, plantCode, machineCode, taskRefNo);
        String machineManualKey = buildMachineManualKey(companyCode, plantCode, machineCode);

        // Generate time-limited presigned URLs
        String taskSopUrl       = awsS3Service.generatePresignedUrl(taskSopKey);
        String machineManualUrl = awsS3Service.generatePresignedUrl(machineManualKey);

        return new DocumentUrlsResponse(taskSopUrl, machineManualUrl, taskSopKey, machineManualKey);
    }

    // ---------------------------------------------------------------------------
    // S3 Key Builders
    // ---------------------------------------------------------------------------

    /**
     * Builds the S3 object key for the task SOP PDF.
     * Pattern: {companyCode}/{plantCode}/{machineCode}/tasks-sop/{taskRefNo}.pdf
     */
    private String buildTaskSopKey(String companyCode, String plantCode,
                                   String machineCode, String taskRefNo) {
        return String.format("%s/%s/%s/tasks-sop/%s.pdf",
                companyCode, plantCode, machineCode, taskRefNo);
    }

    /**
     * Builds the S3 object key for the machine manual PDF.
     * Pattern: {companyCode}/{plantCode}/{machineCode}/manuals/{machineCode}.pdf
     */
    private String buildMachineManualKey(String companyCode, String plantCode, String machineCode) {
        return String.format("%s/%s/%s/manuals/%s.pdf",
                companyCode, plantCode, machineCode, machineCode);
    }
}
