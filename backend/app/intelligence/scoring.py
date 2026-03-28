import math


def haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Return the great-circle distance in kilometres between two GPS coordinates."""
    R = 6371.0
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlambda = math.radians(lon2 - lon1)
    a = math.sin(dphi / 2) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(dlambda / 2) ** 2
    return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))


def _distance_score(distance_km: float, radius_km: float) -> float:
    """Map distance to a 0–20 score. Donors within 5 km get full 20 pts; beyond radius get 0."""
    if distance_km <= 0:
        return 20.0
    if distance_km >= radius_km:
        return 0.0
    # Linear decay from 20 (at 5 km) to 0 (at radius_km), floored at 0.
    near_threshold = min(5.0, radius_km / 2)
    if distance_km <= near_threshold:
        return 20.0
    return max(0.0, 20.0 * (1 - (distance_km - near_threshold) / (radius_km - near_threshold)))


def score_donor(
    *,
    donor_blood_type: str,
    campaign_blood_type: str,
    is_eligible: bool,
    donor_lat: float | None,
    donor_lon: float | None,
    center_lat: float | None,
    center_lon: float | None,
    radius_km: float,
    response_score: float,
) -> float:
    """
    Score a single donor 0–100 for a campaign.

    Breakdown:
        +40  blood-type exact match
        +25  eligibility (≥56 days since last donation, or never donated)
        +20  proximity (haversine, linear decay)
        +15  historical response rate (0–1 scaled to 0–15)
    """
    score = 0.0

    # Blood type match
    if donor_blood_type == campaign_blood_type:
        score += 40.0
    elif _is_compatible(donor_blood_type, campaign_blood_type):
        # Compatible but not exact match gets partial credit
        score += 20.0

    # Eligibility
    if is_eligible:
        score += 25.0

    # Distance
    if donor_lat is not None and donor_lon is not None and center_lat is not None and center_lon is not None:
        dist = haversine_km(donor_lat, donor_lon, center_lat, center_lon)
        score += _distance_score(dist, radius_km)
    else:
        # No coordinates available – assume mid-range
        score += 10.0

    # Response history
    score += min(1.0, max(0.0, response_score)) * 15.0

    return round(score, 2)


def _is_compatible(donor_type: str, recipient_type: str) -> bool:
    """Universal donors / basic compatibility check."""
    compatibility: dict[str, set[str]] = {
        "O-": {"O-", "O+", "A-", "A+", "B-", "B+", "AB-", "AB+"},
        "O+": {"O+", "A+", "B+", "AB+"},
        "A-": {"A-", "A+", "AB-", "AB+"},
        "A+": {"A+", "AB+"},
        "B-": {"B-", "B+", "AB-", "AB+"},
        "B+": {"B+", "AB+"},
        "AB-": {"AB-", "AB+"},
        "AB+": {"AB+"},
    }
    return recipient_type in compatibility.get(donor_type, set())


def rank_donors(donors_data: list[dict], campaign_data: dict) -> list[dict]:
    """
    Score and rank a list of donor dicts for a campaign.

    donor_data keys: blood_type, is_eligible, lat, lon, response_score, donor_id
    campaign_data keys: blood_type, center_lat, center_lon, radius_km
    """
    scored = []
    for d in donors_data:
        s = score_donor(
            donor_blood_type=d["blood_type"],
            campaign_blood_type=campaign_data["blood_type"],
            is_eligible=d["is_eligible"],
            donor_lat=d.get("lat"),
            donor_lon=d.get("lon"),
            center_lat=campaign_data.get("center_lat"),
            center_lon=campaign_data.get("center_lon"),
            radius_km=campaign_data.get("radius_km", 50.0),
            response_score=d.get("response_score", 0.5),
        )
        scored.append({**d, "score": s})

    scored.sort(key=lambda x: x["score"], reverse=True)
    return scored
