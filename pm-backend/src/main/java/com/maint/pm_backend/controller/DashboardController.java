package com.maint.pm_backend.controller;

import com.maint.pm_backend.dto.OperatorDashboardResponse;
import com.maint.pm_backend.dto.SupervisorDashboardResponse;
import com.maint.pm_backend.dto.LineManagerDashboardResponse;
import com.maint.pm_backend.entity.Employee;
import com.maint.pm_backend.repository.EmployeeRepository;
import com.maint.pm_backend.service.DashboardService;
import com.maint.pm_backend.service.SupervisorDashboardService;
import com.maint.pm_backend.service.LineManagerDashboardService;
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

}
