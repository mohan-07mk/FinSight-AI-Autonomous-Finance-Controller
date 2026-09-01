"""
FinSight AI — Transaction Repository
Persistence for bank transactions (Supabase + Store fallback).
"""
from typing import Dict, List, Optional
from app.repositories.base_repository import BaseRepository
from app.models import store


class TransactionRepository(BaseRepository):
    def __init__(self):
        super().__init__("transactions")

    def save_transactions(self, records: List[dict]) -> int:
        """Save bank transaction records to Supabase and in-memory store."""
        db_records = []
        for r in records:
            tid = r.get("transaction_id", "")
            store.bank_transactions[tid] = r
            db_records.append({
                "transaction_id": tid,
                "date": str(r.get("date", "")),
                "vendor_name": r.get("vendor_name", ""),
                "normalized_vendor_name": r.get("vendor_name_normalized", r.get("vendor_name", "")),
                "amount": float(r.get("amount", 0)),
                "reference": r.get("reference", ""),
                "transaction_type": r.get("type", "payment"),
            })

        if db_records:
            self.bulk_insert_records(db_records)

        return len(records)

    def get_all_transactions(self) -> List[dict]:
        """Get all bank transactions from Supabase or store."""
        db_data = self.fetch_all()
        if db_data:
            # Sync back to store
            for r in db_data:
                tid = r.get("transaction_id", "")
                if tid and tid not in store.bank_transactions:
                    store.bank_transactions[tid] = {
                        "transaction_id": tid,
                        "date": r.get("date", ""),
                        "vendor_name": r.get("vendor_name", ""),
                        "vendor_name_normalized": r.get("normalized_vendor_name", r.get("vendor_name", "")),
                        "amount": float(r.get("amount", 0)),
                        "reference": r.get("reference", ""),
                        "type": r.get("transaction_type", "payment"),
                    }
        return list(store.bank_transactions.values())


transaction_repo = TransactionRepository()
