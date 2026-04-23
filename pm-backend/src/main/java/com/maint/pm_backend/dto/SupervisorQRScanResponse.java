package com.maint.pm_backend.dto;

import lombok.Builder;
import lombok.Data;
import com.fasterxml.jackson.annotation.JsonInclude;

import java.math.BigDecimal;
import java.util.List;

@Data
@Builder
@JsonInclude(JsonInclude.Include.NON_NULL)
public class SupervisorQRScanResponse {
    private String status;
    private String message;

    private String uom;
    private BigDecimal toleranceMin;
    private BigDecimal toleranceMax;
    private BigDecimal standardValue;

    private BigDecimal actualValue;
    private Boolean deviationFlag;
    private Double timeTaken;
    private String notes;
    private Integer estimatedReqTime;

    private String observationPhotoUrl;

    private List<HistoricalTaskProjection> historicalData;
}
