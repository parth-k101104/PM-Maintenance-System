package com.maint.pm_backend.entity.enums;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonValue;

public enum TaskExecutionStatus {
    ASSIGNED("ASSIGNED"),
    IN_PROGRESS("IN_PROGRESS"),
    UNDER_SUPERVISOR_REVIEW("UNDER_SUPERVISOR_REVIEW"),
    UNDER_LINE_MANAGER_REVIEW("UNDER_LINE_MANAGER_REVIEW"),
    UNDER_MAINT_MANAGER_REVIEW("UNDER_MAINT_MANAGER_REVIEW"),
    APPROVED("APPROVED"),
    REJECTED("REJECTED"),
    COMPLETED("COMPLETED");

    private final String value;

    TaskExecutionStatus(String value) {
        this.value = value;
    }

    @JsonValue
    public String getValue() {
        return value;
    }

    @JsonCreator
    public static TaskExecutionStatus fromValue(String value) {
        for (TaskExecutionStatus status : values()) {
            if (status.value.equalsIgnoreCase(value)) {
                return status;
            }
        }
        throw new IllegalArgumentException("Unknown execution status: " + value);
    }
}
