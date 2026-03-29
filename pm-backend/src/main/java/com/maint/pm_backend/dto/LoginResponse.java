package com.maint.pm_backend.dto;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class LoginResponse {
    private String message;
    private String token;
    private Long employeeId;
    private String fullName;
    private Long roleId;
    private java.util.Map<String, Object> permissions;
}
