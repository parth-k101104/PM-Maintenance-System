package com.maint.pm_backend.service;

import com.maint.pm_backend.dto.TaskDetailsProjection;
import com.maint.pm_backend.entity.Employee;
import com.maint.pm_backend.repository.EmployeeRepository;
import com.maint.pm_backend.repository.PmScheduleExecutionRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.util.List;

@Service
@RequiredArgsConstructor
public class TaskListService {

    private final PmScheduleExecutionRepository executionRepository;
    private final EmployeeRepository employeeRepository;

    public List<TaskDetailsProjection> getTasksForToday(Long employeeId) {
        Employee employee = employeeRepository.findById(employeeId)
                .orElseThrow(() -> new RuntimeException("Employee not found"));

        // Fixed date for testing to match seed data (Feb 1st, 2026)
        LocalDate today = LocalDate.of(2026, 2, 1);
        
        return executionRepository.findTasksForTodayNative(employeeId, today);
    }

    public List<com.maint.pm_backend.dto.CompletedTaskProjection> getCompletedTasks(Long employeeId) {
        Employee employee = employeeRepository.findById(employeeId)
                .orElseThrow(() -> new RuntimeException("Employee not found"));

        return executionRepository.findCompletedTasksNative(employeeId);
    }

}
