import json
from decimal import Decimal
from datetime import date, datetime
from typing import Any

from psycopg.types.json import Jsonb

def _json_dumps(obj: Any) -> str:
    def serial(o):
        if isinstance(o, (date, datetime)):
            return o.isoformat()
        if isinstance(o, Decimal):
            return float(o)
        raise TypeError(f"Object of type {o.__class__.__name__} is not JSON serializable")
    return json.dumps(obj, default=serial)

JOB_CODE = "NIGHTLY_PHM_ANALYTICS_SYNC"


TARGET_TASKS_SQL = """
SELECT
    pts.task_schedule_id,
    pst.std_task_id,
    pst.part_id,
    ep.name AS part_name,
    ee.equipment_id,
    eq.plant_id,
    eq.department_id,
    eq.line_id,
    pst.standard_value,
    pst.tolerance_min,
    pst.tolerance_max,
    pst.uom
FROM pm_task_schedules pts
JOIN pm_std_tasks pst ON pst.std_task_id = pts.std_task_id
JOIN equipment_parts ep ON ep.part_id = pst.part_id
LEFT JOIN equipment_element ee ON ee.element_id = ep.equipment_element_id
LEFT JOIN equipments eq ON eq.equipment_id = ee.equipment_id
WHERE pts.is_active IS TRUE
  AND pst.part_id IS NOT NULL
  AND pst.uom IS NOT NULL
  AND (%(part_ids)s::bigint[] IS NULL OR pst.part_id = ANY(%(part_ids)s::bigint[]))
ORDER BY pst.part_id, pts.task_schedule_id
"""


REPLACEMENTS_SQL = """
SELECT replacement_dttm
FROM spare_part_replacements
WHERE part_id = %(part_id)s
ORDER BY replacement_dttm
"""


EXECUTIONS_SQL = """
SELECT schedule_execution_id, completed_dttm, actual_value, deviation_flag
FROM pm_schedule_execution
WHERE task_schedule_id = %(task_schedule_id)s
  AND completed_dttm IS NOT NULL
  AND actual_value IS NOT NULL
ORDER BY completed_dttm
"""

OPERATIONAL_METRICS_SQL = """
SELECT
    eq.plant_id,
    eq.department_id,
    eq.line_id,
    ee.equipment_id,
    SUM(pst.estimated_req_time) AS total_estimated_time,
    SUM(e.time_taken) AS total_time_taken,
    COUNT(*) AS total_completed,
    COUNT(CASE WHEN e.status = 'REJECTED' THEN 1 END) AS total_rejected,
    COUNT(CASE WHEN e.evidence_rejected_flag IS FALSE OR e.evidence_rejected_flag IS NULL THEN 1 END) AS total_evidence_accepted,
    SUM(EXTRACT(EPOCH FROM (a.final_approved_dttm - e.completed_dttm))/3600) AS sum_turnaround_hours,
    COUNT(CASE WHEN e.status IN ('APPROVED', 'COMPLETED', 'FLAGGED_AND_COMPLETED') THEN 1 END) AS count_approved
FROM pm_schedule_execution e
JOIN pm_task_schedules pts ON pts.task_schedule_id = e.task_schedule_id
JOIN pm_std_tasks pst ON pst.std_task_id = pts.std_task_id
JOIN equipment_parts ep ON ep.part_id = pst.part_id
LEFT JOIN equipment_element ee ON ee.element_id = ep.equipment_element_id
LEFT JOIN equipments eq ON eq.equipment_id = ee.equipment_id
LEFT JOIN LATERAL (
    SELECT MAX(approved_dttm) AS final_approved_dttm
    FROM pm_schedule_approval
    WHERE schedule_execution_id = e.schedule_execution_id
      AND approval_status = 'APPROVED'
) a ON TRUE
WHERE e.completed_dttm IS NOT NULL
  AND e.completed_dttm >= %(start_date)s
  AND e.completed_dttm <= %(end_date)s
GROUP BY eq.plant_id, eq.department_id, eq.line_id, ee.equipment_id
"""


def fetch_target_tasks(conn, part_ids: list[int] | None) -> list[dict[str, Any]]:
    with conn.cursor() as cur:
        cur.execute(TARGET_TASKS_SQL, {"part_ids": part_ids})
        return list(cur.fetchall())


def fetch_replacements(conn, part_id: int) -> list[datetime]:
    with conn.cursor() as cur:
        cur.execute(REPLACEMENTS_SQL, {"part_id": part_id})
        return [row["replacement_dttm"] for row in cur.fetchall()]


def fetch_executions(conn, task_schedule_id: int) -> list[dict[str, Any]]:
    with conn.cursor() as cur:
        cur.execute(EXECUTIONS_SQL, {"task_schedule_id": task_schedule_id})
        return list(cur.fetchall())

