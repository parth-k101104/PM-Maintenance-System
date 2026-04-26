package com.maint.pm_backend.config;

import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Configuration;

/**
 * Centralized configuration for approval workflow timing parameters.
 * All values can be overridden in application.properties under the
 * {@code app.workflow} prefix, or via environment variables.
 *
 * <pre>
 * app.workflow.approval-due-date-offset-days=1
 * app.workflow.reschedule-offset-days=1
 * </pre>
 */
@Configuration
@ConfigurationProperties(prefix = "app.workflow")
@Getter
@Setter
public class AppWorkflowProperties {

    /**
     * Number of days added to "now" to compute the due date when an approval
     * row transitions to APPROVAL_REQUESTED status.
     * Default: 1 day.
     */
    private long approvalDueDateOffsetDays = 1;

    /**
     * Number of days after rejection to set the due date for a rescheduled
     * task execution.
     * Default: 1 day.
     */
    private long rescheduleDueDateOffsetDays = 1;
}
