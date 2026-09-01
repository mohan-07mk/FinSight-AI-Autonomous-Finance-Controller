"""
FinSight AI — Data Validators
Validate uploaded file data against required schemas.
"""
from __future__ import annotations
from typing import Dict, List, Set, Tuple

# ── Column name mappings (common variations → canonical name) ──────────

BANK_COLUMN_MAP: Dict[str, str] = {
    "transaction_id": "transaction_id", "txn_id": "transaction_id",
    "trans_id": "transaction_id", "id": "transaction_id",
    "date": "date", "transaction_date": "date", "txn_date": "date",
    "payment_date": "date", "value_date": "date",
    "vendor": "vendor_name", "vendor_name": "vendor_name",
    "payee": "vendor_name", "beneficiary": "vendor_name",
    "party_name": "vendor_name", "counterparty": "vendor_name",
    "amount": "amount", "debit_amount": "amount", "credit_amount": "amount",
    "txn_amount": "amount", "payment_amount": "amount", "value": "amount",
    "reference": "reference", "ref": "reference", "ref_no": "reference",
    "reference_number": "reference", "utr": "reference", "cheque_no": "reference",
    "type": "type", "txn_type": "type", "transaction_type": "type",
}

INVOICE_COLUMN_MAP: Dict[str, str] = {
    "invoice_id": "invoice_id", "inv_id": "invoice_id", "id": "invoice_id",
    "invoice_number": "invoice_id", "inv_no": "invoice_id",
    "date": "date", "invoice_date": "date", "inv_date": "date",
    "due_date": "date", "issue_date": "date",
    "vendor": "vendor_name", "vendor_name": "vendor_name",
    "payee": "vendor_name", "supplier": "vendor_name",
    "supplier_name": "vendor_name", "party_name": "vendor_name",
    "amount": "amount", "invoice_amount": "amount", "total": "amount",
    "total_amount": "amount", "net_amount": "amount", "value": "amount",
    "invoice_reference": "invoice_reference", "reference": "invoice_reference",
    "ref": "invoice_reference", "po_number": "invoice_reference",
    "status": "status", "invoice_status": "status",
}

LEDGER_COLUMN_MAP: Dict[str, str] = {
    "ledger_id": "ledger_id", "entry_id": "ledger_id", "id": "ledger_id",
    "date": "date", "entry_date": "date", "posting_date": "date",
    "transaction_date": "date",
    "vendor": "vendor_name", "vendor_name": "vendor_name",
    "party_name": "vendor_name", "account_name": "vendor_name",
    "payee": "vendor_name",
    "amount": "amount", "debit": "amount", "credit": "amount",
    "value": "amount",
    "reference": "reference", "ref": "reference", "voucher_no": "reference",
    "journal_ref": "reference",
    "account_type": "account_type", "type": "account_type",
    "category": "account_type",
}


# ── Required columns per type ──────────────────────────────────────────

BANK_REQUIRED: Set[str] = {"date", "vendor_name", "amount"}
INVOICE_REQUIRED: Set[str] = {"date", "vendor_name", "amount"}
LEDGER_REQUIRED: Set[str] = {"date", "vendor_name", "amount"}


def map_columns(raw_columns: List[str], column_map: Dict[str, str]) -> Dict[str, str]:
    """Map raw column names to canonical names."""
    mapped = {}
    for col in raw_columns:
        key = col.strip().lower().replace(" ", "_")
        if key in column_map:
            mapped[col] = column_map[key]
    return mapped


def validate_required_columns(
    mapped_cols: Dict[str, str], required: Set[str]
) -> Tuple[bool, List[str]]:
    """Check that all required canonical columns are present."""
    found = set(mapped_cols.values())
    missing = required - found
    return len(missing) == 0, list(missing)
