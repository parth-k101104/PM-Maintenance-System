package com.maint.pm_backend.entity.enums;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonValue;

public enum IssueFlagStatus {
    POTENTIAL_REPLACEMENT("POTENTIAL_REPLACEMENT"),
    REPLACEMENT_REQUIRED("REPLACEMENT_REQUIRED"),
    REPLACEMENT_INITIATED("REPLACEMENT_INITIATED"),
    REPLACEMENT_DONE("REPLACEMENT_DONE"),
    CLOSED("CLOSED");

    private final String value;

    IssueFlagStatus(String value) {
        this.value = value;
    }

    @JsonValue
    public String getValue() {
        return value;
    }

    @JsonCreator
    public static IssueFlagStatus fromValue(String value) {
        for (IssueFlagStatus status : values()) {
            if (status.value.equalsIgnoreCase(value)) {
                return status;
            }
        }
        throw new IllegalArgumentException("Unknown issue flag status: " + value);
    }
}
