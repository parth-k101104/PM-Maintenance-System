package com.maint.pm_backend.dto;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class TaskCompletionResponse {
    private String status;
    private String message;
}
