package com.maint.pm_backend.dto;

import java.math.BigDecimal;
import java.time.LocalDateTime;

public interface HistoricalTaskProjection {
    Long getScheduleExecutionId();
    String getTaskName();
    BigDecimal getActualValue();
    Boolean getDeviationFlag();
    Double getTimeTaken();
    String getNotes();
    LocalDateTime getCompletedDate();
    String getStatus();
    String getExecutedBy();
}
