from typing import Any
from datetime import date
from .analytics.orchestrator import AnalyticsOrchestrator
from .schemas import RunNightlyResponse

def run_nightly(
    conn: Any,
    evaluation_date: date,
    part_ids: list[int] | None,
    persist: bool,
    execution_id: int | None = None,
    window_days: int = 365
) -> RunNightlyResponse:
    # \"\"\"
    # Backward compatibility wrapper for the nightly batch job.
    # Delegates to the modular AnalyticsOrchestrator.
    # \"\"\"
    return AnalyticsOrchestrator.run(
        conn=conn,
        evaluation_date=evaluation_date,
        part_ids=part_ids,
        persist=persist,
        execution_id=execution_id,
        window_days=window_days
    )
