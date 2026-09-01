"""
FinSight AI — Copilot Service
Core AI Copilot logic: intent detection, data retrieval, Gemini integration.
READ-ONLY database access. Never modifies financial records.
"""
from __future__ import annotations
import json, logging, re, time, uuid
from typing import Any, Dict, List, Optional
from app.services.ai_service import _init_genai, _genai_client, _genai_available, _AI_MODEL, _parse_ai_json
from app.repositories.transaction_repository import transaction_repo
from app.repositories.invoice_repository import invoice_repo
from app.repositories.ledger_repository import ledger_repo
from app.repositories.exception_repository import exception_repo
from app.repositories.reconciliation_repository import reconciliation_repo
from app.repositories.audit_repository import audit_repo
from app.services.copilot_prompts import COPILOT_CHAT_PROMPT, COPILOT_RECORD_ANALYSIS_PROMPT, COPILOT_VENDOR_REPORT_PROMPT

logger = logging.getLogger("finsight.copilot")

# Session memory store (in-memory, per-session)
_sessions: Dict[str, Dict] = {}

INTENTS = [
    ("vendor_lookup", []),
    ("transaction_lookup", [r"TXN[\-_]?\w+"]),
    ("invoice_lookup", [r"INV[\-_]?\w+"]),
    ("ledger_lookup", [r"LED[\-_]?\w+"]),
    ("exception_lookup", [r"EXC[\-_]?\w+"]),
    ("audit_lookup", [r"AUD[\-_]?\w+"]),
    ("high_risk_summary", ["high.?risk", "critical", "dangerous"]),
    ("duplicate_payments", ["duplicate", "duplicat"]),
    ("amount_mismatches", ["amount.?mismatch", "amount.?diff"]),
    ("date_mismatches", ["date.?mismatch"]),
    ("vendor_mismatches", ["vendor.?mismatch"]),
    ("reconciliation_summary", ["reconcil", "match.?rate"]),
    ("dashboard_summary", ["dashboard", "summary", "overview"]),
    ("cash_forecast", ["cash", "forecast", "project"]),
    ("exception_prioritization", ["prioriti", "investigate.?first", "urgent"]),
]

def _get_session(session_id: str) -> Dict:
    if session_id not in _sessions:
        _sessions[session_id] = {"id": session_id, "history": [], "created": time.time()}
    return _sessions[session_id]

def clear_session(session_id: str):
    _sessions.pop(session_id, None)

def get_copilot_status() -> Dict[str, Any]:
    _init_genai()
    return {"copilot_available": True, "ai_available": _genai_available, "model": _AI_MODEL}

def _detect_intent(question: str) -> tuple:
    q = question.strip()
    ql = q.lower()
    # Check for record ID patterns
    for prefix, patt in [("transaction_lookup", r"(TXN[\-_]?\w+)"), ("invoice_lookup", r"(INV[\-_]?\w+)"),
                          ("ledger_lookup", r"(LED[\-_]?\w+)"), ("exception_lookup", r"(EXC[\-_]?\w+)"),
                          ("audit_lookup", r"(AUD[\-_]?\w+)")]:
        m = re.search(patt, q, re.IGNORECASE)
        if m:
            return prefix, m.group(1).upper()
    # Keyword intents
    for intent, patterns in INTENTS[6:]:  # skip lookup intents
        for p in patterns:
            if re.search(p, ql):
                return intent, None
    # Smart name detection: if short text with no question words, likely vendor
    question_words = {"what","how","why","when","where","which","show","list","give","tell","explain","analyze","get"}
    words = ql.split()
    if len(words) <= 6 and not any(w in question_words for w in words):
        return "vendor_lookup", q
    return "general_finance_question", None

def _normalize(name: str) -> str:
    return re.sub(r"[^a-z0-9]", "", name.lower())

