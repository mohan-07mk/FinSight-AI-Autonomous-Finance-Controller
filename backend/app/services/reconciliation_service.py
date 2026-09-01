"""
FinSight AI — Reconciliation Service
Core three-way matching engine: Bank vs Invoice vs Ledger.
"""
from __future__ import annotations
from datetime import date
from typing import Dict, List, Optional, Tuple

from rapidfuzz import fuzz

from app.models import store
from app.repositories.reconciliation_repository import reconciliation_repo
from app.repositories.transaction_repository import transaction_repo
from app.repositories.invoice_repository import invoice_repo
from app.repositories.ledger_repository import ledger_repo
from app.schemas.schemas import MatchStatus
from app.utils.normalizers import parse_date, normalize_reference
from app import config


def vendor_similarity(v1: str, v2: str) -> float:
    """0–100 fuzzy similarity of normalized vendor names."""
    if not v1 or not v2:
        return 0.0
    return fuzz.token_sort_ratio(v1, v2)


def amount_similarity(a1: float, a2: float) -> float:
    """0–100 based on how close two amounts are."""
    if a1 == 0 and a2 == 0:
        return 100.0
    mx = max(abs(a1), abs(a2))
    if mx == 0:
        return 100.0
    diff_pct = abs(a1 - a2) / mx * 100
    if diff_pct == 0:
        return 100.0
    if diff_pct <= 0.1:
        return 99.0
    if diff_pct <= 1:
        return 95.0
    if diff_pct <= 5:
        return 80.0
    if diff_pct <= 10:
        return 60.0
    if diff_pct <= 20:
        return 40.0
    return max(0, 100 - diff_pct)


def date_similarity(d1: Optional[date], d2: Optional[date]) -> float:
    """0–100 based on day proximity."""
    if d1 is None or d2 is None:
        return 0.0
    diff = abs((d1 - d2).days)
    if diff == 0:
        return 100.0
    if diff <= config.DATE_CLOSE_MATCH_DAYS:
        return 90.0 - (diff * 3)
    if diff <= config.DATE_PARTIAL_MATCH_DAYS:
        return 70.0 - (diff * 2)
    if diff <= 14:
        return 40.0
    return max(0, 30.0 - diff)


def reference_similarity(r1: str, r2: str) -> float:
    """0–100 fuzzy similarity of normalized references."""
    n1 = normalize_reference(r1)
    n2 = normalize_reference(r2)
    if not n1 or not n2:
        return 0.0
    return fuzz.ratio(n1, n2)


def compute_confidence(
    v_sim: float, a_sim: float, d_sim: float, r_sim: float
) -> float:
    """Weighted confidence score (0–100)."""
    score = (
        v_sim * config.WEIGHT_VENDOR / 100 +
        a_sim * config.WEIGHT_AMOUNT / 100 +
        d_sim * config.WEIGHT_DATE / 100 +
        r_sim * config.WEIGHT_REFERENCE / 100
    )
    return round(min(100, max(0, score)), 1)


def classify_match(confidence: float) -> MatchStatus:
    """Map confidence score → match status."""
    if confidence >= config.THRESHOLD_AUTO_RESOLVE:
        return MatchStatus.MATCHED
    if confidence >= config.THRESHOLD_HUMAN_REVIEW:
        return MatchStatus.PARTIAL_MATCH
    if confidence >= 50:
        return MatchStatus.AI_REVIEW
    return MatchStatus.UNMATCHED


def _find_best_invoice(
    txn: dict, invoice_list: List[dict], used: set
) -> Optional[Tuple[dict, float, float, float, float, float]]:
    """Find best matching invoice for a bank transaction."""
    best = None
    best_conf = -1

    txn_vendor = txn.get("vendor_name_normalized", "")
    txn_date = parse_date(txn.get("date_parsed", txn.get("date", "")))
    txn_amount = float(txn.get("amount", 0))
    txn_ref = txn.get("reference", "")

    for inv in invoice_list:
        inv_id = inv.get("invoice_id", "")
        if inv_id in used:
            continue

        inv_vendor = inv.get("vendor_name_normalized", "")
        inv_date = parse_date(inv.get("date_parsed", inv.get("date", "")))
        inv_amount = float(inv.get("amount", 0))
        inv_ref = inv.get("invoice_reference", inv.get("reference", ""))

        v_sim = vendor_similarity(txn_vendor, inv_vendor)
        a_sim = amount_similarity(txn_amount, inv_amount)
        d_sim = date_similarity(txn_date, inv_date)
        r_sim = reference_similarity(txn_ref, inv_ref)
        conf = compute_confidence(v_sim, a_sim, d_sim, r_sim)

        if conf > best_conf:
            best_conf = conf
            best = (inv, v_sim, a_sim, d_sim, r_sim, conf)

    return best


