"""
FinSight AI — FastAPI Application Entry Point
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import CORS_ORIGINS
from app.schemas.schemas import APIResponse
from app.db.supabase_client import check_supabase_connection
from app.api.routes_upload import router as upload_router
from app.api.routes_reconciliation import router as recon_router
from app.api.routes_exceptions import router as exceptions_router
from app.api.routes_dashboard import (
    dashboard_router, insights_router, forecast_router, audit_router,
)
from app.api.routes_ai import router as ai_router
from app.api.routes_copilot import router as copilot_router
from app.api.routes_risk_radar import router as risk_radar_router
from app.api.routes_explain import router as explain_router
from app.api.routes_simulator import router as simulator_router

app = FastAPI(
    title="FinSight AI — Autonomous Finance Controller",
    description="AI-powered reconciliation, exception intelligence, and financial control.",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(upload_router)
app.include_router(recon_router)
app.include_router(exceptions_router)
app.include_router(dashboard_router)
app.include_router(insights_router)
app.include_router(forecast_router)
app.include_router(audit_router)
app.include_router(ai_router)
app.include_router(copilot_router)
app.include_router(risk_radar_router)
app.include_router(explain_router)
app.include_router(simulator_router)


@app.get("/health", response_model=APIResponse, tags=["Health"])
async def health():
    db_ok, db_msg = check_supabase_connection()
    return APIResponse(
        success=True,
        message="FinSight AI backend is running.",
        data={
            "status": "healthy",
            "version": "1.0.0",
            "database_status": "connected" if db_ok else "disconnected",
            "database_details": db_msg,
        },
    )
