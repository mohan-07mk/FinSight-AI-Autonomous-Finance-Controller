"""
FinSight AI — Risk Radar API Routes
GET /api/risk-radar
POST /api/risk-radar/analyze
"""
from fastapi import APIRouter, Query, HTTPException
from pydantic import BaseModel
from typing import Optional, List, Dict, Any

from app.schemas.schemas import APIResponse
from app.services.risk_radar_service import get_risk_radar

router = APIRouter(prefix="/api/risk-radar", tags=["Risk Radar"])


class AnalyzeRiskRequest(BaseModel):
    top_n: Optional[int] = 3
    risk_level: Optional[str] = None
    vendor: Optional[str] = None


@router.get("", response_model=APIResponse)
@router.get("/", response_model=APIResponse)
async def fetch_risk_radar(
    top_n: int = Query(3, ge=1, le=20),
    risk_level: Optional[str] = Query(None),
    vendor: Optional[str] = Query(None)
):
    """Return top prioritized financial risks calculated deterministically from database."""
    risks = get_risk_radar(top_n=top_n, risk_level_filter=risk_level, vendor_filter=vendor)
    return APIResponse(
        success=True,
        message=f"Retrieved top {len(risks)} priority financial risks.",
        data={"risks": risks, "total_returned": len(risks)}
    )


@router.post("/analyze", response_model=APIResponse)
async def analyze_risk_radar(req: AnalyzeRiskRequest):
    """Trigger deep analysis of financial risks with custom filter parameters."""
    top_n = req.top_n or 3
    risks = get_risk_radar(top_n=top_n, risk_level_filter=req.risk_level, vendor_filter=req.vendor)
    return APIResponse(
        success=True,
        message=f"Analyzed top {len(risks)} priority financial risks.",
        data={"risks": risks, "total_returned": len(risks)}
    )
