package com.maint.pm_backend.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;

/**
 * Represents a single tuneable business-logic parameter stored in the
 * {@code config_param} table.
 *
 * <p>Params are loaded once at startup into an in-memory cache by
 * {@link com.maint.pm_backend.service.ConfigParamService} and refreshed
 * automatically every 10 minutes so that DB edits propagate without restart.
 */
@Entity
@Table(name = "config_param")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ConfigParam {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "param_id")
    private Long paramId;

    /**
     * Unique business key — use {@link com.maint.pm_backend.entity.enums.ConfigParamKey}
     * constants rather than raw strings throughout the codebase.
     */
    @Column(name = "param_key", nullable = false, unique = true, length = 100)
    private String paramKey;

    @Column(name = "param_value", nullable = false, length = 500)
    private String paramValue;

    /** Logical grouping: WORKFLOW, ISSUE_FLAG, TASK, S3, ANALYTICS */
    @Column(name = "param_category", nullable = false, length = 100)
    private String paramCategory;

    @Column(name = "description", columnDefinition = "TEXT")
    private String description;

    /** Hint for consumers: STRING | INTEGER | LONG | DOUBLE | BOOLEAN */
    @Column(name = "data_type", nullable = false, length = 20)
    @Builder.Default
    private String dataType = "STRING";

    @Column(name = "is_active", nullable = false)
    @Builder.Default
    private boolean isActive = true;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        if (createdAt == null) createdAt = LocalDateTime.now();
        if (updatedAt == null) updatedAt = LocalDateTime.now();
    }
}
