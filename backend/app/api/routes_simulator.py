"""
FinSight AI — What-If Cash Flow Simulator API Routes
POST /api/forecast/simulate
"""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from typing import Optional, Any

from app.schemas.schemas import APIResponse
from app.services.simulator_service import run_simulation

router = APIRouter(prefix="/api/forecast", tags=["Cash Forecast Simulator"])


class SimulateRequest(BaseModel):
    scenario_type: str = Field(..., description="Scenario type: payment_delay, invoice_delay, expense_increase, expense_decrease, custom_adjustment, transaction_delayed, exception_impact")
    amount: Optional[float] = Field(0.0, description="Financial amount involved")
    percentage: Optional[float] = Field(0.0, description="Percentage impact")
    delay_days: Optional[int] = Field(0, ge=0, le=365, description="Number of days delayed")
    record_id: Optional[str] = Field(None, description="Optional associated record ID")


@router.post("/simulate", response_model=APIResponse)
async def simulate_cash_flow(req: SimulateRequest):
    """
    Execute a read-only hypothetical cash flow simulation.
    All numerical calculations are deterministic. Database records are never modified.
    """
    try:
        res = run_simulation(
            scenario_type=req.scenario_type,
            amount=req.amount or 0.0,
            percentage=req.percentage or 0.0,
            delay_days=req.delay_days or 0,
            record_id=req.record_id
        )
        return APIResponse(
            success=True,
            message="What-If simulation calculated successfully.",
            data=res
        )
    except ValueError as ve:
        return APIResponse(
            success=False,
            message=str(ve)
        )
    except Exception as e:
        return APIResponse(
            success=False,
            message=f"Simulation error: {str(e)}"
        )
