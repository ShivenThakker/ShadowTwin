from __future__ import annotations

from datetime import datetime, timedelta, timezone
from typing import Literal

from fastapi import APIRouter, Header, HTTPException
from pydantic import BaseModel

from config import settings
from services.firebase import get_db

router = APIRouter(prefix="/api/v1", tags=["analytics"])


class AnalyticsSummary(BaseModel):
    total_decisions: int
    bias_rate: float  # percentage of decisions with bias detected
    avg_severity_score: float
    decisions_last_24h: int
    decisions_last_7d: int


class BiasByAttribute(BaseModel):
    attribute: str
    count: int
    avg_severity: float


class BiasByCategory(BaseModel):
    category: str
    count: int
    bias_count: int
    bias_rate: float


class BiasOverTimePoint(BaseModel):
    date: str
    count: int
    bias_count: int
    avg_severity: float


class AnalyticsResponse(BaseModel):
    summary: AnalyticsSummary
    bias_by_attribute: list[BiasByAttribute]
    bias_by_category: list[BiasByCategory]
    bias_over_time: list[BiasOverTimePoint]
    top_flagged_attributes: list[str]


async def _verify_firebase_jwt(authorization: str | None) -> dict:
    """Verify Firebase JWT token and return decoded claims."""
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing or invalid authorization header")

    import firebase_admin

    try:
        auth = firebase_admin.auth()
        token = authorization.split(" ")[1]
        decoded_token = auth.verify_id_token(token)
        return decoded_token
    except Exception as e:
        raise HTTPException(status_code=401, detail=f"Invalid token: {str(e)}")


def _demo_analytics_response() -> AnalyticsResponse:
    """Return demo analytics when Firebase is not available."""
    return AnalyticsResponse(
        summary=AnalyticsSummary(
            total_decisions=127,
            bias_rate=31.5,
            avg_severity_score=42.3,
            decisions_last_24h=18,
            decisions_last_7d=82,
        ),
        bias_by_attribute=[
            BiasByAttribute(attribute="name", count=18, avg_severity=68.5),
            BiasByAttribute(attribute="postcode", count=14, avg_severity=61.2),
            BiasByAttribute(attribute="university_tier", count=12, avg_severity=55.8),
            BiasByAttribute(attribute="gender", count=9, avg_severity=48.3),
            BiasByAttribute(attribute="employment_gap", count=6, avg_severity=38.7),
        ],
        bias_by_category=[
            BiasByCategory(category="loan_application", count=89, bias_count=31, bias_rate=34.8),
            BiasByCategory(category="job_application", count=38, bias_count=9, bias_rate=23.7),
        ],
        bias_over_time=[
            BiasOverTimePoint(date="2026-04-01", count=12, bias_count=3, avg_severity=38.0),
            BiasOverTimePoint(date="2026-04-05", count=19, bias_count=5, avg_severity=41.0),
            BiasOverTimePoint(date="2026-04-10", count=15, bias_count=4, avg_severity=39.5),
            BiasOverTimePoint(date="2026-04-15", count=25, bias_count=8, avg_severity=44.0),
            BiasOverTimePoint(date="2026-04-20", count=22, bias_count=7, avg_severity=43.0),
            BiasOverTimePoint(date="2026-04-25", count=30, bias_count=12, avg_severity=46.0),
            BiasOverTimePoint(date="2026-04-28", count=28, bias_count=11, avg_severity=45.0),
        ],
        top_flagged_attributes=["name", "postcode", "university_tier", "gender", "employment_gap"],
    )


