"""
FinSight AI — Copilot API Routes
AI Financial Copilot endpoints: chat, analyze, vendor lookup, suggestions.
All operations are READ-ONLY. No database modifications.
"""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional

from app.schemas.schemas import APIResponse, AuditEventType
from app.services.copilot_service import (
    chat, analyze_record, get_copilot_status, get_suggestions, clear_session,
)
from app.services.audit_service import create_audit_entry

router = APIRouter(prefix="/api/copilot", tags=["AI Copilot"])


class ChatRequest(BaseModel):
    question: str
    session_id: Optional[str] = None


class AnalyzeRequest(BaseModel):
    record_type: str  # transaction, invoice, ledger, exception
    record_id: str


# ── Copilot Status ────────────────────────────────────────────────────

@router.get("/status", response_model=APIResponse)
async def copilot_status():
    """Return AI Copilot availability status."""
    return APIResponse(success=True, message="Copilot status retrieved.", data=get_copilot_status())


# ── Chat ──────────────────────────────────────────────────────────────

@router.post("/chat", response_model=APIResponse)
async def copilot_chat(req: ChatRequest):
    """Process a copilot chat message. Detects intent, fetches data, returns AI response."""
    if not req.question or not req.question.strip():
        return APIResponse(success=False, message="Question cannot be empty.")

    # Safety: reject overly long inputs
    if len(req.question) > 1000:
        return APIResponse(success=False, message="Question too long. Maximum 1000 characters.")

    result = chat(req.question, req.session_id)

    # Audit
    try:
        create_audit_entry(
            event_type=AuditEventType.INSIGHT_GENERATED,
            original_data=f"Copilot query: {req.question[:100]}",
            evidence=f"Intent: {result.get('intent', 'unknown')}",
            confidence_score=float(result.get("ai_confidence", 0)),
            ai_recommendation=result.get("summary", ""),
            decision_type="AI_COPILOT_QUERY",
            final_action="Copilot response generated",
            actor="AI_COPILOT",
        )
    except Exception:
        pass  # Don't fail the chat if audit fails

    return APIResponse(success=True, message="Copilot response generated.", data=result)


# ── Analyze Record ────────────────────────────────────────────────────

@router.post("/analyze-record", response_model=APIResponse)
async def copilot_analyze_record(req: AnalyzeRequest):
    """Analyze a specific financial record with full AI investigation."""
    valid_types = {"transaction", "invoice", "ledger", "exception"}
    if req.record_type not in valid_types:
        return APIResponse(success=False, message=f"Invalid record_type. Must be one of: {valid_types}")

    result = analyze_record(req.record_type, req.record_id)

    if "error" in result:
        raise HTTPException(404, result["error"])

    # Audit
    try:
        create_audit_entry(
            event_type=AuditEventType.INSIGHT_GENERATED,
            original_data=f"Record analysis: {req.record_type}/{req.record_id}",
            evidence=f"AI confidence: {result.get('ai_confidence', 0)}",
            confidence_score=float(result.get("ai_confidence", 0)),
            ai_recommendation=result.get("recommended_action", ""),
            decision_type="AI_RECORD_ANALYSIS",
            final_action=f"Analysis for {req.record_type} {req.record_id}",
            actor="AI_COPILOT",
        )
    except Exception:
        pass

    return APIResponse(success=True, message=f"Analysis generated for {req.record_id}.", data=result)


# ── Suggestions ───────────────────────────────────────────────────────

@router.get("/suggestions", response_model=APIResponse)
async def copilot_suggestions():
    """Return suggested questions for the chatbot."""
    return APIResponse(success=True, message="Suggestions retrieved.", data=get_suggestions())


# ── Clear Chat ────────────────────────────────────────────────────────

@router.post("/clear-chat", response_model=APIResponse)
async def copilot_clear_chat(session_id: str = ""):
    """Clear chat session memory."""
    if session_id:
        clear_session(session_id)
    return APIResponse(success=True, message="Chat session cleared.", data={"cleared": True})
