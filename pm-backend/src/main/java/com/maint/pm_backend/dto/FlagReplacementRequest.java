package com.maint.pm_backend.dto;

import lombok.Data;

/** Request body for completing a flag replacement. */
@Data
public class FlagReplacementRequest {
    /** Whether the physical replacement was actually performed. */
    private boolean replacementDone;
    /** ID of the spare part consumed (required when replacementDone=true). */
    private Long sparePartId;
    /** Free-text notes from the operator. */
    private String notes;
}
