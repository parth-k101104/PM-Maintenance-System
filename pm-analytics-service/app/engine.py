from __future__ import annotations

from dataclasses import dataclass
from datetime import date, datetime, timedelta
from math import ceil
from statistics import mean, pstdev
from typing import Any

from app.config import get_settings
from app.repository import (
    fetch_previous_health_scores,
    fetch_executions,
    fetch_replacements,
    fetch_target_tasks,
    persist_evaluation_audits,
    persist_health_scores,
    persist_insights,
    persist_prediction,
)
from app.schemas import EvaluationAuditResponse, HistoricalCycleResponse, PredictionResponse, RunNightlyResponse, SeriesPoint, Thresholds


@dataclass(frozen=True)
class Cycle:
    start: datetime
    end: datetime | None
    points: list[dict[str, Any]]


def run_nightly(
    conn,
    evaluation_date: date,
    part_ids: list[int] | None,
    persist: bool,
    execution_id: int | None = None,
) -> RunNightlyResponse:
    triggered_at = datetime.utcnow()
    predictions: list[PredictionResponse] = []
    audits: list[EvaluationAuditResponse] = []
    audit_rows: list[dict[str, Any]] = []
    insight_count = 0

    for task in fetch_target_tasks(conn, part_ids):
        result, audit = evaluate_task(conn, task, evaluation_date)
        audits.append(audit)
        audit_rows.append(build_audit_row(task, audit, evaluation_date, execution_id, result))

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

    health_scores = build_health_scores(conn, evaluation_date, audit_rows)
    if persist:
        persist_evaluation_audits(conn, audit_rows)
        persist_health_scores(conn, evaluation_date, health_scores)

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


