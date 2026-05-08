package com.maint.pm_backend.dto;

import lombok.Builder;
import lombok.Data;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

@Data
@Builder
public class SchedulePlannerTaskResponse {
    private Long stdTaskId;
    private Long taskScheduleId;
    private String taskRefNo;
    private String taskName;
    private String frequency;
    private Long lineId;
    private String lineName;
    private Long equipmentId;
    private String equipmentName;
    private Long elementId;
    private String elementName;
    private Long partId;
    private String partName;
    private Long assigneeEmployeeId;
    private String assigneeName;
    private Long supervisorId;
    private String supervisorName;
    private Long approvalWorkflowId;
    private Integer executionCount;
    private LocalDate firstDueDate;
    private LocalDate lastDueDate;
    private List<ExecutionSummary> executions;

    @Data
    @Builder
    public static class ExecutionSummary {
        private Long scheduleExecutionId;
        private LocalDateTime dueDate;
        private String status;
        private Long assigneeEmployeeId;
        private String assigneeName;
    }
}
