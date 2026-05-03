package com.maint.pm_backend.repository;

import com.maint.pm_backend.entity.SystemJobSchedule;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;

public interface SystemJobScheduleRepository extends JpaRepository<SystemJobSchedule, Long> {
    @Query("""
            SELECT schedule
            FROM SystemJobSchedule schedule
            JOIN FETCH schedule.job job
            WHERE schedule.active = TRUE
              AND job.active = TRUE
            """)
    List<SystemJobSchedule> findByActiveTrueAndJobActiveTrue();
}
