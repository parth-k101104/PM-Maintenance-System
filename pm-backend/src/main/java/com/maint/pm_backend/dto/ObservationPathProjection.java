package com.maint.pm_backend.dto;

/**
 * Projection to fetch all data needed to compose the S3 observation image path.
 *
 * Path pattern:
 *   pm-tasks-observations/{companyCode}/{plantCode}/{machineCode}/{elementId}/{partId}/{scheduleId}/{executionId}/{executionId}_{taskRefNo}.jpg
 */
public interface ObservationPathProjection {
    /** e.g. "AAC" */
    String getCompanyCode();
    /** e.g. "DET-01" */
    String getPlantCode();
    /** e.g. "EQ-PKG-CONV-01" */
    String getMachineCode();
    /** Numeric element ID */
    Long getElementId();
    /** Numeric part ID */
    Long getPartId();
    /** Numeric task schedule ID */
    Long getTaskScheduleId();
    /** Numeric execution ID */
    Long getScheduleExecutionId();
    /** Task reference number e.g. "PM-CONV-001" used as the unique task code */
    String getTaskRefNo();
}