def evaluate_task(conn, task: dict[str, Any], evaluation_date: date) -> tuple[PredictionResponse | None, EvaluationAuditResponse]:
    executions = fetch_executions(conn, task["task_schedule_id"])
    if len(executions) < 2:
        return None, make_audit(task, "INSUFFICIENT_DATA", "LESS_THAN_TWO_READINGS", len(executions), len(executions), 0)

    if task["tolerance_min"] is None and task["tolerance_max"] is None:
        return None, make_audit(task, "CONFIG_MISSING", "NO_TOLERANCE_THRESHOLD", len(executions), 0, 0)

    replacements = fetch_replacements(conn, task["part_id"])
    cycles = build_cycles(executions, replacements)
    if not cycles:
        return None, make_audit(task, "INSUFFICIENT_DATA", "NO_ACTIVE_CYCLE", len(executions), 0, 0)

    current_cycle = cycles[-1]
    if len(current_cycle.points) < 2:
        return None, make_audit(task, "INSUFFICIENT_DATA", "CURRENT_CYCLE_LESS_THAN_TWO_READINGS", len(executions), len(current_cycle.points), len(cycles[:-1]))

    completed_cycles = [cycle for cycle in cycles[:-1] if len(cycle.points) >= 2]
    max_threshold = as_float(task["tolerance_max"])
    min_threshold = as_float(task["tolerance_min"])
    standard_value = as_float(task["standard_value"])
    current_points = to_series_points(current_cycle.points, current_cycle.start)
    current_value = current_points[-1].value
    current_slope = slope_per_day(current_points)
    boundary = choose_boundary(current_slope, min_threshold, max_threshold)
    prediction_threshold = max_threshold if boundary == "UPPER" else min_threshold
    warning_value = calculate_warning_value(boundary, standard_value, min_threshold, max_threshold)

    master_points = build_master_curve(completed_cycles)
    historical_velocity = mean([abs(slope_per_day(to_series_points(c.points, c.start))) for c in completed_cycles]) if completed_cycles else 0.0
    
    # Flaw 2 Fix: Only penalize velocity if moving toward the boundary
    if moving_toward_boundary(current_slope, boundary) and historical_velocity > 0:
        velocity_ratio = abs(current_slope) / historical_velocity
    else:
        velocity_ratio = 1.0 # Safe baseline for stable or healing parts

    lifecycle_ratio = calculate_lifecycle_ratio(
        current_cycle=current_cycle,
        current_value=current_value,
        standard_value=standard_value,
        min_threshold=min_threshold,
        max_threshold=max_threshold,
        boundary=boundary,
        completed_cycles=completed_cycles,
        velocity_ratio=velocity_ratio,
    )
    risk_score = clamp(lifecycle_ratio * 100, 0, 100)

    status = choose_status(current_slope, current_value, warning_value, prediction_threshold, boundary, completed_cycles)
    predicted_failure_date: date | None = None
    days_remaining: int | None = None
    days_to_threshold: int | None = None
    confidence_score = calculate_confidence(completed_cycles)

    if status in {"LINEAR_REGRESSION", "MASTER_CURVE"} and prediction_threshold is not None and moving_toward_boundary(current_slope, boundary):
        if crossed_failure(current_value, prediction_threshold, boundary):
            days_to_threshold = 0
        elif status == "MASTER_CURVE" and master_points:
            # Flaw 1 Fix: Use Master Curve for non-linear prediction
            days_to_threshold = predict_days_to_threshold_from_master(
                current_value=current_value,
                threshold=prediction_threshold,
                master_points=master_points,
                boundary=boundary,
                current_slope=current_slope
            )
        else:
            # Fallback to Linear Regression
            distance = abs(prediction_threshold - current_value)
            days_to_threshold = max(0, ceil(distance / abs(current_slope)))
            
        predicted_failure_date = current_points[-1].date + timedelta(days=days_to_threshold)
        days_remaining = max(0, (predicted_failure_date - evaluation_date).days)
        if status == "LINEAR_REGRESSION":
            confidence_score = min(confidence_score, 55.0)

    simulated_curve = project_curve(current_points[-1], current_slope, prediction_threshold, days_to_threshold)
    insights = build_insights(
        task=task,
        current_value=current_value,
        warning_value=warning_value,
        boundary=boundary,
        predicted_failure_date=predicted_failure_date,
        velocity_ratio=velocity_ratio,
    )

    prediction = PredictionResponse(
        part_id=task["part_id"],
        part_name=task["part_name"],
        line_id=task["line_id"],
        equipment_id=task["equipment_id"],
        task_schedule_id=task["task_schedule_id"],
        std_task_id=task["std_task_id"],
        status=status,
        current_value=round(current_value, 4),
        predicted_failure_date=predicted_failure_date,
        confidence_score=round(confidence_score, 2),
        days_remaining=days_remaining,
        degradation_velocity=round(current_slope, 6),
        risk_score=round(risk_score, 2),
        lifecycle_ratio=round(clamp(lifecycle_ratio, 0, 1.5), 4),
        velocity_ratio=round(velocity_ratio, 4) if velocity_ratio is not None else None,
        thresholds=Thresholds(
            standard_value=standard_value,
            tolerance_min=min_threshold,
            tolerance_max=max_threshold,
            warning_value=round(warning_value, 4) if warning_value is not None else None,
            uom=task["uom"],
        ),
        current_cycle=current_points,
        historical_cycles=build_historical_cycle_responses(completed_cycles),
        master_curve=master_points,
        simulated_failure_curve=simulated_curve,
        insights=insights,
    )
    audit_status = "STABLE" if prediction.status == "STABLE" else "PREDICTED"
    return prediction, make_audit(
        task=task,
        evaluation_status=audit_status,
        reason_code=prediction.status,
        data_points_count=len(executions),
        current_cycle_points_count=len(current_cycle.points),
        completed_cycles_count=len(completed_cycles),
    )


def make_audit(
    task: dict[str, Any],
    evaluation_status: str,
    reason_code: str,
    data_points_count: int,
    current_cycle_points_count: int,
    completed_cycles_count: int,
) -> EvaluationAuditResponse:
    return EvaluationAuditResponse(
        part_id=task["part_id"],
        task_schedule_id=task["task_schedule_id"],
        std_task_id=task["std_task_id"],
        evaluation_status=evaluation_status,
        reason_code=reason_code,
        data_points_count=data_points_count,
        current_cycle_points_count=current_cycle_points_count,
        completed_cycles_count=completed_cycles_count,
    )


