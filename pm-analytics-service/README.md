# PM Analytics Microservice

FastAPI service for PHM degradation analytics. It reads bounded historical cycles from PostgreSQL, writes predictions to `phm_degradation_predictions`, creates manager insights in `phm_action_insights`, and returns graph-ready lifecycle data to the caller.

## Run locally

```powershell
cd pm-analytics-service
pip install poetry
poetry install
copy .env.example .env
poetry run uvicorn app.main:app --reload --port 8000
```

Check DB connectivity:

```powershell
poetry run python test_db.py
```

Trigger the nightly analytics batch locally with the fallback static key:

```powershell
Invoke-RestMethod `
  -Method Post `
  -Uri http://localhost:8000/api/v1/batch/run-nightly `
  -Headers @{ "X-Analytics-Key" = "local-dev-static-key" } `
  -ContentType "application/json" `
  -Body '{"persist":true}'
```

For backend-triggered jobs, prefer `X-Analytics-Job-Token`. The main backend generates a short-lived HMAC token with the shared `ANALYTICS_SHARED_SECRET`; the Python service validates the signature and expiry before opening its DB connection.

When Postgres runs through `pm-backend/docker-compose.yml`, host tools use:

```text
DATABASE_URL=postgresql://postgres:root@localhost:5433/pm_db
```

Containers on the same Compose network use:

```text
DATABASE_URL=postgresql://postgres:root@db:5432/pm_db
```
