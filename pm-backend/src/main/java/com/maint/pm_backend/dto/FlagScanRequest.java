package com.maint.pm_backend.dto;

import lombok.Data;

/** Request body for the flag QR-scan endpoint. */
@Data
public class FlagScanRequest {
    private Long equipmentId;
    private Long equipmentElementId;
    private Long equipmentPartId;
}