def build_audit_row(
    task: dict[str, Any],
    audit: EvaluationAuditResponse,
    evaluation_date: date,
    execution_id: int | None,
    prediction: PredictionResponse | None,
) -> dict[str, Any]:
    return {
        "execution_id": execution_id,
        "evaluation_date": evaluation_date,
        "plant_id": task["plant_id"],
        "department_id": task["department_id"],
        "line_id": task["line_id"],
        "equipment_id": task["equipment_id"],
        "part_id": task["part_id"],
        "task_schedule_id": task["task_schedule_id"],
        "std_task_id": task["std_task_id"],
        "evaluation_status": audit.evaluation_status,
        "reason_code": audit.reason_code,
        "data_points_count": audit.data_points_count,
        "current_cycle_points_count": audit.current_cycle_points_count,
        "completed_cycles_count": audit.completed_cycles_count,
        "current_value": prediction.current_value if prediction is not None else None,
        "risk_score": prediction.risk_score if prediction is not None else None,
        "metadata": {
            "part_name": task["part_name"],
            "uom": task["uom"],
            "standard_value": as_float(task["standard_value"]),
            "tolerance_min": as_float(task["tolerance_min"]),
            "tolerance_max": as_float(task["tolerance_max"]),
            "prediction_status": prediction.status if prediction is not None else None,
        },
    }


def build_health_scores(conn, evaluation_date: date, audit_rows: list[dict[str, Any]]) -> list[dict[str, Any]]:
    buckets: dict[tuple[str, int], list[dict[str, Any]]] = {}

    for audit in audit_rows:
        for entity_type, id_key in (
            ("EQUIPMENT", "equipment_id"),
            ("LINE", "line_id"),
            ("DEPARTMENT", "department_id"),
            ("PLANT", "plant_id"),
        ):
            entity_id = audit.get(id_key)
            if entity_id is None:
                continue
            buckets.setdefault((entity_type, entity_id), []).append(audit)

    previous_scores = fetch_previous_health_scores(conn, evaluation_date, list(buckets.keys()))
    health_scores: list[dict[str, Any]] = []

    for key, rows in buckets.items():
        entity_type, entity_id = key
        contribution_scores = [health_contribution(row) for row in rows]
        health_score = round(mean(contribution_scores), 2) if contribution_scores else 100.0
        critical_flags_count = sum(1 for row in rows if (row.get("risk_score") or 0) >= 90)
        complete_count = sum(1 for row in rows if row["evaluation_status"] in {"PREDICTED", "STABLE"})
        coverage_rate = round((complete_count / len(rows)) * 100, 2) if rows else 100.0
        previous = previous_scores.get(key)

        if previous is None or abs(health_score - previous) < 1:
            trend = "STABLE"
        elif health_score > previous:
            trend = "IMPROVING"
        else:
            trend = "DEGRADING"

        health_scores.append(
            {
                "entity_type": entity_type,
                "entity_id": entity_id,
                "health_score": health_score,
                "critical_flags_count": critical_flags_count,
                "pm_compliance_rate": coverage_rate,
                "trend": trend,
            }
        )

    return health_scores


def health_contribution(audit: dict[str, Any]) -> float:
    if audit["evaluation_status"] == "CONFIG_MISSING":
        return 60.0
    if audit["evaluation_status"] == "INSUFFICIENT_DATA":
        return 70.0
    risk_score = audit.get("risk_score")
    if risk_score is None:
        return 75.0
    return clamp(100.0 - float(risk_score), 0.0, 100.0)


