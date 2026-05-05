from typing import Any
from datetime import date, datetime
from app.repository import (
    fetch_target_tasks,
    persist_evaluation_audits,
    persist_health_scores,
    persist_insights,
    persist_prediction,
)
from app.schemas import PredictionResponse, EvaluationAuditResponse, RunNightlyResponse
from .predictor import DegradationPredictor
from .evaluator import HealthEvaluator

class AnalyticsOrchestrator:
    @staticmethod
    def run(
        conn: Any,
        evaluation_date: date,
        part_ids: list[int] | None,
        persist: bool,
        execution_id: int | None = None,
        window_days: int = 365
    ) -> RunNightlyResponse:
        triggered_at = datetime.utcnow()
        predictions: list[PredictionResponse] = []
        audits: list[EvaluationAuditResponse] = []
        audit_rows: list[dict[str, Any]] = []
        insight_count = 0

        for task in fetch_target_tasks(conn, part_ids):
            result, audit = DegradationPredictor.evaluate_task(conn, task, evaluation_date)
            audits.append(audit)
            audit_rows.append(DegradationPredictor.build_audit_row(task, audit, evaluation_date, execution_id, result))

            if result is not None:
                predictions.append(result)
                insight_count += len(result.insights)

            if persist and result is not None:
                persist_prediction(
                    conn,
                    {
                        "part_id": result.part_id,
                        "task_schedule_id": result.task_schedule_id,
                        "current_value": result.current_value,
                        "predicted_failure_date": result.predicted_failure_date,
                        "confidence_score": result.confidence_score,
                        "days_remaining": result.days_remaining,
                        "degradation_velocity": result.degradation_velocity,
                        "risk_score": result.risk_score,
                        "lifecycle_ratio": result.lifecycle_ratio,
                        "chart_data_payload": {
                            "status": result.status,
                            "velocity_ratio": result.velocity_ratio,
                            "thresholds": result.thresholds.model_dump(),
                            "current_cycle": [p.model_dump() for p in result.current_cycle],
                            "historical_cycles": [c.model_dump() for c in result.historical_cycles],
                            "simulated_failure_curve": [p.model_dump() for p in result.simulated_failure_curve],
                            "master_curve": [p.model_dump() for p in result.master_curve],
                        },
                    },
                    evaluation_date,
                )
                persist_insights(conn, result.insights)

        evaluator = HealthEvaluator(conn, evaluation_date, window_days)
        health_scores = evaluator.evaluate(audit_rows)

        if persist:
            persist_evaluation_audits(conn, audit_rows)
            persist_health_scores(conn, evaluation_date, health_scores, window_days)

        return RunNightlyResponse(
            triggered_at=triggered_at,
            evaluation_date=evaluation_date,
            persisted=persist,
            duration_ms=int((datetime.utcnow() - triggered_at).total_seconds() * 1000),
            evaluated_count=len(audits),
            prediction_count=sum(1 for item in predictions if item.status != "STABLE"),
            insight_count=insight_count,
            insufficient_data_count=sum(1 for item in audits if item.evaluation_status in {"INSUFFICIENT_DATA", "CONFIG_MISSING"}),
            health_score_count=len(health_scores),
            predictions=predictions,
            evaluation_audits=audits,
        )
