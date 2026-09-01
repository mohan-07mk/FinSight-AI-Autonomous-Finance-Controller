"""
FinSight AI — AI Intelligence API Routes
Endpoints for exception analysis, AI insights, and AI service status.
"""
from fastapi import APIRouter, HTTPException

from app.schemas.schemas import APIResponse, AuditEventType
from app.models import store
from app.repositories.exception_repository import exception_repo
from app.repositories.reconciliation_repository import reconciliation_repo
from app.repositories.insight_repository import insight_repo
from app.services.ai_service import (
    get_ai_status, is_ai_available, analyse_exception, generate_ai_insights,
)
from app.services.audit_service import create_audit_entry
from app.utils.helpers import utc_now

router = APIRouter(prefix="/api/ai", tags=["AI Intelligence"])


# ── AI Status ─────────────────────────────────────────────────────────────

@router.get("/status", response_model=APIResponse)
async def ai_status():
    """Return AI service status. Never exposes API keys."""
    status = get_ai_status()
    return APIResponse(
        success=True,
        message="AI service status retrieved.",
        data=status,
    )


# ── Analyse Single Exception ─────────────────────────────────────────────

@router.post("/analyze-exception/{exception_id}", response_model=APIResponse)
async def analyze_exception_endpoint(exception_id: str):
    """
    Analyse a specific exception using Gemini AI.
    Returns structured investigation report.
    """
    # Fetch exception data
    exc = exception_repo.get_by_id(exception_id)
    if not exc:
        raise HTTPException(404, f"Exception {exception_id} not found.")

    # Enrich with reconciliation context if available
    txn_id = exc.get("transaction_id", "")
    recon = reconciliation_repo.get_by_transaction_id(txn_id) if txn_id else None
    if recon:
        exc["recon_context"] = {
            "vendor_similarity": recon.get("vendor_similarity", 0),
            "amount_similarity": recon.get("amount_similarity", 0),
            "date_similarity": recon.get("date_similarity", 0),
            "reference_similarity": recon.get("reference_similarity", 0),
            "amount_difference": recon.get("amount_difference", 0),
            "date_difference_days": recon.get("date_difference_days", -1),
            "bank_amount": recon.get("bank_amount", 0),
            "invoice_amount": recon.get("invoice_amount"),
            "ledger_amount": recon.get("ledger_amount"),
        }

    # Run AI analysis
    analysis = analyse_exception(exc)

    # Save AI insight to Supabase
    insight_id = store.next_id("insight")
    insight_record = {
        "insight_id": insight_id,
        "title": f"AI Analysis: {exc.get('exception_type', 'Exception')} — {exc.get('vendor', 'Unknown')}",
        "description": analysis.get("summary", ""),
        "evidence": "; ".join(analysis.get("reasoning", [])),
        "possible_root_cause": analysis.get("probable_root_cause", ""),
        "confidence": round(analysis.get("ai_confidence", 0) * 100, 1),
        "severity": analysis.get("risk_level", "medium"),
        "recommendation": analysis.get("recommended_action", ""),
    }
    insight_repo.save_insights([insight_record])

    # Create audit record
    create_audit_entry(
        event_type=AuditEventType.INSIGHT_GENERATED,
        transaction_id=txn_id,
        exception_id=exception_id,
        original_data=exc.get("description", ""),
        evidence="; ".join(analysis.get("reasoning", [])),
        confidence_score=exc.get("confidence_score", 0),
        ai_recommendation=analysis.get("recommended_action", ""),
        decision_type="AI_ANALYSIS_GENERATED",
        final_action=f"AI model: {analysis.get('ai_model', 'unknown')}",
        actor="AI_CONTROLLER",
    )

    # Build investigation report (the main unique feature)
    investigation_report = {
        "exception_id": exception_id,
        "what_happened": analysis.get("summary", ""),
        "why_flagged": exc.get("description", ""),
        "evidence_analysed": analysis.get("reasoning", []),
        "probable_root_cause": analysis.get("probable_root_cause", ""),
        "financial_risk": analysis.get("risk_level", "medium"),
        "ai_recommendation": analysis.get("recommended_action", ""),
        "ai_decision_recommendation": analysis.get("ai_recommendation", "INVESTIGATE_FURTHER"),
        "next_investigation_step": analysis.get("next_investigation_step", ""),
        "requires_human_review": analysis.get("requires_human_review", True),
        "ai_confidence": analysis.get("ai_confidence", 0),
        "ai_generated": analysis.get("ai_generated", False),
        "ai_model": analysis.get("ai_model", "fallback"),
        "insight_id": insight_id,
        "generated_at": utc_now(),
    }

    return APIResponse(
        success=True,
        message=f"AI investigation report generated for {exception_id}.",
        data=investigation_report,
    )


# ── AI Insights ───────────────────────────────────────────────────────────

@router.get("/insights", response_model=APIResponse)
async def get_ai_insights():
    """Return all stored AI insights."""
    insights = insight_repo.get_all_insights()
    return APIResponse(
        success=True,
        message=f"{len(insights)} AI insights.",
        data=insights,
    )


@router.post("/generate-insights", response_model=APIResponse)
async def generate_insights_endpoint():
    """
    Analyse all exceptions and reconciliation data to generate
    higher-level financial insights using AI.
    """
    exceptions = exception_repo.get_all_exceptions()
    recon_results = reconciliation_repo.get_all_results()

    if not exceptions and not recon_results:
        return APIResponse(
            success=True,
            message="No data available for insight generation.",
            data=[],
        )

    ai_insights = generate_ai_insights(exceptions, recon_results)

    # Save generated insights
    saved = []
    for ins in ai_insights:
        insight_id = store.next_id("insight")
        record = {
            "insight_id": insight_id,
            "title": ins.get("title", "AI Insight"),
            "description": ins.get("description", ""),
            "evidence": ins.get("evidence", ""),
            "possible_root_cause": ins.get("probable_root_cause", ""),
            "confidence": 75.0,  # Default confidence for batch insights
            "severity": ins.get("severity", "medium"),
            "recommendation": ins.get("recommendation", ""),
        }
        saved.append(record)

    if saved:
        insight_repo.save_insights(saved)

        # Create audit entry for batch insight generation
        create_audit_entry(
            event_type=AuditEventType.INSIGHT_GENERATED,
            original_data=f"{len(exceptions)} exceptions analysed",
            evidence=f"Generated {len(saved)} AI insights",
            confidence_score=0,
            ai_recommendation="Batch AI insight generation",
            decision_type="AI_INSIGHTS_GENERATED",
            final_action=f"{len(saved)} insights generated",
            actor="AI_CONTROLLER",
        )

    # If AI not available, note it in response
    if not is_ai_available():
        return APIResponse(
            success=True,
            message="AI analysis unavailable. Rule-based analysis remains available.",
            data=saved,
        )

    return APIResponse(
        success=True,
        message=f"{len(saved)} AI insights generated.",
        data=saved,
    )