def build_cycles(executions: list[dict[str, Any]], replacements: list[datetime]) -> list[Cycle]:
    """
    Flaw 3 Fix: Properly anchors cycles to replacements and handles the implicit 'Cycle 0'.
    """
    if not executions:
        return []

    # Sort replacements to ensure order
    all_replacements = sorted(replacements)
    
    # Determine the absolute start of the first observed cycle
    # If there's a replacement BEFORE the first execution, that's our start.
    # Otherwise, we assume the machine was in service at least 1 day before the first reading.
    first_execution_time = executions[0]["completed_dttm"]
    
    starts: list[datetime] = []
    
    # 1. Handle the very first cycle anchor
    if not all_replacements or first_execution_time < all_replacements[0]:
        # No replacement before first execution: anchor 1 day before
        starts.append(first_execution_time - timedelta(days=1))
    else:
        # Use the replacement that was in effect when the first reading was taken
        prior_replacements = [r for r in all_replacements if r <= first_execution_time]
        if prior_replacements:
            starts.append(prior_replacements[-1])
        else:
            starts.append(first_execution_time - timedelta(days=1))

    # 2. Add all subsequent replacements as cycle boundaries
    starts.extend([r for r in all_replacements if r > starts[0]])
    
    # Remove duplicates and re-sort (in case a replacement exactly matched the anchor)
    starts = sorted(list(set(starts)))
    
    cycles: list[Cycle] = []
    for index, start in enumerate(starts):
        next_start = starts[index + 1] if index + 1 < len(starts) else None
        points = [
            row
            for row in executions
            if row["completed_dttm"] >= start and (next_start is None or row["completed_dttm"] < next_start)
        ]
        if points:
            cycles.append(Cycle(start=start, end=next_start, points=points))

    return cycles


def to_series_points(points: list[dict[str, Any]], start: datetime) -> list[SeriesPoint]:
    return [
        SeriesPoint(
            day=max(0, (row["completed_dttm"].date() - start.date()).days),
            date=row["completed_dttm"].date(),
            value=float(row["actual_value"]),
        )
        for row in points
    ]


def slope_per_day(points: list[SeriesPoint]) -> float:
    if len(points) < 2:
        return 0.0
    xs = [point.day for point in points]
    ys = [point.value for point in points]
    x_mean = mean(xs)
    y_mean = mean(ys)
    denominator = sum((x - x_mean) ** 2 for x in xs)
    if denominator == 0:
        return 0.0
    return sum((x - x_mean) * (y - y_mean) for x, y in zip(xs, ys)) / denominator


def build_master_curve(completed_cycles: list[Cycle]) -> list[SeriesPoint]:
    if not completed_cycles:
        return []

    normalized = [to_series_points(cycle.points, cycle.start) for cycle in completed_cycles]
    all_days = sorted({point.day for cycle in normalized for point in cycle})
    master: list[SeriesPoint] = []
    anchor = date.today()

    for day in all_days:
        values = [interpolate(cycle, day) for cycle in normalized]
        values = [value for value in values if value is not None]
        if values:
            master.append(SeriesPoint(day=day, date=anchor + timedelta(days=day), value=round(mean(values), 4)))

    return master


def build_historical_cycle_responses(completed_cycles: list[Cycle]) -> list[HistoricalCycleResponse]:
    responses: list[HistoricalCycleResponse] = []
    for index, cycle in enumerate(completed_cycles, start=1):
        points = to_series_points(cycle.points, cycle.start)
        responses.append(
            HistoricalCycleResponse(
                cycle_index=index,
                start_date=cycle.start.date(),
                end_date=cycle.end.date() if cycle.end is not None else None,
                velocity=round(slope_per_day(points), 6),
                points=points,
            )
        )
    return responses


def interpolate(points: list[SeriesPoint], day: int) -> float | None:
    if not points:
        return None
    if day <= points[0].day:
        return points[0].value
    if day >= points[-1].day:
        return points[-1].value
    for prev, nxt in zip(points, points[1:]):
        if prev.day <= day <= nxt.day:
            span = nxt.day - prev.day
            if span == 0:
                return nxt.value
            ratio = (day - prev.day) / span
            return prev.value + ratio * (nxt.value - prev.value)
    return None


