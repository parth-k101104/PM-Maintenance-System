from __future__ import annotations
from dataclasses import dataclass
from datetime import date, datetime, timedelta
from math import ceil
from statistics import mean, pstdev
from typing import Any

from app.config import get_settings
from app.repository import (
    fetch_executions,
    fetch_replacements,
)
from app.schemas import EvaluationAuditResponse, HistoricalCycleResponse, PredictionResponse, SeriesPoint, Thresholds
from .insights import InsightGenerator

@dataclass(frozen=True)
class Cycle:
    start: datetime
    end: datetime | None
    points: list[dict[str, Any]]

class DegradationPredictor:
    @staticmethod
    def evaluate_task(conn: Any, task: dict[str, Any], evaluation_date: date) -> tuple[PredictionResponse | None, EvaluationAuditResponse]:
        executions = fetch_executions(conn, task["task_schedule_id"])
        if len(executions) < 2:
            return None, DegradationPredictor.make_audit(task, "INSUFFICIENT_DATA", "LESS_THAN_TWO_READINGS", len(executions), len(executions), 0)

        if task["tolerance_min"] is None and task["tolerance_max"] is None:
            return None, DegradationPredictor.make_audit(task, "CONFIG_MISSING", "NO_TOLERANCE_THRESHOLD", len(executions), 0, 0)

        replacements = fetch_replacements(conn, task["part_id"])
        cycles = DegradationPredictor.build_cycles(executions, replacements)
        if not cycles:
            return None, DegradationPredictor.make_audit(task, "INSUFFICIENT_DATA", "NO_ACTIVE_CYCLE", len(executions), 0, 0)

        current_cycle = cycles[-1]
        if len(current_cycle.points) < 2:
            return None, DegradationPredictor.make_audit(task, "INSUFFICIENT_DATA", "CURRENT_CYCLE_LESS_THAN_TWO_READINGS", len(executions), len(current_cycle.points), len(cycles[:-1]))

        completed_cycles = [cycle for cycle in cycles[:-1] if len(cycle.points) >= 2]
        max_threshold = DegradationPredictor.as_float(task["tolerance_max"])
        min_threshold = DegradationPredictor.as_float(task["tolerance_min"])
        standard_value = DegradationPredictor.as_float(task["standard_value"])
        current_points = DegradationPredictor.to_series_points(current_cycle.points, current_cycle.start)
        current_value = current_points[-1].value
        current_slope = DegradationPredictor.slope_per_day(current_points)
        boundary = DegradationPredictor.choose_boundary(current_slope, min_threshold, max_threshold)
        prediction_threshold = max_threshold if boundary == "UPPER" else min_threshold
        warning_value = DegradationPredictor.calculate_warning_value(boundary, standard_value, min_threshold, max_threshold)

        master_points = DegradationPredictor.build_master_curve(completed_cycles)
        historical_velocity = mean([abs(DegradationPredictor.slope_per_day(DegradationPredictor.to_series_points(c.points, c.start))) for c in completed_cycles]) if completed_cycles else 0.0
        
        if DegradationPredictor.moving_toward_boundary(current_slope, boundary) and historical_velocity > 0:
            velocity_ratio = abs(current_slope) / historical_velocity
        else:
            velocity_ratio = 1.0

        lifecycle_ratio = DegradationPredictor.calculate_lifecycle_ratio(
            current_cycle=current_cycle,
            current_value=current_value,
            standard_value=standard_value,
            min_threshold=min_threshold,
            max_threshold=max_threshold,
            boundary=boundary,
            completed_cycles=completed_cycles,
            velocity_ratio=velocity_ratio,
        )
        risk_score = DegradationPredictor.clamp(lifecycle_ratio * 100, 0, 100)

        status = DegradationPredictor.choose_status(current_slope, current_value, warning_value, prediction_threshold, boundary, completed_cycles)
        predicted_failure_date: date | None = None
        days_remaining: int | None = None
        days_to_threshold: int | None = None
        confidence_score = DegradationPredictor.calculate_confidence(completed_cycles)

        if status in {"LINEAR_REGRESSION", "MASTER_CURVE"} and prediction_threshold is not None and DegradationPredictor.moving_toward_boundary(current_slope, boundary):
            if DegradationPredictor.crossed_failure(current_value, prediction_threshold, boundary):
                days_to_threshold = 0
            elif status == "MASTER_CURVE" and master_points:
                days_to_threshold = DegradationPredictor.predict_days_to_threshold_from_master(
                    current_value=current_value,
                    threshold=prediction_threshold,
                    master_points=master_points,
                    boundary=boundary,
                    current_slope=current_slope
                )
            else:
                distance = abs(prediction_threshold - current_value)
                days_to_threshold = max(0, ceil(distance / abs(current_slope)))
                
            predicted_failure_date = current_points[-1].date + timedelta(days=days_to_threshold)
            days_remaining = max(0, (predicted_failure_date - evaluation_date).days)
            if status == "LINEAR_REGRESSION":
                confidence_score = min(confidence_score, 55.0)

        simulated_curve = DegradationPredictor.project_curve(current_points[-1], current_slope, prediction_threshold, days_to_threshold)
        insights = InsightGenerator.build_insights(
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
            lifecycle_ratio=round(DegradationPredictor.clamp(lifecycle_ratio, 0, 1.5), 4),
            velocity_ratio=round(velocity_ratio, 4) if velocity_ratio is not None else None,
            thresholds=Thresholds(
                standard_value=standard_value,
                tolerance_min=min_threshold,
                tolerance_max=max_threshold,
                warning_value=round(warning_value, 4) if warning_value is not None else None,
                uom=task["uom"],
            ),
            current_cycle=current_points,
            historical_cycles=DegradationPredictor.build_historical_cycle_responses(completed_cycles),
            master_curve=master_points,
            simulated_failure_curve=simulated_curve,
            insights=insights,
        )
        audit_status = "STABLE" if prediction.status == "STABLE" else "PREDICTED"
        return prediction, DegradationPredictor.make_audit(
            task=task,
            evaluation_status=audit_status,
            reason_code=prediction.status,
            data_points_count=len(executions),
            current_cycle_points_count=len(current_cycle.points),
            completed_cycles_count=len(completed_cycles),
        )

    @staticmethod
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

    @staticmethod
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
                "standard_value": DegradationPredictor.as_float(task["standard_value"]),
                "tolerance_min": DegradationPredictor.as_float(task["tolerance_min"]),
                "tolerance_max": DegradationPredictor.as_float(task["tolerance_max"]),
                "prediction_status": prediction.status if prediction is not None else None,
            },
        }

    @staticmethod
    def build_cycles(executions: list[dict[str, Any]], replacements: list[datetime]) -> list[Cycle]:
        if not executions:
            return []

        all_replacements = sorted(replacements)
        first_execution_time = executions[0]["completed_dttm"]
        
        starts: list[datetime] = []
        if not all_replacements or first_execution_time < all_replacements[0]:
            starts.append(first_execution_time - timedelta(days=1))
        else:
            prior_replacements = [r for r in all_replacements if r <= first_execution_time]
            if prior_replacements:
                starts.append(prior_replacements[-1])
            else:
                starts.append(first_execution_time - timedelta(days=1))

        starts.extend([r for r in all_replacements if r > starts[0]])
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

    @staticmethod
    def to_series_points(points: list[dict[str, Any]], start: datetime) -> list[SeriesPoint]:
        return [
            SeriesPoint(
                day=max(0, (row["completed_dttm"].date() - start.date()).days),
                date=row["completed_dttm"].date(),
                value=float(row["actual_value"]),
            )
            for row in points
        ]

    @staticmethod
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

    @staticmethod
    def build_master_curve(completed_cycles: list[Cycle]) -> list[SeriesPoint]:
        if not completed_cycles:
            return []

        normalized = [DegradationPredictor.to_series_points(cycle.points, cycle.start) for cycle in completed_cycles]
        all_days = sorted({point.day for cycle in normalized for point in cycle})
        master: list[SeriesPoint] = []
        anchor = date.today()

        for day in all_days:
            values = [DegradationPredictor.interpolate(cycle, day) for cycle in normalized]
            values = [value for value in values if value is not None]
            if values:
                master.append(SeriesPoint(day=day, date=anchor + timedelta(days=day), value=round(mean(values), 4)))

        return master

    @staticmethod
    def build_historical_cycle_responses(completed_cycles: list[Cycle]) -> list[HistoricalCycleResponse]:
        responses: list[HistoricalCycleResponse] = []
        for index, cycle in enumerate(completed_cycles, start=1):
            points = DegradationPredictor.to_series_points(cycle.points, cycle.start)
            responses.append(
                HistoricalCycleResponse(
                    cycle_index=index,
                    start_date=cycle.start.date(),
                    end_date=cycle.end.date() if cycle.end is not None else None,
                    velocity=round(DegradationPredictor.slope_per_day(points), 6),
                    points=points,
                )
            )
        return responses

    @staticmethod
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

    @staticmethod
    def choose_status(
        current_slope: float,
        current_value: float,
        warning_value: float | None,
        prediction_threshold: float | None,
        boundary: str,
        completed_cycles: list[Cycle],
    ) -> str:
        settings = get_settings()
        warning_crossed = DegradationPredictor.crossed_warning(current_value, warning_value, boundary)
        if abs(current_slope) <= settings.stable_slope_epsilon and not warning_crossed:
            return "STABLE"
        if prediction_threshold is None:
            return "INSUFFICIENT_DATA"
        if len(completed_cycles) >= 2:
            return "MASTER_CURVE"
        return "LINEAR_REGRESSION"

    @staticmethod
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

    @staticmethod
    def calculate_confidence(completed_cycles: list[Cycle]) -> float:
        if len(completed_cycles) < 2:
            return 50.0

        durations = [(cycle.points[-1]["completed_dttm"].date() - cycle.start.date()).days for cycle in completed_cycles]
        avg_duration = mean(durations)
        if avg_duration <= 0:
            return 60.0

        coefficient_variance = pstdev(durations) / avg_duration
        return DegradationPredictor.clamp(95.0 - coefficient_variance * 100.0, 60.0, 95.0)

    @staticmethod
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
                    value=round(DegradationPredictor.bound_projected_value(last_point.value + slope * day_offset, threshold, slope), 4),
                )
            )
            if day_offset == horizon:
                break
        return projected

    @staticmethod
    def as_float(value: Any) -> float | None:
        return float(value) if value is not None else None

    @staticmethod
    def clamp(value: float, minimum: float, maximum: float) -> float:
        return max(minimum, min(maximum, value))

    @staticmethod
    def choose_boundary(slope: float, min_threshold: float | None, max_threshold: float | None) -> str:
        if slope < 0 and min_threshold is not None:
            return "LOWER"
        if max_threshold is not None:
            return "UPPER"
        return "LOWER"

    @staticmethod
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

    @staticmethod
    def moving_toward_boundary(slope: float, boundary: str) -> bool:
        return (boundary == "UPPER" and slope > 0) or (boundary == "LOWER" and slope < 0)

    @staticmethod
    def crossed_warning(current_value: float, warning_value: float | None, boundary: str) -> bool:
        if warning_value is None:
            return False
        return current_value >= warning_value if boundary == "UPPER" else current_value <= warning_value

    @staticmethod
    def crossed_failure(current_value: float, threshold: float, boundary: str) -> bool:
        return current_value >= threshold if boundary == "UPPER" else current_value <= threshold

    @staticmethod
    def bound_projected_value(value: float, threshold: float, slope: float) -> float:
        return min(threshold, value) if slope > 0 else max(threshold, value)

    @staticmethod
    def predict_days_to_threshold_from_master(
        current_value: float, 
        threshold: float, 
        master_points: list[SeriesPoint], 
        boundary: str,
        current_slope: float
    ) -> int:
        if not master_points:
            return 0

        start_day = None
        for p in master_points:
            if (boundary == "UPPER" and p.value >= current_value) or \
               (boundary == "LOWER" and p.value <= current_value):
                start_day = p.day
                break
                
        if start_day is None:
            if current_slope == 0:
                return 9999
            distance = abs(threshold - current_value)
            return max(0, ceil(distance / abs(current_slope)))

        end_day = None
        for p in master_points:
            if (boundary == "UPPER" and p.value >= threshold) or \
               (boundary == "LOWER" and p.value <= threshold):
                end_day = p.day
                break
                
        if end_day is not None:
            return max(0, end_day - start_day)
            
        last_p = master_points[-1]
        
        tail = master_points[-5:] if len(master_points) >= 5 else master_points
        if len(tail) < 2:
            tail_slope = current_slope
        else:
            tail_slope = DegradationPredictor.slope_per_day(tail)
            
        if not DegradationPredictor.moving_toward_boundary(tail_slope, boundary) or tail_slope == 0:
            tail_slope = current_slope
            
        if tail_slope == 0:
            return 9999

        distance = abs(threshold - last_p.value)
        extrapolated_days = ceil(distance / abs(tail_slope))
        
        return max(0, (last_p.day + extrapolated_days) - start_day)
