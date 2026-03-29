package com.maint.pm_backend.service;

import com.maint.pm_backend.dto.DashboardItemDTO;
import com.maint.pm_backend.dto.OperatorDashboardResponse;
import com.maint.pm_backend.entity.Employee;
import com.maint.pm_backend.entity.PmScheduleExecution;
import com.maint.pm_backend.entity.enums.TaskExecutionStatus;
import com.maint.pm_backend.repository.EmployeeRepository;
import com.maint.pm_backend.repository.PmScheduleExecutionRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class DashboardService {

    private final PmScheduleExecutionRepository executionRepository;
    private final EmployeeRepository employeeRepository;

    public OperatorDashboardResponse getOperatorDashboard(Long employeeId) {
        Employee employee = employeeRepository.findById(employeeId)
                .orElseThrow(() -> new RuntimeException("Employee not found"));

        List<PmScheduleExecution> allTasks = executionRepository.findAllByEmployeeIdWithDetails(employeeId);
        // Fixed date for testing to match seed data (Feb 1st, 2026)
        LocalDate today = LocalDate.of(2026, 2, 1);

        // 1. User Context
        // Fixed time for testing to ensure a consistent shift (10:00 AM)
        String shiftStr = employee.getShift() != null ? employee.getShift() : determineShift(java.time.LocalTime.of(10, 0));
        OperatorDashboardResponse.UserContext userContext = OperatorDashboardResponse.UserContext.builder()
                .name(employee.getFullName())
                .date(today.format(DateTimeFormatter.ofPattern("yyyy-MM-dd")))
                .shift(shiftStr)
                .build();

        // 2 & 3. Task Aggregations
        int tasksToday = 0;
        int backlogTasks = 0;
        int remainingTasks = 0;
        int approved = 0;
        int pending = 0;
        int denied = 0;
        int totalTimeMins = 0;

        Map<String, Integer> toolCounts = new HashMap<>();

        for (PmScheduleExecution exec : allTasks) {
            LocalDate dueDate = exec.getDueDate() != null ? exec.getDueDate().toLocalDate() : null;
            TaskExecutionStatus status = exec.getStatus() != null ? exec.getStatus() : TaskExecutionStatus.ASSIGNED;

            if (dueDate != null) {
                if (dueDate.isEqual(today)) {
                    tasksToday++;
                } else if (dueDate.isBefore(today) && status != TaskExecutionStatus.COMPLETED) {
                    backlogTasks++;
                }
            }

            if (status != TaskExecutionStatus.COMPLETED) {
                remainingTasks++;
                
                // Sum time
                if (exec.getTaskSchedule() != null && exec.getTaskSchedule().getStdTask() != null) {
                    Integer estTime = exec.getTaskSchedule().getStdTask().getEstimatedReqTime();
                    if (estTime != null) {
                        totalTimeMins += estTime;
                    }
                    
                    // Aggregate tools
                    List<String> tools = exec.getTaskSchedule().getStdTask().getTools();
                    if (tools != null) {
                        for (String t : tools) {
                            if (t != null && !t.isBlank()) {
                                String trimmedTool = t.trim();
                                toolCounts.put(trimmedTool, toolCounts.getOrDefault(trimmedTool, 0) + 1);
                            }
                        }
                    }
                }
            }

            // Status counts
            if (status == TaskExecutionStatus.APPROVED) {
                approved++;
            } else if (status == TaskExecutionStatus.REJECTED) {
                denied++;
            } else if (status == TaskExecutionStatus.APPROVAL_PENDING) {
                pending++;
            }
        }

        // 4. Build tools list
        List<DashboardItemDTO> requiredItems = toolCounts.entrySet().stream()
                .map(entry -> new DashboardItemDTO(entry.getKey(), entry.getValue()))
                .collect(Collectors.toList());

        // 5. Build Final Response
        return OperatorDashboardResponse.builder()
                .userContext(userContext)
                .taskSummary(OperatorDashboardResponse.TaskSummary.builder()
                        .tasksToday(tasksToday)
                        .backlogTasks(backlogTasks)
                        .remainingTasks(remainingTasks)
                        .build())
                .taskStatus(OperatorDashboardResponse.TaskStatusCount.builder()
                        .approved(approved)
                        .pending(pending)
                        .denied(denied)
                        .build())
                .timeEstimate(OperatorDashboardResponse.TimeEstimate.builder()
                        .totalTimeRequiredMins(totalTimeMins)
                        .formattedEstimate(formatMinutes(totalTimeMins))
                        .build())
                .requiredItems(requiredItems)
                .build();
    }

    private String determineShift(java.time.LocalTime time) {
        if (time.isAfter(java.time.LocalTime.of(6, 0)) && time.isBefore(java.time.LocalTime.of(14, 0))) {
            return "Morning (06:00 - 14:00)";
        } else if (time.isAfter(java.time.LocalTime.of(14, 0)) && time.isBefore(java.time.LocalTime.of(22, 0))) {
            return "Afternoon (14:00 - 22:00)";
        }
        return "Night (22:00 - 06:00)";
    }

    private String formatMinutes(int totalMins) {
        int hours = totalMins / 60;
        int mins = totalMins % 60;
        if (hours > 0) {
            return hours + "h " + (mins > 0 ? mins + "m" : "");
        }
        return mins + "m";
    }
}