def _search_vendor(name: str) -> Dict[str, Any]:
    norm = _normalize(name)
    txns = transaction_repo.get_all_transactions()
    invs = invoice_repo.get_all_invoices()
    ledgers = ledger_repo.get_all_ledger_entries()
    exceptions_list = exception_repo.get_all_exceptions()
    recon = reconciliation_repo.get_all_results()

    def match_vendor(record, fields=("vendor_name","vendor","vendor_name_normalized","normalized_vendor_name")):
        for f in fields:
            v = record.get(f, "")
            if v and (_normalize(v) == norm or norm in _normalize(v) or _normalize(v) in norm):
                return True
        return False

    v_txns = [t for t in txns if match_vendor(t)]
    v_invs = [i for i in invs if match_vendor(i)]
    v_leds = [l for l in ledgers if match_vendor(l)]
    v_excs = [e for e in exceptions_list if match_vendor(e)]
    v_recon = [r for r in recon if match_vendor(r)]
    return {"transactions": v_txns, "invoices": v_invs, "ledger_entries": v_leds,
            "exceptions": v_excs, "reconciliation": v_recon, "name": name}

def _build_vendor_report(name: str) -> Dict[str, Any]:
    data = _search_vendor(name)
    txns, invs, leds, excs = data["transactions"], data["invoices"], data["ledger_entries"], data["exceptions"]
    recon = data["reconciliation"]
    if not txns and not invs and not leds and not excs:
        return None
    # Deterministic calculations
    total_txn_amt = sum(float(t.get("amount", 0)) for t in txns)
    total_inv_amt = sum(float(i.get("amount", 0)) for i in invs)
    total_led_amt = sum(float(l.get("amount", 0)) for l in leds)
    high_risk_excs = [e for e in excs if e.get("risk_level") == "high"]
    matched = [r for r in recon if r.get("status") == "Matched"]
    partial = [r for r in recon if r.get("status") == "Partial Match"]
    unmatched = [r for r in recon if r.get("status") in ("Unmatched", "AI Review")]
    dates = []
    for t in txns:
        d = t.get("date", "")
        if d: dates.append(d)
    report = {
        "vendor_overview": {"name": name, "first_transaction": dates[0] if dates else "N/A", "latest_transaction": dates[-1] if dates else "N/A"},
        "financial_summary": {"total_transactions": len(txns), "total_transaction_amount": round(total_txn_amt, 2),
                              "total_invoices": len(invs), "total_invoice_amount": round(total_inv_amt, 2),
                              "total_ledger_entries": len(leds), "total_ledger_amount": round(total_led_amt, 2)},
        "reconciliation_summary": {"matched": len(matched), "partial_matches": len(partial), "unmatched": len(unmatched)},
        "exception_summary": {"total_exceptions": len(excs), "high_risk": len(high_risk_excs),
                              "exception_types": list(set(e.get("exception_type","") for e in excs))},
        "source": "database"
    }
    # Get AI analysis if available
    _init_genai()
    if _genai_available:
        try:
            from google.genai import types
            resp = _genai_client.models.generate_content(
                model=_AI_MODEL, contents=COPILOT_VENDOR_REPORT_PROMPT.format(vendor_data=json.dumps(report, default=str)),
                config=types.GenerateContentConfig(temperature=0.2, max_output_tokens=1024))
            parsed = _parse_ai_json(resp.text if resp and resp.text else "")
            if parsed:
                report["ai_analysis"] = {
                    "risk_assessment": parsed.get("risk_assessment", "medium"),
                    "risk_explanation": parsed.get("risk_explanation", ""),
                    "pattern_analysis": parsed.get("pattern_analysis", []),
                    "ai_recommendation": parsed.get("ai_recommendation", ""),
                    "vendor_summary": parsed.get("vendor_summary", ""),
                    "ai_confidence": min(1.0, max(0.0, float(parsed.get("ai_confidence", 0.7)))),
                    "requires_human_review": parsed.get("requires_human_review", True),
                }
        except Exception as e:
            logger.warning(f"Vendor AI analysis failed: {str(e)[:100]}")
            report["ai_analysis"] = {"risk_assessment": "medium", "ai_confidence": 0.0, "ai_recommendation": "Review manually", "error": "AI analysis unavailable"}
    return report

