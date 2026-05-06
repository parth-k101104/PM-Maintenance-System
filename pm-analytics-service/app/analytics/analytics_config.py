"""
Typed container for all analytics tuning parameters loaded from the
``config_param`` DB table (category = 'ANALYTICS').

Every field has a hard-coded default so the analytics pipeline keeps
working even when the DB is unavailable or V27 hasn't been applied yet.

Usage
-----
In the orchestrator::

    from app.repository import fetch_analytics_config
    from app.analytics.analytics_config import AnalyticsConfig

    raw = fetch_analytics_config(conn)
    config = AnalyticsConfig.from_db(raw)
    # pass config down to predictor, evaluator, insights
"""

from dataclasses import dataclass


@dataclass(frozen=True)
class AnalyticsConfig:
    # ── Predictor / warning thresholds ────────────────────────────────────────
    warn_threshold_ratio: float = 0.875
    """Fraction of max tolerance at which a PREDICTIVE_WARNING insight fires."""

    stable_slope_epsilon: float = 0.002
    """Slope (per day) below which a trend is classified STABLE."""

    anomaly_velocity_ratio: float = 1.3
    """Current/historical velocity ratio above which DEGRADATION_ANOMALY fires."""

    # ── Run parameters ─────────────────────────────────────────────────────────
    window_days: int = 365
    """Historical data window (days) for health score calculation."""

    # ── Evaluator thresholds ───────────────────────────────────────────────────
    critical_risk_threshold: float = 90.0
    """Risk score (0-100) above which a part counts as a critical flag."""

    trend_stability_threshold: float = 1.0
    """Max health-score delta for trend to be STABLE (vs IMPROVING/DEGRADING)."""

    health_config_missing_score: float = 60.0
    """Health contribution when evaluation_status = CONFIG_MISSING."""

    health_insufficient_data_score: float = 70.0
    """Health contribution when evaluation_status = INSUFFICIENT_DATA."""

    health_no_risk_fallback_score: float = 75.0
    """Health contribution fallback when risk_score is None."""

    # ── Confidence score bounds ────────────────────────────────────────────────
    min_confidence_score: float = 60.0
    """Floor for prediction confidence score."""

    max_confidence_score: float = 95.0
    """Ceiling for prediction confidence score."""

    lr_confidence_cap: float = 55.0
    """Confidence cap when prediction method is LINEAR_REGRESSION."""

    # ─────────────────────────────────────────────────────────────────────────

    @classmethod
    def from_db(cls, raw: dict[str, str]) -> "AnalyticsConfig":
        """
        Build an ``AnalyticsConfig`` from the raw ``{param_key: param_value}``
        dict returned by :func:`app.repository.fetch_analytics_config`.
        Missing or unparseable keys silently fall back to the field defaults.
        """
        def _float(key: str, default: float) -> float:
            try:
                return float(raw[key])
            except (KeyError, ValueError, TypeError):
                return default

        def _int(key: str, default: int) -> int:
            try:
                return int(float(raw[key]))  # handles "365.0" etc.
            except (KeyError, ValueError, TypeError):
                return default

        return cls(
            warn_threshold_ratio=_float("ANALYTICS_WARN_THRESHOLD_RATIO", 0.875),
            stable_slope_epsilon=_float("ANALYTICS_STABLE_SLOPE_EPSILON", 0.002),
            anomaly_velocity_ratio=_float("ANALYTICS_ANOMALY_VELOCITY_RATIO", 1.3),
            window_days=_int("ANALYTICS_WINDOW_DAYS", 365),
            critical_risk_threshold=_float("ANALYTICS_CRITICAL_RISK_THRESHOLD", 90.0),
            trend_stability_threshold=_float("ANALYTICS_TREND_STABILITY_THRESHOLD", 1.0),
            health_config_missing_score=_float("ANALYTICS_HEALTH_CONFIG_MISSING_SCORE", 60.0),
            health_insufficient_data_score=_float("ANALYTICS_HEALTH_INSUFFICIENT_DATA_SCORE", 70.0),
            health_no_risk_fallback_score=_float("ANALYTICS_HEALTH_NO_RISK_FALLBACK_SCORE", 75.0),
            min_confidence_score=_float("ANALYTICS_MIN_CONFIDENCE_SCORE", 60.0),
            max_confidence_score=_float("ANALYTICS_MAX_CONFIDENCE_SCORE", 95.0),
            lr_confidence_cap=_float("ANALYTICS_LR_CONFIDENCE_CAP", 55.0),
        )

    @classmethod
    def defaults(cls) -> "AnalyticsConfig":
        """Return an instance with all hard-coded defaults (no DB needed)."""
        return cls()
