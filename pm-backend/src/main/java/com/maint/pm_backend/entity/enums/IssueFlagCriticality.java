package com.maint.pm_backend.entity.enums;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonValue;

public enum IssueFlagCriticality {
    CRITICAL("CRITICAL"),
    HIGH("HIGH"),
    MEDIUM("MEDIUM"),
    LOW("LOW");

    private final String value;

    IssueFlagCriticality(String value) {
        this.value = value;
    }

    @JsonValue
    public String getValue() {
        return value;
    }

    @JsonCreator
    public static IssueFlagCriticality fromValue(String value) {
        for (IssueFlagCriticality criticality : values()) {
            if (criticality.value.equalsIgnoreCase(value)) {
                return criticality;
            }
        }
        throw new IllegalArgumentException("Unknown criticality: " + value);
    }
}
