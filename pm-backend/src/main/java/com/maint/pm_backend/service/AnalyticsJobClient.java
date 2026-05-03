package com.maint.pm_backend.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.maint.pm_backend.config.AnalyticsServiceProperties;
import com.maint.pm_backend.entity.SystemJob;
import com.maint.pm_backend.entity.enums.SystemJobTriggerType;
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
        return runAnalyticsJob(null, SystemJobTriggerType.MANUAL_API, null, persist);
    }

    public String runAnalyticsJob(
            SystemJob job,
            SystemJobTriggerType triggerType,
            Long triggeredByEmployeeId,
            boolean persist
    ) {
        String jobCode = job != null ? job.getJobCode() : "NIGHTLY_PHM_ANALYTICS_SYNC";
        String targetEndpoint = job != null ? job.getTargetApiEndpoint() : RUN_NIGHTLY_PATH;
        String token = tokenService.generateJobToken(jobCode);
        HttpRequest request = HttpRequest.newBuilder()
                .uri(resolveTargetUri(targetEndpoint))
                .version(HttpClient.Version.HTTP_1_1)
                .timeout(Duration.ofMinutes(10))
                .header("Content-Type", "application/json")
                .header("X-Analytics-Job-Token", token)
                .POST(HttpRequest.BodyPublishers.ofString(toJson(buildRequestBody(
                        persist,
                        triggerType,
                        triggeredByEmployeeId
                ))))
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
        } catch (Exception ex) {
            throw new IllegalStateException("Failed to serialize analytics request.", ex);
        }
    }

    private Map<String, Object> buildRequestBody(
            boolean persist,
            SystemJobTriggerType triggerType,
            Long triggeredByEmployeeId
    ) {
        Map<String, Object> requestBody = new LinkedHashMap<>();
        requestBody.put("persist", persist);
        requestBody.put("trigger_type", triggerType.name());
        if (triggeredByEmployeeId != null) {
            requestBody.put("triggered_by_employee_id", triggeredByEmployeeId);
        }
        return requestBody;
    }

    private URI resolveTargetUri(String targetEndpoint) {
        if (targetEndpoint == null || targetEndpoint.isBlank()) {
            return URI.create(properties.getBaseUrl() + RUN_NIGHTLY_PATH);
        }
        if (targetEndpoint.startsWith("http://") || targetEndpoint.startsWith("https://")) {
            return URI.create(targetEndpoint);
        }
        String separator = targetEndpoint.startsWith("/") ? "" : "/";
        return URI.create(properties.getBaseUrl() + separator + targetEndpoint);
    }
}
