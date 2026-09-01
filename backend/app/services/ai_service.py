"""
FinSight AI — Gemini AI Service
Modular AI intelligence layer for financial exception analysis and insight generation.
Loads configuration securely from environment variables. Never exposes API keys.
"""
from __future__ import annotations

import json
import logging
import os
import re
from pathlib import Path
from typing import Any, Dict, List, Optional

from dotenv import load_dotenv

from app.services.ai_prompts import EXCEPTION_ANALYSIS_PROMPT, BATCH_INSIGHTS_PROMPT

logger = logging.getLogger("finsight.ai")

# ── Load environment variables ────────────────────────────────────────────
env_path = Path(__file__).resolve().parent.parent.parent / ".env"
if env_path.exists():
    load_dotenv(dotenv_path=env_path)

# ── Configuration (from environment only) ─────────────────────────────────
_GEMINI_API_KEY: str = os.getenv("GEMINI_API_KEY", "")
_AI_MODEL: str = os.getenv("AI_MODEL", "gemini-3.6-flash")
_AI_API_ENABLED: bool = os.getenv("AI_API_ENABLED", "False").lower() in ("true", "1", "yes")
_AI_TIMEOUT: int = 30  # seconds

# ── Gemini client (lazy singleton) ────────────────────────────────────────
_genai_client = None
_genai_available = False


def _init_genai():
    """Lazily initialize the Google Generative AI client. Never exposes API key."""
    global _genai_client, _genai_available
    if _genai_client is not None:
        return

    if not _GEMINI_API_KEY:
        logger.warning("GEMINI_API_KEY not configured. AI features disabled.")
        _genai_available = False
        return

    if not _AI_API_ENABLED:
        logger.info("AI_API_ENABLED is False. AI features disabled.")
        _genai_available = False
        return

    try:
        from google import genai
        _genai_client = genai.Client(api_key=_GEMINI_API_KEY)
        _genai_available = True
        logger.info(f"Gemini AI client initialized (model: {_AI_MODEL}).")
    except ImportError:
        logger.error("google-genai package not installed. AI features disabled.")
        _genai_available = False
    except Exception as e:
        logger.error(f"Failed to initialize Gemini AI: {str(e)[:100]}")
        _genai_available = False


# ═══════════════════════════════════════════════════════════════════════════
#  PUBLIC API
# ═══════════════════════════════════════════════════════════════════════════

def get_ai_status() -> Dict[str, Any]:
    """Return AI service status (safe — never exposes secrets)."""
    _init_genai()
    return {
        "enabled": _AI_API_ENABLED,
        "available": _genai_available,
        "model": _AI_MODEL if _AI_API_ENABLED else "disabled",
    }


def is_ai_available() -> bool:
    """Check if AI service is ready to use."""
    _init_genai()
    return _genai_available


# ═══════════════════════════════════════════════════════════════════════════
#  EXCEPTION ANALYSIS
# ═══════════════════════════════════════════════════════════════════════════

def analyse_exception(exception_data: dict) -> Dict[str, Any]:
    """
    Analyse a financial exception using Gemini AI.
    Returns structured analysis or deterministic fallback.
    """
    _init_genai()

    if not _genai_available:
        return _fallback_analysis(exception_data)

    # Build financial context (only necessary structured data, no secrets)
    context = _build_exception_context(exception_data)
    prompt = EXCEPTION_ANALYSIS_PROMPT.format(context=context)

    try:
        from google.genai import types
        response = _genai_client.models.generate_content(
            model=_AI_MODEL,
            contents=prompt,
            config=types.GenerateContentConfig(
                temperature=0.2,
                max_output_tokens=2048,
            ),
        )

        raw_text = response.text if response and response.text else ""
        parsed = _parse_ai_json(raw_text)

        if parsed:
            return _validate_analysis(parsed, exception_data)
        else:
            logger.warning("AI returned malformed response. Using fallback.")
            return _fallback_analysis(exception_data)

    except Exception as e:
        logger.error(f"Gemini AI analysis failed: {str(e)[:150]}")
        return _fallback_analysis(exception_data)


# ═══════════════════════════════════════════════════════════════════════════
#  BATCH INSIGHT GENERATION
# ═══════════════════════════════════════════════════════════════════════════

