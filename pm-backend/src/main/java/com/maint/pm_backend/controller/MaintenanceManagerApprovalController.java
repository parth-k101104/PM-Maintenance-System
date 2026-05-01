package com.maint.pm_backend.controller;

import com.maint.pm_backend.dto.SupervisorApprovalRequest;
import com.maint.pm_backend.dto.SupervisorApprovalResponse;
import com.maint.pm_backend.entity.Employee;
import com.maint.pm_backend.repository.EmployeeRepository;
import com.maint.pm_backend.service.MaintenanceManagerApprovalService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.security.Principal;

@RestController
@RequestMapping("/api/v1/maintenance-manager/approvals")
@RequiredArgsConstructor
public class MaintenanceManagerApprovalController {

    private final MaintenanceManagerApprovalService maintenanceManagerApprovalService;
    private final EmployeeRepository employeeRepository;

    private Employee resolveEmployee(Principal principal) {
        if (principal == null) return null;
        return employeeRepository.findByEmail(principal.getName())
                .orElseThrow(() -> new RuntimeException("Logged in user not found"));
    }

    @PostMapping("/action")
    public ResponseEntity<SupervisorApprovalResponse> processApproval(
            @RequestBody SupervisorApprovalRequest request,
            Principal principal) {
        Employee employee = resolveEmployee(principal);
        if (employee == null) return ResponseEntity.status(401).build();
        try {
            return ResponseEntity.ok(maintenanceManagerApprovalService.processApproval(request, employee.getEmployeeId()));
        } catch (RuntimeException e) {
            if (e.getMessage().startsWith("Access denied")) return ResponseEntity.status(403).build();
            throw e;
        }
    }
}
