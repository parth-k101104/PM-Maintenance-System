-- ─────────────────────────────────────────────────────────────────────────────
-- V28: Add pm_operational_compliance column to phm_health_scores
--
-- pm_compliance_rate  → PHM prediction *coverage*: % of tasks the analytics
--                        engine was able to evaluate (has enough data to predict).
--
-- pm_operational_compliance → Operational PM *compliance*: of tasks that reached
--                        a terminal approval decision in the rolling window,
--                        what % were approved.
--                        Formula: count_approved / (count_approved + total_rejected) × 100
--                        Computed by the Python analytics engine at run time and
--                        persisted here — never computed on the fly by the Java backend.
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE phm_health_scores
    ADD COLUMN IF NOT EXISTS pm_operational_compliance NUMERIC(5,2);

COMMENT ON COLUMN phm_health_scores.pm_operational_compliance IS
    'Operational PM compliance: approved / (approved + rejected) × 100 '
    'over the rolling window, computed by the analytics engine.';
