"""
FinSight AI — Dashboard Service
Computes overview metrics, finance control score, workflow summary with repository persistence.
"""
from __future__ import annotations
from typing import Dict, List, Any

from app.models import store
from app.repositories.reconciliation_repository import reconciliation_repo
from app.repositories.exception_repository import exception_repo
from app.repositories.transaction_repository import transaction_repo
from app.repositories.invoice_repository import invoice_repo
from app.repositories.ledger_repository import ledger_repo
from app.schemas.schemas import ExceptionStatus


def compute_finance_control_score() -> float:
    """
    Finance Control Score (0–100)
    Formula:
      base = 50
      + match_rate_bonus (0–25)
      − exception_penalty (0–20)
      − data_quality_penalty (0–5)
      + resolution_bonus (0–10)
    """
    recon = reconciliation_repo.get_all_results()
    exceptions = exception_repo.get_all_exceptions()

    base = 50.0

    if recon:
        matched = sum(1 for r in recon if r.get("status") == "Matched")
        match_rate = matched / len(recon)
        match_bonus = match_rate * 25
    else:
        match_bonus = 0

    open_excs = [e for e in exceptions if e.get("status") in
                 (ExceptionStatus.OPEN.value, ExceptionStatus.PENDING_APPROVAL.value)]
    high_risk = sum(1 for e in open_excs if e.get("risk_level") == "high")
    med_risk = sum(1 for e in open_excs if e.get("risk_level") == "medium")
    low_risk = sum(1 for e in open_excs if e.get("risk_level") == "low")
    exc_penalty = min(20, high_risk * 4 + med_risk * 2 + low_risk * 0.5)

    dq_penalty = 0
    if recon:
        matched = sum(1 for r in recon if r.get("status") == "Matched")
        if matched / len(recon) < 0.8:
            dq_penalty = 5

    resolved = sum(1 for e in exceptions if e.get("status") in
                   (ExceptionStatus.APPROVED.value, ExceptionStatus.AUTO_RESOLVED.value))
    total_exc = len(exceptions)
    resolution_bonus = (resolved / total_exc * 10) if total_exc > 0 else 5

    score = base + match_bonus - exc_penalty - dq_penalty + resolution_bonus
    return round(max(0, min(100, score)), 1)


def get_dashboard_data() -> dict:
    """Build full dashboard response matching frontend expectations."""
    recon = reconciliation_repo.get_all_results()
    exceptions = exception_repo.get_all_exceptions()
    bank_txns = transaction_repo.get_all_transactions()
    invoices = invoice_repo.get_all_invoices()
    ledger_entries = ledger_repo.get_all_ledger_entries()

    total_txn = len(recon)
    matched = sum(1 for r in recon if r.get("status") == "Matched")
    partial = sum(1 for r in recon if r.get("status") == "Partial Match")
    unmatched = sum(1 for r in recon if r.get("status") in ("Unmatched", "AI Review"))
    match_rate = round(matched / total_txn * 100, 1) if total_txn else 0

    open_excs = [e for e in exceptions if e.get("status") in
                 (ExceptionStatus.OPEN.value, ExceptionStatus.PENDING_APPROVAL.value)]
    high_count = sum(1 for e in open_excs if e.get("risk_level") == "high")
    med_count = sum(1 for e in open_excs if e.get("risk_level") == "medium")
    low_count = sum(1 for e in open_excs if e.get("risk_level") == "low")

    auto_resolved = sum(1 for e in exceptions
                        if e.get("status") == ExceptionStatus.AUTO_RESOLVED.value)
    awaiting = sum(1 for e in exceptions
                   if e.get("status") in (ExceptionStatus.OPEN.value, ExceptionStatus.PENDING_APPROVAL.value)
                   and e.get("decision_type") == "HUMAN_APPROVAL_REQUIRED")
    escalated = sum(1 for e in exceptions
                    if e.get("status") == ExceptionStatus.ESCALATED.value)
    human_review = sum(1 for e in exceptions
                       if e.get("status") == ExceptionStatus.APPROVED.value)

    priority_actions = []
    high_excs = [e for e in open_excs if e.get("risk_level") == "high"]
    if high_excs:
        e = high_excs[0]
        priority_actions.append({
            "id": "pa1", "level": "high",
            "title": f"₹{e.get('amount', 0):,.0f} {e.get('exception_type', 'exception')}",
            "sub": f"{e.get('vendor', '')} · {e.get('exception_id', '')}",
            "action": "Review",
        })
    med_excs = [e for e in open_excs if e.get("risk_level") == "medium"]
    if med_excs:
        e = med_excs[0]
        priority_actions.append({
            "id": "pa2", "level": "medium",
            "title": e.get("description", "Medium risk exception"),
            "sub": f"{e.get('vendor', '')} · ₹{e.get('amount', 0):,.0f}",
            "action": "Investigate",
        })
    resolvable = [e for e in open_excs if e.get("resolvable")]
    if resolvable:
        priority_actions.append({
            "id": "pa3", "level": "low",
            "title": f"{len(resolvable)} transaction(s) ready for auto-approval",
            "sub": "No conflicts detected across sources",
            "action": "Review All",
        })

    score = compute_finance_control_score()

    return {
        "finance_control_score": score,
        "finance_control_score_trend": 4.2,
        "reconciliation": {
            "total_transactions": total_txn,
            "matched": matched,
            "partial_match": partial,
            "unmatched": unmatched,
            "match_rate": match_rate,
        },
        "exceptions": {
            "total": len(open_excs),
            "high": high_count,
            "medium": med_count,
            "low": low_count,
        },
        "cash_position": 2_480_000,
        "ai_actions": {
            "total": len(exceptions),
            "auto_resolved": auto_resolved,
            "awaiting_approval": awaiting,
        },
        "priority_actions": priority_actions,
        "workflow_summary": {
            "data_sources": sum([
                1 if bank_txns else 0,
                1 if invoices else 0,
                1 if ledger_entries else 0,
            ]),
            "transactions_processed": len(bank_txns),
            "matched": matched,
            "exceptions_detected": len(exceptions),
            "ai_resolved": auto_resolved,
            "human_review": human_review,
            "escalated": escalated,
        },
        "recon_performance": [],
    }
