package com.maint.pm_backend.controller;

import com.maint.pm_backend.dto.OperatorDashboardResponse;
import com.maint.pm_backend.dto.SupervisorDashboardResponse;
import com.maint.pm_backend.dto.LineManagerDashboardResponse;
import com.maint.pm_backend.entity.Employee;
import com.maint.pm_backend.repository.EmployeeRepository;
import com.maint.pm_backend.service.DashboardService;
import com.maint.pm_backend.service.SupervisorDashboardService;
import com.maint.pm_backend.service.LineManagerDashboardService;
import com.maint.pm_backend.service.MaintenanceManagerDashboardService;
import com.maint.pm_backend.dto.MaintenanceManagerDashboardResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.security.Principal;
import java.util.List;

@RestController
@RequestMapping("/api/v1/dashboard")
@RequiredArgsConstructor
public class DashboardController {

    private final DashboardService dashboardService;
    private final SupervisorDashboardService supervisorDashboardService;
    private final LineManagerDashboardService lineManagerDashboardService;
    private final MaintenanceManagerDashboardService maintenanceManagerDashboardService;
    private final EmployeeRepository employeeRepository;

    @GetMapping("/operator")
    public ResponseEntity<OperatorDashboardResponse> getOperatorDashboard(Principal principal) {
        if (principal == null) {
            return ResponseEntity.status(401).build();
        }

        String email = principal.getName();
        Employee employee = employeeRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("Logged in user not found"));

        OperatorDashboardResponse response = dashboardService.getOperatorDashboard(employee.getEmployeeId());
        return ResponseEntity.ok(response);
    }

    @GetMapping("/supervisor")
    public ResponseEntity<SupervisorDashboardResponse> getSupervisorDashboard(Principal principal) {
        if (principal == null) {
            return ResponseEntity.status(401).build();
        }

        String email = principal.getName();
        Employee employee = employeeRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("Logged in user not found"));

        try {
            SupervisorDashboardResponse response = supervisorDashboardService.getDashboard(employee.getEmployeeId());
            return ResponseEntity.ok(response);
        } catch (RuntimeException e) {
            if (e.getMessage().startsWith("Access denied")) {
                return ResponseEntity.status(403).build();
            }
            throw e;
        }
    }

    @GetMapping("/line-manager")
    public ResponseEntity<LineManagerDashboardResponse> getLineManagerDashboard(Principal principal) {
        if (principal == null) {
            return ResponseEntity.status(401).build();
        }

        String email = principal.getName();
        Employee employee = employeeRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("Logged in user not found"));

        try {
            LineManagerDashboardResponse response = lineManagerDashboardService.getDashboard(employee.getEmployeeId());
            return ResponseEntity.ok(response);
        } catch (RuntimeException e) {
            if (e.getMessage().startsWith("Access denied")) {
                return ResponseEntity.status(403).build();
            }
            throw e;
        }
    }

    @GetMapping("/maintenance-manager")
    public ResponseEntity<MaintenanceManagerDashboardResponse> getMaintenanceManagerDashboard(
            Principal principal,
            @org.springframework.web.bind.annotation.RequestParam(defaultValue = "365") int windowDays) {
        if (principal == null) {
            return ResponseEntity.status(401).build();
        }

        String email = principal.getName();
        Employee employee = employeeRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("Logged in user not found"));

        try {
            MaintenanceManagerDashboardResponse response = maintenanceManagerDashboardService.getDashboard(employee.getEmployeeId(), windowDays);
            return ResponseEntity.ok(response);
        } catch (RuntimeException e) {
            if (e.getMessage().startsWith("Access denied")) {
                return ResponseEntity.status(403).build();
            }
            throw e;
        }
    }

    @GetMapping("/maintenance-manager/tasks")
    public ResponseEntity<java.util.List<com.maint.pm_backend.dto.TaskDetailsProjection>> getMaintenanceManagerTasksByStatusGroup(
            Principal principal,
            @org.springframework.web.bind.annotation.RequestParam String statusGroup,
            @org.springframework.web.bind.annotation.RequestParam(defaultValue = "30") int windowDays) {
        if (principal == null) {
            return ResponseEntity.status(401).build();
        }

        String email = principal.getName();
        Employee employee = employeeRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("Logged in user not found"));

        try {
            java.util.List<com.maint.pm_backend.dto.TaskDetailsProjection> tasks =
                    maintenanceManagerDashboardService.getTasksByStatusGroup(statusGroup, windowDays);
            return ResponseEntity.ok(tasks);
        } catch (RuntimeException e) {
            if (e.getMessage() != null && e.getMessage().startsWith("Access denied")) {
                return ResponseEntity.status(403).build();
            }
            throw e;
        }
    }

    @GetMapping("/maintenance-manager/compliance-trend")
    public ResponseEntity<java.util.List<java.util.Map<String, Object>>> getPlantComplianceTrend(
            Principal principal,
            @org.springframework.web.bind.annotation.RequestParam(defaultValue = "365") int windowDays) {
        try {
            return ResponseEntity.ok(maintenanceManagerDashboardService.getPlantComplianceTrend(windowDays));
        } catch (RuntimeException e) {
            throw e;
        }
    }

    @GetMapping("/maintenance-manager/evidence-trend")
    public ResponseEntity<java.util.List<java.util.Map<String, Object>>> getPlantEvidenceTrend(
            Principal principal,
            @org.springframework.web.bind.annotation.RequestParam(defaultValue = "365") int windowDays) {
        try {
            return ResponseEntity.ok(maintenanceManagerDashboardService.getPlantEvidenceTrend(windowDays));
        } catch (RuntimeException e) {
            throw e;
        }
    }

    @GetMapping("/maintenance-manager/rejection-trend")
    public ResponseEntity<java.util.List<java.util.Map<String, Object>>> getPlantRejectionTrend(
            Principal principal,
            @org.springframework.web.bind.annotation.RequestParam(defaultValue = "365") int windowDays) {
        try {
            return ResponseEntity.ok(maintenanceManagerDashboardService.getPlantRejectionTrend(windowDays));
        } catch (RuntimeException e) {
            throw e;
        }
    }

    @GetMapping("/maintenance-manager/approval-turnaround-trend")
    public ResponseEntity<java.util.List<java.util.Map<String, Object>>> getPlantApprovalTurnaroundTrend(
            Principal principal,
            @org.springframework.web.bind.annotation.RequestParam(defaultValue = "365") int windowDays) {
        try {
            return ResponseEntity.ok(maintenanceManagerDashboardService.getPlantApprovalTurnaroundTrend(windowDays));
        } catch (RuntimeException e) {
            throw e;
        }
    }

}
