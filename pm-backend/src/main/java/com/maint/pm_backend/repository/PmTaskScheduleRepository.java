package com.maint.pm_backend.repository;

import com.maint.pm_backend.entity.PmTaskSchedule;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface PmTaskScheduleRepository extends JpaRepository<PmTaskSchedule, Long> {
}
