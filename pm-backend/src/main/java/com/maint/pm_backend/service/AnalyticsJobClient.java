package com.maint.pm_backend.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.maint.pm_backend.config.AnalyticsServiceProperties;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.LinkedHashMap;
import java.util.Map;

@Service
public class AnalyticsJobClient {

    private static final String NIGHTLY_JOB_CODE = "NIGHTLY_PHM_ANALYTICS_SYNC";
    private static final String RUN_NIGHTLY_PATH = "/api/v1/batch/run-nightly";

    private final AnalyticsServiceProperties properties;
    private final AnalyticsJobTokenService tokenService;
    private final ObjectMapper objectMapper;
    private final HttpClient httpClient;

    public AnalyticsJobClient(
            AnalyticsServiceProperties properties,
            AnalyticsJobTokenService tokenService,
            ObjectMapper objectMapper
    ) {
        this.properties = properties;
        this.tokenService = tokenService;
        this.objectMapper = objectMapper;
        this.httpClient = HttpClient.newBuilder()
                .connectTimeout(Duration.ofSeconds(10))
                .build();
    }

    public String runNightlyAnalytics(boolean persist) {
        String token = tokenService.generateJobToken(NIGHTLY_JOB_CODE);
        HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create(properties.getBaseUrl() + RUN_NIGHTLY_PATH))
                .timeout(Duration.ofMinutes(10))
                .header("Content-Type", "application/json")
                .header("X-Analytics-Job-Token", token)
                .POST(HttpRequest.BodyPublishers.ofString(toJson(Map.of("persist", persist))))
                .build();

        try {
            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() < 200 || response.statusCode() >= 300) {
                throw new IllegalStateException(
                        "Analytics service returned HTTP " + response.statusCode() + ": " + response.body()
                );
            }
            return response.body();
        } catch (IOException ex) {
            throw new IllegalStateException("Failed to reach analytics service.", ex);
        } catch (InterruptedException ex) {
            Thread.currentThread().interrupt();
            throw new IllegalStateException("Analytics service call was interrupted.", ex);
        }
    }

    private String toJson(Map<String, Object> input) {
        try {
            return objectMapper.writeValueAsString(new LinkedHashMap<>(input));
        } catch (JsonProcessingException ex) {
            throw new IllegalStateException("Failed to serialize analytics request.", ex);
        }
    }
}