def generate_ai_insights(exceptions: List[dict], recon_results: List[dict]) -> List[Dict[str, Any]]:
    """
    Analyse multiple exceptions and reconciliation data to generate
    higher-level financial insights using Gemini AI.
    Returns list of insight dicts or empty list on failure.
    """
    _init_genai()

    if not _genai_available:
        return []

    if not exceptions and not recon_results:
        return []

    context = _build_batch_context(exceptions, recon_results)
    prompt = BATCH_INSIGHTS_PROMPT.format(context=context)

    try:
        from google.genai import types
        response = _genai_client.models.generate_content(
            model=_AI_MODEL,
            contents=prompt,
            config=types.GenerateContentConfig(
                temperature=0.3,
                max_output_tokens=2048,
            ),
        )

        raw_text = response.text if response and response.text else ""
        parsed = _parse_ai_json(raw_text)

        if parsed and "insights" in parsed:
            return _validate_insights(parsed["insights"])
        else:
            logger.warning("AI batch insights returned malformed response.")
            return []

    except Exception as e:
        logger.error(f"Gemini AI batch insights failed: {str(e)[:150]}")
        return []


# ═══════════════════════════════════════════════════════════════════════════
#  CONTEXT BUILDERS (only structured financial data — never secrets)
# ═══════════════════════════════════════════════════════════════════════════

def _build_exception_context(exc: dict) -> str:
    """Build structured financial context for AI analysis."""
    lines = [
        f"Exception Type: {exc.get('exception_type', 'Unknown')}",
        f"Exception ID: {exc.get('exception_id', 'N/A')}",
        f"Transaction ID: {exc.get('transaction_id', 'N/A')}",
        f"Vendor: {exc.get('vendor', 'Unknown')}",
        f"Amount: {exc.get('amount', 0)}",
        f"Risk Level: {exc.get('risk_level', 'medium')}",
        f"Description: {exc.get('description', 'N/A')}",
        f"Current Status: {exc.get('status', 'OPEN')}",
        f"Confidence Score: {exc.get('confidence_score', 0)}",
        f"Decision Type: {exc.get('decision_type', 'N/A')}",
        f"Rule-Based Recommendation: {exc.get('recommended_action', 'N/A')}",
    ]

    evidence = exc.get("evidence", [])
    if evidence:
        lines.append(f"Evidence: {'; '.join(str(e) for e in evidence)}")

    # Include reconciliation context if available
    recon = exc.get("recon_context", {})
    if recon:
        lines.append(f"Vendor Similarity: {recon.get('vendor_similarity', 'N/A')}%")
        lines.append(f"Amount Similarity: {recon.get('amount_similarity', 'N/A')}%")
        lines.append(f"Date Similarity: {recon.get('date_similarity', 'N/A')}%")
        lines.append(f"Reference Similarity: {recon.get('reference_similarity', 'N/A')}%")
        lines.append(f"Amount Difference: {recon.get('amount_difference', 'N/A')}")
        lines.append(f"Date Difference (days): {recon.get('date_difference_days', 'N/A')}")
        lines.append(f"Bank Amount: {recon.get('bank_amount', 'N/A')}")
        lines.append(f"Invoice Amount: {recon.get('invoice_amount', 'N/A')}")
        lines.append(f"Ledger Amount: {recon.get('ledger_amount', 'N/A')}")

    return "\n".join(lines)


def _build_batch_context(exceptions: List[dict], recon_results: List[dict]) -> str:
    """Build aggregated context for batch insight generation."""
    lines = []

    # Summary statistics
    total_exc = len(exceptions)
    lines.append(f"Total Exceptions: {total_exc}")

    type_counts = {}
    risk_counts = {"high": 0, "medium": 0, "low": 0}
    vendor_counts = {}
    total_amount_at_risk = 0.0

    for e in exceptions:
        etype = e.get("exception_type", "Unknown")
        type_counts[etype] = type_counts.get(etype, 0) + 1

        risk = e.get("risk_level", "medium")
        risk_counts[risk] = risk_counts.get(risk, 0) + 1

        vendor = e.get("vendor", "Unknown")
        vendor_counts[vendor] = vendor_counts.get(vendor, 0) + 1

        total_amount_at_risk += float(e.get("amount", 0))

    lines.append(f"Total Amount at Risk: {total_amount_at_risk}")
    lines.append(f"Exception Types: {json.dumps(type_counts)}")
    lines.append(f"Risk Distribution: {json.dumps(risk_counts)}")
    lines.append(f"Vendor Distribution: {json.dumps(vendor_counts)}")

    # Reconciliation summary
    if recon_results:
        total_recon = len(recon_results)
        matched = sum(1 for r in recon_results if r.get("status") == "Matched")
        partial = sum(1 for r in recon_results if r.get("status") == "Partial Match")
        unmatched = sum(1 for r in recon_results if r.get("status") in ("Unmatched", "AI Review"))
        match_rate = round(matched / total_recon * 100, 1) if total_recon else 0

        lines.append(f"\nReconciliation Summary:")
        lines.append(f"Total Transactions: {total_recon}")
        lines.append(f"Matched: {matched} ({match_rate}%)")
        lines.append(f"Partial Match: {partial}")
        lines.append(f"Unmatched: {unmatched}")

    # Top exceptions detail (limit to 10 for token efficiency)
    lines.append("\nTop Exception Details:")
    for e in exceptions[:10]:
        lines.append(
            f"- [{e.get('exception_type', 'Unknown')}] {e.get('vendor', 'Unknown')} "
            f"| Amount: {e.get('amount', 0)} | Risk: {e.get('risk_level', 'medium')} "
            f"| Confidence: {e.get('confidence_score', 0)}"
        )

    return "\n".join(lines)


