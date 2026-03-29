package com.maint.pm_backend.entity;

import jakarta.persistence.*;
import lombok.Data;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;
import java.time.LocalDateTime;
import java.util.List;

@Entity
@Table(name = "pm_std_tasks")
@Data
public class PmStdTask {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "std_task_id")
    private Long stdTaskId;

    @Column(name = "task_ref_no", length = 100)
    private String taskRefNo;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "tools", columnDefinition = "jsonb")
    private List<String> tools;

    @Column(name = "estimated_req_time")
    private Integer estimatedReqTime;

    @Column(name = "created_at")
    private LocalDateTime createdAt;
}
