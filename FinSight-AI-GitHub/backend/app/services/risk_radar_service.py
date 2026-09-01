"""
FinSight AI — AI Financial Risk Radar Service
Deterministic risk priority calculation & Gemini explainability for top financial risks.
"""
from __future__ import annotations
import json
import logging
from typing import List, Dict, Any, Optional

from app.repositories.exception_repository import exception_repo
from app.repositories.transaction_repository import transaction_repo
from app.repositories.invoice_repository import invoice_repo
from app.repositories.ledger_repository import ledger_repo
from app.repositories.audit_repository import audit_repo
from app.services.ai_service import _init_genai, _genai_client, _genai_available, _AI_MODEL, _parse_ai_json
from app.services.audit_service import create_audit_entry
from app.schemas.schemas import AuditEventType

logger = logging.getLogger("finsight.risk_radar")

RISK_RADAR_PROMPT = """You are FinSight AI Senior Financial Controller analyzing a prioritized financial risk item.

CRITICAL RULES:
- Base your analysis ONLY on the provided verified evidence.
- Never invent financial facts or numbers.
- Provide evidence-based reasoning.
- Be concise, actionable, and executive-focused.

VERIFIED RISK EVIDENCE:
{risk_evidence}

Respond ONLY with valid JSON (no markdown, no code blocks):
{{
  "ai_explanation": "Concise 1-2 sentence evidence-based explanation of why this risk was flagged",
  "recommended_action": "Specific recommended action for the finance controller",
  "next_step": "Exact next investigation step to take"
}}
"""


def _calculate_priority_score(record: Dict[str, Any], vendor_counts: Dict[str, int]) -> int:
    """
    Deterministic Risk Priority Score (0 - 100):
    - Base Severity Weight: High=40, Medium=25, Low=10
    - Financial Amount Weight: up to 30 points (based on amount scale relative to 100,000)
    - Recurrence Weight: up to 20 points (based on repeat vendor exceptions)
    - Unresolved Factor: 10 points if status is open/pending
    - Pattern Factor: 10 points for high-impact types (Duplicate Payment, Fraud, Amount Mismatch)
    """
    risk_level = str(record.get("risk_level", "medium")).lower()
    base_weight = 40 if risk_level == "high" or risk_level == "critical" else 25 if risk_level == "medium" else 10

    amount = float(record.get("amount", 0))
    amount_weight = min(30.0, (amount / 100000.0) * 30.0)

    vendor = str(record.get("vendor", record.get("vendor_name", ""))).lower()
    v_count = vendor_counts.get(vendor, 1)
    recurrence_weight = min(20.0, (v_count - 1) * 10.0)

    status = str(record.get("status", "OPEN")).upper()
    unresolved_factor = 10 if status in ("OPEN", "PENDING_APPROVAL", "ESCALATED") else 0

    exc_type = str(record.get("exception_type", "")).lower()
    pattern_factor = 10 if any(k in exc_type for k in ("duplicate", "fraud", "mismatch", "unmatched")) else 0

    total_score = base_weight + amount_weight + recurrence_weight + unresolved_factor + pattern_factor
    return int(min(100, max(1, round(total_score))))