def choose_status(
    current_slope: float,
    current_value: float,
    warning_value: float | None,
    prediction_threshold: float | None,
    boundary: str,
    completed_cycles: list[Cycle],
) -> str:
    settings = get_settings()
    warning_crossed = crossed_warning(current_value, warning_value, boundary)
    if abs(current_slope) <= settings.stable_slope_epsilon and not warning_crossed:
        return "STABLE"
    if prediction_threshold is None:
        return "INSUFFICIENT_DATA"
    if len(completed_cycles) >= 2:
        return "MASTER_CURVE"
    return "LINEAR_REGRESSION"


def calculate_lifecycle_ratio(
    current_cycle: Cycle,
    current_value: float,
    standard_value: float | None,
    min_threshold: float | None,
    max_threshold: float | None,
    boundary: str,
    completed_cycles: list[Cycle],
    velocity_ratio: float | None,
) -> float:
    if boundary == "UPPER" and max_threshold and max_threshold > 0:
        value_ratio = current_value / max_threshold
    elif boundary == "LOWER" and min_threshold is not None:
        healthy_anchor = standard_value if standard_value is not None else max_threshold
        if healthy_anchor is not None and healthy_anchor != min_threshold:
            value_ratio = (healthy_anchor - current_value) / (healthy_anchor - min_threshold)
        else:
            value_ratio = 1.0 if current_value <= min_threshold else 0.0
    else:
        value_ratio = 0.0

    if not completed_cycles:
        return value_ratio

    durations = [(cycle.points[-1]["completed_dttm"].date() - cycle.start.date()).days for cycle in completed_cycles]
    avg_duration = max(mean([duration for duration in durations if duration > 0] or [1]), 1)
    elapsed = (current_cycle.points[-1]["completed_dttm"].date() - current_cycle.start.date()).days
    adjusted_duration = avg_duration / max(velocity_ratio or 1.0, 0.1)
    return max(value_ratio, elapsed / adjusted_duration)


def calculate_confidence(completed_cycles: list[Cycle]) -> float:
    if len(completed_cycles) < 2:
        return 50.0

    durations = [(cycle.points[-1]["completed_dttm"].date() - cycle.start.date()).days for cycle in completed_cycles]
    avg_duration = mean(durations)
    if avg_duration <= 0:
        return 60.0

    coefficient_variance = pstdev(durations) / avg_duration
    return clamp(95.0 - coefficient_variance * 100.0, 60.0, 95.0)


def project_curve(last_point: SeriesPoint, slope: float, threshold: float | None, days_remaining: int | None) -> list[SeriesPoint]:
    if threshold is None or days_remaining is None or slope == 0:
        return []
    if days_remaining == 0:
        return [last_point]

    horizon = max(days_remaining, 1)
    step = max(1, ceil(horizon / 8))
    projected = [last_point]
    for offset in range(step, horizon + step, step):
        day_offset = min(offset, horizon)
        projected.append(
            SeriesPoint(
                day=last_point.day + day_offset,
                date=last_point.date + timedelta(days=day_offset),
                value=round(bound_projected_value(last_point.value + slope * day_offset, threshold, slope), 4),
            )
        )
        if day_offset == horizon:
            break
    return projected


def build_insights(
    task: dict[str, Any],
    current_value: float,
    warning_value: float | None,
    boundary: str,
    predicted_failure_date: date | None,
    velocity_ratio: float | None,
) -> list[dict[str, Any]]:
    settings = get_settings()
    insights: list[dict[str, Any]] = []

    if crossed_warning(current_value, warning_value, boundary):
        insights.append(
            {
                "line_id": task["line_id"],
                "part_id": task["part_id"],
                "insight_type": "PREDICTIVE_WARNING",
                "insight_code": "PREDICTIVE_WARNING",
                "severity": "WARNING",
                "metadata": {
                    "part": task["part_name"],
                    "value": round(current_value, 4),
                    "warning_value": round(warning_value, 4),
                    "boundary": boundary,
                    "predicted_fail": predicted_failure_date.isoformat() if predicted_failure_date else None,
                },
            }
        )

    if velocity_ratio is not None and velocity_ratio >= settings.anomaly_velocity_ratio:
        insights.append(
            {
                "line_id": task["line_id"],
                "part_id": task["part_id"],
                "insight_type": "DEGRADATION_ANOMALY",
                "insight_code": "DEGRADATION_ANOMALY",
                "severity": "CRITICAL",
                "metadata": {
                    "part": task["part_name"],
                    "velocity_increase": f"{round((velocity_ratio - 1) * 100, 2)}%",
                    "velocity_ratio": round(velocity_ratio, 4),
                    "action": "Immediate inspection required.",
                },
            }
        )

    return insights