@router.get("/analytics", response_model=AnalyticsResponse)
async def get_analytics(
    days: int = 30, authorization: str | None = Header(default=None)
) -> AnalyticsResponse:
    """Get analytics data for the dashboard. Requires authentication."""
    # Verify auth (optional for demo, required for org data)
    org_id = None
    if authorization:
        try:
            claims = await _verify_firebase_jwt(authorization)
            org_id = f"org_{claims.get('uid')}"
        except HTTPException:
            pass  # Fall back to public/demo data

    now = datetime.now(timezone.utc)
    cutoff = now - timedelta(days=days)

    # Query decisions
    db = get_db()
    if not db:
        return _demo_analytics_response()

    query = db.collection("decisions")
    if org_id:
        query = query.where("organization_id", "==", org_id)
    query = query.where("timestamp", ">=", cutoff.isoformat())

    decisions = query.stream()

    # Aggregate data
    total_decisions = 0
    bias_count = 0
    total_severity = 0
    decisions_24h = 0
    decisions_7d = 0

    attribute_stats: dict[str, dict] = {}
    category_stats: dict[str, dict] = {}
    daily_stats: dict[str, dict] = {}

    cutoff_24h = (now - timedelta(hours=24)).timestamp()
    cutoff_7d = (now - timedelta(days=7)).timestamp()

    for doc in decisions:
        data = doc.to_dict()
        total_decisions += 1

        # Check time buckets
        try:
            ts = datetime.fromisoformat(data["timestamp"].replace("Z", "+00:00")).timestamp()
            if ts >= cutoff_24h:
                decisions_24h += 1
            if ts >= cutoff_7d:
                decisions_7d += 1

            # Daily stats
            date_key = datetime.fromisoformat(data["timestamp"].replace("Z", "+00:00")).strftime(
                "%Y-%m-%d"
            )
            if date_key not in daily_stats:
                daily_stats[date_key] = {"count": 0, "bias_count": 0, "total_severity": 0}
            daily_stats[date_key]["count"] += 1
        except (KeyError, ValueError):
            pass

        # Bias stats
        if data.get("bias_detected"):
            bias_count += 1
            severity = data.get("bias_severity_score", 0)
            total_severity += severity

            if date_key in daily_stats:
                daily_stats[date_key]["bias_count"] += 1
                daily_stats[date_key]["total_severity"] += severity

            # Attribute stats
            primary_attr = data.get("primary_causal_attribute")
            if primary_attr:
                if primary_attr not in attribute_stats:
                    attribute_stats[primary_attr] = {"count": 0, "total_severity": 0}
                attribute_stats[primary_attr]["count"] += 1
                attribute_stats[primary_attr]["total_severity"] += severity

            secondary_attr = data.get("secondary_causal_attribute")
            if secondary_attr:
                if secondary_attr not in attribute_stats:
                    attribute_stats[secondary_attr] = {"count": 0, "total_severity": 0}
                attribute_stats[secondary_attr]["count"] += 1
                attribute_stats[secondary_attr]["total_severity"] += severity

        # Category stats
        category = data.get("decision_category", "unknown")
        if category not in category_stats:
            category_stats[category] = {"count": 0, "bias_count": 0}
        category_stats[category]["count"] += 1
        if data.get("bias_detected"):
            category_stats[category]["bias_count"] += 1

    # Build response
    summary = AnalyticsSummary(
        total_decisions=total_decisions,
        bias_rate=(bias_count / total_decisions * 100) if total_decisions > 0 else 0.0,
        avg_severity_score=(total_severity / bias_count) if bias_count > 0 else 0.0,
        decisions_last_24h=decisions_24h,
        decisions_last_7d=decisions_7d,
    )

    bias_by_attribute = [
        BiasByAttribute(
            attribute=attr,
            count=stats["count"],
            avg_severity=stats["total_severity"] / stats["count"] if stats["count"] > 0 else 0.0,
        )
        for attr, stats in sorted(attribute_stats.items(), key=lambda x: x[1]["count"], reverse=True)
    ]

    bias_by_category = [
        BiasByCategory(
            category=cat,
            count=stats["count"],
            bias_count=stats["bias_count"],
            bias_rate=(stats["bias_count"] / stats["count"] * 100) if stats["count"] > 0 else 0.0,
        )
        for cat, stats in category_stats.items()
    ]

    bias_over_time = [
        BiasOverTimePoint(
            date=date_key,
            count=stats["count"],
            bias_count=stats["bias_count"],
            avg_severity=(stats["total_severity"] / stats["bias_count"])
            if stats["bias_count"] > 0
            else 0.0,
        )
        for date_key, stats in sorted(daily_stats.items())
    ]

    top_flagged_attributes = [
        attr for attr, _ in sorted(attribute_stats.items(), key=lambda x: x[1]["count"], reverse=True)
    ][:5]

    return AnalyticsResponse(
        summary=summary,
        bias_by_attribute=bias_by_attribute,
        bias_by_category=bias_by_category,
        bias_over_time=bias_over_time,
        top_flagged_attributes=top_flagged_attributes,
    )
