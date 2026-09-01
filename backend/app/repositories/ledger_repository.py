"""
FinSight AI — Ledger Record Repository
Persistence for ledger/ERP entries (Supabase + Store fallback).
"""
from typing import Dict, List, Optional
from app.repositories.base_repository import BaseRepository
from app.models import store


class LedgerRepository(BaseRepository):
    def __init__(self):
        super().__init__("ledger_records")

    def save_ledger_entries(self, records: List[dict]) -> int:
        """Save ledger records to Supabase and in-memory store."""
        db_records = []
        for r in records:
            lid = r.get("ledger_id", "")
            store.ledger_entries[lid] = r
            db_records.append({
                "ledger_id": lid,
                "date": str(r.get("date", "")),
                "vendor_name": r.get("vendor_name", ""),
                "normalized_vendor_name": r.get("vendor_name_normalized", r.get("vendor_name", "")),
                "amount": float(r.get("amount", 0)),
                "reference": r.get("reference", ""),
                "account_type": r.get("account_type", ""),
            })

        if db_records:
            self.bulk_insert_records(db_records)

        return len(records)

    def get_all_ledger_entries(self) -> List[dict]:
        """Get all ledger entries from Supabase or store."""
        db_data = self.fetch_all()
        if db_data:
            for r in db_data:
                lid = r.get("ledger_id", "")
                if lid and lid not in store.ledger_entries:
                    store.ledger_entries[lid] = {
                        "ledger_id": lid,
                        "date": r.get("date", ""),
                        "vendor_name": r.get("vendor_name", ""),
                        "vendor_name_normalized": r.get("normalized_vendor_name", r.get("vendor_name", "")),
                        "amount": float(r.get("amount", 0)),
                        "reference": r.get("reference", ""),
                        "account_type": r.get("account_type", ""),
                    }
        return list(store.ledger_entries.values())


ledger_repo = LedgerRepository()
