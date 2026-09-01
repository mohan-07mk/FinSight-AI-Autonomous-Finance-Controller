"""
FinSight AI — Dashboard, Insights, Forecast, Audit API Routes
"""
from fastapi import APIRouter, HTTPException
from app.schemas.schemas import APIResponse
from app.services.dashboard_service import get_dashboard_data
from app.services.insight_service import generate_insights
from app.services.forecast_service import generate_forecast
from app.services.audit_service import get_all_audits, get_audit_by_id
from app.models import store

dashboard_router = APIRouter(prefix="/api/dashboard", tags=["Dashboard"])
insights_router = APIRouter(prefix="/api/insights", tags=["Insights"])
forecast_router = APIRouter(prefix="/api/forecast", tags=["Forecast"])
audit_router = APIRouter(prefix="/api/audit", tags=["Audit"])


# ── Dashboard ──────────────────────────────────────────────────────────

@dashboard_router.get("/overview", response_model=APIResponse)
async def dashboard_overview():
    data = get_dashboard_data()
    return APIResponse(success=True, message="Dashboard data.", data=data)


# ── Insights ───────────────────────────────────────────────────────────

@insights_router.get("", response_model=APIResponse)
async def get_insights():
    insights = generate_insights()
    return APIResponse(success=True, message=f"{len(insights)} insights.", data=insights)


# ── Forecast ───────────────────────────────────────────────────────────

@forecast_router.get("", response_model=APIResponse)
async def get_forecast():
    data = generate_forecast()
    return APIResponse(success=True, message="Forecast generated.", data=data)


# ── Audit Trail ────────────────────────────────────────────────────────

@audit_router.get("", response_model=APIResponse)
async def list_audits():
    audits = get_all_audits()
    return APIResponse(success=True, message=f"{len(audits)} audit records.", data=audits)


@audit_router.get("/{audit_id}", response_model=APIResponse)
async def get_audit_detail(audit_id: str):
    record = get_audit_by_id(audit_id)
    if not record:
        raise HTTPException(404, f"Audit record {audit_id} not found.")
    return APIResponse(success=True, message="OK", data=record)