def _fetch_context_for_intent(intent: str, entity_id: str = None) -> tuple:
    """Fetch database context based on detected intent. Returns (context_str, facts_list)."""
    facts = []
    ctx_lines = []
    try:
        if intent == "transaction_lookup" and entity_id:
            txns = transaction_repo.get_all_transactions()
            txn = next((t for t in txns if t.get("transaction_id","").upper() == entity_id.upper()), None)
            if txn:
                ctx_lines.append(f"Transaction: {json.dumps(txn, default=str)}")
                facts.append({"label": "Transaction ID", "value": entity_id, "source": "database"})
            else:
                ctx_lines.append(f"Transaction {entity_id} not found in database.")
        elif intent == "invoice_lookup" and entity_id:
            invs = invoice_repo.get_all_invoices()
            inv = next((i for i in invs if i.get("invoice_id","").upper() == entity_id.upper()), None)
            if inv:
                ctx_lines.append(f"Invoice: {json.dumps(inv, default=str)}")
                facts.append({"label": "Invoice ID", "value": entity_id, "source": "database"})
            else:
                ctx_lines.append(f"Invoice {entity_id} not found.")
        elif intent == "ledger_lookup" and entity_id:
            leds = ledger_repo.get_all_ledger_entries()
            led = next((l for l in leds if l.get("ledger_id","").upper() == entity_id.upper()), None)
            if led:
                ctx_lines.append(f"Ledger: {json.dumps(led, default=str)}")
                facts.append({"label": "Ledger ID", "value": entity_id, "source": "database"})
            else:
                ctx_lines.append(f"Ledger entry {entity_id} not found.")
        elif intent == "exception_lookup" and entity_id:
            exc = exception_repo.get_by_id(entity_id)
            if not exc:
                excs = exception_repo.get_all_exceptions()
                exc = next((e for e in excs if e.get("exception_id","").upper() == entity_id.upper()), None)
            if exc:
                ctx_lines.append(f"Exception: {json.dumps(exc, default=str)}")
                facts.append({"label": "Exception ID", "value": entity_id, "source": "database"})
            else:
                ctx_lines.append(f"Exception {entity_id} not found.")
        elif intent == "high_risk_summary":
            excs = exception_repo.get_all_exceptions()
            high = [e for e in excs if e.get("risk_level") == "high"]
            facts.append({"label": "Total Exceptions", "value": str(len(excs)), "source": "database"})
            facts.append({"label": "High Risk Exceptions", "value": str(len(high)), "source": "database"})
            ctx_lines.append(f"Total exceptions: {len(excs)}, High risk: {len(high)}")
            for e in high[:5]:
                ctx_lines.append(f"- {e.get('exception_id','')}: {e.get('exception_type','')} | {e.get('vendor','')} | Amount: {e.get('amount',0)} | Risk: {e.get('risk_level','')}")
        elif intent == "duplicate_payments":
            excs = exception_repo.get_all_exceptions()
            dups = [e for e in excs if "duplicate" in e.get("exception_type","").lower()]
            facts.append({"label": "Duplicate Payment Exceptions", "value": str(len(dups)), "source": "database"})
            ctx_lines.append(f"Duplicate payment exceptions found: {len(dups)}")
            for d in dups[:5]:
                ctx_lines.append(f"- {d.get('exception_id','')}: {d.get('vendor','')} | Amount: {d.get('amount',0)}")
        elif intent == "amount_mismatches":
            excs = exception_repo.get_all_exceptions()
            mis = [e for e in excs if "amount" in e.get("exception_type","").lower() or "mismatch" in e.get("exception_type","").lower()]
            facts.append({"label": "Amount Mismatch Exceptions", "value": str(len(mis)), "source": "database"})
            ctx_lines.append(f"Amount mismatch exceptions: {len(mis)}")
            for m in mis[:5]:
                ctx_lines.append(f"- {m.get('exception_id','')}: {m.get('vendor','')} | Amount: {m.get('amount',0)}")
        elif intent == "reconciliation_summary":
            recon = reconciliation_repo.get_all_results()
            total = len(recon)
            matched = sum(1 for r in recon if r.get("status") == "Matched")
            rate = round(matched/total*100, 1) if total else 0
            facts.append({"label": "Total Records", "value": str(total), "source": "database"})
            facts.append({"label": "Matched", "value": str(matched), "source": "database"})
            facts.append({"label": "Match Rate", "value": f"{rate}%", "source": "database"})
            ctx_lines.append(f"Reconciliation: {total} total, {matched} matched, rate {rate}%")
        elif intent == "dashboard_summary":
            txns = transaction_repo.get_all_transactions()
            excs = exception_repo.get_all_exceptions()
            recon = reconciliation_repo.get_all_results()
            facts.append({"label": "Total Transactions", "value": str(len(txns)), "source": "database"})
            facts.append({"label": "Total Exceptions", "value": str(len(excs)), "source": "database"})
            ctx_lines.append(f"Transactions: {len(txns)}, Exceptions: {len(excs)}, Recon results: {len(recon)}")
        elif intent == "cash_forecast":
            txns = transaction_repo.get_all_transactions()
            total = sum(float(t.get("amount",0)) for t in txns)
            facts.append({"label": "Total Transaction Value", "value": f"₹{total:,.2f}", "source": "database"})
            ctx_lines.append(f"Total transaction value: ₹{total:,.2f} across {len(txns)} transactions")
        elif intent == "exception_prioritization":
            excs = exception_repo.get_all_exceptions()
            sorted_excs = sorted(excs, key=lambda e: ({"high":3,"medium":2,"low":1}.get(e.get("risk_level","medium"),2), -float(e.get("amount",0))), reverse=True)
            ctx_lines.append(f"Prioritized exceptions (highest risk first):")
            for e in sorted_excs[:5]:
                ctx_lines.append(f"- {e.get('exception_id','')}: {e.get('exception_type','')} | {e.get('vendor','')} | ₹{e.get('amount',0)} | Risk: {e.get('risk_level','')}")
            facts.append({"label": "Total Exceptions", "value": str(len(excs)), "source": "database"})
        else:
            # General: provide aggregate context
            txns = transaction_repo.get_all_transactions()
            excs = exception_repo.get_all_exceptions()
            ctx_lines.append(f"System has {len(txns)} transactions, {len(excs)} exceptions.")
            facts.append({"label": "Transactions", "value": str(len(txns)), "source": "database"})
            facts.append({"label": "Exceptions", "value": str(len(excs)), "source": "database"})
    except Exception as e:
        logger.error(f"Context fetch error: {str(e)[:100]}")
        ctx_lines.append("Database query encountered an error.")
    return "\n".join(ctx_lines), facts

