"""
FinSight AI — Audit Service
Immutable, append-only audit trail backed by repository persistence.
"""
from __future__ import annotations
from typing import List, Optional

from app.models import store
from app.repositories.audit_repository import audit_repo
from app.schemas.schemas import AuditEventType
from app.utils.helpers import utc_now


def create_audit_entry(
    event_type: AuditEventType,
    transaction_id: str = "",
    exception_id: str = "",
    original_data: str = "",
    match_analysis: str = "",
    evidence: str = "",
    confidence_score: float = 0.0,
    ai_recommendation: str = "",
    decision_type: str = "",
    final_action: str = "",
    actor: str = "SYSTEM",
) -> dict:
    """Create and store an audit record. Append-only."""
    record = {
        "audit_id": store.next_id("audit"),
        "timestamp": utc_now(),
        "transaction_id": transaction_id,
        "exception_id": exception_id,
        "event_type": event_type.value,
        "original_data": original_data,
        "match_analysis": match_analysis,
        "evidence": evidence,
        "confidence_score": confidence_score,
        "ai_recommendation": ai_recommendation,
        "decision_type": decision_type,
        "final_action": final_action,
        "actor": actor,
    }
    return audit_repo.create_audit_log(record)


def get_all_audits() -> List[dict]:
    """Return full audit trail (newest first)."""
    return audit_repo.get_all_audits()


def get_audit_by_id(audit_id: str) -> Optional[dict]:
    """Find a single audit record."""
    return audit_repo.get_by_id(audit_id)
