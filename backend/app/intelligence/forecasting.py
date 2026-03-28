import json
from datetime import datetime, timezone


def _ratio_risk(available: int, demand: int) -> float:
    """0 = no risk (surplus), 1 = critical shortage."""
    if demand <= 0:
        return 0.0
    ratio = available / demand
    if ratio >= 1.5:
        return 0.0
    if ratio >= 1.0:
        return 0.1 + 0.15 * (1.5 - ratio) / 0.5
    if ratio >= 0.5:
        return 0.25 + 0.35 * (1.0 - ratio) / 0.5
    return min(1.0, 0.60 + 0.40 * (0.5 - ratio) / 0.5)


def _seasonal_factor(now: datetime) -> float:
    """Summer and Christmas/New Year periods have higher demand."""
    month = now.month
    if month in (7, 8):        # Summer holiday – reduced donations
        return 0.10
    if month in (12, 1):       # Winter holidays
        return 0.07
    return 0.0


def _rarity_factor(blood_type: str) -> float:
    """Rarer blood types contribute additional baseline risk."""
    rare = {"O-": 0.12, "AB-": 0.08, "B-": 0.05, "A-": 0.03}
    return rare.get(blood_type, 0.0)


def compute_forecast(
    *,
    city: str,
    blood_type: str,
    available_units: int,
    expected_demand_units: int,
    days_since_last_surge: int = 30,
    recent_campaign_response_rate: float = 0.3,
) -> dict:
    """
    Compute a forecast result for a city + blood_type combination.

    Returns a dict matching the ForecastResult schema (minus DB fields).
    """
    now = datetime.now(timezone.utc)

    ratio_risk = _ratio_risk(available_units, expected_demand_units)
    seasonal = _seasonal_factor(now)
    rarity = _rarity_factor(blood_type)

    # Surge recency: if no surge in last 14 days, slight additional risk
    surge_risk = max(0.0, (days_since_last_surge - 14) / 90.0) * 0.08

    # Good response rate mitigates risk slightly
    campaign_mitigation = recent_campaign_response_rate * 0.05

    raw_risk = ratio_risk + seasonal + rarity + surge_risk - campaign_mitigation
    predicted_shortage_risk = round(min(1.0, max(0.0, raw_risk)), 4)

    # Units needed = deficit, floor at 0
    deficit = max(0, expected_demand_units - available_units)
    buffer = int(expected_demand_units * 0.2)  # 20 % safety buffer
    predicted_units_needed = deficit + buffer

    # Confidence: higher when we have recent data (simplified)
    confidence_score = round(min(0.95, 0.60 + (1.0 - ratio_risk) * 0.2 + 0.05), 4)

    if predicted_shortage_risk >= 0.75:
        risk_level = "critical"
    elif predicted_shortage_risk >= 0.50:
        risk_level = "high"
    elif predicted_shortage_risk >= 0.25:
        risk_level = "medium"
    else:
        risk_level = "low"

    factors = {
        "supply_demand_ratio": round(available_units / max(1, expected_demand_units), 3),
        "ratio_risk": round(ratio_risk, 4),
        "seasonal_factor": round(seasonal, 4),
        "rarity_factor": round(rarity, 4),
        "surge_recency_risk": round(surge_risk, 4),
        "campaign_mitigation": round(campaign_mitigation, 4),
        "risk_level": risk_level,
    }

    return {
        "city": city,
        "blood_type": blood_type,
        "predicted_shortage_risk": predicted_shortage_risk,
        "predicted_units_needed": predicted_units_needed,
        "confidence_score": confidence_score,
        "factors_json": json.dumps(factors),
        "risk_level": risk_level,
    }


def risk_level_from_score(score: float) -> str:
    if score >= 0.75:
        return "critical"
    if score >= 0.50:
        return "high"
    if score >= 0.25:
        return "medium"
    return "low"
