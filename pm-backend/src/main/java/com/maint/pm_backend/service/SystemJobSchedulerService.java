package com.maint.pm_backend.service;

import com.maint.pm_backend.entity.SystemJobSchedule;
import com.maint.pm_backend.repository.SystemJobScheduleRepository;
import org.quartz.*;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Service;

import java.util.TimeZone;

@Service
public class SystemJobSchedulerService {

    private final Scheduler scheduler;
    private final SystemJobScheduleRepository scheduleRepository;

    public SystemJobSchedulerService(Scheduler scheduler, SystemJobScheduleRepository scheduleRepository) {
        this.scheduler = scheduler;
        this.scheduleRepository = scheduleRepository;
    }

    @EventListener(ApplicationReadyEvent.class)
    public void scheduleActiveJobs() {
        scheduleRepository.findByActiveTrueAndJobActiveTrue().forEach(this::schedule);
    }

    public void schedule(SystemJobSchedule scheduleConfig) {
        try {
            JobKey jobKey = JobKey.jobKey(scheduleConfig.getQuartzJobName(), scheduleConfig.getQuartzJobGroup());
            TriggerKey triggerKey = TriggerKey.triggerKey(
                    scheduleConfig.getQuartzTriggerName(),
                    scheduleConfig.getQuartzTriggerGroup()
            );

            JobDetail jobDetail = JobBuilder.newJob(SystemQuartzJob.class)
                    .withIdentity(jobKey)
                    .usingJobData("jobCode", scheduleConfig.getJob().getJobCode())
                    .storeDurably()
                    .build();

            CronScheduleBuilder cronSchedule = CronScheduleBuilder
                    .cronSchedule(scheduleConfig.getCronExpression())
                    .inTimeZone(TimeZone.getTimeZone(scheduleConfig.getTimeZone()));

            if ("DO_NOTHING".equalsIgnoreCase(scheduleConfig.getMisfirePolicy())) {
                cronSchedule = cronSchedule.withMisfireHandlingInstructionDoNothing();
            }

            CronTrigger trigger = TriggerBuilder.newTrigger()
                    .withIdentity(triggerKey)
                    .forJob(jobDetail)
                    .withSchedule(cronSchedule)
                    .build();

            if (scheduler.checkExists(triggerKey)) {
                scheduler.unscheduleJob(triggerKey);
            }
            if (!scheduler.checkExists(jobKey)) {
                scheduler.addJob(jobDetail, true);
            }
            scheduler.scheduleJob(trigger);
        } catch (SchedulerException ex) {
            throw new IllegalStateException("Failed to schedule system job: " + scheduleConfig.getScheduleCode(), ex);
        }
    }
}
