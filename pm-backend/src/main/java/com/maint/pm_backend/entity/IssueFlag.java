package com.maint.pm_backend.entity;

import com.maint.pm_backend.entity.enums.IssueFlagCriticality;
import com.maint.pm_backend.entity.enums.IssueFlagStatus;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.LocalDateTime;

@Entity
@Table(name = "issue_flags")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class IssueFlag {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "flag_id")
    private Long flagId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "schedule_execution_id")
    private PmScheduleExecution scheduleExecution;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "raised_by")
    private Employee raisedBy;

    @Column(name = "raised_dttm")
    private LocalDateTime raisedDttm;

    @Column(name = "due_date")
    private LocalDateTime dueDate;

    @Column(name = "addressed_dttm")
    private LocalDateTime addressedDttm;

    @Column(name = "issue_details", columnDefinition = "TEXT")
    private String issueDetails;

    @Column(name = "notes", columnDefinition = "TEXT")
    private String notes;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "attendant_id")
    private Employee attendant;

    @Column(name = "criticality", length = 50)
    @Enumerated(EnumType.STRING)
    private IssueFlagCriticality criticality;

    @Column(name = "flag_status", length = 50)
    @Enumerated(EnumType.STRING)
    private IssueFlagStatus flagStatus;
}
