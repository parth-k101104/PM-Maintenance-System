package com.maint.pm_backend.controller;

import com.maint.pm_backend.dto.DocumentUrlsResponse;
import com.maint.pm_backend.entity.Employee;
import com.maint.pm_backend.repository.EmployeeRepository;
import com.maint.pm_backend.service.DocumentService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.security.Principal;

/**
 * REST controller exposing endpoints for fetching S3 presigned URLs
 * for task SOP PDFs and machine manual PDFs.
 *
 * All endpoints require a valid JWT (resolved via Spring Security principal).
 *
 * Base path: /api/v1/documents
 */
@Slf4j
@RestController
@RequestMapping("/api/v1/documents")
@RequiredArgsConstructor
public class DocumentController {

    private final DocumentService documentService;
    private final EmployeeRepository employeeRepository;

    /**
     * Fetch presigned S3 URLs for the task SOP and machine manual
     * associated with a given schedule execution.
     *
     * @param executionId the schedule_execution_id from the task list
     * @param principal   injected by Spring Security from the JWT token
     * @return {@link DocumentUrlsResponse} with taskSopUrl and machineManualUrl
     *
     * Example:
     *   GET /api/v1/documents/task/105
     */
    @GetMapping("/task/{executionId}")
    public ResponseEntity<DocumentUrlsResponse> getDocumentUrls(
            @PathVariable Long executionId,
            Principal principal) {

        if (principal == null) {
            return ResponseEntity.status(401).build();
        }

        String email = principal.getName();
        Employee employee = employeeRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("Logged-in user not found: " + email));

        log.info("Document URL request: executionId={} employeeId={}", executionId, employee.getEmployeeId());

        DocumentUrlsResponse response = documentService.getDocumentUrls(executionId, employee.getEmployeeId());
        return ResponseEntity.ok(response);
    }
}
