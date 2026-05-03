package com.maint.pm_backend.repository;

import com.maint.pm_backend.entity.SystemJob;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface SystemJobRepository extends JpaRepository<SystemJob, Long> {
    Optional<SystemJob> findByJobCode(String jobCode);
}
