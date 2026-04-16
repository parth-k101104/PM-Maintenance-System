package com.maint.pm_backend.dto;

/**
 * Projection interface to fetch all data required to build S3 paths for manuals and task SOPs.
 * Resolved by joining pm_schedule_execution → pm_std_tasks → equipment_element → equipments
 * → plants → companies for a given schedule execution ID.
 */
public interface DocumentPathProjection {
    /** Company code (e.g. "AAC") used as top-level S3 folder */
    String getCompanyCode();

    /** Plant code (e.g. "DET-01") used as second-level S3 folder */
    String getPlantCode();

    /** Equipment/machine code (e.g. "EQ-PKG-CONV-01") used as third-level S3 folder */
    String getMachineCode();

    /** Task reference number (e.g. "PM-CONV-001") used as the SOP PDF filename */
    String getTaskRefNo();
}
