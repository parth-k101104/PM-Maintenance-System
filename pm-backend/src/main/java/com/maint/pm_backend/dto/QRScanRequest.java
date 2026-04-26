package com.maint.pm_backend.dto;

import lombok.Data;

@Data
public class QRScanRequest {
    private Long equipmentId;
    private Long equipmentElementId;
    private Long equipmentPartId;
    private Long scheduleExecutionId;
    private Long scheduleApprovalId;
}
