package com.maint.pm_backend.util;

import java.time.LocalDate;
import java.time.LocalDateTime;

/**
 * Utility class for date handling. 
 * Provides a toggle to switch between a frozen backend date and the actual current date.
 */
public class DateUtils {

    // Toggle this to false in production to use the actual system local date
    public static final boolean USE_FROZEN_DATE = true;
    
    public static final LocalDate FROZEN_DATE = LocalDate.of(2026, 2, 1);

    /**
     * Returns the effective 'today' date for the backend.
     * @return FROZEN_DATE if USE_FROZEN_DATE is true, else LocalDate.now()
     */
    public static LocalDate getToday() {
        if (USE_FROZEN_DATE) {
            return FROZEN_DATE;
        }
        return LocalDate.now();
    }

    /**
     * Returns the effective 'now' datetime for the backend.
     * @return Frozen datetime if USE_FROZEN_DATE is true, else LocalDateTime.now()
     */
    public static LocalDateTime getNow() {
        if (USE_FROZEN_DATE) {
            return FROZEN_DATE.atStartOfDay();
        }
        return LocalDateTime.now();
    }
}
