package com.maint.pm_backend.controller;

import com.maint.pm_backend.entity.ConfigParam;
import com.maint.pm_backend.repository.ConfigParamRepository;
import com.maint.pm_backend.service.ConfigParamService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

/**
 * Admin REST API for managing {@code config_param} rows.
 *
 * <pre>
 * GET  /api/admin/config-params              — list all active params
 * GET  /api/admin/config-params/{key}        — get a single param by key
 * PUT  /api/admin/config-params/{key}        — update value of a param
 * POST /api/admin/config-params/cache/refresh — manually trigger cache reload
 * </pre>
 *
 * <p>After a PUT update, call the refresh endpoint to apply the change immediately
 * without waiting for the 10-minute scheduled reload.
 */
@RestController
@RequestMapping("/api/admin/config-params")
@RequiredArgsConstructor
public class ConfigParamController {

    private final ConfigParamRepository configParamRepository;
    private final ConfigParamService configParamService;

    // ─── GET /api/admin/config-params ────────────────────────────────────────

    /**
     * Returns all active config params from the DB (live, not cached).
     */
    @GetMapping
    public ResponseEntity<List<ConfigParam>> listAll() {
        return ResponseEntity.ok(configParamRepository.findAllByIsActiveTrue());
    }

    // ─── GET /api/admin/config-params/{key} ──────────────────────────────────

    /**
     * Returns a single param by its business key.
     */
    @GetMapping("/{key}")
    public ResponseEntity<ConfigParam> getByKey(@PathVariable String key) {
        return configParamRepository.findByParamKeyAndIsActiveTrue(key)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    // ─── PUT /api/admin/config-params/{key} ──────────────────────────────────

    /**
     * Updates the {@code param_value} of an existing active param.
     *
     * <p>Request body: {@code { "value": "..." }}
     *
     * <p>After this call, invoke {@code POST /api/admin/config-params/cache/refresh}
     * to apply the new value immediately without waiting for the next 10-minute cycle.
     */
    @PutMapping("/{key}")
    public ResponseEntity<?> updateValue(
            @PathVariable String key,
            @RequestBody Map<String, String> body
    ) {
        String newValue = body.get("value");
        if (newValue == null || newValue.isBlank()) {
            return ResponseEntity.badRequest()
                    .body(Map.of("error", "Request body must contain a non-blank 'value' field."));
        }

        ConfigParam param = configParamRepository.findByParamKeyAndIsActiveTrue(key)
                .orElse(null);

        if (param == null) {
            return ResponseEntity.notFound().build();
        }

        param.setParamValue(newValue.trim());
        param.setUpdatedAt(LocalDateTime.now());
        configParamRepository.save(param);

        return ResponseEntity.ok(Map.of(
                "paramKey", param.getParamKey(),
                "newValue", param.getParamValue(),
                "updatedAt", param.getUpdatedAt().toString(),
                "hint", "Call POST /api/admin/config-params/cache/refresh to apply immediately."
        ));
    }

    // ─── POST /api/admin/config-params/cache/refresh ─────────────────────────

    /**
     * Manually triggers an immediate cache reload from the DB.
     *
     * <p>Use this after a PUT update to apply the new value without waiting for the
     * automatic 10-minute scheduled refresh.
     */
    @PostMapping("/cache/refresh")
    public ResponseEntity<Map<String, Object>> refreshCache() {
        int count = configParamService.refreshCache();
        return ResponseEntity.ok(Map.of(
                "status", "refreshed",
                "paramCount", count,
                "refreshedAt", LocalDateTime.now().toString()
        ));
    }

    // ─── GET /api/admin/config-params/cache/snapshot ─────────────────────────

    /**
     * Returns the current in-memory cache snapshot (key → value).
     * Useful for verifying what values are actually live without hitting the DB.
     */
    @GetMapping("/cache/snapshot")
    public ResponseEntity<Map<String, String>> cacheSnapshot() {
        return ResponseEntity.ok(configParamService.getAllCached());
    }
}
