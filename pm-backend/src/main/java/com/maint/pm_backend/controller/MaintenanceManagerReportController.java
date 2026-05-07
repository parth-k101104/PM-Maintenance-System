package com.maint.pm_backend.controller;

import com.maint.pm_backend.dto.ReportOptionsResponse;
import com.maint.pm_backend.dto.ReportRequest;
import com.maint.pm_backend.dto.ReportResponse;
import com.maint.pm_backend.entity.Employee;
import com.maint.pm_backend.repository.EmployeeRepository;
import com.maint.pm_backend.service.MaintenanceManagerReportPdfService;
import com.maint.pm_backend.service.MaintenanceManagerReportService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.security.Principal;
import java.util.Base64;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/reports/maintenance-manager")
@RequiredArgsConstructor
public class MaintenanceManagerReportController {

    private final MaintenanceManagerReportService reportService;
    private final MaintenanceManagerReportPdfService pdfService;
    private final EmployeeRepository employeeRepository;

    @GetMapping("/options")
    public ResponseEntity<ReportOptionsResponse> options(Principal principal) {
        requireUser(principal);
        return ResponseEntity.ok(reportService.getOptions());
    }

    @PostMapping("/generate")
    public ResponseEntity<?> generate(Principal principal, @RequestBody ReportRequest request) {
        requireUser(principal);
        try {
            return ResponseEntity.ok(reportService.generate(request));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }

    @PostMapping(value = "/generate/pdf", produces = MediaType.APPLICATION_PDF_VALUE)
    public ResponseEntity<?> generatePdf(Principal principal, @RequestBody ReportRequest request) {
        requireUser(principal);
        try {
            ReportResponse report = reportService.generate(request);
            byte[] pdf = pdfService.render(report);
            String filename = report.getReportType().name().toLowerCase().replace('_', '-') + ".pdf";
            return ResponseEntity.ok()
                    .contentType(MediaType.APPLICATION_PDF)
                    .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + filename + "\"")
                    .body(pdf);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().contentType(MediaType.APPLICATION_JSON).body(Map.of("message", e.getMessage()));
        }
    }

    @PostMapping("/generate/pdf-base64")
    public ResponseEntity<?> generatePdfBase64(Principal principal, @RequestBody ReportRequest request) {
        requireUser(principal);
        try {
            ReportResponse report = reportService.generate(request);
            byte[] pdf = pdfService.render(report);
            String filename = report.getReportType().name().toLowerCase().replace('_', '-') + ".pdf";
            return ResponseEntity.ok(Map.of(
                    "filename", filename,
                    "contentType", MediaType.APPLICATION_PDF_VALUE,
                    "base64", Base64.getEncoder().encodeToString(pdf)));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }

    private Employee requireUser(Principal principal) {
        if (principal == null) {
            throw new RuntimeException("Unauthorized");
        }
        return employeeRepository.findByEmail(principal.getName())
                .orElseThrow(() -> new RuntimeException("Logged in user not found"));
    }
}
