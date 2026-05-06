package com.maint.pm_backend.service;

import com.maint.pm_backend.entity.ConfigParam;
import com.maint.pm_backend.entity.enums.ConfigParamKey;
import com.maint.pm_backend.entity.enums.IssueFlagCriticality;
import com.maint.pm_backend.repository.ConfigParamRepository;
import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Central service for reading and caching all {@code config_param} DB rows.
 * Provides type-safe, performant access to tunable business-logic parameters.
 *
 * The cache is automatically refreshed every 10 minutes from the DB.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class ConfigParamService {

    private final ConfigParamRepository configParamRepository;

    /** In-memory cache of paramKey -> paramValue for sub-millisecond lookups. */
    private final Map<String, String> cache = new ConcurrentHashMap<>();

    @PostConstruct
    public void init() {
        refreshCache();
    }

    /**
     * Periodically reloads all active parameters from the database.
     * Scheduled for every 10 minutes to allow runtime configuration changes
     * without requiring an application restart.
     *
     * @return the number of parameters successfully loaded into cache
     */
    @Scheduled(fixedRate = 600000) // 10 minutes
    public int refreshCache() {
        log.info("Refreshing ConfigParam cache from database...");
        try {
            List<ConfigParam> params = configParamRepository.findAllByIsActiveTrue();
            Map<String, String> freshMap = new ConcurrentHashMap<>();
            for (ConfigParam p : params) {
                freshMap.put(p.getParamKey(), p.getParamValue());
            }

            // Replace entire cache atomically
            cache.clear();
            cache.putAll(freshMap);
            log.info("Successfully loaded {} configuration parameters.", cache.size());
            return cache.size();
        } catch (Exception e) {
            log.error("Failed to refresh ConfigParam cache: {}", e.getMessage());
            return 0;
        }
    }

    /**
     * Returns an unmodifiable snapshot of the current in-memory cache.
     */
    public Map<String, String> getAllCached() {
        return java.util.Collections.unmodifiableMap(cache);
    }

    public List<ConfigParam> getAllParams() {
        return configParamRepository.findAll();
    }

    public ConfigParam updateParamValue(String paramKey, String paramValue) {
        ConfigParam param = configParamRepository.findByParamKey(paramKey)
                .orElseThrow(() -> new RuntimeException("Config parameter not found: " + paramKey));
        validateValue(param.getDataType(), paramValue);
        param.setParamValue(paramValue);
        ConfigParam saved = configParamRepository.save(param);
        refreshCache();
        return saved;
    }

    private void validateValue(String dataType, String value) {
        if (value == null || value.isBlank()) {
            throw new RuntimeException("Config parameter value cannot be blank.");
        }

        try {
            switch ((dataType == null ? "STRING" : dataType).toUpperCase()) {
                case "INTEGER" -> Integer.parseInt(value);
                case "LONG" -> Long.parseLong(value);
                case "DOUBLE" -> Double.parseDouble(value);
                case "BOOLEAN" -> {
                    String normalized = value.toLowerCase();
                    if (!normalized.equals("true") && !normalized.equals("false")) {
                        throw new IllegalArgumentException("Expected true or false");
                    }
                }
                default -> {
                    // STRING accepts any non-blank value.
                }
            }
        } catch (Exception e) {
            throw new RuntimeException("Invalid value for data type " + dataType + ": " + value);
        }
    }

    // ── Generic Getters ───────────────────────────────────────────────────────

    public String getString(ConfigParamKey key) {
        return cache.getOrDefault(key.getKey(), key.getDefaultValue());
    }

    public int getInt(ConfigParamKey key) {
        return Integer.parseInt(getString(key));
    }

    public long getLong(ConfigParamKey key) {
        return Long.parseLong(getString(key));
    }

    public double getDouble(ConfigParamKey key) {
        return Double.parseDouble(getString(key));
    }

    public boolean getBoolean(ConfigParamKey key) {
        return Boolean.parseBoolean(getString(key));
    }

    // ── Typed Helpers ─────────────────────────────────────────────────────────

    // ── Category: WORKFLOW ──

    public long getApprovalDueDateOffsetDays() {
        return getLong(ConfigParamKey.APPROVAL_DUE_DATE_OFFSET_DAYS);
    }

    public long getRescheduleDueDateOffsetDays() {
        return getLong(ConfigParamKey.RESCHEDULE_DUE_DATE_OFFSET_DAYS);
    }

    // ── Category: ISSUE_FLAG ──

    /** Returns the due-date offset (days) based on flag criticality. */
    public int getFlagDueDateDays(IssueFlagCriticality criticality) {
        if (criticality == null) return getInt(ConfigParamKey.FLAG_DUE_DATE_LOW_DAYS);
        return switch (criticality) {
            case CRITICAL -> getInt(ConfigParamKey.FLAG_DUE_DATE_CRITICAL_DAYS);
            case HIGH -> getInt(ConfigParamKey.FLAG_DUE_DATE_HIGH_DAYS);
            case MEDIUM -> getInt(ConfigParamKey.FLAG_DUE_DATE_MEDIUM_DAYS);
            case LOW -> getInt(ConfigParamKey.FLAG_DUE_DATE_LOW_DAYS);
        };
    }

    // ── Category: TASK ──

    /**
     * Returns the threshold (days) for considering a task recently completed.
     * This blocks duplicate QR scans within this window.
     */
    public long getTaskRecentCompletionThresholdDays() {
        return getLong(ConfigParamKey.TASK_RECENT_COMPLETION_THRESHOLD_DAYS);
    }

    // ── Category: S3 ──

    public long getS3GetUrlExpiryMinutes() {
        return getLong(ConfigParamKey.S3_GET_URL_EXPIRY_MINUTES);
    }

    public long getS3PutUrlExpiryMinutes() {
        return getLong(ConfigParamKey.S3_PUT_URL_EXPIRY_MINUTES);
    }

    // ── Category: ANALYTICS ──

    public double getAnalyticsWarnThresholdRatio() {
        return getDouble(ConfigParamKey.ANALYTICS_WARN_THRESHOLD_RATIO);
    }

    public double getAnalyticsStableSlopeEpsilon() {
        return getDouble(ConfigParamKey.ANALYTICS_STABLE_SLOPE_EPSILON);
    }

    public double getAnalyticsAnomalyVelocityRatio() {
        return getDouble(ConfigParamKey.ANALYTICS_ANOMALY_VELOCITY_RATIO);
    }

    public int getAnalyticsWindowDays() {
        return getInt(ConfigParamKey.ANALYTICS_WINDOW_DAYS);
    }

    public double getAnalyticsCriticalRiskThreshold() {
        return getDouble(ConfigParamKey.ANALYTICS_CRITICAL_RISK_THRESHOLD);
    }

    public double getAnalyticsTrendStabilityThreshold() {
        return getDouble(ConfigParamKey.ANALYTICS_TREND_STABILITY_THRESHOLD);
    }

    public double getAnalyticsHealthConfigMissingScore() {
        return getDouble(ConfigParamKey.ANALYTICS_HEALTH_CONFIG_MISSING_SCORE);
    }

    public double getAnalyticsHealthInsufficientDataScore() {
        return getDouble(ConfigParamKey.ANALYTICS_HEALTH_INSUFFICIENT_DATA_SCORE);
    }

    public double getAnalyticsHealthNoRiskFallbackScore() {
        return getDouble(ConfigParamKey.ANALYTICS_HEALTH_NO_RISK_FALLBACK_SCORE);
    }

    public double getAnalyticsMinConfidenceScore() {
        return getDouble(ConfigParamKey.ANALYTICS_MIN_CONFIDENCE_SCORE);
    }

    public double getAnalyticsMaxConfidenceScore() {
        return getDouble(ConfigParamKey.ANALYTICS_MAX_CONFIDENCE_SCORE);
    }

    /** Confidence cap when prediction method is LINEAR_REGRESSION. */
    public double getAnalyticsLrConfidenceCap() {
        return getDouble(ConfigParamKey.ANALYTICS_LR_CONFIDENCE_CAP);
    }
}