def chat(question: str, session_id: str = None) -> Dict[str, Any]:
    """Main copilot chat endpoint. Detects intent, fetches data, calls Gemini."""
    if not session_id:
        session_id = str(uuid.uuid4())
    session = _get_session(session_id)
    intent, entity_id = _detect_intent(question)

    # Vendor lookup
    if intent == "vendor_lookup":
        vendor_name = entity_id or question.strip()
        report = _build_vendor_report(vendor_name)
        if report:
            session["history"].append({"role": "user", "text": question})
            session["history"].append({"role": "ai", "text": f"Vendor 360° report for {vendor_name}", "intent": intent})
            if len(session["history"]) > 20:
                session["history"] = session["history"][-20:]
            return {"answer": f"Here is the Vendor 360° Intelligence Report for **{vendor_name}**.",
                    "summary": f"Vendor report for {vendor_name}",
                    "vendor_report": report, "intent": intent, "session_id": session_id,
                    "facts": [{"label":"Vendor","value":vendor_name,"source":"database"}],
                    "recommendations": [report.get("ai_analysis",{}).get("ai_recommendation","Review vendor profile")],
                    "ai_confidence": report.get("ai_analysis",{}).get("ai_confidence",0.7),
                    "requires_human_review": True, "related_records": [], "analysis": []}
        # Not found - fall through to general
        intent = "general_finance_question"

    # Fetch context
    context, facts = _fetch_context_for_intent(intent, entity_id)

    # Add conversation history for context
    history_ctx = ""
    if session["history"]:
        recent = session["history"][-6:]
        history_ctx = "\n\nRECENT CONVERSATION:\n" + "\n".join(f"{h['role']}: {h['text']}" for h in recent)

    # Call Gemini
    _init_genai()
    if _genai_available:
        try:
            from google.genai import types
            prompt = COPILOT_CHAT_PROMPT.format(question=question, context=context + history_ctx)
            resp = _genai_client.models.generate_content(
                model=_AI_MODEL, contents=prompt,
                config=types.GenerateContentConfig(temperature=0.3, max_output_tokens=1536))
            raw = resp.text if resp and resp.text else ""
            parsed = _parse_ai_json(raw)
            if parsed:
                result = {
                    "answer": str(parsed.get("answer", "I analyzed your query but couldn't generate a detailed response.")),
                    "summary": str(parsed.get("summary", "")),
                    "facts": parsed.get("facts", facts) or facts,
                    "analysis": parsed.get("analysis", []),
                    "recommendations": parsed.get("recommendations", []),
                    "related_records": parsed.get("related_records", []),
                    "requires_human_review": parsed.get("requires_human_review", False),
                    "ai_confidence": min(1.0, max(0.0, float(parsed.get("ai_confidence", 0.7)))),
                    "intent": intent, "session_id": session_id,
                }
                session["history"].append({"role": "user", "text": question})
                session["history"].append({"role": "ai", "text": result["summary"], "intent": intent})
                if len(session["history"]) > 20:
                    session["history"] = session["history"][-20:]
                return result
        except Exception as e:
            logger.error(f"Copilot Gemini error: {str(e)[:150]}")

    # Fallback: return database facts without AI
    session["history"].append({"role": "user", "text": question})
    session["history"].append({"role": "ai", "text": "Responded with database facts (AI unavailable)", "intent": intent})
    return {
        "answer": f"Here are the verified facts from your financial database:\n\n" + context if context else "I couldn't find relevant data for your query.",
        "summary": "Database facts returned (AI explanation unavailable)",
        "facts": facts, "analysis": [], "recommendations": [],
        "related_records": [], "requires_human_review": False,
        "ai_confidence": 0.0, "intent": intent, "session_id": session_id,
        "fallback": True, "fallback_reason": "AI Copilot is temporarily unavailable. Showing verified database facts only."
    }

