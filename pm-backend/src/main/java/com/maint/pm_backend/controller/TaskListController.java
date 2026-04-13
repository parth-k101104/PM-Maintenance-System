package com.maint.pm_backend.controller;

import com.maint.pm_backend.dto.TaskDetailsProjection;
import com.maint.pm_backend.entity.Employee;
import com.maint.pm_backend.repository.EmployeeRepository;
import com.maint.pm_backend.service.TaskListService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.security.Principal;
import java.util.List;

@RestController
@RequestMapping("/api/v1/tasks")
@RequiredArgsConstructor
public class TaskListController {

    private final TaskListService taskListService;
    private final EmployeeRepository employeeRepository;

    @GetMapping("/today")
    public ResponseEntity<List<TaskDetailsProjection>> getTasksForToday(Principal principal) {
        if (principal == null) {
            return ResponseEntity.status(401).build();
        }

        String email = principal.getName();
        Employee employee = employeeRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("Logged in user not found"));

        List<TaskDetailsProjection> tasks = taskListService.getTasksForToday(employee.getEmployeeId());
        return ResponseEntity.ok(tasks);
    }

    @GetMapping("/completed")
    public ResponseEntity<List<com.maint.pm_backend.dto.CompletedTaskProjection>> getCompletedTasks(Principal principal) {
        if (principal == null) {
            return ResponseEntity.status(401).build();
        }

        String email = principal.getName();
        Employee employee = employeeRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("Logged in user not found"));

        List<com.maint.pm_backend.dto.CompletedTaskProjection> tasks = taskListService.getCompletedTasks(employee.getEmployeeId());
        return ResponseEntity.ok(tasks);
    }

}