# ═══════════════════════════════════════════════════════════════════════════
#  RESPONSE PARSING & VALIDATION
# ═══════════════════════════════════════════════════════════════════════════

def _parse_ai_json(raw_text: str) -> Optional[dict]:
    """Safely parse JSON from AI response, handling markdown code blocks."""
    if not raw_text:
        return None

    text = raw_text.strip()

    # Remove markdown code blocks if present
    if text.startswith("```"):
        # Remove opening ```json or ``` line
        text = re.sub(r"^```(?:json)?\s*\n?", "", text)
        # Remove closing ``` line
        text = re.sub(r"\n?```\s*$", "", text)
        text = text.strip()

    # First attempt: parse the whole text as JSON
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        pass

    # Second attempt: find the outermost JSON object by brace counting
    start_idx = text.find("{")
    if start_idx != -1:
        depth = 0
        end_idx = start_idx
        in_string = False
        escape_next = False

        for i in range(start_idx, len(text)):
            ch = text[i]
            if escape_next:
                escape_next = False
                continue
            if ch == "\\":
                escape_next = True
                continue
            if ch == '"' and not escape_next:
                in_string = not in_string
                continue
            if in_string:
                continue
            if ch == "{":
                depth += 1
            elif ch == "}":
                depth -= 1
                if depth == 0:
                    end_idx = i
                    break

        if depth == 0:
            json_candidate = text[start_idx:end_idx + 1]
            try:
                return json.loads(json_candidate)
            except json.JSONDecodeError:
                pass

    logger.warning(f"Failed to parse AI JSON response: {text[:200]}")
    return None


def _validate_analysis(parsed: dict, original_exc: dict) -> Dict[str, Any]:
    """Validate and sanitize AI analysis response."""
    valid_risk = {"low", "medium", "high", "critical"}
    valid_recommendations = {
        "AUTO_RESOLVE_CANDIDATE", "APPROVE_RECOMMENDED", "REJECT_RECOMMENDED",
        "ESCALATE_RECOMMENDED", "INVESTIGATE_FURTHER",
    }

    risk = parsed.get("risk_level", "medium")
    if risk not in valid_risk:
        risk = "medium"

    ai_rec = parsed.get("ai_recommendation", "INVESTIGATE_FURTHER")
    if ai_rec not in valid_recommendations:
        ai_rec = "INVESTIGATE_FURTHER"

    ai_confidence = parsed.get("ai_confidence", 0.0)
    try:
        ai_confidence = float(ai_confidence)
        ai_confidence = max(0.0, min(1.0, ai_confidence))
    except (TypeError, ValueError):
        ai_confidence = 0.0

    reasoning = parsed.get("reasoning", [])
    if not isinstance(reasoning, list):
        reasoning = [str(reasoning)] if reasoning else []

    return {
        "summary": str(parsed.get("summary", "AI analysis completed.")),
        "probable_root_cause": str(parsed.get("probable_root_cause", "Unable to determine.")),
        "risk_level": risk,
        "reasoning": reasoning[:10],  # Cap at 10 points
        "recommended_action": str(parsed.get("recommended_action", original_exc.get("recommended_action", "Investigate further."))),
        "next_investigation_step": str(parsed.get("next_investigation_step", "Review transaction details manually.")),
        "requires_human_review": bool(parsed.get("requires_human_review", True)),
        "ai_confidence": round(ai_confidence, 2),
        "ai_recommendation": ai_rec,
        "ai_generated": True,
        "ai_model": _AI_MODEL,
    }


