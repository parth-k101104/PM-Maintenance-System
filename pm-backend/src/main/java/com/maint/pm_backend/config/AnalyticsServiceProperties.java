package com.maint.pm_backend.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

@Component
public class AnalyticsServiceProperties {

    @Value("${analytics.service.base-url:http://localhost:8000}")
    private String baseUrl;

    @Value("${analytics.service.shared-secret:}")
    private String sharedSecret;

    @Value("${analytics.service.token-ttl-seconds:300}")
    private long tokenTtlSeconds;

    public String getBaseUrl() {
        return baseUrl;
    }

    public String getSharedSecret() {
        return sharedSecret;
    }

    public long getTokenTtlSeconds() {
        return tokenTtlSeconds;
    }
}
