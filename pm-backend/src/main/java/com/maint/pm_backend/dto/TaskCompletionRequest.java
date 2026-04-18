package com.maint.pm_backend.dto;

import lombok.Data;
import java.math.BigDecimal;

@Data
public class TaskCompletionRequest {
    private Long scheduleExecutionId;
    private BigDecimal timeTaken;
    private BigDecimal actualValue;
    private String notes;
}
