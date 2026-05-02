package com.maint.pm_backend.service;

import com.maint.pm_backend.dto.SupervisorApprovalRequest;
import com.maint.pm_backend.dto.SupervisorApprovalResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class LineManagerApprovalService {
    private final ApprovalWorkflowService approvalWorkflowService;

    public SupervisorApprovalResponse processApproval(SupervisorApprovalRequest request, Long lineManagerId) {
        return approvalWorkflowService.processApproval(request, lineManagerId, 2, 2L, "Line Manager");
    }
}
