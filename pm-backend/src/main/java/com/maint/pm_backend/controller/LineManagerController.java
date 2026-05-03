package com.maint.pm_backend.controller;

import com.maint.pm_backend.dto.LineEquipmentDTO;
import com.maint.pm_backend.dto.LineAnalyticsDashboardResponse;
import com.maint.pm_backend.dto.PartAnalyticsResponse;
import com.maint.pm_backend.dto.SupervisorApprovalRequest;
import com.maint.pm_backend.dto.SupervisorApprovalResponse;
import com.maint.pm_backend.dto.TaskDetailsProjection;
import com.maint.pm_backend.dto.IssueFlagProjection;
import com.maint.pm_backend.entity.Employee;
import com.maint.pm_backend.repository.EmployeeRepository;
import com.maint.pm_backend.service.LineManagerApprovalService;
import com.maint.pm_backend.service.LineAnalyticsService;
import com.maint.pm_backend.service.LineManagerDashboardService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.security.Principal;
import java.util.List;

@RestController
@RequestMapping("/api/v1/line-manager")
@RequiredArgsConstructor
public class LineManagerController {

    private final LineManagerDashboardService lineManagerService;
    private final LineManagerApprovalService lineManagerApprovalService;
    private final LineAnalyticsService lineAnalyticsService;
    private final EmployeeRepository employeeRepository;

    private Employee resolveEmployee(Principal principal) {
        if (principal == null) return null;
        return employeeRepository.findByEmail(principal.getName())
                .orElseThrow(() -> new RuntimeException("Logged in user not found"));
    }

    @GetMapping("/equipments")
    public ResponseEntity<List<LineEquipmentDTO>> getEquipments(Principal principal) {
        Employee employee = resolveEmployee(principal);
        if (employee == null) return ResponseEntity.status(401).build();
        try {
            return ResponseEntity.ok(lineManagerService.getEquipmentHierarchy(employee.getEmployeeId()));
        } catch (RuntimeException e) {
            if (e.getMessage().startsWith("Access denied")) return ResponseEntity.status(403).build();
            throw e;
        }
    }

    @GetMapping("/analytics/dashboard")
    public ResponseEntity<LineAnalyticsDashboardResponse> getAnalyticsDashboard(Principal principal) {
        Employee employee = resolveEmployee(principal);
        if (employee == null) return ResponseEntity.status(401).build();
        try {
            return ResponseEntity.ok(lineAnalyticsService.getDashboard(employee.getEmployeeId()));
        } catch (RuntimeException e) {
            if (e.getMessage().startsWith("Access denied")) return ResponseEntity.status(403).build();
            throw e;
        }
    }

    @PostMapping("/analytics/insights/{insightId}/acknowledge")
    public ResponseEntity<Void> acknowledgeInsight(
            @org.springframework.web.bind.annotation.PathVariable Long insightId,
            Principal principal) {
        Employee employee = resolveEmployee(principal);
        if (employee == null) return ResponseEntity.status(401).build();
        try {
            lineAnalyticsService.acknowledgeInsight(employee.getEmployeeId(), insightId);
            return ResponseEntity.noContent().build();
        } catch (RuntimeException e) {
            if (e.getMessage().startsWith("Access denied")) return ResponseEntity.status(403).build();
            if (e.getMessage().startsWith("Insight not found")) return ResponseEntity.notFound().build();
            throw e;
        }
    }

    @GetMapping("/analytics/parts/{partId}")
    public ResponseEntity<PartAnalyticsResponse> getPartAnalytics(
            @PathVariable Long partId,
            Principal principal) {
        Employee employee = resolveEmployee(principal);
        if (employee == null) return ResponseEntity.status(401).build();
        try {
            return ResponseEntity.ok(lineAnalyticsService.getPartAnalytics(employee.getEmployeeId(), partId));
        } catch (RuntimeException e) {
            if (e.getMessage().startsWith("Access denied")) return ResponseEntity.status(403).build();
            throw e;
        }
    }

    @GetMapping("/approvals/today")
    public ResponseEntity<List<TaskDetailsProjection>> getTodaysApprovals(Principal principal) {
        Employee employee = resolveEmployee(principal);
        if (employee == null) return ResponseEntity.status(401).build();
        try {
            return ResponseEntity.ok(lineManagerService.getTodaysApprovalsList(employee.getEmployeeId()));
        } catch (RuntimeException e) {
            if (e.getMessage().startsWith("Access denied")) return ResponseEntity.status(403).build();
            throw e;
        }
    }

    @GetMapping("/approvals/backlog")
    public ResponseEntity<List<TaskDetailsProjection>> getBacklogApprovals(Principal principal) {
        Employee employee = resolveEmployee(principal);
        if (employee == null) return ResponseEntity.status(401).build();
        try {
            return ResponseEntity.ok(lineManagerService.getBacklogApprovalsList(employee.getEmployeeId()));
        } catch (RuntimeException e) {
            if (e.getMessage().startsWith("Access denied")) return ResponseEntity.status(403).build();
            throw e;
        }
    }

    @GetMapping("/flags")
    public ResponseEntity<List<IssueFlagProjection>> getFlags(Principal principal) {
        Employee employee = resolveEmployee(principal);
        if (employee == null) return ResponseEntity.status(401).build();
        try {
            return ResponseEntity.ok(lineManagerService.getFlagsList(employee.getEmployeeId()));
        } catch (RuntimeException e) {
            if (e.getMessage().startsWith("Access denied")) return ResponseEntity.status(403).build();
            throw e;
        }
    }

    @GetMapping("/tasks/active")
    public ResponseEntity<List<TaskDetailsProjection>> getActiveTasks(Principal principal) {
        Employee employee = resolveEmployee(principal);
        if (employee == null) return ResponseEntity.status(401).build();
        try {
            return ResponseEntity.ok(lineManagerService.getActiveTasksList(employee.getEmployeeId()));
        } catch (RuntimeException e) {
            if (e.getMessage().startsWith("Access denied")) return ResponseEntity.status(403).build();
            throw e;
        }
    }

    @PostMapping("/approvals/action")
    public ResponseEntity<SupervisorApprovalResponse> processApproval(
            @RequestBody SupervisorApprovalRequest request,
            Principal principal) {
        Employee employee = resolveEmployee(principal);
        if (employee == null) return ResponseEntity.status(401).build();
        try {
            return ResponseEntity.ok(lineManagerApprovalService.processApproval(request, employee.getEmployeeId()));
        } catch (RuntimeException e) {
            if (e.getMessage().startsWith("Access denied")) return ResponseEntity.status(403).build();
            throw e;
        }
    }
}
