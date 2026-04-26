package com.maint.pm_backend.dto;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class SupervisorApprovalResponse {
    private String status;
    private String message;
    /** The new execution status after the action */
    private String executionStatus;
    /** ID of the next approver (line manager), present only on APPROVE when workflow continues */
    private Long nextApproverId;
    /** ID of the newly created rescheduled execution, present only on REJECT */
    private Long rescheduledExecutionId;
}