def _validate_insights(raw_insights: list) -> List[Dict[str, Any]]:
    """Validate and sanitize AI-generated insights."""
    valid = []
    valid_severity = {"low", "medium", "high"}

    for ins in raw_insights[:5]:  # Cap at 5
        if not isinstance(ins, dict):
            continue
        severity = ins.get("severity", "medium")
        if severity not in valid_severity:
            severity = "medium"

        valid.append({
            "title": str(ins.get("title", "Insight"))[:200],
            "description": str(ins.get("description", ""))[:500],
            "evidence": str(ins.get("evidence", ""))[:300],
            "probable_root_cause": str(ins.get("probable_root_cause", ""))[:300],
            "severity": severity,
            "recommendation": str(ins.get("recommendation", ""))[:300],
            "ai_generated": True,
        })

    return valid


# ═══════════════════════════════════════════════════════════════════════════
#  DETERMINISTIC FALLBACK
# ═══════════════════════════════════════════════════════════════════════════

def _fallback_analysis(exc: dict) -> Dict[str, Any]:
    """Generate a deterministic fallback analysis when AI is unavailable."""
    exc_type = exc.get("exception_type", "Unknown")
    vendor = exc.get("vendor", "Unknown")
    amount = exc.get("amount", 0)
    confidence = exc.get("confidence_score", 0)
    risk = exc.get("risk_level", "medium")

    # Type-specific fallback logic
    type_map = {
        "Duplicate Payment Suspected": {
            "summary": f"Potential duplicate payment of ₹{amount:,.0f} detected for vendor {vendor}.",
            "root_cause": "Multiple payments with similar vendor, amount, and timing indicators suggest possible duplicate processing.",
            "action": "Hold payment and verify against vendor ledger before release.",
            "step": "Cross-reference payment dates, amounts, and invoice numbers in the vendor ledger.",
        },
        "Amount Mismatch": {
            "summary": f"Amount difference detected between bank payment and invoice for vendor {vendor}.",
            "root_cause": "The difference may be due to taxes, fees, partial payment, credit notes, or data entry errors.",
            "action": "Review the invoice terms, tax calculations, and any applicable credit notes.",
            "step": "Check invoice line items, applicable GST/tax rates, and any outstanding debit/credit notes.",
        },
        "Partial Payment Detected": {
            "summary": f"Partial payment of ₹{amount:,.0f} detected against a higher invoice amount for vendor {vendor}.",
            "root_cause": "Payment amount is less than invoice total, suggesting scheduled partial payment or advance.",
            "action": "Verify if partial payment was pre-agreed and link payment to the relevant invoice.",
            "step": "Check payment terms and any instalment agreements with the vendor.",
        },
        "Date Mismatch": {
            "summary": f"Payment date and invoice date do not align for vendor {vendor}.",
            "root_cause": "Settlement processing delay, weekend/holiday timing, or bank posting delay.",
            "action": "Review settlement date and update reconciliation if delay is within normal parameters.",
            "step": "Check bank processing dates and vendor's payment terms for settlement windows.",
        },
        "Missing Invoice": {
            "summary": f"No matching invoice found for bank transaction of ₹{amount:,.0f} to vendor {vendor}.",
            "root_cause": "Invoice may not have been uploaded, or it may be filed under a different vendor name or reference.",
            "action": "Request invoice from vendor or search accounts payable system.",
            "step": "Search AP system by amount, date range, and vendor variations.",
        },
        "Unknown Vendor": {
            "summary": f"Payment of ₹{amount:,.0f} to unrecognized vendor {vendor}.",
            "root_cause": "Vendor may be new, have a different registered name, or this could be an unauthorized payment.",
            "action": "Escalate for manual review and verify vendor identity.",
            "step": "Check vendor master database and verify banking details against registration records.",
        },
    }

    fallback = type_map.get(exc_type, {
        "summary": f"Exception detected for vendor {vendor} — ₹{amount:,.0f}.",
        "root_cause": "Unable to determine root cause without AI analysis.",
        "action": exc.get("recommended_action", "Investigate further."),
        "step": "Review all transaction details and supporting documents manually.",
    })

    return {
        "summary": fallback["summary"],
        "probable_root_cause": fallback["root_cause"],
        "risk_level": risk,
        "reasoning": [
            f"Exception type: {exc_type}",
            f"Confidence score: {confidence}%",
            f"Risk level: {risk}",
            f"Vendor: {vendor}",
            f"Amount: ₹{amount:,.0f}",
        ],
        "recommended_action": fallback["action"],
        "next_investigation_step": fallback["step"],
        "requires_human_review": confidence < 95,
        "ai_confidence": 0.0,
        "ai_recommendation": "INVESTIGATE_FURTHER",
        "ai_generated": False,
        "ai_model": "fallback",
    }
