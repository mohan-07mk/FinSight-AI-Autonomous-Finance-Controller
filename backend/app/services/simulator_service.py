"""
FinSight AI — What-If Cash Flow Simulator Service
Deterministic simulation of financial scenarios (delays, expense shifts, custom adjustments).
"""
from __future__ import annotations
import json
import logging
from typing import Dict, Any, List, Optional

from app.services.forecast_service import generate_forecast
from app.repositories.audit_repository import audit_repo
from app.services.audit_service import create_audit_entry
from app.schemas.schemas import AuditEventType
from app.services.ai_service import _init_genai, _genai_client, _genai_available, _AI_MODEL, _parse_ai_json

logger = logging.getLogger("finsight.simulator")

VALID_SCENARIOS = {
    "payment_delay", "invoice_delay", "expense_increase",
    "expense_decrease", "custom_adjustment", "transaction_delayed", "exception_impact"
}

SIMULATOR_PROMPT = """You are FinSight AI Senior Treasury Controller analyzing a simulated financial scenario.

CRITICAL RULES:
- Base your analysis ONLY on the provided calculated numerical figures.
- Do NOT alter any calculated numbers.
- Provide clear liquidity impact reasoning and actionable treasury recommendations.

SCENARIO CALCULATION RESULTS:
{scenario_results}

Respond ONLY with valid JSON (no markdown, no code blocks):
{{
  "ai_explanation": "Concise 1-2 sentence executive assessment of the scenario's liquidity impact",
  "recommendations": ["Recommendation 1", "Recommendation 2"]
}}
"""


