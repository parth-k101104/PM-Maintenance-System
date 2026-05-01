package com.maint.pm_backend.dto;

import lombok.Builder;
import lombok.Data;
import java.time.LocalDateTime;

/**
 * Response DTO for the "denied tasks" list.
 *
 * Business rules encoded here:
 *  - rescheduledStatus = ASSIGNED | IN_PROGRESS → show Redo button (use rescheduledExecutionId)
 *  - rescheduledStatus = UNDER_*_REVIEW → show the review status label, no Redo button
 *  - row is absent entirely if rescheduledStatus = COMPLETED | APPROVED
 */
@Data
@Builder
public class RejectedTaskDto {

    // Original rejected execution
    private Long rejectedExecutionId;
    private Long stdTaskId;
    private String taskRefNo;
    private String taskName;
    private String machineName;
    private String machineElementName;
    private String machinePartName;
    private String zone;
    private String block;
    private String lineName;
    private String lineCode;
    private Long lineId;
    private LocalDateTime originalDueDate;
    private String taskCriticality;

    // Rescheduled (child) execution info
    private Long rescheduledExecutionId;
    private String rescheduledStatus;
    private LocalDateTime rescheduledDueDate;

    /**
     * Convenience flag the frontend can use directly.
     * true  → show Redo button pointing to rescheduledExecutionId
     * false → show rescheduledStatus label (task is already under review)
     */
    private boolean showRedoButton;
}
