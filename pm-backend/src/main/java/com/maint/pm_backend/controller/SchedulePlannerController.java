package com.maint.pm_backend.controller;

import com.maint.pm_backend.dto.CreatePmScheduleRequest;
import com.maint.pm_backend.dto.SchedulePlannerContextResponse;
import com.maint.pm_backend.dto.SchedulePlannerTaskResponse;
import com.maint.pm_backend.dto.UpdateScheduleAssignmentRequest;
import com.maint.pm_backend.entity.Employee;
import com.maint.pm_backend.repository.EmployeeRepository;
import com.maint.pm_backend.service.SchedulePlannerService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.security.Principal;
import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/api/v1/schedule-planner")
@RequiredArgsConstructor
@Slf4j
public class SchedulePlannerController {

    private final SchedulePlannerService schedulePlannerService;
    private final EmployeeRepository employeeRepository;

    @GetMapping("/context")
    public ResponseEntity<SchedulePlannerContextResponse> getContext(
            @RequestParam(required = false) Long lineId,
            @RequestParam(required = false) String expertise,
            Principal principal) {
        Employee employee = resolveEmployee(principal);
        if (employee == null) return ResponseEntity.status(401).build();
        try {
            return ResponseEntity.ok(schedulePlannerService.getContext(employee.getEmployeeId(), lineId, expertise));
        } catch (RuntimeException e) {
            return mapPlannerError(e);
        }
    }

    @GetMapping("/tasks")
    public ResponseEntity<List<SchedulePlannerTaskResponse>> listTasks(
            @RequestParam(required = false) Long lineId,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate fromDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate toDate,
            Principal principal) {
        Employee employee = resolveEmployee(principal);
        if (employee == null) return ResponseEntity.status(401).build();
        try {
            return ResponseEntity.ok(schedulePlannerService.listTasks(employee.getEmployeeId(), lineId, fromDate, toDate));
        } catch (RuntimeException e) {
            return mapPlannerError(e);
        }
    }

    @PostMapping("/tasks")
    public ResponseEntity<SchedulePlannerTaskResponse> createTask(
            @RequestBody CreatePmScheduleRequest request,
            Principal principal) {
        Employee employee = resolveEmployee(principal);
        if (employee == null) return ResponseEntity.status(401).build();
        try {
            return ResponseEntity.ok(schedulePlannerService.createTask(employee.getEmployeeId(), request));
        } catch (RuntimeException e) {
            return mapPlannerError(e);
        }
    }

    @PutMapping("/task-schedules/{taskScheduleId}/assignment")
    public ResponseEntity<SchedulePlannerTaskResponse> updateAssignment(
            @PathVariable Long taskScheduleId,
            @RequestBody UpdateScheduleAssignmentRequest request,
            Principal principal) {
        Employee employee = resolveEmployee(principal);
        if (employee == null) return ResponseEntity.status(401).build();
        try {
            return ResponseEntity.ok(schedulePlannerService.updateAssignment(employee.getEmployeeId(), taskScheduleId, request));
        } catch (RuntimeException e) {
            return mapPlannerError(e);
        }
    }

    @PutMapping("/schedule-executions/{scheduleExecutionId}/assignment")
    public ResponseEntity<SchedulePlannerTaskResponse> updateExecutionAssignment(
            @PathVariable Long scheduleExecutionId,
            @RequestBody UpdateScheduleAssignmentRequest request,
            Principal principal) {
        Employee employee = resolveEmployee(principal);
        if (employee == null) return ResponseEntity.status(401).build();
        try {
            return ResponseEntity.ok(schedulePlannerService.updateExecutionAssignment(employee.getEmployeeId(), scheduleExecutionId, request));
        } catch (RuntimeException e) {
            return mapPlannerError(e);
        }
    }

    private Employee resolveEmployee(Principal principal) {
        if (principal == null) return null;
        return employeeRepository.findByEmail(principal.getName())
                .orElseThrow(() -> new RuntimeException("Logged in user not found"));
    }

    private <T> ResponseEntity<T> mapPlannerError(RuntimeException e) {
        log.warn("Schedule planner request failed: {}", e.getMessage(), e);
        if (e.getMessage() != null && e.getMessage().startsWith("Access denied")) {
            return ResponseEntity.status(403).build();
        }
        if (e.getMessage() != null && (e.getMessage().contains("not found") || e.getMessage().contains("not have"))) {
            return ResponseEntity.notFound().build();
        }
        return ResponseEntity.badRequest().build();
    }
}
