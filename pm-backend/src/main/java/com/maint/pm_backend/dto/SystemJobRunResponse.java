package com.maint.pm_backend.dto;

import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor
public class SystemJobRunResponse {
    private String jobCode;
    private String status;
    private String responsePayload;
}
