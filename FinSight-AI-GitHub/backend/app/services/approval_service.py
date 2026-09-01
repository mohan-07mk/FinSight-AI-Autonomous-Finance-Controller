"""
FinSight AI — Approval / Resolution Service
Handles approve, reject, escalate workflows with repository persistence.
"""
from __future__ import annotations

from app.models import store
from app.repositories.exception_repository import exception_repo
from app.schemas.schemas import ExceptionStatus, AuditEventType
from app.services.audit_service import create_audit_entry
from app.utils.helpers import utc_now


def approve_exception(exception_id: str, actor: str = "Finance Team", notes: str = "") -> dict:
    """Approve an AI-recommended resolution."""
    exc = exception_repo.get_by_id(exception_id)
    if not exc:
        raise ValueError(f"Exception {exception_id} not found.")
    if exc.get("status") in (ExceptionStatus.APPROVED.value, ExceptionStatus.AUTO_RESOLVED.value):
        raise ValueError(f"Exception {exception_id} is already resolved.")

    exception_repo.update_exception_status(exception_id, ExceptionStatus.APPROVED.value, actor)
    exc["resolved_at"] = utc_now()
    exc["resolved_by"] = actor

    create_audit_entry(
        event_type=AuditEventType.EXCEPTION_APPROVED,
        transaction_id=exc.get("transaction_id", ""),
        exception_id=exception_id,
        original_data=exc.get("description", ""),
        evidence=", ".join(exc.get("evidence", [])),
        confidence_score=exc.get("confidence_score", 0),
        ai_recommendation=exc.get("recommended_action", ""),
        decision_type="APPROVED",
        final_action=f"Approved by {actor}" + (f" — {notes}" if notes else ""),
        actor=actor,
    )
    return exc


def reject_exception(exception_id: str, actor: str = "Finance Team", notes: str = "") -> dict:
    """Reject an AI-recommended resolution."""
    exc = exception_repo.get_by_id(exception_id)
    if not exc:
        raise ValueError(f"Exception {exception_id} not found.")

    exception_repo.update_exception_status(exception_id, ExceptionStatus.REJECTED.value, actor)
    exc["resolved_at"] = utc_now()
    exc["resolved_by"] = actor

    create_audit_entry(
        event_type=AuditEventType.EXCEPTION_REJECTED,
        transaction_id=exc.get("transaction_id", ""),
        exception_id=exception_id,
        original_data=exc.get("description", ""),
        evidence=", ".join(exc.get("evidence", [])),
        confidence_score=exc.get("confidence_score", 0),
        ai_recommendation=exc.get("recommended_action", ""),
        decision_type="REJECTED",
        final_action=f"Rejected by {actor}" + (f" — {notes}" if notes else ""),
        actor=actor,
    )
    return exc


def escalate_exception(exception_id: str, actor: str = "Finance Team", notes: str = "") -> dict:
    """Escalate an exception for manual investigation."""
    exc = exception_repo.get_by_id(exception_id)
    if not exc:
        raise ValueError(f"Exception {exception_id} not found.")

    exception_repo.update_exception_status(exception_id, ExceptionStatus.ESCALATED.value, actor)
    exc["resolved_at"] = utc_now()
    exc["resolved_by"] = actor

    create_audit_entry(
        event_type=AuditEventType.EXCEPTION_ESCALATED,
        transaction_id=exc.get("transaction_id", ""),
        exception_id=exception_id,
        original_data=exc.get("description", ""),
        evidence=", ".join(exc.get("evidence", [])),
        confidence_score=exc.get("confidence_score", 0),
        ai_recommendation=exc.get("recommended_action", ""),
        decision_type="ESCALATED",
        final_action=f"Escalate by {actor}" + (f" — {notes}" if notes else ""),
        actor=actor,
    )
    return exc
