"""
FinSight AI — Audit Repository
Persistence for immutable, append-only audit log records (Supabase + Store fallback).
"""
from typing import Dict, List, Optional
from app.repositories.base_repository import BaseRepository
from app.models import store


class AuditRepository(BaseRepository):
    def __init__(self):
        super().__init__("audit_logs")

    def create_audit_log(self, record: dict) -> dict:
        """Create append-only audit entry in Supabase and in-memory log."""
        aid = record.get("audit_id", "")
        store.audit_log.append(record)

        db_record = {
            "audit_id": aid,
            "timestamp": record.get("timestamp"),
            "transaction_id": record.get("transaction_id", ""),
            "exception_id": record.get("exception_id", ""),
            "event_type": record.get("event_type", ""),
            "original_data": {"data": record.get("original_data", "")},
            "match_analysis": {"analysis": record.get("match_analysis", "")},
            "evidence": {"evidence": record.get("evidence", "")},
            "confidence_score": float(record.get("confidence_score", 0)),
            "recommendation": record.get("ai_recommendation", ""),
            "decision_type": record.get("decision_type", ""),
            "final_action": record.get("final_action", ""),
            "actor": record.get("actor", "SYSTEM"),
        }

        self.insert_record(db_record)
        return record

    def get_all_audits(self) -> List[dict]:
        """Fetch all audit logs (newest first). No update/delete APIs exist."""
        db_data = self.fetch_all()
        if db_data:
            for r in db_data:
                aid = r.get("audit_id", "")
                if aid and not any(x.get("audit_id") == aid for x in store.audit_log):
                    store.audit_log.append({
                        "audit_id": aid,
                        "timestamp": r.get("timestamp", ""),
                        "transaction_id": r.get("transaction_id", ""),
                        "exception_id": r.get("exception_id", ""),
                        "event_type": r.get("event_type", ""),
                        "original_data": r.get("original_data", {}).get("data", ""),
                        "match_analysis": r.get("match_analysis", {}).get("analysis", ""),
                        "evidence": r.get("evidence", {}).get("evidence", ""),
                        "confidence_score": float(r.get("confidence_score", 0)),
                        "ai_recommendation": r.get("recommendation", ""),
                        "decision_type": r.get("decision_type", ""),
                        "final_action": r.get("final_action", ""),
                        "actor": r.get("actor", "SYSTEM"),
                    })
        return list(reversed(store.audit_log))

    def get_by_id(self, audit_id: str) -> Optional[dict]:
        """Fetch single audit log entry."""
        for rec in store.audit_log:
            if rec.get("audit_id") == audit_id:
                return rec
        return None


audit_repo = AuditRepository()
