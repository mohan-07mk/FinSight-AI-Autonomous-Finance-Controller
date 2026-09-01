"""
FinSight AI — AI Insights Repository
Persistence for pattern insights and root cause discovery (Supabase + Store fallback).
"""
from typing import Dict, List, Optional
from app.repositories.base_repository import BaseRepository
from app.models import store


class InsightRepository(BaseRepository):
    def __init__(self):
        super().__init__("ai_insights")

    def save_insights(self, insights: List[dict]) -> int:
        """Save insights to Supabase and in-memory store."""
        store.insights = insights
        db_records = []
        for i in insights:
            record = {
                "insight_id": i.get("insight_id", ""),
                "title": i.get("title", ""),
                "description": i.get("description", ""),
                "evidence": i.get("evidence", ""),
                "possible_root_cause": i.get("possible_root_cause", ""),
                "confidence": float(i.get("confidence", 0)),
                "severity": i.get("severity", "medium"),
            }
            db_records.append(record)

        if db_records:
            self.bulk_insert_records(db_records)

        return len(insights)

    def get_all_insights(self) -> List[dict]:
        """Fetch insights from Supabase or store."""
        db_data = self.fetch_all()
        if db_data:
            synced = []
            for r in db_data:
                synced.append({
                    "insight_id": r.get("insight_id", ""),
                    "kind": "root-cause",
                    "title": r.get("title", ""),
                    "description": r.get("description", ""),
                    "evidence": r.get("evidence", ""),
                    "possible_root_cause": r.get("possible_root_cause", ""),
                    "confidence": float(r.get("confidence", 0)),
                    "severity": r.get("severity", "medium"),
                })
            if synced:
                store.insights = synced
        return store.insights


insight_repo = InsightRepository()
