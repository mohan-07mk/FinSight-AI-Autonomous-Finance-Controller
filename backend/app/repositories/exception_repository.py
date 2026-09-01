"""
FinSight AI — Exception Repository
Persistence for exceptions and exception evidence (Supabase + Store fallback).
"""
from typing import Dict, List, Optional
from app.repositories.base_repository import BaseRepository
from app.models import store


class ExceptionRepository(BaseRepository):
    def __init__(self):
        super().__init__("exceptions")
        self.evidence_repo = BaseRepository("exception_evidence")

    def save_exceptions(self, exceptions: List[dict]) -> int:
        """Save exception records and associated evidence to Supabase and store."""
        db_records = []
        evidence_records = []

        for e in exceptions:
            eid = e.get("exception_id", "")
            store.exceptions[eid] = e

            db_records.append({
                "exception_id": eid,
                "transaction_id": e.get("transaction_id", ""),
                "exception_type": e.get("exception_type", ""),
                "risk_level": e.get("risk_level", "medium"),
                "description": e.get("description", ""),
                "recommended_action": e.get("recommended_action", ""),
                "confidence_score": float(e.get("confidence_score", 0)),
                "status": e.get("status", "OPEN"),
                "decision_type": e.get("decision_type", ""),
            })

            # Format evidence records
            ev_list = e.get("evidence", [])
            for ev_item in ev_list:
                evidence_records.append({
                    "exception_id": eid,
                    "evidence_type": "text",
                    "evidence_key": "bullet",
                    "evidence_value": {"text": str(ev_item)},
                })

        if db_records:
            self.bulk_insert_records(db_records)

        if evidence_records and self.evidence_repo.is_available():
            self.evidence_repo.bulk_insert_records(evidence_records)

        return len(exceptions)

    def update_exception_status(self, exception_id: str, status: str, actor: str = "Finance Team") -> Optional[dict]:
        """Update exception status in store and Supabase."""
        exc = store.exceptions.get(exception_id)
        if exc:
            exc["status"] = status

        self.update_record("exception_id", exception_id, {
            "status": status,
        })
        return exc

    def get_all_exceptions(self, risk: Optional[str] = None, status: Optional[str] = None) -> List[dict]:
        """Fetch all exceptions with optional filtering."""
        db_data = self.fetch_all()
        if db_data:
            for r in db_data:
                eid = r.get("exception_id", "")
                if eid and eid not in store.exceptions:
                    store.exceptions[eid] = {
                        "exception_id": eid,
                        "transaction_id": r.get("transaction_id", ""),
                        "exception_type": r.get("exception_type", ""),
                        "risk_level": r.get("risk_level", "medium"),
                        "vendor": "",
                        "amount": 0,
                        "description": r.get("description", ""),
                        "evidence": [],
                        "recommended_action": r.get("recommended_action", ""),
                        "confidence_score": float(r.get("confidence_score", 0)),
                        "status": r.get("status", "OPEN"),
                        "decision_type": r.get("decision_type", ""),
                    }

        excs = list(store.exceptions.values())
        if risk:
            excs = [e for e in excs if e.get("risk_level") == risk]
        if status:
            excs = [e for e in excs if e.get("status") == status]
        return excs

    def get_by_id(self, exception_id: str) -> Optional[dict]:
        """Fetch single exception detail."""
        return store.exceptions.get(exception_id)


exception_repo = ExceptionRepository()
