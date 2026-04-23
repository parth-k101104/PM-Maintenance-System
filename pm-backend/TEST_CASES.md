# PM Maintenance System — Test Data & API Test Cases

> **Database reference date: February 1, 2026** (all "today" logic in the backend uses this static date)
>
> To reset data: stop Docker → `docker compose down -v` → `docker compose up -d`

---

## 🧑‍🔧 Test Personas

| Employee ID | Name | Role | Login | Password |
|---|---|---|---|---|
| **208** | Sunil Gupta | Electrician (Operator) | `elec101a@company.com` | `engineer@123` |
| **209** | Manoj Verma | Electrician (Operator) | `elec101b@company.com` | `engineer@123` |
| **210** | Akshay Rao | Fitter (Operator) | `fitter101a@company.com` | `engineer@123` |
| **214** | Deepak Shinde | Line Supervisor | `sup101@company.com` | `supervisor@123` |
| **202** | Amit Sharma | Line Manager | `lm101@company.com` | `manager@123` |
| **201** | Rajesh Patil | Maintenance Manager | `mm101@company.com` | `admin@123` |

---

## 📋 Approval Workflow Rules (by task criticality)

| Criticality | Workflow | Approvers |
|---|---|---|
| LOW | Workflow 1 | Supervisor only (level 1) |
| MEDIUM | Workflow 2 | Supervisor → Line Manager (levels 1 → 2) |
| HIGH | Workflow 3 | Supervisor → Line Manager → Maint. Manager (1 → 2 → 3) |

---

## 🧪 Employee 208 (Sunil Gupta) — Edge Case Test Suite

### TC-208-01 | ASSIGNED (not started)
| Field | Value |
|---|---|
| Schedule Execution ID | 130013 |
| Task | Measure sensor voltage (PM-10002-05) |
| Equipment | Conveyor Belt (equipmentId: 9001, elementId: 10002, partId: 30007) |
| Status | `ASSIGNED` |
| Criticality / Workflow | LOW → Sup only |
| Approval | Level 1 (sup 214): PENDING |

**API Test:**
```
GET /api/v1/tasks/today?employeeId=208
→ Expect 130013 in list with status=ASSIGNED
```

---

### TC-208-02 | IN_PROGRESS
| Field | Value |
|---|---|
| Schedule Execution ID | 130018 |
| Task | Inspect cable insulation (PM-10004-03) |
| Status | `IN-PROGRESS` |
| Criticality / Workflow | MEDIUM → Sup + LM |

**API Test:**
```
GET /api/v1/tasks/today?employeeId=208
→ Expect 130018 with status=IN-PROGRESS
```

---

### TC-208-03 | UNDER_SUPERVISOR_REVIEW (no deviation)
| Field | Value |
|---|---|
| Schedule Execution ID | 130023 |
| Task | Clean cooling fan (PM-10004-07) |
| Status | `UNDER_SUPERVISOR_REVIEW` |
| Criticality / Workflow | LOW → Sup only |
| Approval | Level 1 (sup 214): APPROVAL_REQUESTED |

**API Test (supervisor view):**
```
GET /api/v1/dashboard/supervisor   [logged in as sup101@company.com]
→ todaysDueApprovals should include this task
```

---

### TC-208-04 | UNDER_SUPERVISOR_REVIEW **with DEVIATION** ⚠️
| Field | Value |
|---|---|
| Schedule Execution ID | 130017 |
| Task | Measure voltage drop (PM-10004-02) |
| Status | `UNDER_SUPERVISOR_REVIEW` |
| Actual Value | 20.5V (tolerance: 22–26V) → **deviation_flag = TRUE** |
| Criticality / Workflow | HIGH → Sup → LM → MM |
| Approval | Level 1 (sup 214): APPROVAL_REQUESTED |

**API Tests:**
```
GET /api/v1/dashboard/supervisor   [logged in as sup101]
→ openDeviations ≥ 1  (deviation flagged task awaiting review)

GET /api/v1/tasks/completed?employeeId=208
→ Should NOT appear (still under review)
```

---

### TC-208-05 | UNDER_LINE_MANAGER_REVIEW
| Field | Value |
|---|---|
| Schedule Execution ID | 130035 |
| Task | Inspect contact wear (PM-10004-01) |
| Status | `UNDER_LINE_MANAGER_REVIEW` |
| Criticality / Workflow | HIGH → Wf3 |
| Approval | Level 1 (sup 214): **APPROVED** ✅ \| Level 2 (lm 202): APPROVAL_REQUESTED |

