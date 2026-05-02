package com.maint.pm_backend.dto;

import lombok.Data;
import java.time.LocalDateTime;

@Data
public class IssueFlagReviewRequest {
    /**
     * The new status to set on the flag.
     * Supervisor can set: POTENTIAL_REPLACEMENT ↔ REPLACEMENT_REQUIRED
     * Line Manager / Maintenance Manager can set: any status including REPLACEMENT_INITIATED, REPLACEMENT_DONE, CLOSED
     */
    private String newStatus;

    private String criticality; // Optional override
    private LocalDateTime dueDate; // Optional — auto-calculated from criticality if absent
    private String notes;

    /**
     * Required only when newStatus = CLOSED.
     * Captures what action was taken to address the issue.
     */
    private String closureReason;
}
