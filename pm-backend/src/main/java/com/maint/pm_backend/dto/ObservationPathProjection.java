package com.maint.pm_backend.dto;

/**
 * Projection to fetch all data needed to compose the S3 observation image path.
 *
 * Path pattern:
 *   pm-tasks-observations/{companyCode}/{plantCode}/{equipmentCode}/{elementRefNo}/{partName}/{taskRefNo}_{scheduleId}/{executionId}/{executionId}_{taskRefNo}.jpg
 */
public interface ObservationPathProjection {
    /** e.g. "AAC" */
    String getCompanyCode();
    /** e.g. "DET-01" */
    String getPlantCode();
    /** Equipment code e.g. "EQ-PKG-CONV-01" */
    String getMachineCode();
    /** Element ref_no e.g. "CONV-BELT" */
    String getElementRefNo();
    /** Part name e.g. "Tracking Sensor" */
    String getPartName();
    /** Numeric task schedule ID (used as sub-folder identifier alongside taskRefNo) */
    Long getTaskScheduleId();
    /** Numeric schedule execution ID */
    Long getScheduleExecutionId();
    /** Task reference number e.g. "PM-10002-05" */
    String getTaskRefNo();
}
