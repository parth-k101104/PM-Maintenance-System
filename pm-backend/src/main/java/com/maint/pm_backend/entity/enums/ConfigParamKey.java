package com.maint.pm_backend.entity.enums;

/**
 * Type-safe keys for all configurable system parameters stored in the {@code config_param} table.
 * Analogous to {@link SystemJobCode} but for business logic parameters.
 *
 * Each key is associated with a {@code defaultValue} used as a fallback by
 * {@link com.maint.pm_backend.service.ConfigParamService} if the DB row is missing or inactive.
 */
public enum ConfigParamKey {

    // ── WORKFLOW ─────────────────────────────────────────────────────────────
    /** Days added to "now" when approval transitions to APPROVAL_REQUESTED. */
    APPROVAL_DUE_DATE_OFFSET_DAYS("APPROVAL_DUE_DATE_OFFSET_DAYS", "1"),

    /** Days after rejection to set due date of the rescheduled execution. */
    RESCHEDULE_DUE_DATE_OFFSET_DAYS("RESCHEDULE_DUE_DATE_OFFSET_DAYS", "1"),

    // ── ISSUE_FLAG ────────────────────────────────────────────────────────────
    /** Auto due-date offset (days) for CRITICAL criticality issue flags. */
    FLAG_DUE_DATE_CRITICAL_DAYS("FLAG_DUE_DATE_CRITICAL_DAYS", "1"),

    /** Auto due-date offset (days) for HIGH criticality issue flags. */
    FLAG_DUE_DATE_HIGH_DAYS("FLAG_DUE_DATE_HIGH_DAYS", "1"),

    /** Auto due-date offset (days) for MEDIUM criticality issue flags. */
    FLAG_DUE_DATE_MEDIUM_DAYS("FLAG_DUE_DATE_MEDIUM_DAYS", "2"),

    /** Auto due-date offset (days) for LOW / default criticality issue flags. */
    FLAG_DUE_DATE_LOW_DAYS("FLAG_DUE_DATE_LOW_DAYS", "7"),

    // ── TASK ─────────────────────────────────────────────────────────────────
    /**
     * QR-scan duplicate guard: if the same task was completed within this many
     * days the API returns "recently_completed" and blocks re-submission.
     */
    TASK_RECENT_COMPLETION_THRESHOLD_DAYS("TASK_RECENT_COMPLETION_THRESHOLD_DAYS", "7"),

    // ── S3 ───────────────────────────────────────────────────────────────────
    /** Presigned GET URL validity (minutes) for observation/document reads. */
    S3_GET_URL_EXPIRY_MINUTES("S3_GET_URL_EXPIRY_MINUTES", "15"),

    /** Presigned PUT URL validity (minutes) for mobile observation/flag uploads. */
    S3_PUT_URL_EXPIRY_MINUTES("S3_PUT_URL_EXPIRY_MINUTES", "15"),

    // ── ANALYTICS ────────────────────────────────────────────────────────────
    /** Fraction of max tolerance at which a PREDICTIVE_WARNING insight triggers. */
    ANALYTICS_WARN_THRESHOLD_RATIO("ANALYTICS_WARN_THRESHOLD_RATIO", "0.875"),

    /** Slope magnitude (per day) below which a trend is classified as STABLE. */
    ANALYTICS_STABLE_SLOPE_EPSILON("ANALYTICS_STABLE_SLOPE_EPSILON", "0.002"),

    /** Velocity ratio above which a DEGRADATION_ANOMALY insight triggers. */
    ANALYTICS_ANOMALY_VELOCITY_RATIO("ANALYTICS_ANOMALY_VELOCITY_RATIO", "1.3"),

    /** Historical data window (days) used for health evaluation runs. */
    ANALYTICS_WINDOW_DAYS("ANALYTICS_WINDOW_DAYS", "365"),

    /** Risk score (0-100) above which a part counts as a critical flag. */
    ANALYTICS_CRITICAL_RISK_THRESHOLD("ANALYTICS_CRITICAL_RISK_THRESHOLD", "90"),

    /** Max health-score delta for a trend to be STABLE vs IMPROVING/DEGRADING. */
    ANALYTICS_TREND_STABILITY_THRESHOLD("ANALYTICS_TREND_STABILITY_THRESHOLD", "1.0"),

    /** Health contribution score when evaluation_status is CONFIG_MISSING. */
    ANALYTICS_HEALTH_CONFIG_MISSING_SCORE("ANALYTICS_HEALTH_CONFIG_MISSING_SCORE", "60.0"),

    /** Health contribution score when evaluation_status is INSUFFICIENT_DATA. */
    ANALYTICS_HEALTH_INSUFFICIENT_DATA_SCORE("ANALYTICS_HEALTH_INSUFFICIENT_DATA_SCORE", "70.0"),

    /** Health contribution fallback when risk_score is null. */
    ANALYTICS_HEALTH_NO_RISK_FALLBACK_SCORE("ANALYTICS_HEALTH_NO_RISK_FALLBACK_SCORE", "75.0"),

    /** Floor for calculated prediction confidence score. */
    ANALYTICS_MIN_CONFIDENCE_SCORE("ANALYTICS_MIN_CONFIDENCE_SCORE", "60.0"),

    /** Ceiling for calculated prediction confidence score. */
    ANALYTICS_MAX_CONFIDENCE_SCORE("ANALYTICS_MAX_CONFIDENCE_SCORE", "95.0"),

    /** Confidence cap when prediction method is LINEAR_REGRESSION. */
    ANALYTICS_LR_CONFIDENCE_CAP("ANALYTICS_LR_CONFIDENCE_CAP", "55.0");

    // ─────────────────────────────────────────────────────────────────────────

    private final String key;
    private final String defaultValue;

    ConfigParamKey(String key, String defaultValue) {
        this.key = key;
        this.defaultValue = defaultValue;
    }

    /** The exact {@code param_key} stored in the DB. */
    public String getKey() {
        return key;
    }

    /**
     * Safe fallback value used by {@link com.maint.pm_backend.service.ConfigParamService}
     * when the DB row is missing or inactive.
     */
    public String getDefaultValue() {
        return defaultValue;
    }
}