def run_simulation(
    scenario_type: str,
    amount: float = 0.0,
    percentage: float = 0.0,
    delay_days: int = 0,
    record_id: Optional[str] = None
) -> Dict[str, Any]:
    """
    Run a deterministic what-if financial simulation without modifying database records.
    """
    st = str(scenario_type).lower().strip()
    if st not in VALID_SCENARIOS:
        raise ValueError(f"Invalid scenario_type '{scenario_type}'. Must be one of: {sorted(list(VALID_SCENARIOS))}")

    if amount < 0 and st not in ("custom_adjustment", "expense_decrease"):
        raise ValueError("Amount cannot be negative for this scenario type.")

    if percentage < 0:
        raise ValueError("Percentage cannot be negative.")

    if delay_days < 0 or delay_days > 365:
        raise ValueError("delay_days must be between 0 and 365.")

    # Fetch current baseline forecast deterministically
    base_fc = generate_forecast()
    current_cash = float(base_fc.get("current_cash_position", 2500000))
    proj_30 = float(base_fc.get("projected_30_day", current_cash))

    calculated_impact = 0.0
    affected_period = f"Next {delay_days or 30} Days"
    calc_details = []

    if st in ("payment_delay", "transaction_delayed"):
        calc_amount = amount if amount > 0 else 50000.0
        calculated_impact = -calc_amount
        calc_details.append(f"Payment of ₹{calc_amount:,.2f} delayed by {delay_days or 7} days")
        calc_details.append(f"Temporary working capital buffer reduced by ₹{calc_amount:,.2f}")
        affected_period = f"D+{delay_days or 7} to D+30"

    elif st in ("invoice_delay", "exception_impact"):
        calc_amount = amount if amount > 0 else 75000.0
        calculated_impact = -calc_amount
        calc_details.append(f"Invoice collection of ₹{calc_amount:,.2f} delayed by {delay_days or 14} days")
        calc_details.append(f"Inflow timing shift reduces cash balance by ₹{calc_amount:,.2f}")
        affected_period = f"D+{delay_days or 14} to D+30"

    elif st == "expense_increase":
        pct = percentage if percentage > 0 else 10.0
        base_exp = current_cash * 0.15
        calculated_impact = - (base_exp * (pct / 100.0)) if amount == 0 else -amount
        calc_details.append(f"Operating expenses increased by {pct}% (or ₹{abs(calculated_impact):,.2f})")
        calc_details.append(f"Net monthly cash outflow increased")

    elif st == "expense_decrease":
        pct = percentage if percentage > 0 else 10.0
        base_exp = current_cash * 0.15
        calculated_impact = (base_exp * (pct / 100.0)) if amount == 0 else abs(amount)
        calc_details.append(f"Operating expenses reduced by {pct}% (savings of ₹{calculated_impact:,.2f})")
        calc_details.append(f"Net monthly cash buffer improved")

    elif st == "custom_adjustment":
        calculated_impact = float(amount)
        calc_details.append(f"Custom manual cash adjustment applied: ₹{calculated_impact:,.2f}")

    # Calculate new projected position
    new_proj_30 = proj_30 + calculated_impact
    diff = new_proj_30 - proj_30
    pct_impact = (diff / proj_30 * 100.0) if proj_30 != 0 else 0.0

    # Risk level determination
    if new_proj_30 < 0:
        risk_level = "HIGH"
        risk_desc = "CRITICAL: Scenario causes negative projected cash balance!"
    elif new_proj_30 < current_cash * 0.3:
        risk_level = "MEDIUM"
        risk_desc = "WARNING: Cash buffer drops below 30% safety threshold."
    else:
        risk_level = "LOW"
        risk_desc = "STABLE: Cash position remains healthy after scenario adjustment."

    # Base rule-based explanation
    ai_explanation = f"Under this scenario ({st.replace('_', ' ').title()}), projected 30-day cash position changes by ₹{diff:,.2f} ({pct_impact:+.1f}%). {risk_desc}"
    recommendations = [
        "Monitor working capital buffer during affected period.",
        "Ensure credit lines remain available if timing shifts extend further."
    ]

    # Enrich with Gemini if available
    _init_genai()
    if _genai_available:
        try:
            from google.genai import types
            prompt = SIMULATOR_PROMPT.format(scenario_results=json.dumps({
                "scenario_type": st,
                "current_projected_cash": proj_30,
                "impact_amount": calculated_impact,
                "new_projected_cash": new_proj_30,
                "difference": diff,
                "percentage_impact": pct_impact,
                "risk_level": risk_level
            }))
            resp = _genai_client.models.generate_content(
                model=_AI_MODEL,
                contents=prompt,
                config=types.GenerateContentConfig(temperature=0.2, max_output_tokens=512)
            )
            parsed = _parse_ai_json(resp.text if resp and resp.text else "")
            if parsed:
                if parsed.get("ai_explanation"):
                    ai_explanation = parsed["ai_explanation"]
                if parsed.get("recommendations") and isinstance(parsed["recommendations"], list):
                    recommendations = parsed["recommendations"]
        except Exception as e:
            logger.warning(f"Simulator Gemini enrichment error: {str(e)[:100]}")

    result = {
        "is_hypothetical_simulation": True,
        "scenario": {
            "scenario_type": st,
            "amount": amount,
            "percentage": percentage,
            "delay_days": delay_days,
            "record_id": record_id
        },
        "current_forecast": {
            "current_cash_position": round(current_cash, 2),
            "projected_30_day": round(proj_30, 2),
            "risk_level": base_fc.get("risk_level", "LOW")
        },
        "scenario_forecast": {
            "new_projected_30_day": round(new_proj_30, 2),
            "lowest_expected_balance": round(base_fc.get("lowest_expected_balance", 0) + calculated_impact, 2)
        },
        "financial_impact": {
            "amount_impact": round(calculated_impact, 2),
            "difference": round(diff, 2),
            "percentage_impact": round(pct_impact, 2),
            "affected_period": affected_period
        },
        "risk_assessment": {
            "risk_level": risk_level,
            "risk_description": risk_desc
        },
        "confirmed_calculation_details": calc_details,
        "ai_explanation": ai_explanation,
        "recommendations": recommendations
    }

    # Write Audit trail event for simulation
    try:
        create_audit_entry(
            event_type=AuditEventType.WHAT_IF_SIMULATION_RUN,
            original_data=f"Hypothetical simulation run: {st}",
            evidence=f"Impact: ₹{calculated_impact:,.2f}, New Projected 30-Day: ₹{new_proj_30:,.2f}",
            confidence_score=100.0,
            ai_recommendation=ai_explanation,
            decision_type="HYPOTHETICAL_SIMULATION",
            final_action="Read-only simulation calculated deterministically. Database untouched.",
            actor="USER_OR_SYSTEM"
        )
    except Exception as e:
        logger.warning(f"Audit log error for What-If Simulator: {e}")

    return result
