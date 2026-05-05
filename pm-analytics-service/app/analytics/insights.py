from typing import Any
from datetime import date
from app.config import get_settings

class InsightGenerator:
    @staticmethod
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

        # Circular import protection: only import crossed_warning if needed
        from .predictor import DegradationPredictor

        if DegradationPredictor.crossed_warning(current_value, warning_value, boundary):
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