def as_float(value: Any) -> float | None:
    return float(value) if value is not None else None


def clamp(value: float, minimum: float, maximum: float) -> float:
    return max(minimum, min(maximum, value))


def choose_boundary(slope: float, min_threshold: float | None, max_threshold: float | None) -> str:
    if slope < 0 and min_threshold is not None:
        return "LOWER"
    if max_threshold is not None:
        return "UPPER"
    return "LOWER"


def calculate_warning_value(
    boundary: str,
    standard_value: float | None,
    min_threshold: float | None,
    max_threshold: float | None,
) -> float | None:
    settings = get_settings()
    if boundary == "UPPER" and max_threshold is not None:
        return max_threshold * settings.warn_threshold_ratio
    if boundary == "LOWER" and min_threshold is not None:
        if standard_value is not None:
            return min_threshold + (standard_value - min_threshold) * (1 - settings.warn_threshold_ratio)
        return min_threshold
    return None


def moving_toward_boundary(slope: float, boundary: str) -> bool:
    return (boundary == "UPPER" and slope > 0) or (boundary == "LOWER" and slope < 0)


def crossed_warning(current_value: float, warning_value: float | None, boundary: str) -> bool:
    if warning_value is None:
        return False
    return current_value >= warning_value if boundary == "UPPER" else current_value <= warning_value


def crossed_failure(current_value: float, threshold: float, boundary: str) -> bool:
    return current_value >= threshold if boundary == "UPPER" else current_value <= threshold


def bound_projected_value(value: float, threshold: float, slope: float) -> float:
    return min(threshold, value) if slope > 0 else max(threshold, value)


def predict_days_to_threshold_from_master(
    current_value: float, 
    threshold: float, 
    master_points: list[SeriesPoint], 
    boundary: str,
    current_slope: float
) -> int:
    """
    Flaw 1 Implementation: Calculates days to failure by locating current position on the master curve.
    Includes extrapolation if the curve does not reach the threshold.
    """
    if not master_points:
        return 0

    # 1. Find the point on the master curve closest to current_value
    start_day = None
    for p in master_points:
        if (boundary == "UPPER" and p.value >= current_value) or \
           (boundary == "LOWER" and p.value <= current_value):
            start_day = p.day
            break
            
    # If current_value is beyond the master curve, fallback to linear regression
    if start_day is None:
        if current_slope == 0:
            return 9999
        distance = abs(threshold - current_value)
        return max(0, ceil(distance / abs(current_slope)))

    # 2. Find the point on the master curve that crosses the threshold
    end_day = None
    for p in master_points:
        if (boundary == "UPPER" and p.value >= threshold) or \
           (boundary == "LOWER" and p.value <= threshold):
            end_day = p.day
            break
            
    if end_day is not None:
        return max(0, end_day - start_day)
        
    # Extrapolate if master curve doesn't reach threshold
    last_p = master_points[-1]
    
    # Calculate tail slope (last 5 points or fewer)
    tail = master_points[-5:] if len(master_points) >= 5 else master_points
    if len(tail) < 2:
        tail_slope = current_slope
    else:
        tail_slope = slope_per_day(tail)
        
    # If tail slope is pointing away or flat, use current slope as fallback
    if not moving_toward_boundary(tail_slope, boundary) or tail_slope == 0:
        tail_slope = current_slope
        
    if tail_slope == 0:
        return 9999

    distance = abs(threshold - last_p.value)
    extrapolated_days = ceil(distance / abs(tail_slope))
    
    return max(0, (last_p.day + extrapolated_days) - start_day)

