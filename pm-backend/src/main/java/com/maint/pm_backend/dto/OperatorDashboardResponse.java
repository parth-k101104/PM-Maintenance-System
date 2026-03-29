package com.maint.pm_backend.dto;

import lombok.Builder;
import lombok.Data;
import java.util.List;

@Data
@Builder
public class OperatorDashboardResponse {

    private UserContext userContext;
    private TaskSummary taskSummary;
    private TaskStatusCount taskStatus;
    private TimeEstimate timeEstimate;
    private List<DashboardItemDTO> requiredItems;

    @Data
    @Builder
    public static class UserContext {
        private String name;
        private String date;
        private String shift;
    }

    @Data
    @Builder
    public static class TaskSummary {
        private int tasksToday;
        private int backlogTasks;
        private int remainingTasks;
    }

    @Data
    @Builder
    public static class TaskStatusCount {
        private int approved;
        private int pending;
        private int denied;
    }

    @Data
    @Builder
    public static class TimeEstimate {
        private int totalTimeRequiredMins;
        private String formattedEstimate;
    }
}
