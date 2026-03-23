# PM Maintenance System

Welcome to the Preventive and Predictive Maintenance (PM) System! This project is a comprehensive solution designed to manage plants, departments, equipments, spare parts, and execution of maintenance tasks. 

Currently, the repository contains the **Backend** implementation. A **Frontend** section will be added in the future.

---

## 🏗️ Architecture Overview

- **Backend**: Built with Java 17 and Spring Boot 3.x.
- **Database**: PostgreSQL handling various schemas for configuration, equipment tracking, and task scheduling.
- **Database Migrations**: Managed automatically through Flyway (using SQL scripts located in `pm-backend/src/main/resources/db/migration`).
- **Frontend**: *Coming Soon...*

---

## ⚙️ Backend Guide

The backend project is located inside the `pm-backend` directory.

### Prerequisites
- **Java 17** installed and configured on your system.
- **PostgreSQL Database** running (you can start it via Docker using the `docker-compose.yml` provided or a local Postgres instance).
  - Ensure a database named `pm_db` exists, or modify your `application.properties` to match your local setup database.

### How to Start the Backend
1. **Open your terminal**.
2. **Navigate** to the backend directory:
   ```bash
   cd pm-backend
   ```
3. **Run the application** using the Maven Wrapper:
   - On Windows:
     ```cmd
     .\mvnw.cmd spring-boot:run
     ```
   - On macOS/Linux:
     ```bash
     ./mvnw spring-boot:run
     ```
4. The application will start locally on `http://localhost:8080`.
   *(During the first startup, Flyway will automatically execute all the `V1__` through `V16__` SQL scripts to create your tables and insert the seed data).*

---

## 🧪 Testing Guide

We write pure unit tests isolated from the database context to ensure rapid, predictable test execution.

### How to Run Tests
1. Ensure you are in the `pm-backend` folder.
2. Execute the Maven test task:
   - On Windows:
     ```cmd
     .\mvnw.cmd clean test
     ```
   - On macOS/Linux:
     ```bash
     ./mvnw clean test
     ```
3. The command will compile the code and execute all the JUnit cases for the controllers and services.

---

## 🛠️ Internal Services Overview

Currently implemented services in the backend:

1. **Authentication / Login Service (AuthController & AuthService)**
   - Exposes an endpoint: `POST /api/auth/login`
   - Accepts a JSON `LoginRequest` payload (containing `email` and `password`).
   - Retrieves the matching internal `Employee` based on the database email.
   - Validates the password, verifies if the user is `active`, and returns a customized `LoginResponse` specifying the `employeeId`, `fullName`, and `roleId`.

*(Additional services for equipments, parts, and standard tasks will be registered here as they are integrated into the REST layer!)*

---

*Once the frontend UI component is built, instructions for the node/React/framework environment will be appended to this guide.*
