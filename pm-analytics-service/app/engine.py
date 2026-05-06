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
    window_days: int | None = None,  # None → use ANALYTICS_WINDOW_DAYS from config_param DB
) -> RunNightlyResponse:
    """
    Backward compatibility wrapper for the nightly batch job.
    Delegates to the modular AnalyticsOrchestrator.

    If window_days is not passed, the orchestrator reads ANALYTICS_WINDOW_DAYS
    from the config_param table (default: 365 days if DB row is missing).
    """
    return AnalyticsOrchestrator.run(
        conn=conn,
        evaluation_date=evaluation_date,
        part_ids=part_ids,
        persist=persist,
        execution_id=execution_id,
        window_days=window_days,
    )
