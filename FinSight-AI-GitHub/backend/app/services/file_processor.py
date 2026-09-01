"""
FinSight AI — File Processor Service
Handles CSV/XLSX upload, validation, normalization, and repository persistence.
"""
from __future__ import annotations
import io
from typing import Dict, List, Tuple

import pandas as pd

from app.models import store
from app.repositories.transaction_repository import transaction_repo
from app.repositories.invoice_repository import invoice_repo
from app.repositories.ledger_repository import ledger_repo
from app.repositories.base_repository import BaseRepository
from app.utils.normalizers import (
    normalize_vendor, normalize_date, normalize_amount, normalize_reference,
)
from app.utils.validators import (
    BANK_COLUMN_MAP, INVOICE_COLUMN_MAP, LEDGER_COLUMN_MAP,
    BANK_REQUIRED, INVOICE_REQUIRED, LEDGER_REQUIRED,
    map_columns, validate_required_columns,
)

ALLOWED_EXTENSIONS = {".csv", ".xlsx", ".xls"}
uploaded_files_repo = BaseRepository("uploaded_files")


def _read_dataframe(content: bytes, filename: str) -> pd.DataFrame:
    """Read file bytes into a DataFrame."""
    ext = "." + filename.rsplit(".", 1)[-1].lower() if "." in filename else ""
    if ext not in ALLOWED_EXTENSIONS:
        raise ValueError(f"Unsupported file type '{ext}'. Use CSV or XLSX.")
    if ext == ".csv":
        return pd.read_csv(io.BytesIO(content))
    else:
        return pd.read_excel(io.BytesIO(content), engine="openpyxl")


def _normalize_df(
    df: pd.DataFrame,
    col_map: Dict[str, str],
    required: set,
    id_col: str,
    id_prefix: str,
) -> Tuple[pd.DataFrame, Dict[str, str]]:
    """Validate columns, rename, normalize, assign IDs if missing."""
    mapped = map_columns(list(df.columns), col_map)
    valid, missing = validate_required_columns(mapped, required)
    if not valid:
        raise ValueError(f"Missing required columns: {', '.join(missing)}. "
                         f"Found columns: {', '.join(df.columns.tolist())}")

    df = df.rename(columns=mapped)
    canonical = list(set(mapped.values()))
    df = df[[c for c in canonical if c in df.columns]].copy()
    df = df.fillna("")

    if id_col not in df.columns or df[id_col].eq("").all():
        df[id_col] = [f"{id_prefix}-{i+1:04d}" for i in range(len(df))]
    df[id_col] = df[id_col].astype(str)

    if "amount" in df.columns:
        df["amount"] = df["amount"].apply(normalize_amount)
        df = df.dropna(subset=["amount"])

    if "vendor_name" in df.columns:
        df["vendor_name"] = df["vendor_name"].astype(str)
        df["vendor_name_normalized"] = df["vendor_name"].apply(normalize_vendor)

    if "date" in df.columns:
        df["date"] = df["date"].astype(str)
        df["date_parsed"] = df["date"].apply(normalize_date)

    for ref_col in ["reference", "invoice_reference"]:
        if ref_col in df.columns:
            df[ref_col] = df[ref_col].astype(str)

    return df, mapped


def process_bank_file(content: bytes, filename: str) -> Tuple[int, List[dict]]:
    """Process bank statement file → save to repository."""
    df = _read_dataframe(content, filename)
    if df.empty:
        raise ValueError("Uploaded file is empty.")

    df, mapped = _normalize_df(df, BANK_COLUMN_MAP, BANK_REQUIRED,
                               "transaction_id", "TXN")

    records = df.to_dict("records")
    for rec in records:
        rec.setdefault("reference", "")
        rec.setdefault("type", "payment")

    count = transaction_repo.save_transactions(records)

    # Save upload metadata record
    uploaded_files_repo.insert_record({
        "filename": filename,
        "file_type": "bank",
        "record_count": count,
        "status": "processed",
    })

    return count, records


def process_invoice_file(content: bytes, filename: str) -> Tuple[int, List[dict]]:
    """Process invoice file → save to repository."""
    df = _read_dataframe(content, filename)
    if df.empty:
        raise ValueError("Uploaded file is empty.")

    df, mapped = _normalize_df(df, INVOICE_COLUMN_MAP, INVOICE_REQUIRED,
                               "invoice_id", "INV")

    records = df.to_dict("records")
    for rec in records:
        rec.setdefault("invoice_reference", "")
        rec.setdefault("status", "open")

    count = invoice_repo.save_invoices(records)

    uploaded_files_repo.insert_record({
        "filename": filename,
        "file_type": "invoice",
        "record_count": count,
        "status": "processed",
    })

    return count, records


def process_ledger_file(content: bytes, filename: str) -> Tuple[int, List[dict]]:
    """Process ledger/ERP file → save to repository."""
    df = _read_dataframe(content, filename)
    if df.empty:
        raise ValueError("Uploaded file is empty.")

    df, mapped = _normalize_df(df, LEDGER_COLUMN_MAP, LEDGER_REQUIRED,
                               "ledger_id", "LDG")

    records = df.to_dict("records")
    for rec in records:
        rec.setdefault("reference", "")
        rec.setdefault("account_type", "")

    count = ledger_repo.save_ledger_entries(records)

    uploaded_files_repo.insert_record({
        "filename": filename,
        "file_type": "ledger",
        "record_count": count,
        "status": "processed",
    })

    return count, records
