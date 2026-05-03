package com.maint.pm_backend.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.maint.pm_backend.config.AnalyticsServiceProperties;
import org.springframework.stereotype.Service;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.Base64;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.UUID;

@Service
public class AnalyticsJobTokenService {

    private static final String HMAC_ALGORITHM = "HmacSHA256";

    private final AnalyticsServiceProperties properties;
    private final ObjectMapper objectMapper;

    public AnalyticsJobTokenService(AnalyticsServiceProperties properties, ObjectMapper objectMapper) {
        this.properties = properties;
        this.objectMapper = objectMapper;
    }

    public String generateJobToken(String jobCode) {
        String sharedSecret = properties.getSharedSecret();
        if (sharedSecret == null || sharedSecret.isBlank()) {
            throw new IllegalStateException("analytics.service.shared-secret must be configured.");
        }

        Instant issuedAt = Instant.now();
        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("job_code", jobCode);
        payload.put("issued_at", issuedAt.toString());
        payload.put("expires_at", issuedAt.plusSeconds(properties.getTokenTtlSeconds()).toString());
        payload.put("nonce", UUID.randomUUID().toString());

        String payloadBase64 = base64Url(toJson(payload));
        String signatureBase64 = base64Url(sign(payloadBase64, sharedSecret));
        return payloadBase64 + "." + signatureBase64;
    }

    private byte[] toJson(Map<String, Object> payload) {
        try {
            return objectMapper.writeValueAsBytes(payload);
        } catch (Exception ex) {
            throw new IllegalStateException("Failed to serialize analytics job token payload.", ex);
        }
    }

    private byte[] sign(String payloadBase64, String sharedSecret) {
        try {
            Mac mac = Mac.getInstance(HMAC_ALGORITHM);
            mac.init(new SecretKeySpec(sharedSecret.getBytes(StandardCharsets.UTF_8), HMAC_ALGORITHM));
            return mac.doFinal(payloadBase64.getBytes(StandardCharsets.UTF_8));
        } catch (Exception ex) {
            throw new IllegalStateException("Failed to sign analytics job token.", ex);
        }
    }

    private String base64Url(byte[] raw) {
        return Base64.getUrlEncoder().withoutPadding().encodeToString(raw);
    }
}
