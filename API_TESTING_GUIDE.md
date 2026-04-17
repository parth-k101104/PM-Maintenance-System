# Front-End API Testing & Integration Guide

This document serves as a complete reference guide for the frontend engineering team to integrate the endpoints created for the Predictive Maintenance module. 

It maps out standard flows using **actual data** pre-populated via the database seeds (`db/migration` files) to ensure deterministic mock testing.

---

## 1. Authentication & Login

All secured endpoints expect an `Authorization` header populated via a Bearer token received from this route.

**Endpoint**: `POST /api/v1/auth/login`

**Test Identity (Operator - Electrician)**
Use this credential block to log in as employee ID `208` (Sunil Gupta), an Operator mapping to role access permission level 1.
```json
{
  "email": "elec101a@company.com",
  "password": "engineer@123"
}
```
**Test Identity (Supervisor)**
```json
{
  "email": "sup101@company.com",
  "password": "supervisor@123"
}
```

*Note: Save the `token` from the response to inject as `Bearer <token>` in the Authorization headers for the subsequent routes.*

---

## 2. Dashboard APIs

### Fetch Dashboard Metrics
Depending on the user's logged-in identity, you can retrieve respective overview metrics.

**Endpoint**: `GET /api/v1/dashboard/operator`
- Automatically reads the `employee_id` from the JWT Principal.
- **Expected Data**: Aggregation variables populated from `pm_schedule_execution` targeting assigned and completed counts for this user explicitly.

---

## 3. Viewing Task Lists

The system segregates retrieving lists from actionable execution. Both of these are accessed via `GET` calls.

### Today's Tasks
**Endpoint**: `GET /api/v1/tasks/today`
- **Desc**: Returns tasks mapped securely to the user exactly bounded by the current physical date (system is mocked dynamically against Feb 1st, 2026 seed data).

### Completed Tasks
**Endpoint**: `GET /api/v1/tasks/completed`
- **Desc**: Yields historical tasks containing statuses (`COMPLETED`, `APPROVED`, `APPROVAL_PENDING`, `REJECTED`). Returns rich projection metrics including the zone, line id, and timing margins!

---

## 4. Task Execution & QR Processing

We split task execution mutations into a separate micro-namespace explicitly for lifecycle actions. 

### Operator Scanning a QR Code
When the user opens their camera and scans a machine, the decoded payload will hit the system to discern what they are capable of working on.

**Endpoint**: `POST /api/v1/task-execution/scan`

**Test Payload (Valid Assignment Target)**
If using the `elec101a@company.com` login above, scanning this exact part maps seamlessly to an `ASSIGNED` execution ticket `130046` waiting for them!
```json
{
  "equipmentId": 9001,       // Packaging Conveyor
  "equipmentElementId": 10002, // Electrical Control Unit
  "equipmentPartId": 30007,  // Contact Wear / Voltage Drop Check 
  "scheduleExecutionId": 130013 // Specific assigned schedule execution ticket ID for this user
}
```
**Expected Response (Success Route):**
Because execution `130046` is mapped exactly to Sunil Gupta with an `ASSIGNED` status:
```json
{
    "status": "success",
    "message": "Task assigned and verified",
    "uom": "V"
}
```

**Test Payload (Fallback / Not Assigned Route)**
If you modify the JSON to pass a random unassigned execution ticket, or remove the `scheduleExecutionId` completely:
```json
{
  "equipmentId": 9001,
  "equipmentElementId": 10004,
  "equipmentPartId": 30013,
  "scheduleExecutionId": 99999
}
```
**Expected Response (Not Found Route):**
The API safely traps the failure, returning their "Next-best Action" arrays filtered specifically by parts or machines they ARE assigned to for future dates:
```json
{
    "status": "not_found",
    "message": "Task not found or not assigned to you",
    "uom": null,
    "relatedPartTasks": [
        // Tasks active on part 30013 bounded out to the end of the month
    ],
    "relatedMachineTasks": [
        // Tasks located broadly on equipment 9001, explicitly omitting part 30013
    ]
}
```

---

## 5. Edge Cases & Advanced Test Scenarios

To ensure the frontend robustly captures all conditions, test the following edge cases against the backend:

### Case 1: Unauthorized Missing Token (401)
- **Action**: Call any endpoint (e.g. `GET /api/v1/tasks/today`) without the `Authorization` header.
- **Expected Result**: API returns a `401 Unauthorized` HTTP status. The frontend UI should elegantly bounce the user back to the login screen and clear local storage.

### Case 2: Incomplete QR Payload (Omitted `scheduleExecutionId`)
Sometimes a machine QR code will just dictate the equipment part without knowing what specific task needs executing!
- **Action**: Trigger `POST /api/v1/task-execution/scan` but omit `"scheduleExecutionId": null`.
- **Expected Result**: API successfully safely skips the exact match verification, gracefully fails to `"status": "not_found"`, but safely yields all pending part tasks mapped to the rest of the array so the operator can manually select what they want to do!

### Case 3: Task Exhausted / Date Out-Of-Bounds
- **Action**: Pass an `equipmentPartId` that has zero tasks scheduled for the remainder of the month for that specific user.
- **Expected Result**: `"status": "not_found"`, and `relatedPartTasks: []` will return an empty array. The frontend should display a UI informing the operator that no upcoming action is required on this component right now.

### Case 4: Testing Non-Operator Role (Supervisor Scenario)
- **Action**: Log in using `sup101@company.com` and hit the `POST` scan endpoint.
- **Expected Result**: The frontend should gracefully capture an empty task array if the supervisor operates this. Supervisors rarely hold `ASSIGNED` execution tags, their ecosystem is populated via `APPROVAL_PENDING` tags in different pipeline routes.
