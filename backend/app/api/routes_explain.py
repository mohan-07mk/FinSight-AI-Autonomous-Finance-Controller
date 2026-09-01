"""
FinSight AI — Explainable AI API Routes
GET /api/ai/explain/{record_type}/{record_id}
"""
from fastapi import APIRouter, HTTPException, Path
from typing import Optional

from app.schemas.schemas import APIResponse
from app.services.explainability_service import get_ai_explanation

router = APIRouter(prefix="/api/ai/explain", tags=["Explainable AI"])


@router.get("/{record_type}/{record_id}", response_model=APIResponse)
async def explain_record(
    record_type: str = Path(..., description="Record type (exception, transaction, invoice, vendor, risk)"),
    record_id: str = Path(..., description="Target record ID")
):
    """
    Return evidence-based explanation for AI recommendations or risk flags.
    Never exposes internal system prompts or hidden chain-of-thought.
    """
    valid_types = {"exception", "transaction", "txn", "invoice", "inv", "vendor", "risk"}
    if record_type.lower() not in valid_types:
        return APIResponse(
            success=False,
            message=f"Invalid record_type. Must be one of: {valid_types}"
        )

    explanation = get_ai_explanation(record_type, record_id)
    return APIResponse(
        success=True,
        message=f"Generated evidence-based AI explanation for {record_type} '{record_id}'.",
        data=explanation
    )
