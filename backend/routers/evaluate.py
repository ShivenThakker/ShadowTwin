from __future__ import annotations

from datetime import datetime, timezone
from typing import Literal
from uuid import uuid4

import firebase_admin
from fastapi import APIRouter, Header, HTTPException
from pydantic import BaseModel

from config import settings
from services.firebase import get_db, get_realtime_db
from services.gemini_pipeline import GeminiPipeline

router = APIRouter(prefix="/api/v1", tags=["evaluate"])

pipeline = GeminiPipeline(settings)


class OriginalDecision(BaseModel):
    outcome: Literal["approved", "rejected"]
    reason: str


class DecisionInput(BaseModel):
    applicant_name: str
    age: int
    gender: str
    postcode: str
    city: str
    annual_income_inr: int
    employment_status: str
    loan_amount_requested_inr: int
    credit_score: int
    additional_context: str | None = None


class JobDecisionInput(BaseModel):
    applicant_name: str
    gender: str
    location: str
    university_tier: str
    employment_gap_months: int
    job_description: str
    resume_text: str
    additional_context: str | None = None


class EvaluateRequest(BaseModel):
    decision_id: str | None = None
    organization_id: str | None = None
    decision_category: Literal["loan_application", "job_application"]
    input: DecisionInput | JobDecisionInput
    original_decision: OriginalDecision | None = None


class ShadowResult(BaseModel):
    attribute_tested: str
    shadow_input_name: str | None = None
    shadow_postcode: str | None = None
    shadow_gender: str | None = None
    shadow_location: str | None = None
    shadow_university_tier: str | None = None
    shadow_employment_gap_months: int | None = None
    shadow_decision: Literal["approved", "rejected"]
    decision_diverged: bool
    divergence_confidence: float


class EvaluateResponse(BaseModel):
    decision_id: str
    evaluation_complete: bool
    processing_time_ms: int
    bias_detected: bool
    bias_severity_score: int
    severity_label: Literal["negligible", "moderate", "severe", "critical"]
    primary_causal_attribute: str
    secondary_causal_attribute: str | None = None
    shadow_results: list[ShadowResult]
    bias_explanation: str
    recommended_action: str
    audit_log_id: str
    timestamp: str


def _severity_label(score: int) -> str:
    if score >= 81:
        return "critical"
    if score >= 51:
        return "severe"
    if score >= 21:
        return "moderate"
    return "negligible"


def _hash_name(name: str) -> str:
    import hashlib

    return hashlib.sha256(name.encode()).hexdigest()[:16]


async def _verify_firebase_jwt(authorization: str | None) -> dict:
    """Verify Firebase JWT token and return decoded claims."""
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing or invalid authorization header")

    token = authorization.split(" ")[1]

    try:
        auth = firebase_admin.auth()
        decoded_token = auth.verify_id_token(token)
        return decoded_token
    except Exception as e:
        raise HTTPException(status_code=401, detail=f"Invalid token: {str(e)}")


@router.post("/evaluate", response_model=EvaluateResponse)
async def evaluate(
    payload: EvaluateRequest, authorization: str | None = Header(default=None)
) -> EvaluateResponse:
    """Evaluate a decision for bias. Requires Firebase JWT authentication."""
    # Verify auth
    claims = await _verify_firebase_jwt(authorization)
    user_uid = claims.get("uid")

    decision_id = payload.decision_id or f"eval-{uuid4()}"
    timestamp = datetime.now(timezone.utc).isoformat()
    org_id = payload.organization_id or f"org_{user_uid}"

    input_dict = payload.input.model_dump()
    result = await pipeline.run(input_dict, payload.decision_category)

    shadow_results = []
    for sr in result["shadow_results"]:
        shadow_results.append(
            ShadowResult(
                attribute_tested=sr["attribute_tested"],
                shadow_input_name=sr.get("shadow_value"),
                shadow_postcode=sr.get("shadow_value")
                if sr["attribute_tested"] == "postcode"
                else None,
                shadow_gender=sr.get("shadow_value")
                if sr["attribute_tested"] == "gender"
                else None,
                shadow_location=sr.get("shadow_value")
                if sr["attribute_tested"] == "location"
                else None,
                shadow_university_tier=sr.get("shadow_value")
                if sr["attribute_tested"] == "university_tier"
                else None,
                shadow_employment_gap_months=sr.get("shadow_value")
                if sr["attribute_tested"] == "employment_gap_months"
                else None,
                shadow_decision=sr["shadow_decision"],
                decision_diverged=sr["decision_diverged"],
                divergence_confidence=sr.get("divergence_confidence", 0.0),
            )
        )

    response = EvaluateResponse(
        decision_id=decision_id,
        evaluation_complete=result["evaluation_complete"],
        processing_time_ms=result["processing_time_ms"],
        bias_detected=result["bias_detected"],
        bias_severity_score=result["bias_severity_score"],
        severity_label=result["severity_label"],
        primary_causal_attribute=result["primary_causal_attribute"],
        secondary_causal_attribute=result.get("secondary_causal_attribute"),
        shadow_results=shadow_results,
        bias_explanation=result["bias_explanation"],
        recommended_action=result["recommended_action"],
        audit_log_id=f"audit_{decision_id}",
        timestamp=timestamp,
    )

    # Write to Firestore
    decision_data = {
        "decision_id": decision_id,
        "organization_id": org_id,
        "user_uid": user_uid,
        "decision_category": payload.decision_category,
        "applicant_name_hashed": _hash_name(input_dict.get("applicant_name", "unknown")),
        "original_decision": payload.original_decision.model_dump()
        if payload.original_decision
        else None,
        "bias_detected": result["bias_detected"],
        "bias_severity_score": result["bias_severity_score"],
        "severity_label": result["severity_label"],
        "primary_causal_attribute": result["primary_causal_attribute"],
        "secondary_causal_attribute": result.get("secondary_causal_attribute"),
        "timestamp": timestamp,
    }
    db = get_db()
    if db:
        db.collection("decisions").document(decision_id).set(decision_data)

    audit_data = {
        "decision_id": decision_id,
        "organization_id": org_id,
        "user_uid": user_uid,
        "shadow_inputs": result.get("shadow_variants_generated", []),
        "attributes_extracted": result.get("attributes_extracted", {}),
        "shadow_results": [sr.model_dump() for sr in shadow_results],
        "bias_explanation": result["bias_explanation"],
        "recommended_action": result["recommended_action"],
        "timestamp": timestamp,
    }
    if db:
        db.collection("audit_logs").document(f"audit_{decision_id}").set(audit_data)

    # Write to Realtime DB for live feed
    rdb = get_realtime_db()
    if rdb:
        rdb.reference(f"live_feed/{org_id}/{decision_id}").set(
            {
                "decision_id": decision_id,
                "applicant_name": input_dict.get("applicant_name", "Unknown"),
                "decision_category": payload.decision_category,
                "bias_severity_score": result["bias_severity_score"],
                "severity_label": result["severity_label"],
                "timestamp": datetime.now(timezone.utc).timestamp(),
            }
        )

    return response
