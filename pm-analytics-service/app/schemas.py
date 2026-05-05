from datetime import date, datetime
from typing import Any, Literal

from pydantic import BaseModel, Field


class RunNightlyRequest(BaseModel):
    evaluation_date: date | None = None
    part_ids: list[int] | None = None
    persist: bool = True
    trigger_type: Literal["CRON", "MANUAL_UI", "MANUAL_API"] = "MANUAL_API"
    triggered_by_employee_id: int | None = None
    window_days: int = 365


class SeriesPoint(BaseModel):
    day: int
    date: date
    value: float


class Thresholds(BaseModel):
    standard_value: float | None = None
    tolerance_min: float | None = None
    tolerance_max: float | None = None
    warning_value: float | None = None
    uom: str | None = None


class HistoricalCycleResponse(BaseModel):
    cycle_index: int
    start_date: date
    end_date: date | None = None
    velocity: float
    points: list[SeriesPoint]


class PredictionResponse(BaseModel):
    part_id: int
    part_name: str | None = None
    line_id: int | None = None
    equipment_id: int | None = None
    task_schedule_id: int
    std_task_id: int
    status: Literal["STABLE", "INSUFFICIENT_DATA", "LINEAR_REGRESSION", "MASTER_CURVE"]
    current_value: float | None = None
    predicted_failure_date: date | None = None
    confidence_score: float
    days_remaining: int | None = None
    degradation_velocity: float
    risk_score: float
    lifecycle_ratio: float
    velocity_ratio: float | None = None
    thresholds: Thresholds
    current_cycle: list[SeriesPoint]
    historical_cycles: list[HistoricalCycleResponse] = Field(default_factory=list)
    master_curve: list[SeriesPoint] = Field(default_factory=list)
    simulated_failure_curve: list[SeriesPoint] = Field(default_factory=list)
    insights: list[dict[str, Any]] = Field(default_factory=list)


class EvaluationAuditResponse(BaseModel):
    part_id: int
    task_schedule_id: int
    std_task_id: int
    evaluation_status: Literal["PREDICTED", "STABLE", "INSUFFICIENT_DATA", "CONFIG_MISSING"]
    reason_code: str | None = None
    data_points_count: int
    current_cycle_points_count: int
    completed_cycles_count: int


class RunNightlyResponse(BaseModel):
    job_code: str = "NIGHTLY_PHM_ANALYTICS_SYNC"
    job_execution_id: int | None = None
    status: Literal["COMPLETED_SUCCESS", "FAILED"] = "COMPLETED_SUCCESS"
    triggered_at: datetime
    evaluation_date: date
    persisted: bool
    duration_ms: int
    evaluated_count: int
    prediction_count: int
    insight_count: int
    insufficient_data_count: int
    health_score_count: int
    predictions: list[PredictionResponse]
    evaluation_audits: list[EvaluationAuditResponse] = Field(default_factory=list)
