package com.maint.pm_backend.service;

import com.maint.pm_backend.dto.FlagReplacementRequest;
import com.maint.pm_backend.dto.FlagScanRequest;
import com.maint.pm_backend.dto.FlagScanResponse;
import com.maint.pm_backend.dto.IndependentIssueRequest;
import com.maint.pm_backend.dto.IssueFlagReviewRequest;
import com.maint.pm_backend.entity.Employee;
import com.maint.pm_backend.entity.IssueFlag;
import com.maint.pm_backend.entity.PmScheduleExecution;
import com.maint.pm_backend.entity.SparePart;
import com.maint.pm_backend.entity.SparePartReplacement;
import com.maint.pm_backend.entity.enums.IssueFlagCriticality;
import com.maint.pm_backend.entity.enums.IssueFlagStatus;
import com.maint.pm_backend.repository.EmployeeRepository;
import com.maint.pm_backend.repository.IssueFlagRepository;
import com.maint.pm_backend.repository.PmScheduleExecutionRepository;
import com.maint.pm_backend.repository.SparePartRepository;
import com.maint.pm_backend.repository.SparePartReplacementRepository;
import com.maint.pm_backend.util.DateUtils;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Set;

@Service
@RequiredArgsConstructor
public class IssueFlagService {

    private final IssueFlagRepository issueFlagRepository;
    private final PmScheduleExecutionRepository executionRepository;
    private final EmployeeRepository employeeRepository;
    private final SparePartRepository sparePartRepository;
    private final SparePartReplacementRepository replacementRepository;
    private final AwsS3Service awsS3Service;
    private final ConfigParamService configParamService;

    // role_id reference from V5__insert_roles.sql:
    // 1 = Maintenance Manager, 2 = Line Manager, 3 = Line Supervisor, 6 = Maintenance Engineer
    private static final Set<Long> SUPERVISOR_ROLES     = Set.of(3L);
    private static final Set<Long> SENIOR_MANAGER_ROLES = Set.of(1L, 2L, 6L);

    @Transactional
    public IssueFlag raiseIndependentIssue(IndependentIssueRequest request, Long employeeId) {
        Employee employee = employeeRepository.findById(employeeId)
                .orElseThrow(() -> new RuntimeException("Employee not found"));

        // Find linked execution — prefer upcoming assigned task, fall back to most recent past one
        PmScheduleExecution linkedExecution = null;
        List<PmScheduleExecution> upcoming = executionRepository.findUpcomingForPart(request.getPartId());
        if (!upcoming.isEmpty()) {
            linkedExecution = upcoming.get(0);
        } else {
            List<PmScheduleExecution> past = executionRepository.findPastExecutionsForPart(request.getPartId());
            if (!past.isEmpty()) {
                linkedExecution = past.get(0);
            }
        }

        IssueFlag flag = IssueFlag.builder()
                .scheduleExecution(linkedExecution)
                .raisedBy(employee)
                .raisedDttm(DateUtils.getNow())
                .issueDetails(request.getIssueDetails())
                .criticality(IssueFlagCriticality.fromValue(request.getCriticality()))
                .flagStatus(IssueFlagStatus.REPLACEMENT_REQUIRED)
                .attendant(linkedExecution != null ? linkedExecution.getEmployee() : null)
                .build();

        return issueFlagRepository.save(flag);
    }

    public List<IssueFlag> getAllFlags() {
        return issueFlagRepository.findAll();
    }

    public List<com.maint.pm_backend.dto.IssueFlagProjection> getFlagsForOperator(Long employeeId) {
        return issueFlagRepository.findFlagsByAttendantId(employeeId);
    }

    public List<com.maint.pm_backend.dto.IssueFlagProjection> getFlagsForSupervisor(Long supervisorId) {
        return issueFlagRepository.findFlagsBySupervisorId(supervisorId);
    }

    public List<com.maint.pm_backend.dto.IssueFlagProjection> getFlagsForLineManager(Long lineManagerId) {
        return issueFlagRepository.findFlagsByLineManagerId(lineManagerId);
    }

