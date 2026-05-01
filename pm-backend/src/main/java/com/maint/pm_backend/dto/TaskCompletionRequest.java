package com.maint.pm_backend.dto;

import lombok.Data;
import java.math.BigDecimal;

@Data
public class TaskCompletionRequest {
    private Long scheduleExecutionId;
    private BigDecimal timeTaken;
    private BigDecimal actualValue;
    private String notes;
    private boolean isManualDeviation;
    private String manualFlagStatus; // REPLACEMENT_REQUIRED or POTENTIAL_REPLACEMENT
    private String manualIssueDetails;
}