def analyze_record(record_type: str, record_id: str) -> Dict[str, Any]:
    """Analyze a specific record with full context."""
    record = None
    related = []
    if record_type == "exception":
        record = exception_repo.get_by_id(record_id)
        if not record:
            excs = exception_repo.get_all_exceptions()
            record = next((e for e in excs if e.get("exception_id","").upper() == record_id.upper()), None)
    elif record_type == "transaction":
        txns = transaction_repo.get_all_transactions()
        record = next((t for t in txns if t.get("transaction_id","").upper() == record_id.upper()), None)
    elif record_type == "invoice":
        invs = invoice_repo.get_all_invoices()
        record = next((i for i in invs if i.get("invoice_id","").upper() == record_id.upper()), None)
    elif record_type == "ledger":
        leds = ledger_repo.get_all_ledger_entries()
        record = next((l for l in leds if l.get("ledger_id","").upper() == record_id.upper()), None)
    if not record:
        return {"error": f"{record_type} {record_id} not found", "answer": f"Record {record_id} was not found in the database."}

    # Fetch related records
    vendor = record.get("vendor", record.get("vendor_name", ""))
    if vendor:
        vendor_data = _search_vendor(vendor)
        related = [{"type": "transaction", "id": t.get("transaction_id","")} for t in vendor_data["transactions"][:3]]
        related += [{"type": "exception", "id": e.get("exception_id","")} for e in vendor_data["exceptions"][:3]]

    _init_genai()
    if _genai_available:
        try:
            from google.genai import types
            prompt = COPILOT_RECORD_ANALYSIS_PROMPT.format(
                record_data=json.dumps(record, default=str),
                related_data=json.dumps(related[:10], default=str))
            resp = _genai_client.models.generate_content(
                model=_AI_MODEL, contents=prompt,
                config=types.GenerateContentConfig(temperature=0.2, max_output_tokens=1536))
            parsed = _parse_ai_json(resp.text if resp and resp.text else "")
            if parsed:
                return {
                    "record_type": record_type, "record_id": record_id, "record": record,
                    "what_happened": parsed.get("what_happened", ""),
                    "record_summary": parsed.get("record_summary", ""),
                    "why_flagged": parsed.get("why_flagged", ""),
                    "evidence_analysed": parsed.get("evidence_analysed", []),
                    "probable_root_cause": parsed.get("probable_root_cause", ""),
                    "risk_level": parsed.get("risk_level", "medium"),
                    "risk_explanation": parsed.get("risk_explanation", ""),
                    "financial_impact": parsed.get("financial_impact", ""),
                    "pattern_detected": parsed.get("pattern_detected", ""),
                    "recommended_action": parsed.get("recommended_action", ""),
                    "next_investigation_step": parsed.get("next_investigation_step", ""),
                    "requires_human_review": parsed.get("requires_human_review", True),
                    "ai_confidence": min(1.0, max(0.0, float(parsed.get("ai_confidence", 0.7)))),
                    "confirmed_facts": parsed.get("confirmed_facts", []),
                    "ai_explanations": parsed.get("ai_explanations", []),
                    "related_records": related, "ai_generated": True,
                }
        except Exception as e:
            logger.error(f"Record analysis Gemini error: {str(e)[:150]}")

    # Fallback
    return {
        "record_type": record_type, "record_id": record_id, "record": record,
        "what_happened": f"Record {record_id} found in database.",
        "record_summary": json.dumps(record, default=str)[:200],
        "risk_level": record.get("risk_level", "medium"),
        "recommended_action": "Review record details manually.",
        "requires_human_review": True, "ai_confidence": 0.0,
        "related_records": related, "ai_generated": False,
        "confirmed_facts": [f"Record {record_id} exists in {record_type} table"],
        "ai_explanations": ["AI analysis unavailable - showing raw record data"],
    }

def get_suggestions() -> List[Dict[str, str]]:
    return [
        {"text": "What are my high-risk exceptions?", "category": "exceptions"},
        {"text": "Show duplicate payments", "category": "exceptions"},
        {"text": "Which vendor has the highest transaction amount?", "category": "vendors"},
        {"text": "Show amount mismatches", "category": "exceptions"},
        {"text": "What is the current reconciliation rate?", "category": "reconciliation"},
        {"text": "What should I investigate first?", "category": "priority"},
        {"text": "Give me a summary of today's financial issues", "category": "summary"},
        {"text": "Which vendors have recurring exceptions?", "category": "vendors"},
        {"text": "What is my projected cash position?", "category": "forecast"},
        {"text": "Explain the highest-risk transaction", "category": "exceptions"},
    ]
