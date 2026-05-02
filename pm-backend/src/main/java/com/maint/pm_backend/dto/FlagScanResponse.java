package com.maint.pm_backend.dto;

import lombok.Builder;
import lombok.Data;

/** Response for the flag QR-scan endpoint. */
@Data
@Builder
public class FlagScanResponse {
    private String status;
    private String message;

    // Part & spare-part info for the detail screen
    private Long partId;
    private String partName;
    private String partCode;
    private Long sparePartId;
    private String sparePartName;
    private String sparePartNumber;
    private String sparePartLocation;
    private Integer sparePartCurrentStock;

    // The value logged in the execution that triggered the flag
    private java.math.BigDecimal actualValue;
    private String uom;
    private java.math.BigDecimal toleranceMin;
    private java.math.BigDecimal toleranceMax;
    private java.math.BigDecimal standardValue;

    // S3 upload URL for the replacement photo
    private String photoUploadUrl;
    private String photoS3Key;
    private Integer uploadExpiresInMinutes;
}
