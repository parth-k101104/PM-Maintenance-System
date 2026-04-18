package com.maint.pm_backend.repository;

import com.maint.pm_backend.entity.PmScheduleApproval;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface PmScheduleApprovalRepository extends JpaRepository<PmScheduleApproval, Long> {
    List<PmScheduleApproval> findByScheduleExecution_ScheduleExecutionId(Long scheduleExecutionId);
    Optional<PmScheduleApproval> findByScheduleExecution_ScheduleExecutionIdAndApprovalLevel(Long scheduleExecutionId, Integer approvalLevel);
}