def get_risk_radar(top_n: int = 3, risk_level_filter: Optional[str] = None, vendor_filter: Optional[str] = None) -> List[Dict[str, Any]]:
    """
    Fetch actual Supabase database data, calculate deterministic risk priority rankings,
    and enrich top N risks with Gemini AI explanations.
    """
    exceptions = exception_repo.get_all_exceptions()
    transactions = transaction_repo.get_all_transactions()
    invoices = invoice_repo.get_all_invoices()
    ledgers = ledger_repo.get_all_ledger_entries()

    # Vendor exception frequency map
    vendor_counts: Dict[str, int] = {}
    for exc in exceptions:
        v = str(exc.get("vendor", exc.get("vendor_name", ""))).lower()
        if v:
            vendor_counts[v] = vendor_counts.get(v, 0) + 1

    # Filter exceptions if requested
    candidates = exceptions.copy()
    if risk_level_filter:
        candidates = [c for c in candidates if str(c.get("risk_level", "")).lower() == risk_level_filter.lower()]
    if vendor_filter:
        vf = vendor_filter.lower()
        candidates = [c for c in candidates if vf in str(c.get("vendor", c.get("vendor_name", ""))).lower()]

    # If no exceptions in DB, construct candidate risks from transactions or invoices
    if not candidates:
        for t in transactions:
            if float(t.get("amount", 0)) > 50000 or t.get("status") != "Matched":
                candidates.append({
                    "id": t.get("transaction_id", "TXN-001"),
                    "exception_id": t.get("transaction_id", "TXN-001"),
                    "title": f"Unreconciled Transaction {t.get('transaction_id')}",
                    "exception_type": "Unmatched Transaction",
                    "risk_level": "medium",
                    "amount": float(t.get("amount", 0)),
                    "vendor": t.get("vendor_name", "Unknown Vendor"),
                    "status": "OPEN",
                    "evidence": f"Transaction of ₹{t.get('amount', 0)} requires matching"
                })

    # Calculate deterministic priority scores
    scored_items = []
    for exc in candidates:
        score = _calculate_priority_score(exc, vendor_counts)
        v_name = exc.get("vendor", exc.get("vendor_name", "Unknown Vendor"))
        r_level = str(exc.get("risk_level", "medium")).lower()
        if score >= 85 and r_level != "critical":
            r_level = "critical" if score >= 90 else "high"

        # Confirmed evidence array
        confirmed = []
        if exc.get("evidence"):
            confirmed.append(str(exc.get("evidence")))
        if exc.get("exception_type"):
            confirmed.append(f"Flagged as {exc.get('exception_type')}")
        confirmed.append(f"Amount at risk: ₹{float(exc.get('amount', 0)):,.2f}")
        v_freq = vendor_counts.get(str(v_name).lower(), 1)
        if v_freq > 1:
            confirmed.append(f"Vendor has {v_freq} total exception occurrences in ledger")

        scored_items.append({
            "raw": exc,
            "id": exc.get("id", exc.get("exception_id", "")),
            "exception_id": exc.get("exception_id", exc.get("id", "")),
            "title": exc.get("title", f"{exc.get('exception_type', 'Financial Risk')} - {v_name}"),
            "risk_level": r_level,
            "priority_score": score,
            "amount_at_risk": float(exc.get("amount", 0)),
            "affected_vendor": v_name,
            "related_records": [{"type": "exception", "id": exc.get("exception_id", exc.get("id", ""))}],
            "confirmed_evidence": confirmed,
            "risk_reason": f"Priority score {score}/100 calculated from severity, amount (₹{float(exc.get('amount', 0)):,.2f}), and vendor frequency.",
            "status": exc.get("status", "OPEN"),
            "requires_human_review": True
        })

    # Deterministic ranking by priority_score descending, then amount descending
    scored_items.sort(key=lambda x: (x["priority_score"], x["amount_at_risk"]), reverse=True)

    # Top N items
    top_items = scored_items[:top_n]

    # Enrich with Gemini AI explanations where available
    _init_genai()
    for idx, item in enumerate(top_items, start=1):
        item["priority_rank"] = idx

        # Default rule-based fallback explanation
        item["ai_explanation"] = f"Flagged as a top priority risk due to high financial impact (₹{item['amount_at_risk']:,.2f}) and exception patterns."
        item["recommended_action"] = "Investigate record immediately in Exception Intelligence and verify supporting invoices."
        item["next_step"] = f"Compare transaction details for {item['affected_vendor']} against bank statement."

        if _genai_available:
            try:
                from google.genai import types
                prompt = RISK_RADAR_PROMPT.format(risk_evidence=json.dumps({
                    "title": item["title"],
                    "risk_level": item["risk_level"],
                    "amount_at_risk": item["amount_at_risk"],
                    "affected_vendor": item["affected_vendor"],
                    "confirmed_evidence": item["confirmed_evidence"]
                }))
                resp = _genai_client.models.generate_content(
                    model=_AI_MODEL,
                    contents=prompt,
                    config=types.GenerateContentConfig(temperature=0.2, max_output_tokens=512)
                )
                parsed = _parse_ai_json(resp.text if resp and resp.text else "")
                if parsed:
                    if parsed.get("ai_explanation"):
                        item["ai_explanation"] = parsed["ai_explanation"]
                    if parsed.get("recommended_action"):
                        item["recommended_action"] = parsed["recommended_action"]
                    if parsed.get("next_step"):
                        item["next_step"] = parsed["next_step"]
            except Exception as e:
                logger.warning(f"Risk Radar Gemini enrichment error: {str(e)[:100]}")

    # Log Audit event
    try:
        create_audit_entry(
            event_type=AuditEventType.RISK_RADAR_GENERATED,
            original_data=f"Risk Radar top {len(top_items)} items requested",
            evidence=f"Top risk: {top_items[0]['title'] if top_items else 'None'}",
            confidence_score=95.0,
            ai_recommendation="Generated AI Financial Risk Radar rankings",
            decision_type="RISK_RADAR_ANALYSIS",
            final_action=f"Top {len(top_items)} priority risks calculated deterministically",
            actor="SYSTEM_RISK_RADAR"
        )
    except Exception as e:
        logger.warning(f"Audit log error for Risk Radar: {e}")

    return top_items