**API Tests:**
```
GET /api/v1/tasks/completed?employeeId=208
→ Expect 130035 in completed list (status=UNDER_LINE_MANAGER_REVIEW)

GET /api/v1/dashboard/supervisor
→ tasksInPipeline ≥ 1  (sup approved, pending higher levels)
```

---

### TC-208-06 | UNDER_MAINT_MANAGER_REVIEW
| Field | Value |
|---|---|
| Schedule Execution ID | 130033 |
| Task | Backup PLC program (PM-10012-02) |
| Status | `UNDER_MAINT_MANAGER_REVIEW` |
| Criticality / Workflow | HIGH → Wf3 |
| Approval | Sup: **APPROVED** ✅ \| LM: **APPROVED** ✅ \| MM (201): APPROVAL_REQUESTED |

**API Tests:**
```
GET /api/v1/tasks/completed?employeeId=208
→ Expect 130033 (status=UNDER_MAINT_MANAGER_REVIEW)

GET /api/v1/dashboard/supervisor
→ tasksInPipeline ≥ 1  (sup fully approved, awaiting MM)
```

---

### TC-208-07 | APPROVED — Single Level (Supervisor only)
| Field | Value |
|---|---|
| Schedule Execution ID | 130021 |
| Task | Check fan rotation (PM-10004-08) |
| Status | `APPROVED` |
| Criticality / Workflow | LOW → Wf1 |
| Approval | Level 1 (sup 214): **APPROVED** ✅ |

---

### TC-208-08 | APPROVED — Two Levels (Sup + LM)
| Field | Value |
|---|---|
| Schedule Execution ID | 130030 |
| Task | Test I/O response (PM-10012-03) |
| Status | `APPROVED` |
| Criticality / Workflow | MEDIUM → Wf2 |
| Approval | Sup: **APPROVED** ✅ \| LM: **APPROVED** ✅ |

---

### TC-208-09 | APPROVED — Three Levels (all)
| Field | Value |
|---|---|
| Schedule Execution ID | 130019 |
| Task | Check fuse continuity (PM-10004-05) |
| Status | `APPROVED` |
| Criticality / Workflow | HIGH → Wf3 |
| Approval | Sup: **APPROVED** ✅ \| LM: **APPROVED** ✅ \| MM: **APPROVED** ✅ |

**API Test:**
```
GET /api/v1/tasks/completed?employeeId=208
→ 130019 visible with status=APPROVED and reviewerName shown
```

---

### TC-208-10 | REJECTED — at Supervisor level
| Field | Value |
|---|---|
| Schedule Execution ID | 130037 |
| Task | Check PLC status LEDs (PM-10012-01) |
| Status | `REJECTED` |
| Criticality / Workflow | HIGH → Wf3 |
| Rejection | Level 1 (sup 214): **REJECTED** ❌ — "Incomplete checklist, steps 3-5 not documented" |

---

### TC-208-11 | REJECTED — at Line Manager level (Supervisor had approved)
| Field | Value |
|---|---|
| Schedule Execution ID | 130034 |
| Task | Replace damaged cable (PM-10004-04) |
| Status | `REJECTED` |
| Criticality / Workflow | MEDIUM → Wf2 |
| Approval chain | Sup 214: APPROVED ✅ → LM 202: **REJECTED** ❌ — "Wrong cable spec used" |

**API Test (supervisor dashboard):**
```
GET /api/v1/dashboard/supervisor
→ tasksInPipeline should include downstream-rejected tasks
   (sup approved → LM rejected → counts as pipeline task)
```

---

### TC-208-12 | REJECTED — at Line Manager level (escalated relay task)
| Field | Value |
|---|---|
| Schedule Execution ID | 130036 |
| Task | Inspect relay switching (PM-10012-05) |
| Status | `REJECTED` |
| Approval chain | Sup: APPROVED ✅ → LM: **REJECTED** ❌ — "Non-compliant PPE in photo" |

---

### TC-208-13 | ASSIGNED — Annual task
| Field | Value |
|---|---|
| Schedule Execution ID | 130020 |
| Task | Replace fuse if faulty (PM-10004-06) |
| Status | `ASSIGNED` (yearly frequency, just arrived this month) |
| Criticality / Workflow | HIGH → Wf3 |

---

## 📦 Backlog Tasks (Past-due, January 2026)

