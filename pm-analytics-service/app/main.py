from datetime import date, datetime

from fastapi import Depends, FastAPI, HTTPException, status
from psycopg import OperationalError
from psycopg_pool import PoolTimeout

from app.db import close_pool, connection
from app.engine import run_nightly
from app.repository import complete_job_execution, create_job_execution
from app.schemas import RunNightlyRequest, RunNightlyResponse
from app.security import require_analytics_key

app = FastAPI(
    title="PM Predictive Maintenance Analytics Service",
    version="0.1.0",
)


@app.on_event("shutdown")
def shutdown() -> None:
    close_pool()


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/health/db")
def database_health() -> dict[str, str]:
    try:
        with connection() as conn:
            with conn.cursor() as cur:
                cur.execute("SELECT 1")
                cur.fetchone()
        return {"status": "ok"}
    except (OperationalError, PoolTimeout) as ex:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Database unavailable: {ex}",
        ) from ex


@app.post(
    "/api/v1/batch/run-nightly",
    response_model=RunNightlyResponse,
    dependencies=[Depends(require_analytics_key)],
)
def run_nightly_batch(request: RunNightlyRequest) -> RunNightlyResponse:
    evaluation_date = request.evaluation_date or date.today()
    try:
        with connection() as conn:
            execution_id = create_job_execution(
                conn=conn,
                trigger_type=request.trigger_type,
                triggered_by_employee_id=request.triggered_by_employee_id,
            )
            conn.commit()
            started_at = datetime.utcnow()

            try:
                response = run_nightly(
                    conn=conn,
                    evaluation_date=evaluation_date,
                    part_ids=request.part_ids,
                    persist=request.persist,
                    execution_id=execution_id,
                )
                response.job_execution_id = execution_id
                response.status = "COMPLETED_SUCCESS"
                response.duration_ms = int((datetime.utcnow() - started_at).total_seconds() * 1000)
                complete_job_execution(
                    conn=conn,
                    execution_id=execution_id,
                    status=response.status,
                    duration_ms=response.duration_ms,
                    response_payload=response.model_dump(mode="json"),
                )
                conn.commit()
                return response
            except Exception as ex:
                conn.rollback()
                duration_ms = int((datetime.utcnow() - started_at).total_seconds() * 1000)
                complete_job_execution(
                    conn=conn,
                    execution_id=execution_id,
                    status="FAILED",
                    duration_ms=duration_ms,
                    error_message=str(ex),
                )
                conn.commit()
                raise
    except (OperationalError, PoolTimeout) as ex:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Database unavailable: {ex}",
        ) from ex
