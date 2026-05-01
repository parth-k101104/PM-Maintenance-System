package com.maint.pm_backend.service;

import com.maint.pm_backend.dto.SupervisorApprovalRequest;
import com.maint.pm_backend.dto.SupervisorApprovalResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class MaintenanceManagerApprovalService {
    private final ApprovalWorkflowService approvalWorkflowService;

    public SupervisorApprovalResponse processApproval(SupervisorApprovalRequest request, Long maintenanceManagerId) {
        return approvalWorkflowService.processApproval(request, maintenanceManagerId, 3, 1L, "Maintenance Manager");
    }
}