def fetch_operational_metrics(conn, evaluation_date: date, window_days: int) -> list[dict[str, Any]]:
    from datetime import timedelta
    start_date = evaluation_date - timedelta(days=window_days)
    end_date = evaluation_date
    with conn.cursor() as cur:
        cur.execute(OPERATIONAL_METRICS_SQL, {"start_date": start_date, "end_date": end_date})
        return list(cur.fetchall())


def fetch_analytics_config(conn) -> dict[str, str]:
    """
    Reads all active rows from ``config_param`` where
    ``param_category = 'ANALYTICS'`` and returns a plain ``{key: value}`` dict.

    Returns an empty dict (causing callers to use their hard-coded defaults)
    if the table doesn't exist yet or the query fails for any reason.
    """
    try:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT param_key, param_value
                FROM config_param
                WHERE param_category = 'ANALYTICS'
                  AND is_active = TRUE
                """
            )
            return {row["param_key"]: row["param_value"] for row in cur.fetchall()}
    except Exception:
        # Silently fall back to defaults — pipeline must never break on missing config
        return {}


def persist_prediction(conn, prediction: dict[str, Any], evaluation_date: date) -> None:
    with conn.cursor() as cur:
        cur.execute(
            """
            UPDATE phm_degradation_predictions
            SET is_active = FALSE
            WHERE part_id = %(part_id)s
              AND task_schedule_id = %(task_schedule_id)s
              AND is_active = TRUE
            """,
            prediction,
        )
        cur.execute(
            """
            INSERT INTO phm_degradation_predictions (
                part_id,
                task_schedule_id,
                evaluation_date,
                current_value,
                predicted_failure_date,
                confidence_score,
                days_remaining,
                degradation_velocity,
                risk_score,
                lifecycle_ratio,
                chart_data_payload,
                is_active
            )
            VALUES (
                %(part_id)s,
                %(task_schedule_id)s,
                %(evaluation_date)s,
                %(current_value)s,
                %(predicted_failure_date)s,
                %(confidence_score)s,
                %(days_remaining)s,
                %(degradation_velocity)s,
                %(risk_score)s,
                %(lifecycle_ratio)s,
                %(chart_data_payload)s,
                TRUE
            )
            """,
            {
                **prediction,
                "evaluation_date": evaluation_date,
                "chart_data_payload": Jsonb(prediction.get("chart_data_payload"), dumps=_json_dumps) if prediction.get("chart_data_payload") else None
            },
        )


def persist_insights(conn, insights: list[dict[str, Any]]) -> None:
    if not insights:
        return

    with conn.cursor() as cur:
        for insight in insights:
            cur.execute(
                """
                INSERT INTO phm_action_insights (
                    line_id,
                    part_id,
                    insight_type,
                    insight_code,
                    severity,
                    metadata,
                    status
                )
                SELECT
                    %(line_id)s,
                    %(part_id)s,
                    %(insight_type)s::varchar,
                    %(insight_code)s::varchar,
                    %(severity)s::varchar,
                    %(metadata)s,
                    'UNREAD'
                WHERE NOT EXISTS (
                    SELECT 1
                    FROM phm_action_insights
                    WHERE part_id = %(part_id)s
                      AND insight_code = %(insight_code)s
                      AND created_at::date = CURRENT_DATE
                )
                """,
                {**insight, "metadata": Jsonb(insight["metadata"], dumps=_json_dumps)},
            )


def create_job_execution(
    conn,
    trigger_type: str,
    triggered_by_employee_id: int | None,
) -> int:
    with conn.cursor() as cur:
        cur.execute(
            """
            INSERT INTO job_execution_history (
                job_id,
                triggered_by_employee_id,
                trigger_type,
                status
            )
            SELECT
                job_id,
                %(triggered_by_employee_id)s,
                %(trigger_type)s,
                'IN_PROGRESS'
            FROM system_jobs
            WHERE job_code = %(job_code)s
            RETURNING execution_id
            """,
            {
                "job_code": JOB_CODE,
                "triggered_by_employee_id": triggered_by_employee_id,
                "trigger_type": trigger_type,
            },
        )
        row = cur.fetchone()
        if row is None:
            raise RuntimeError(f"System job not registered: {JOB_CODE}")
        return row["execution_id"]


def complete_job_execution(
    conn,
    execution_id: int,
    status: str,
    duration_ms: int,
    response_payload: dict[str, Any] | None = None,
    error_message: str | None = None,
) -> None:
    with conn.cursor() as cur:
        cur.execute(
            """
            UPDATE job_execution_history
            SET
                status = %(status)s,
                completed_at = CURRENT_TIMESTAMP,
                duration_ms = %(duration_ms)s,
                response_payload = %(response_payload)s,
                error_message = %(error_message)s
            WHERE execution_id = %(execution_id)s
            """,
            {
                "execution_id": execution_id,
                "status": status,
                "duration_ms": duration_ms,
                "response_payload": Jsonb(response_payload, dumps=_json_dumps) if response_payload is not None else None,
                "error_message": error_message,
            },
        )


def persist_evaluation_audits(conn, audits: list[dict[str, Any]]) -> None:
    if not audits:
        return

    with conn.cursor() as cur:
        for audit in audits:
            cur.execute(
                """
                INSERT INTO phm_evaluation_audit (
                    execution_id,
                    evaluation_date,
                    plant_id,
                    department_id,
                    line_id,
                    equipment_id,
                    part_id,
                    task_schedule_id,
                    std_task_id,
                    evaluation_status,
                    reason_code,
                    data_points_count,
                    current_cycle_points_count,
                    completed_cycles_count,
                    current_value,
                    risk_score,
                    metadata
                )
                VALUES (
                    %(execution_id)s,
                    %(evaluation_date)s,
                    %(plant_id)s,
                    %(department_id)s,
                    %(line_id)s,
                    %(equipment_id)s,
                    %(part_id)s,
                    %(task_schedule_id)s,
                    %(std_task_id)s,
                    %(evaluation_status)s,
                    %(reason_code)s,
                    %(data_points_count)s,
                    %(current_cycle_points_count)s,
                    %(completed_cycles_count)s,
                    %(current_value)s,
                    %(risk_score)s,
                    %(metadata)s
                )
                """,
                {**audit, "metadata": Jsonb(audit["metadata"], dumps=_json_dumps)},
            )


def persist_health_scores(conn, evaluation_date: date, scores: list[dict[str, Any]], window_days: int) -> None:
    if not scores:
        return

    with conn.cursor() as cur:
        cur.execute(
            """
            DELETE FROM phm_health_scores
            WHERE evaluation_date = %(evaluation_date)s
              AND window_days = %(window_days)s
              AND (entity_type, entity_id) IN (
                  SELECT entity_type, entity_id
                  FROM jsonb_to_recordset(%(scores)s) AS s(entity_type text, entity_id bigint)
              )
            """,
            {"evaluation_date": evaluation_date, "window_days": window_days, "scores": Jsonb(scores, dumps=_json_dumps)},
        )

        for score in scores:
            cur.execute(
                """
                INSERT INTO phm_health_scores (
                    evaluation_date,
                    entity_type,
                    entity_id,
                    health_score,
                    critical_flags_count,
                    pm_compliance_rate,
                    pm_operational_compliance,
                    employee_efficiency,
                    task_rejection_rate,
                    approval_turnaround_time,
                    evidence_compliance_rate,
                    trend,
                    window_days
                )
                VALUES (
                    %(evaluation_date)s,
                    %(entity_type)s,
                    %(entity_id)s,
                    %(health_score)s,
                    %(critical_flags_count)s,
                    %(pm_compliance_rate)s,
                    %(pm_operational_compliance)s,
                    %(employee_efficiency)s,
                    %(task_rejection_rate)s,
                    %(approval_turnaround_time)s,
                    %(evidence_compliance_rate)s,
                    %(trend)s,
                    %(window_days)s
                )
                """,
                {**score, "evaluation_date": evaluation_date, "window_days": window_days},
            )

def fetch_previous_health_scores(conn, evaluation_date: date, entity_keys: list[tuple[str, int]], window_days: int) -> dict[tuple[str, int], float]:
    if not entity_keys:
        return {}

    payload = [{"entity_type": entity_type, "entity_id": entity_id} for entity_type, entity_id in entity_keys]
    with conn.cursor() as cur:
        cur.execute(
            """
            SELECT DISTINCT ON (h.entity_type, h.entity_id)
                h.entity_type,
                h.entity_id,
                h.health_score
            FROM phm_health_scores h
            JOIN jsonb_to_recordset(%(entities)s) AS e(entity_type text, entity_id bigint)
              ON e.entity_type = h.entity_type
             AND e.entity_id = h.entity_id
            WHERE h.evaluation_date < %(evaluation_date)s
              AND h.window_days = %(window_days)s
            ORDER BY h.entity_type, h.entity_id, h.evaluation_date DESC
            """,
            {"evaluation_date": evaluation_date, "window_days": window_days, "entities": Jsonb(payload, dumps=_json_dumps)},
        )
        return {
            (row["entity_type"], row["entity_id"]): float(row["health_score"])
            for row in cur.fetchall()
            if row["health_score"] is not None
        }