| Exec ID | Employee | Task | Due Date | Status | Note |
|---|---|---|---|---|---|
| 130100 | 208 | Sensor voltage check | Jan 18 | `ASSIGNED` | Never started — backlog |
| 130101 | 208 | Contact wear inspect | Jan 18 | `IN-PROGRESS` | Started, not completed — backlog |
| 130102 | 208 | PLC LED check | Jan 25 | `REJECTED` (by sup, deviation=TRUE) | Backlog rejected |
| 130103 | 208 | I/O Response Test | Jan 25 | `APPROVED` (Sup+LM) | Backlog completed |
| 130104 | 209 | Fan rotation check | Jan 25 | `ASSIGNED` | Backlog |
| 130105 | 210 | Mounting bolts inspect | Jan 25 | `UNDER_SUPERVISOR_REVIEW` | Backlog under review |

**API Test (operator backlog):**
```
GET /api/v1/tasks/today?employeeId=208
→ Should include 130100 and 130101 (past-due, still active)

GET /api/v1/tasks/completed?employeeId=208
→ Should include 130102 (REJECTED) and 130103 (APPROVED)
```

---

## 👨‍💼 Supervisor 214 (Deepak Shinde) — Dashboard Test Cases

**Login:** `sup101@company.com` / `supervisor@123`  
**Endpoint:** `GET /api/v1/dashboard/supervisor`

### Expected Dashboard Values (on Feb 1, 2026)

| Metric | Expected | Source |
|---|---|---|
| `todaysDueApprovals` | **4** | 130023, 130017, 130025, 130027 — have APPROVAL_REQUESTED at level 1 with due_date Feb 2 |
| `openDeviations` | **2** | 130017 (emp 208, deviation+under review), 130102 (emp 208 backlog, deviation+rejected counts) |
| `upcomingApprovalsThisMonth` | **10+** | All PENDING/APPROVAL_REQUESTED level-1 rows for sup 214 within Feb |
| `supervisedEmployeeCount` | **4** | Emp 205, 207, 208, 209, 210, 211 (distinct employees with level-1 rows for sup 214) |
| `tasksInPipeline` | **5+** | 130033, 130035 (sup approved, awaiting higher), 130034, 130036 (sup approved, then rejected downstream) |

> Note: `todaysDueApprovals` requires `approval_due_date = Feb 2` AND `approval_status = APPROVAL_REQUESTED`. Adjust date baseline in `SupervisorDashboardService.TODAY` if the DB date is different.

### Supervisor Dashboard API Call
```bash
curl -X GET http://localhost:8080/api/v1/dashboard/supervisor \
  -H "Authorization: Basic c3VwMTAxQGNvbXBhbnkuY29tOnN1cGVydmlzb3JAMTIz"
```

---

## 🔍 QR Scan Test Cases

### Equipment QR used for testing
```json
{
  "equipmentId": 9001,
  "equipmentElementId": 10002,
  "equipmentPartId": 30007
}
```

### QR Scan Scenarios

| Scenario | Input | Expected Result |
|---|---|---|
| **Valid scan, task assigned** | QR above + scheduleExecutionId=130013 + logged as emp 208 | `status=found`, task metadata returned |
| **Wrong employee** | QR above + scheduleExecutionId=130013 + logged as emp 209 | `status=not_found`, fallback list for equipmentId 9001 for emp 209 |
| **Wrong part in QR** | QR with partId=30001 + scheduleExecutionId=130013 | `status=not_found` (part mismatch), fallback list |
| **No scheduleExecutionId in body** | QR only (no execId) | `status=not_found`, fallback tasks for that equipment |
| **Scan QR for different equipment** | Wrong equipmentId | Backend rejects, `status=not_found`, fallback returns only tasks for emp's equipment |

### QR Scan API Call
```bash
curl -X POST http://localhost:8080/api/v1/task-execution/validate \
  -H "Authorization: Basic ZWxlYzEwMWFAY29tcGFueS5jb206ZW5naW5lZXJAMTIz" \
  -H "Content-Type: application/json" \
  -d '{
    "scheduleExecutionId": 130013,
    "equipmentId": 9001,
    "equipmentElementId": 10002,
    "equipmentPartId": 30007
  }'
```

---

## 📅 Task List API Reference

```bash
# Today's tasks for emp 208 (includes backlog)
GET /api/v1/tasks/today?employeeId=208

# Upcoming tasks for emp 208 (rest of Feb)
GET /api/v1/tasks/upcoming?employeeId=208

# Completed/submitted tasks for emp 208
GET /api/v1/tasks/completed?employeeId=208

# Operator dashboard
GET /api/v1/dashboard/operator   [logged in as emp 208]

# Supervisor dashboard
GET /api/v1/dashboard/supervisor [logged in as sup 214]
```

---

## 🔄 How to Reset Test Data

```bash
# 1. Stop and remove the DB volume
docker compose down -v

# 2. Restart fresh (Flyway will re-run all migrations)
docker compose up -d

# 3. Check logs
docker logs pm_backend_app
```