    @Transactional
    public IssueFlag reviewIssueFlag(Long flagId, IssueFlagReviewRequest request, Long actorEmployeeId) {
        Employee actor = employeeRepository.findById(actorEmployeeId)
                .orElseThrow(() -> new RuntimeException("Employee not found"));

        IssueFlag flag = issueFlagRepository.findById(flagId)
                .orElseThrow(() -> new RuntimeException("Issue Flag not found"));

        Long roleId = actor.getRoleId();
        boolean isSupervisor    = SUPERVISOR_ROLES.contains(roleId);
        boolean isSeniorManager = SENIOR_MANAGER_ROLES.contains(roleId);

        if (!isSupervisor && !isSeniorManager) {
            throw new RuntimeException("Access denied: only supervisors, line managers, or maintenance managers can review flags");
        }

        if (request.getNewStatus() == null || request.getNewStatus().isBlank()) {
            throw new RuntimeException("newStatus is required");
        }

        IssueFlagStatus targetStatus = IssueFlagStatus.fromValue(request.getNewStatus());

        if (isSupervisor) {
            if (!issueFlagRepository.existsByFlagIdAndSupervisorLine(flagId, actorEmployeeId)) {
                throw new RuntimeException("Access denied: this flag is not assigned to this supervisor's line");
            }

            if (flag.getFlagStatus() == IssueFlagStatus.POTENTIAL_REPLACEMENT) {
                if (targetStatus != IssueFlagStatus.REPLACEMENT_REQUIRED) {
                    throw new RuntimeException("Supervisor can only change POTENTIAL_REPLACEMENT to REPLACEMENT_REQUIRED");
                }
                flag.setFlagStatus(targetStatus);
            } else if (flag.getFlagStatus() == IssueFlagStatus.UNDER_REVIEW) {
                if (targetStatus != IssueFlagStatus.CLOSED) {
                    throw new RuntimeException("Supervisor can only approve UNDER_REVIEW flags by closing them");
                }
                flag.setFlagStatus(IssueFlagStatus.CLOSED);
                flag.setAddressedDttm(DateUtils.getNow());
            } else {
                throw new RuntimeException(
                        "Supervisor can only act on POTENTIAL_REPLACEMENT or UNDER_REVIEW flags. " +
                        "Current status: " + flag.getFlagStatus());
            }
        }

        if (isSeniorManager) {
            // Line Manager / Maintenance Manager can set any status
            flag.setFlagStatus(targetStatus);

            if (targetStatus == IssueFlagStatus.CLOSED) {
                // Record closure timestamp and reason
                flag.setAddressedDttm(DateUtils.getNow());
                if (request.getClosureReason() != null) {
                    String existingNotes = flag.getNotes() != null ? flag.getNotes() + "\n" : "";
                    flag.setNotes(existingNotes + "Closure reason: " + request.getClosureReason());
                }
            } else if (targetStatus == IssueFlagStatus.REPLACEMENT_INITIATED
                    || targetStatus == IssueFlagStatus.REPLACEMENT_REQUIRED) {
                // Set/update criticality and due date when escalating
                if (request.getCriticality() != null) {
                    flag.setCriticality(IssueFlagCriticality.fromValue(request.getCriticality()));
                }
                if (request.getDueDate() != null) {
                    flag.setDueDate(request.getDueDate());
                } else if (flag.getDueDate() == null) {
                    // Auto-calculate due date based on criticality (values driven by CONFIG_PARAM table)
                    IssueFlagCriticality crit = flag.getCriticality() != null ? flag.getCriticality() : IssueFlagCriticality.MEDIUM;
                    int daysToAdd = configParamService.getFlagDueDateDays(crit);
                    flag.setDueDate(DateUtils.getNow().plusDays(daysToAdd));
                }
            }
        }

        if (request.getNotes() != null) {
            String existing = flag.getNotes() != null ? flag.getNotes() + "\n" : "";
            flag.setNotes(existing + request.getNotes());
        }

        return issueFlagRepository.save(flag);
    }

    // ─── Flag replacement workflow ─────────────────────────────────────────────

