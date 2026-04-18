package com.maint.pm_backend.dto;

import java.math.BigDecimal;

/**
 * Projection to capture task metadata during a QR scan validation.
 */
public interface TaskValidationProjection {
    String getUom();
    BigDecimal getToleranceMin();
    BigDecimal getToleranceMax();
    BigDecimal getStandardValue();
}
