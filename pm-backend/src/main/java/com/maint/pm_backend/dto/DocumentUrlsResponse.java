package com.maint.pm_backend.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Response DTO containing presigned URLs for a task's related documents.
 */
@Data
@AllArgsConstructor
@NoArgsConstructor
public class DocumentUrlsResponse {

    /** Presigned URL for the task SOP PDF stored at:
     *  {bucket}/{companyCode}/{plantCode}/{machineCode}/tasks-sop/{taskRefNo}.pdf */
    private String taskSopUrl;

    /** Presigned URL for the machine manual PDF stored at:
     *  {bucket}/{companyCode}/{plantCode}/{machineCode}/manuals/{machineCode}.pdf */
    private String machineManualUrl;

    /** Resolved S3 key for the task SOP (for debugging / logging) */
    private String taskSopKey;

    /** Resolved S3 key for the machine manual (for debugging / logging) */
    private String machineManualKey;
}
