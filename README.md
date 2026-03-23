# PM Maintenance System

Welcome to the **Preventive and Predictive Maintenance (PM) System** — a comprehensive solution for managing plants, departments, equipment, spare parts, and maintenance task execution.

> **Note:** This repository currently contains only the **Backend**. The Frontend section will be added in the future.

---

## 📁 Repository Structure

```
PM-Maintenance-System/
├── pm-backend/          # Spring Boot backend (Java 17, PostgreSQL, Flyway)
└── postgresql-data-insertion-csvs/  # CSV seed data used by Flyway migrations
```

---

## 🚀 Quickstart — Build & Run (Docker — Recommended)

> **You only need [Docker Desktop](https://www.docker.com/products/docker-desktop/) installed.** No Java, Maven, or local PostgreSQL required.

### Step 1: Build the Application

Run this from inside the `pm-backend` directory whenever you change Java code, migration scripts, or `pom.xml`:

```bash
cd pm-backend
docker-compose build
```

### Step 2: Start Everything

```bash
docker-compose up -d
```

This single command:
- Starts a **PostgreSQL** container on port `5433`
- Starts the **Spring Boot backend** and connects it to the database
- Runs **Flyway migrations automatically** on first startup — creating all tables and inserting seed data

The API is now available at: **`http://localhost:8080`**

### Step 3: Stop Everything

```bash
docker-compose down
```

---

## 🔁 Day-to-Day Workflow

| Situation | Command |
|---|---|
| First time / after code changes | `docker-compose build` then `docker-compose up -d` |
| Starting the app (no code changes) | `docker-compose up -d` |
| Stopping the app | `docker-compose down` |

---

## 🧪 Running Unit Tests

Unit tests run fully isolated — **no database connection needed**.

```bash
cd pm-backend
.\mvnw.cmd clean test -Dtest=AuthServiceTest,AuthControllerTest
```

> When running `.\mvnw.cmd clean test` without specifying tests, the default `PmBackendApplicationTests` will fail unless the database is running. Use `-Dtest=...` to run only unit tests.

---

## 🛠️ Services & API Endpoints

### Authentication Service

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/auth/login` | Log in with email and password |

**Request body:**
```json
{
  "email": "employee@example.com",
  "password": "yourpassword"
}
```

**Success response (`200 OK`):**
```json
{
  "message": "Login successful",
  "employeeId": 1,
  "fullName": "John Doe",
  "roleId": 2,
  "permissions": {
    "can_create_task": true,
    "can_approve": false
  }
}
```

---

## 🗄️ Connecting to the Database (pgAdmin)

The database is exposed on port **5433** (to avoid conflicts with a local PostgreSQL install).

| Setting | Value |
|---|---|
| Host | `localhost` |
| Port | `5433` |
| Database | `pm_db` |
| Username | `postgres` |
| Password | `root` |

---

## 📋 Database Migrations

Migrations are managed automatically by **Flyway** from scripts in:

```
pm-backend/src/main/resources/db/migration/
```

On every startup, Flyway runs any **new** migration scripts that haven't been applied yet. Tables are only created/altered as needed — not recreated from scratch each time.

---

*Frontend setup instructions will be added here once the UI is implemented.*
