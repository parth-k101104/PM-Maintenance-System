from typing import Any
from datetime import date
from statistics import mean
from app.repository import (
    fetch_previous_health_scores,
    fetch_operational_metrics,
)
from .analytics_config import AnalyticsConfig


class HealthEvaluator:
    def __init__(self, conn: Any, evaluation_date: date, window_days: int, config: AnalyticsConfig):
        self.conn = conn
        self.evaluation_date = evaluation_date
        self.window_days = window_days
        self.config = config

    def evaluate(self, audit_rows: list[dict[str, Any]]) -> list[dict[str, Any]]:
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

        op_metrics_raw = fetch_operational_metrics(self.conn, self.evaluation_date, self.window_days)
        op_metrics_agg = self._aggregate_op_metrics(set(buckets.keys()), op_metrics_raw)

        previous_scores = fetch_previous_health_scores(self.conn, self.evaluation_date, list(buckets.keys()), self.window_days)
        health_scores: list[dict[str, Any]] = []

        critical_threshold = self.config.critical_risk_threshold
        trend_threshold = self.config.trend_stability_threshold

        for key, rows in buckets.items():
            entity_type, entity_id = key
            contribution_scores = [self._health_contribution(row) for row in rows]
            health_score = round(mean(contribution_scores), 2) if contribution_scores else 100.0
            critical_flags_count = sum(1 for row in rows if (row.get("risk_score") or 0) >= critical_threshold)
            complete_count = sum(1 for row in rows if row["evaluation_status"] in {"PREDICTED", "STABLE"})
            coverage_rate = round((complete_count / len(rows)) * 100, 2) if rows else 100.0
            previous = previous_scores.get(key)

            if previous is None or abs(health_score - previous) < trend_threshold:
                trend = "STABLE"
            elif health_score > previous:
                trend = "IMPROVING"
            else:
                trend = "DEGRADING"

            metrics = op_metrics_agg.get(key, {})
            employee_efficiency = min(metrics.get("employee_efficiency", 100.0), 100.0)
            task_rejection_rate = metrics.get("task_rejection_rate", 0.0)
            approval_turnaround_time = metrics.get("approval_turnaround_time", "0h")
            evidence_compliance_rate = metrics.get("evidence_compliance_rate", 100.0)

            health_scores.append(
                {
                    "entity_type": entity_type,
                    "entity_id": entity_id,
                    "health_score": health_score,
                    "critical_flags_count": critical_flags_count,
                    "pm_compliance_rate": coverage_rate,
                    "employee_efficiency": employee_efficiency,
                    "task_rejection_rate": task_rejection_rate,
                    "approval_turnaround_time": approval_turnaround_time,
                    "evidence_compliance_rate": evidence_compliance_rate,
                    "trend": trend,
                }
            )

        return health_scores

    def _aggregate_op_metrics(self, entities: set[tuple[str, int]], op_metrics_raw: list[dict[str, Any]]) -> dict[tuple[str, int], dict[str, Any]]:
        agg = {}
        for etype, eid in entities:
            matching_rows = []
            for r in op_metrics_raw:
                if etype == "EQUIPMENT" and r["equipment_id"] == eid:
                    matching_rows.append(r)
                elif etype == "LINE" and r["line_id"] == eid:
                    matching_rows.append(r)
                elif etype == "DEPARTMENT" and r["department_id"] == eid:
                    matching_rows.append(r)
                elif etype == "PLANT" and r["plant_id"] == eid:
                    matching_rows.append(r)

            if not matching_rows:
                continue

            total_est = sum((r["total_estimated_time"] or 0) for r in matching_rows)
            total_taken = sum((r["total_time_taken"] or 0) for r in matching_rows)
            total_comp = sum((r["total_completed"] or 0) for r in matching_rows)
            total_rej = sum((r["total_rejected"] or 0) for r in matching_rows)
            total_ev_acc = sum((r["total_evidence_accepted"] or 0) for r in matching_rows)
            sum_turnaround_hours = sum((r["sum_turnaround_hours"] or 0) for r in matching_rows)
            count_approved = sum((r["count_approved"] or 0) for r in matching_rows)

            employee_efficiency = round((total_est / total_taken * 100), 2) if total_taken > 0 else 100.0
            task_rejection_rate = round((total_rej / total_comp * 100), 2) if total_comp > 0 else 0.0
            avg_turnaround_hours = round(sum_turnaround_hours / count_approved, 2) if count_approved > 0 else 0.0
            evidence_compliance_rate = round((total_ev_acc / total_comp * 100), 2) if total_comp > 0 else 100.0

            agg[(etype, eid)] = {
                "employee_efficiency": employee_efficiency,
                "task_rejection_rate": task_rejection_rate,
                "approval_turnaround_time": self._format_turnaround(avg_turnaround_hours),
                "evidence_compliance_rate": evidence_compliance_rate
            }
        return agg

    @staticmethod
    def _format_turnaround(hours: float) -> str:
        if hours <= 0:
            return "0h"
        d = int(hours // 24)
        h = int(round(hours % 24))
        if h == 24:
            d += 1
            h = 0
        parts = []
        if d > 0:
            parts.append(f"{d}d")
        if h > 0 or d == 0:
            parts.append(f"{h}h")
        return " ".join(parts)

    def _health_contribution(self, audit: dict[str, Any]) -> float:
        """
        Returns a 0-100 health contribution for a single audit row.
        Fallback scores are driven by AnalyticsConfig (from config_param DB table).
        """
        from .predictor import DegradationPredictor
        if audit["evaluation_status"] == "CONFIG_MISSING":
            return self.config.health_config_missing_score
        if audit["evaluation_status"] == "INSUFFICIENT_DATA":
            return self.config.health_insufficient_data_score
        risk_score = audit.get("risk_score")
        if risk_score is None:
            return self.config.health_no_risk_fallback_score
        return DegradationPredictor.clamp(100.0 - float(risk_score), 0.0, 100.0)
