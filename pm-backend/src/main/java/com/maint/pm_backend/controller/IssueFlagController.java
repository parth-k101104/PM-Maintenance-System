package com.maint.pm_backend.controller;

import com.maint.pm_backend.dto.IndependentIssueRequest;
import com.maint.pm_backend.dto.IssueFlagReviewRequest;
import com.maint.pm_backend.entity.Employee;
import com.maint.pm_backend.entity.IssueFlag;
import com.maint.pm_backend.repository.EmployeeRepository;
import com.maint.pm_backend.service.IssueFlagService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.security.Principal;
import java.util.List;

@RestController
@RequestMapping("/api/v1/issues")
@RequiredArgsConstructor
public class IssueFlagController {

    private final IssueFlagService issueFlagService;
    private final EmployeeRepository employeeRepository;

    // ─── Helpers ──────────────────────────────────────────────────────────────

    private Employee resolveEmployee(Principal principal) {
        if (principal == null) return null;
        return employeeRepository.findByEmail(principal.getName())
                .orElseThrow(() -> new RuntimeException("Logged in user not found"));
    }

    // ─── Raise independent flag ───────────────────────────────────────────────

    @PostMapping("/raise-independent")
    public ResponseEntity<IssueFlag> raiseIndependentIssue(
            @RequestBody IndependentIssueRequest request,
            Principal principal) {
        Employee actor = resolveEmployee(principal);
        if (actor == null) return ResponseEntity.status(401).build();
        return ResponseEntity.ok(issueFlagService.raiseIndependentIssue(request, actor.getEmployeeId()));
    }

    // ─── List flags ───────────────────────────────────────────────────────────

    /** Returns all flags scoped to the authenticated operator (attendant). */
    @GetMapping("/operator")
    public ResponseEntity<List<com.maint.pm_backend.dto.IssueFlagProjection>> getOperatorFlags(Principal principal) {
        Employee actor = resolveEmployee(principal);
        if (actor == null) return ResponseEntity.status(401).build();
        return ResponseEntity.ok(issueFlagService.getFlagsForOperator(actor.getEmployeeId()));
    }

    /** Returns all flags on lines supervised by the authenticated supervisor. */
    @GetMapping("/supervisor")
    public ResponseEntity<List<com.maint.pm_backend.dto.IssueFlagProjection>> getSupervisorFlags(Principal principal) {
        Employee actor = resolveEmployee(principal);
        if (actor == null) return ResponseEntity.status(401).build();
        return ResponseEntity.ok(issueFlagService.getFlagsForSupervisor(actor.getEmployeeId()));
    }

    /** Returns all flags on lines managed by the authenticated line manager. */
    @GetMapping("/line-manager")
    public ResponseEntity<List<com.maint.pm_backend.dto.IssueFlagProjection>> getLineManagerFlags(Principal principal) {
        Employee actor = resolveEmployee(principal);
        if (actor == null) return ResponseEntity.status(401).build();
        return ResponseEntity.ok(issueFlagService.getFlagsForLineManager(actor.getEmployeeId()));
    }

    // ─── Review / update flag status ──────────────────────────────────────────

    /**
     * Role-based flag status update.
     * <ul>
     *   <li>Supervisor (role 3): may toggle between POTENTIAL_REPLACEMENT ↔ REPLACEMENT_REQUIRED</li>
     *   <li>Line Manager (role 6) / Maintenance Manager (role 8): may set any status, including CLOSED</li>
     * </ul>
     */
    @PutMapping("/{flagId}/review")
    public ResponseEntity<IssueFlag> reviewIssueFlag(
            @PathVariable Long flagId,
            @RequestBody IssueFlagReviewRequest request,
            Principal principal) {
        Employee actor = resolveEmployee(principal);
        if (actor == null) return ResponseEntity.status(401).build();
        try {
            return ResponseEntity.ok(issueFlagService.reviewIssueFlag(flagId, request, actor.getEmployeeId()));
        } catch (RuntimeException e) {
            if (e.getMessage() != null && e.getMessage().startsWith("Access denied")) {
                return ResponseEntity.status(403).build();
            }
            throw e;
        }
    }

    // ─── Flag replacement QR scan ─────────────────────────────────────────────

    /**
     * Validates that the scanned QR (equipment/element/part IDs) matches the flag's
     * linked task execution and that this operator is the assigned attendant.
     * Returns part details, spare part stock, deviation value, and a pre-signed S3 PUT URL
     * for the replacement photo.
     */
    @PostMapping("/{flagId}/scan")
    public ResponseEntity<com.maint.pm_backend.dto.FlagScanResponse> scanFlagQr(
            @PathVariable Long flagId,
            @RequestBody com.maint.pm_backend.dto.FlagScanRequest request,
            Principal principal) {
        Employee actor = resolveEmployee(principal);
        if (actor == null) return ResponseEntity.status(401).build();
        try {
            return ResponseEntity.ok(issueFlagService.scanFlag(flagId, request, actor.getEmployeeId()));
        } catch (RuntimeException e) {
            if (e.getMessage() != null && e.getMessage().startsWith("Access denied")) {
                return ResponseEntity.status(403).build();
            }
            throw e;
        }
    }

    /**
     * Completes the replacement workflow:
     *  - logs a spare_part_replacements record
     *  - decrements spare part current_stock (if replacementDone=true)
     *  - sets flag status to CLOSED with addressedDttm = now
     */
    @PostMapping("/{flagId}/complete-replacement")
    public ResponseEntity<IssueFlag> completeReplacement(
            @PathVariable Long flagId,
            @RequestBody com.maint.pm_backend.dto.FlagReplacementRequest request,
            Principal principal) {
        Employee actor = resolveEmployee(principal);
        if (actor == null) return ResponseEntity.status(401).build();
        try {
            return ResponseEntity.ok(issueFlagService.completeReplacement(flagId, request, actor.getEmployeeId()));
        } catch (RuntimeException e) {
            if (e.getMessage() != null && e.getMessage().startsWith("Access denied")) {
                return ResponseEntity.status(403).build();
            }
            throw e;
        }
    }
}
