package com.maint.pm_backend.dto;

import lombok.Builder;
import lombok.Data;
import com.fasterxml.jackson.annotation.JsonInclude;
import java.util.List;

@Data
@Builder
@JsonInclude(JsonInclude.Include.NON_NULL)
public class QRScanResponse {
    private String status;
    private String message;

    // Task measurement metadata
    private String uom;
    private java.math.BigDecimal toleranceMin;
    private java.math.BigDecimal toleranceMax;
    private java.math.BigDecimal standardValue;

    // Observation image upload (presigned PUT URL — only on success)
    private String observationUploadUrl;
    private String observationS3Key;
    private Long uploadExpiresInMinutes;

    // Fallback task lists (only on not_found)
    private List<QRTaskProjection> relatedPartTasks;
    private List<QRTaskProjection> relatedMachineTasks;
}
