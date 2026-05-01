package com.maint.pm_backend.dto;

import lombok.Data;

@Data
public class IndependentIssueRequest {
    private Long partId;
    private String criticality;
    private String issueDetails;
}
