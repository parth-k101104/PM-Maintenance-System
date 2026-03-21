# PM Maintenance System Backend

This is the backend component for the Preventive and Predictive Maintenance (PM) System. It is built using Spring Boot, Maven, and leverages PostgreSQL for the database, with Flyway for database migrations.

## Requirements

Before running the application, make sure you have the following installed:
- [Java 17](https://www.oracle.com/java/technologies/javase/jdk17-archive-downloads.html) or higher
- [Maven](https://maven.apache.org/) (optional, since the Maven wrapper `./mvnw` is included)
- [Docker](https://www.docker.com/) and Docker Compose (for running the PostgreSQL database)

## Running the Database

The application connects to a PostgreSQL database. You can start the database using the provided `docker-compose.yml` file.

```bash
docker-compose up -d db
```
This will start a PostgreSQL database container on port `5432` with the database `pm_db` and credentials `postgres` / `root`.

## Building the Application

To compile the code and build the application JAR file, run the following command from the `pm-backend` directory:

```bash
# On Windows (Command Prompt / PowerShell)
.\mvnw.cmd clean package

# On macOS/Linux (or Git Bash on Windows)
./mvnw clean package
```

This will run all tests and package the application into a JAR file inside the `target/` directory.

## Running the Application

### The "100% Docker" Way (Main Recommended Approach)
This is the recommended way to run the application. You don't need Java, Maven, or a local PostgreSQL database installed on your machine. Docker perfectly isolates the database and the backend app.

#### 1. When to use `docker-compose build`
You only need to run the `build` command when you:
- Make changes to your Java code (`.java` files).
- Add or modify database migration scripts (`db/migration/V*.sql`).
- Change your `pom.xml` dependencies.

```bash
docker-compose build
```
*(This tells Docker to compile your fresh code or migrations into a new container image.)*

#### 2. When to use `docker-compose up -d`
You run the `up` command when you simply want to start the application (for example, at the beginning of your workday, or after you just finished a `build`).

```bash
docker-compose up -d
```
**What happens behind the scenes:** Docker starts the PostgreSQL database container first. Then it starts your Java backend. As soon as the Java backend starts, **Flyway kicks in automatically** and runs your migration scripts to instantly create the tables and insert all your CSV mock data.

#### Stopping the Application
To stop both the backend and the database safely, run:
```bash
docker-compose down
```

---

### Connecting to the Database via pgAdmin
Because your database is happily isolated inside Docker, we mapped it to port **5433** on your computer. This intentionally bypasses the default port (5432) to prevent conflicts if you have a local Windows PostgreSQL installed.

To view your data in **pgAdmin**, create a new Server connection with these exact details:
- **Host name/address**: `localhost`
- **Port**: `5433` *(Important: Must be 5433, not 5432)*
- **Maintenance database**: `pm_db`
- **Username**: `postgres`
- **Password**: `root`

Once connected, navigate to **Servers > [Your connection name] > Databases > pm_db > Schemas > public > Tables** to view all your mock data.

---

### Option 2: Local Development (Requires Local Database)
If you want to run the code locally using your own `mvnw.cmd`, you **must** start the database container first, otherwise the backend fails to connect.

1. Start just the database:
   ```bash
   docker-compose up -d db
   ```
2. Build and run the app locally:
   ```bash
   .\mvnw.cmd clean package -DskipTests
   .\mvnw.cmd spring-boot:run
   ```
   *(Note: `-DskipTests` prevents the build from failing if the tests try to connect to the DB while it's down!)*
./mvnw spring-boot:run
```

### Option 2: Running the JAR file
If you have already built the application (`clean package`), you can run the built JAR file:

```bash
java -jar target/pm-backend-0.0.1-SNAPSHOT.jar
```

### Option 3: Running via Docker Compose
To run both the backend application and the database using Docker Compose:

1. Build the Docker image for the backend:
   ```bash
   docker-compose build
   ```
2. Start both services:
   ```bash
   docker-compose up -d
   ```

The backend server will be accessible at `http://localhost:8080`.

## Database Schema and Migrations

This project uses **Flyway** to automatically manage and apply database schema changes.

- Migration scripts are located in `src/main/resources/db/migration/`.
- **How it works:** When the backend application starts up, Flyway checks the database to see which migration scripts have already been applied. It will only run new, pending scripts that haven't been executed yet (e.g., `V1__init_schema.sql`).
- This means **table creation will NOT happen completely from scratch every time.** It happens automatically on startup *only* if there are new update scripts to apply. You do not need to drop the database or re-build everything just to apply schema changes; Flyway manages versioning automatically.
