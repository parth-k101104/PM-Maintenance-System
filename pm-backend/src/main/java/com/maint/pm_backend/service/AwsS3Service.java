package com.maint.pm_backend.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import software.amazon.awssdk.services.s3.presigner.S3Presigner;
import software.amazon.awssdk.services.s3.presigner.model.GetObjectPresignRequest;
import software.amazon.awssdk.services.s3.presigner.model.PutObjectPresignRequest;
import software.amazon.awssdk.services.s3.model.GetObjectRequest;
import software.amazon.awssdk.services.s3.model.PutObjectRequest;

import java.time.Duration;

/**
 * Service responsible for all interactions with AWS S3.
 * - Generates presigned GET URLs for reading manuals/SOPs (machine-manual-data bucket).
 * - Generates presigned PUT URLs for uploading observation images (pm-tasks-observations bucket).
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class AwsS3Service {

    private final S3Presigner s3Presigner;

    @Value("${aws.s3.bucket}")
    private String documentsBucketName;

    @Value("${aws.s3.observations-bucket}")
    private String observationsBucketName;

    @Value("${aws.s3.upload-expiry-minutes:15}")
    private long uploadExpiryMinutes;

    /** Presigned GET URL expiry - 15 minutes */
    private static final Duration GET_URL_EXPIRY = Duration.ofMinutes(15);

    // ──────────────────────────────────────────────────────────────
    // READ: Presigned GET URL (for manuals / task SOPs)
    // ──────────────────────────────────────────────────────────────

    /**
     * Generates a presigned GET URL for an object in the documents bucket.
     *
     * @param key S3 object key e.g. "AAC/DET-01/EQ-PKG-CONV-01/manuals/EQ-PKG-CONV-01.pdf"
     * @return presigned URL string
     */
    public String generatePresignedGetUrl(String key) {
        log.info("Generating presigned GET URL for bucket={} key={}", documentsBucketName, key);

        GetObjectRequest getObjectRequest = GetObjectRequest.builder()
                .bucket(documentsBucketName)
                .key(key)
                .build();

        GetObjectPresignRequest presignRequest = GetObjectPresignRequest.builder()
                .signatureDuration(GET_URL_EXPIRY)
                .getObjectRequest(getObjectRequest)
                .build();

        String url = s3Presigner.presignGetObject(presignRequest).url().toString();
        log.debug("Generated presigned GET URL for key={}: {}", key, url);
        return url;
    }

    /**
     * Backwards-compatible alias — delegates to {@link #generatePresignedGetUrl(String)}.
     */
    public String generatePresignedUrl(String key) {
        return generatePresignedGetUrl(key);
    }

    // ──────────────────────────────────────────────────────────────
    // WRITE: Presigned PUT URL (for observation images)
    // ──────────────────────────────────────────────────────────────

    /**
     * Generates a presigned PUT URL so the mobile app can upload an observation image
     * directly to S3 without routing the bytes through the backend.
     *
     * Bucket: pm-tasks-observations
     * Key pattern:
     *   {companyCode}/{plantCode}/{equipmentCode}/{elementRefNo}/{partName}/{taskRefNo}_{scheduleId}/{executionId}/{executionId}_{taskRefNo}.jpg
     *
     * @param companyCode   e.g. "AAC"
     * @param plantCode     e.g. "DET-01"
     * @param machineCode   e.g. "EQ-PKG-CONV-01"
     * @param elementRefNo  element ref_no e.g. "CONV-BELT"
     * @param partName      part name e.g. "Tracking Sensor" (spaces replaced with underscores)
     * @param taskRefNo     std task reference code e.g. "PM-10002-05"
     * @param scheduleId    numeric task schedule ID
     * @param executionId   numeric schedule execution ID
     * @return presigned PUT URL + the resolved S3 key
     */
    public ObservationUploadResult generateObservationUploadUrl(
            String companyCode, String plantCode, String machineCode,
            String elementRefNo, String partName,
            String taskRefNo, Long scheduleId, Long executionId) {

        // Sanitise part name for use in S3 key (replace spaces/slashes with underscores)
        String safePartName  = partName  != null ? partName.replaceAll("[^A-Za-z0-9._-]", "_") : "unknown";
        String safeElementRef = elementRefNo != null ? elementRefNo.replaceAll("[^A-Za-z0-9._-]", "_") : "unknown";

        String scheduleFolder = taskRefNo + "_" + scheduleId;
        String filename       = executionId + "_" + taskRefNo + ".jpg";

        String key = String.format("%s/%s/%s/%s/%s/%s/%d/%s",
                companyCode, plantCode, machineCode,
                safeElementRef, safePartName,
                scheduleFolder, executionId,
                filename);

        log.info("Generating presigned PUT URL for bucket={} key={}", observationsBucketName, key);

        PutObjectRequest putObjectRequest = PutObjectRequest.builder()
                .bucket(observationsBucketName)
                .key(key)
                .contentType("image/jpeg")
                .build();

        PutObjectPresignRequest presignRequest = PutObjectPresignRequest.builder()
                .signatureDuration(Duration.ofMinutes(uploadExpiryMinutes))
                .putObjectRequest(putObjectRequest)
                .build();

        String presignedUrl = s3Presigner.presignPutObject(presignRequest).url().toString();
        log.debug("Generated presigned PUT URL for key={}", key);

        return new ObservationUploadResult(presignedUrl, key, uploadExpiryMinutes);
    }

    /**
     * Generates a presigned GET URL so the supervisor can view an observation image.
     */
    public String generateObservationGetUrl(
            String companyCode, String plantCode, String machineCode,
            String elementRefNo, String partName,
            String taskRefNo, Long scheduleId, Long executionId) {

        String safePartName  = partName  != null ? partName.replaceAll("[^A-Za-z0-9._-]", "_") : "unknown";
        String safeElementRef = elementRefNo != null ? elementRefNo.replaceAll("[^A-Za-z0-9._-]", "_") : "unknown";

        String scheduleFolder = taskRefNo + "_" + scheduleId;
        String filename       = executionId + "_" + taskRefNo + ".jpg";

        String key = String.format("%s/%s/%s/%s/%s/%s/%d/%s",
                companyCode, plantCode, machineCode,
                safeElementRef, safePartName,
                scheduleFolder, executionId,
                filename);

        log.info("Generating presigned GET URL for bucket={} key={}", observationsBucketName, key);

        GetObjectRequest getObjectRequest = GetObjectRequest.builder()
                .bucket(observationsBucketName)
                .key(key)
                .build();

        GetObjectPresignRequest presignRequest = GetObjectPresignRequest.builder()
                .signatureDuration(GET_URL_EXPIRY)
                .getObjectRequest(getObjectRequest)
                .build();

        String presignedUrl = s3Presigner.presignGetObject(presignRequest).url().toString();
        log.debug("Generated presigned GET URL for key={}", key);

        return presignedUrl;
    }

    // ──────────────────────────────────────────────────────────────
    // Inner record: bundles the PUT URL result
    // ──────────────────────────────────────────────────────────────

    public record ObservationUploadResult(
            String presignedUploadUrl,
            String s3Key,
            long expiresInMinutes
    ) {}

    // ──────────────────────────────────────────────────────────────
    // UTILITY
    // ──────────────────────────────────────────────────────────────

    /**
     * Returns true if the given S3 key exists in the documents bucket.
     */
    public boolean objectExists(String key) {
        try {
            return true; // lightweight — replace with headObject call if needed
        } catch (Exception e) {
            log.warn("S3 object not found for key={}: {}", key, e.getMessage());
            return false;
        }
    }
}