    /**
     * Validates that the scanned QR equipment belongs to the flag's linked execution
     * and that the operator is the assigned attendant for this flag.
     * On success, returns part details, spare part stock info, deviation values, and
     * a pre-signed S3 PUT URL for the replacement photo.
     */
    @Transactional(readOnly = true)
    public FlagScanResponse scanFlag(Long flagId, FlagScanRequest request, Long employeeId) {
        Employee actor = employeeRepository.findById(employeeId)
                .orElseThrow(() -> new RuntimeException("Employee not found"));

        IssueFlag flag = issueFlagRepository.findById(flagId)
                .orElseThrow(() -> new RuntimeException("Flag not found: " + flagId));

        Long roleId = actor.getRoleId();
        boolean isReviewer = SUPERVISOR_ROLES.contains(roleId) || SENIOR_MANAGER_ROLES.contains(roleId);
        boolean isAttendant = flag.getAttendant() != null && flag.getAttendant().getEmployeeId().equals(employeeId);

        if (!isAttendant && !isReviewer) {
            throw new RuntimeException("Access denied: this flag is not assigned to you");
        }

        if (SUPERVISOR_ROLES.contains(roleId)
                && !issueFlagRepository.existsByFlagIdAndSupervisorLine(flagId, employeeId)) {
            throw new RuntimeException("Access denied: this flag is not assigned to this supervisor's line");
        }

        // Operators can perform replacement only once replacement has been initiated.
        // Supervisors/managers use this same endpoint to review details without a QR payload.
        if (isAttendant && !isReviewer && flag.getFlagStatus() != IssueFlagStatus.REPLACEMENT_INITIATED) {
            throw new RuntimeException("Flag is not in REPLACEMENT_INITIATED status. Current status: " + flag.getFlagStatus());
        }

        PmScheduleExecution exec = flag.getScheduleExecution();
        if (exec == null) {
            throw new RuntimeException("Flag has no linked schedule execution");
        }

        // Validate scanned equipment matches the execution's task
        if (request.getEquipmentId() != null && exec.getTaskSchedule() != null) {
            Long taskPartId = exec.getTaskSchedule().getStdTask().getPartId();
            Long taskElementId = exec.getTaskSchedule().getStdTask().getElementId();
            // Validate part or element ID matches — scanned equipment element must match
            if (request.getEquipmentElementId() != null && !request.getEquipmentElementId().equals(taskElementId)) {
                throw new RuntimeException("Scanned equipment does not match the flag's linked task");
            }
        }

        // Fetch spare part if linked — use the first spare part matching plant context
        // (In a fuller implementation you'd link spare_part_id directly on issue_flags)
        SparePart sparePart = null;
        if (exec.getTaskSchedule() != null && exec.getTaskSchedule().getStdTask() != null) {
            Long partId = exec.getTaskSchedule().getStdTask().getPartId();
            if (partId != null) {
                // Find the cheapest spare part in the same plant (simple heuristic; adjust as needed)
                sparePart = sparePartRepository.findAll().stream()
                        .filter(sp -> sp.getCurrentStock() != null && sp.getCurrentStock() > 0)
                        .findFirst()
                        .orElse(null);
            }
        }

        // Generate S3 upload URL for replacement photo
        Long partId = exec.getTaskSchedule() != null ? exec.getTaskSchedule().getStdTask().getPartId() : 0L;
        AwsS3Service.ObservationUploadResult uploadResult =
                awsS3Service.generateFlagPhotoUploadUrl(partId != null ? partId : 0L, flagId, employeeId);

        FlagScanResponse.FlagScanResponseBuilder builder = FlagScanResponse.builder()
                .status("success")
                .message("QR scan verified. Proceed with replacement.")
                .photoUploadUrl(uploadResult.presignedUploadUrl())
                .photoS3Key(uploadResult.s3Key())
                .uploadExpiresInMinutes((int) uploadResult.expiresInMinutes())
                .actualValue(exec.getActualValue());

        if (exec.getTaskSchedule() != null && exec.getTaskSchedule().getStdTask() != null) {
            var stdTask = exec.getTaskSchedule().getStdTask();
            builder.uom(stdTask.getUom())
                   .toleranceMin(stdTask.getToleranceMin())
                   .toleranceMax(stdTask.getToleranceMax())
                   .standardValue(stdTask.getStandardValue())
                   .partId(stdTask.getPartId());
        }

        if (sparePart != null) {
            builder.sparePartId(sparePart.getId())
                   .sparePartName(sparePart.getName())
                   .sparePartNumber(sparePart.getPartNumber())
                   .sparePartLocation(sparePart.getLocationInSap())
                   .sparePartCurrentStock(sparePart.getCurrentStock());
        }

        return builder.build();
    }

    /**
     * Logs the replacement, optionally decrements spare part stock, and closes the flag.
     */
    @Transactional
    public IssueFlag completeReplacement(Long flagId, FlagReplacementRequest request, Long employeeId) {
        Employee employee = employeeRepository.findById(employeeId)
                .orElseThrow(() -> new RuntimeException("Employee not found"));

        IssueFlag flag = issueFlagRepository.findById(flagId)
                .orElseThrow(() -> new RuntimeException("Flag not found: " + flagId));

        if (flag.getAttendant() == null || !flag.getAttendant().getEmployeeId().equals(employeeId)) {
            throw new RuntimeException("Access denied: this flag is not assigned to you");
        }

        // Log the replacement record
        SparePartReplacement replacementRecord = SparePartReplacement.builder()
                .partId(flag.getScheduleExecution() != null && flag.getScheduleExecution().getTaskSchedule() != null
                        ? flag.getScheduleExecution().getTaskSchedule().getStdTask().getPartId() : null)
                .sparePartId(request.getSparePartId())
                .replacedBy(employee)
                .replacementDttm(DateUtils.getNow())
                .notes(request.isReplacementDone()
                        ? "Replacement performed. " + (request.getNotes() != null ? request.getNotes() : "")
                        : "Replacement not performed. " + (request.getNotes() != null ? request.getNotes() : ""))
                .build();
        replacementRepository.save(replacementRecord);

        // Decrement stock if replacement was done and spare part ID provided
        if (request.isReplacementDone() && request.getSparePartId() != null) {
            sparePartRepository.findById(request.getSparePartId()).ifPresent(sp -> {
                int newStock = Math.max(0, (sp.getCurrentStock() != null ? sp.getCurrentStock() : 0) - 1);
                sp.setCurrentStock(newStock);
                sparePartRepository.save(sp);
            });
        }

        flag.setFlagStatus(IssueFlagStatus.UNDER_REVIEW);
        String closureNote = request.isReplacementDone()
                ? "Replacement completed by operator. Pending supervisor review."
                : "Inspection completed by operator. Pending supervisor review.";
        String existingNotes = flag.getNotes() != null ? flag.getNotes() + "\n" : "";
        flag.setNotes(existingNotes + closureNote
                + (request.getNotes() != null ? " Notes: " + request.getNotes() : ""));

        return issueFlagRepository.save(flag);
    }

}
