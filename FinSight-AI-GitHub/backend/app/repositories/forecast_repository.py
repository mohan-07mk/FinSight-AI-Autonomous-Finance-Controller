"""
FinSight AI — Cash Forecast Repository
Persistence for 30-day cash forecasts (Supabase + Store fallback).
"""
from typing import Dict, List, Optional
from app.repositories.base_repository import BaseRepository


class ForecastRepository(BaseRepository):
    def __init__(self):
        super().__init__("cash_forecasts")

    def save_forecast(self, forecast: dict) -> dict:
        """Save cash forecast summary to Supabase."""
        db_record = {
            "current_cash_position": float(forecast.get("current_cash_position", 0)),
            "expected_incoming": 0,
            "expected_outgoing": 0,
            "projected_cash_position": float(forecast.get("projected_30_day", 0)),
            "risk_level": forecast.get("risk_level", "low"),
            "recommendation": forecast.get("recommendation", ""),
        }
        self.insert_record(db_record)
        return forecast


forecast_repo = ForecastRepository()
