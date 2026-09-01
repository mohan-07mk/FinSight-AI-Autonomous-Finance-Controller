"""
FinSight AI — Cash Forecast Service
Deterministic cash projection using transaction data and repository persistence.
"""
from __future__ import annotations
from typing import List

from app.repositories.transaction_repository import transaction_repo
from app.repositories.forecast_repository import forecast_repo
from app.schemas.schemas import CashRisk


def generate_forecast() -> dict:
    """Build a 30-day cash forecast from available transaction data."""
    txns = transaction_repo.get_all_transactions()

    total_incoming = sum(float(t.get("amount", 0)) for t in txns
                         if t.get("type", "").lower() in ("credit", "receipt", "incoming"))
    total_outgoing = sum(float(t.get("amount", 0)) for t in txns
                         if t.get("type", "").lower() not in ("credit", "receipt", "incoming"))

    if total_incoming == 0 and total_outgoing == 0:
        total_outgoing = sum(float(t.get("amount", 0)) for t in txns)

    base_cash = 2_500_000
    current_position = base_cash

    num_days = max(len(txns), 7)
    avg_daily_out = total_outgoing / num_days if num_days > 0 else 20000
    avg_daily_in = total_incoming / num_days if num_days > 0 else avg_daily_out * 0.85

    daily_forecast = []
    min_balance = current_position
    min_balance_day = 0
    position = current_position

    for day_offset in range(-7, 31):
        if day_offset <= 0:
            actual = current_position + (day_offset * (avg_daily_in - avg_daily_out))
            daily_forecast.append({
                "day_offset": day_offset,
                "label": "Today" if day_offset == 0 else f"D{day_offset}",
                "actual": round(actual),
                "forecast": round(actual) if day_offset >= -1 else None,
            })
        else:
            spike = 0
            if day_offset == 19:
                spike = -avg_daily_out * 15
            elif 20 <= day_offset <= 23:
                spike = -avg_daily_out * 5

            position = current_position + day_offset * (avg_daily_in - avg_daily_out) + spike
            daily_forecast.append({
                "day_offset": day_offset,
                "label": f"D+{day_offset}",
                "actual": None,
                "forecast": round(position),
            })

            if position < min_balance:
                min_balance = position
                min_balance_day = day_offset

    projected_30 = current_position + 30 * (avg_daily_in - avg_daily_out)

    if min_balance < 0:
        risk = CashRisk.HIGH
        recommendation = ("Critical: Cash position projected to go negative. "
                          "Accelerate collections and defer non-essential payments immediately.")
    elif min_balance < current_position * 0.3:
        risk = CashRisk.MEDIUM
        recommendation = (f"Cash may drop to ₹{min_balance:,.0f} around day D+{min_balance_day}. "
                          "Prioritize overdue collections to maintain minimum cash threshold.")
    else:
        risk = CashRisk.LOW
        recommendation = "Cash position is healthy for the next 30 days. Continue normal operations."

    res = {
        "current_cash_position": round(current_position),
        "projected_30_day": round(projected_30),
        "lowest_expected_balance": round(min_balance),
        "lowest_balance_date": f"D+{min_balance_day}",
        "risk_level": risk.value,
        "recommendation": recommendation,
        "daily_forecast": daily_forecast,
    }

    forecast_repo.save_forecast(res)
    return res
