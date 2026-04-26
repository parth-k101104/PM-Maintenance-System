package com.maint.pm_backend.dto;

import lombok.Data;

@Data
public class SupervisorApprovalRequest {
    private Long scheduleExecutionId;
    /** "APPROVE" or "REJECT" */
    private String action;
    private String remarks;
}
