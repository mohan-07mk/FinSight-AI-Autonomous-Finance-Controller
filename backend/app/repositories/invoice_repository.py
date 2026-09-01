"""
FinSight AI — Invoice Repository
Persistence for invoices (Supabase + Store fallback).
"""
from typing import Dict, List, Optional
from app.repositories.base_repository import BaseRepository
from app.models import store


class InvoiceRepository(BaseRepository):
    def __init__(self):
        super().__init__("invoices")

    def save_invoices(self, records: List[dict]) -> int:
        """Save invoice records to Supabase and in-memory store."""
        db_records = []
        for r in records:
            iid = r.get("invoice_id", "")
            store.invoices[iid] = r
            db_records.append({
                "invoice_id": iid,
                "date": str(r.get("date", "")),
                "vendor_name": r.get("vendor_name", ""),
                "normalized_vendor_name": r.get("vendor_name_normalized", r.get("vendor_name", "")),
                "amount": float(r.get("amount", 0)),
                "invoice_reference": r.get("invoice_reference", r.get("reference", "")),
                "status": r.get("status", "open"),
            })

        if db_records:
            self.bulk_insert_records(db_records)

        return len(records)

    def get_all_invoices(self) -> List[dict]:
        """Get all invoices from Supabase or store."""
        db_data = self.fetch_all()
        if db_data:
            for r in db_data:
                iid = r.get("invoice_id", "")
                if iid and iid not in store.invoices:
                    store.invoices[iid] = {
                        "invoice_id": iid,
                        "date": r.get("date", ""),
                        "vendor_name": r.get("vendor_name", ""),
                        "vendor_name_normalized": r.get("normalized_vendor_name", r.get("vendor_name", "")),
                        "amount": float(r.get("amount", 0)),
                        "invoice_reference": r.get("invoice_reference", ""),
                        "status": r.get("status", "open"),
                    }
        return list(store.invoices.values())


invoice_repo = InvoiceRepository()