def _find_best_ledger(
    txn: dict, ledger_list: List[dict], used: set
) -> Optional[Tuple[dict, float]]:
    """Find best matching ledger entry for a bank transaction."""
    best = None
    best_conf = -1

    txn_vendor = txn.get("vendor_name_normalized", "")
    txn_date = parse_date(txn.get("date_parsed", txn.get("date", "")))
    txn_amount = float(txn.get("amount", 0))
    txn_ref = txn.get("reference", "")

    for entry in ledger_list:
        lid = entry.get("ledger_id", "")
        if lid in used:
            continue

        v_sim = vendor_similarity(txn_vendor, entry.get("vendor_name_normalized", ""))
        a_sim = amount_similarity(txn_amount, float(entry.get("amount", 0)))
        d_sim = date_similarity(txn_date, parse_date(entry.get("date_parsed", entry.get("date", ""))))
        r_sim = reference_similarity(txn_ref, entry.get("reference", ""))
        conf = compute_confidence(v_sim, a_sim, d_sim, r_sim)

        if conf > best_conf:
            best_conf = conf
            best = (entry, conf)

    return best


def build_explanation(
    status: MatchStatus, v_sim: float, a_sim: float,
    d_sim: float, r_sim: float, amount_diff: float, date_diff: int,
) -> str:
    """Generate human-readable explanation for a match."""
    parts = []
    if v_sim >= 90:
        parts.append(f"Vendor matched with {v_sim:.0f}% similarity")
    elif v_sim >= 70:
        parts.append(f"Vendor partially matched ({v_sim:.0f}%)")
    else:
        parts.append(f"Vendor match is low ({v_sim:.0f}%)")

    if a_sim >= 99:
        parts.append("Amount matches exactly")
    elif a_sim >= 80:
        parts.append(f"Amount is close (difference: ₹{abs(amount_diff):,.0f})")
    else:
        parts.append(f"Significant amount difference: ₹{abs(amount_diff):,.0f}")

    if d_sim >= 90:
        parts.append("Dates align closely" if date_diff <= 1 else f"Date proximity: {date_diff} days")
    elif d_sim > 0:
        parts.append(f"Date gap: {date_diff} days")

    if r_sim >= 80:
        parts.append("Reference numbers match")
    elif r_sim > 0:
        parts.append(f"Partial reference match ({r_sim:.0f}%)")

    return ". ".join(parts) + "."


def run_reconciliation() -> List[dict]:
    """
    Run three-way reconciliation: Bank → Invoice → Ledger.
    Reads data from Repositories and persists results.
    """
    bank_txns = transaction_repo.get_all_transactions()
    invoice_list = invoice_repo.get_all_invoices()
    ledger_list = ledger_repo.get_all_ledger_entries()

    results = []
    used_invoices: set = set()
    used_ledgers: set = set()

    for txn in bank_txns:
        txn_id = txn.get("transaction_id", "")
        txn_amount = float(txn.get("amount", 0))
        txn_date = parse_date(txn.get("date_parsed", txn.get("date", "")))

        inv_match = _find_best_invoice(txn, invoice_list, used_invoices)
        ldg_match = _find_best_ledger(txn, ledger_list, used_ledgers)

        if inv_match:
            inv, v_sim, a_sim, d_sim, r_sim, conf = inv_match
            inv_id = inv.get("invoice_id", "")
            inv_amount = float(inv.get("amount", 0))
            inv_date = parse_date(inv.get("date_parsed", inv.get("date", "")))
            amount_diff = txn_amount - inv_amount
            date_diff = abs((txn_date - inv_date).days) if txn_date and inv_date else 999

            status = classify_match(conf)
            explanation = build_explanation(status, v_sim, a_sim, d_sim, r_sim, amount_diff, date_diff)

            if conf >= 50:
                used_invoices.add(inv_id)

            ldg_id = None
            ldg_amount = None
            if ldg_match and ldg_match[1] >= 50:
                ldg_entry, ldg_conf = ldg_match
                ldg_id = ldg_entry.get("ledger_id")
                ldg_amount = float(ldg_entry.get("amount", 0))
                used_ledgers.add(ldg_id)

            result = {
                "transaction_id": txn_id,
                "date": txn.get("date", ""),
                "vendor": txn.get("vendor_name", ""),
                "bank_amount": txn_amount,
                "invoice_amount": inv_amount,
                "ledger_amount": ldg_amount,
                "possible_invoice_id": inv_id if conf >= 50 else None,
                "possible_ledger_id": ldg_id,
                "status": status.value,
                "confidence": conf,
                "vendor_similarity": round(v_sim, 1),
                "amount_similarity": round(a_sim, 1),
                "date_similarity": round(d_sim, 1),
                "reference_similarity": round(r_sim, 1),
                "amount_difference": round(amount_diff, 2),
                "date_difference_days": date_diff if date_diff != 999 else -1,
                "explanation": explanation,
            }
        else:
            result = {
                "transaction_id": txn_id,
                "date": txn.get("date", ""),
                "vendor": txn.get("vendor_name", ""),
                "bank_amount": txn_amount,
                "invoice_amount": None,
                "ledger_amount": None,
                "possible_invoice_id": None,
                "possible_ledger_id": None,
                "status": MatchStatus.UNMATCHED.value,
                "confidence": 0,
                "vendor_similarity": 0, "amount_similarity": 0,
                "date_similarity": 0, "reference_similarity": 0,
                "amount_difference": 0, "date_difference_days": -1,
                "explanation": "No matching invoice found in uploaded data.",
            }

        results.append(result)

    # Persist match results via repository
    reconciliation_repo.save_results(results)
    return results
