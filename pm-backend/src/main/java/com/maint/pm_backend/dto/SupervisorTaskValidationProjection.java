package com.maint.pm_backend.dto;

import java.math.BigDecimal;

public interface SupervisorTaskValidationProjection {
    String getUom();
    BigDecimal getToleranceMin();
    BigDecimal getToleranceMax();
    BigDecimal getStandardValue();
    BigDecimal getActualValue();
    Boolean getDeviationFlag();
    Double getTimeTaken();
    String getNotes();
    Integer getEstimatedReqTime();
    Long getStdTaskId();
}
