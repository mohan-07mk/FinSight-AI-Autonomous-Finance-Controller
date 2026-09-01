"""
FinSight AI — Reconciliation Repository
Persistence for 3-way reconciliation match results (Supabase + Store fallback).
"""
from typing import Dict, List, Optional
from app.repositories.base_repository import BaseRepository
from app.models import store


class ReconciliationRepository(BaseRepository):
    def __init__(self):
        super().__init__("reconciliation_results")

    def save_results(self, results: List[dict]) -> int:
        """Save reconciliation results to Supabase and store."""
        db_records = []
        for r in results:
            tid = r.get("transaction_id", "")
            store.reconciliation_results[tid] = r
            db_records.append({
                "transaction_id": tid,
                "invoice_id": r.get("possible_invoice_id"),
                "ledger_id": r.get("possible_ledger_id"),
                "status": r.get("status", "Unmatched"),
                "overall_confidence": float(r.get("confidence", 0)),
                "vendor_similarity": float(r.get("vendor_similarity", 0)),
                "amount_similarity": float(r.get("amount_similarity", 0)),
                "date_similarity": float(r.get("date_similarity", 0)),
                "reference_similarity": float(r.get("reference_similarity", 0)),
                "amount_difference": float(r.get("amount_difference", 0)),
                "date_difference_days": int(r.get("date_difference_days", -1)),
                "explanation": r.get("explanation", ""),
                "decision_type": "AUTO_RESOLVE" if r.get("confidence", 0) >= 95 else "HUMAN_REVIEW",
            })

        if db_records:
            self.bulk_insert_records(db_records)

        return len(results)

    def get_all_results(self) -> List[dict]:
        """Fetch all reconciliation results."""
        db_data = self.fetch_all()
        if db_data:
            for r in db_data:
                tid = r.get("transaction_id", "")
                if tid and tid not in store.reconciliation_results:
                    store.reconciliation_results[tid] = {
                        "transaction_id": tid,
                        "date": "",
                        "vendor": "",
                        "bank_amount": 0,
                        "invoice_amount": None,
                        "ledger_amount": None,
                        "possible_invoice_id": r.get("invoice_id"),
                        "possible_ledger_id": r.get("ledger_id"),
                        "status": r.get("status", "Unmatched"),
                        "confidence": float(r.get("overall_confidence", 0)),
                        "vendor_similarity": float(r.get("vendor_similarity", 0)),
                        "amount_similarity": float(r.get("amount_similarity", 0)),
                        "date_similarity": float(r.get("date_similarity", 0)),
                        "reference_similarity": float(r.get("reference_similarity", 0)),
                        "amount_difference": float(r.get("amount_difference", 0)),
                        "date_difference_days": int(r.get("date_difference_days", -1)),
                        "explanation": r.get("explanation", ""),
                    }
        return list(store.reconciliation_results.values())

    def get_by_transaction_id(self, transaction_id: str) -> Optional[dict]:
        """Get match result by transaction ID."""
        if transaction_id in store.reconciliation_results:
            return store.reconciliation_results[transaction_id]
        db_data = self.fetch_by_id("transaction_id", transaction_id)
        if db_data:
            return {
                "transaction_id": transaction_id,
                "possible_invoice_id": db_data.get("invoice_id"),
                "possible_ledger_id": db_data.get("ledger_id"),
                "status": db_data.get("status"),
                "confidence": float(db_data.get("overall_confidence", 0)),
                "vendor_similarity": float(db_data.get("vendor_similarity", 0)),
                "amount_similarity": float(db_data.get("amount_similarity", 0)),
                "date_similarity": float(db_data.get("date_similarity", 0)),
                "reference_similarity": float(db_data.get("reference_similarity", 0)),
                "amount_difference": float(db_data.get("amount_difference", 0)),
                "date_difference_days": int(db_data.get("date_difference_days", -1)),
                "explanation": db_data.get("explanation", ""),
            }
        return None


reconciliation_repo = ReconciliationRepository()
