package com.maint.pm_backend.controller;

import com.maint.pm_backend.dto.ConfigParamUpdateRequest;
import com.maint.pm_backend.entity.ConfigParam;
import com.maint.pm_backend.service.ConfigParamService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.security.Principal;
import java.util.Comparator;
import java.util.List;

@RestController
@RequestMapping("/api/v1/config-params")
@RequiredArgsConstructor
public class ConfigParamController {

    private final ConfigParamService configParamService;

    @GetMapping
    public ResponseEntity<List<ConfigParam>> listParams(Principal principal) {
        if (principal == null) {
            return ResponseEntity.status(401).build();
        }

        List<ConfigParam> params = configParamService.getAllParams().stream()
                .sorted(Comparator.comparing(ConfigParam::getParamCategory).thenComparing(ConfigParam::getParamKey))
                .toList();
        return ResponseEntity.ok(params);
    }

    @PutMapping("/{paramKey}")
    public ResponseEntity<ConfigParam> updateParam(
            Principal principal,
            @PathVariable String paramKey,
            @RequestBody ConfigParamUpdateRequest request) {
        if (principal == null) {
            return ResponseEntity.status(401).build();
        }

        return ResponseEntity.ok(configParamService.updateParamValue(paramKey, request.getParamValue()));
    }
}
