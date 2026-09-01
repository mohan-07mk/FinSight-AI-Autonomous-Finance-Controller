"""
FinSight AI — Exception Detection Service
Detects and classifies reconciliation exceptions with repository persistence.
"""
from __future__ import annotations
from typing import List

from app.models import store
from app.repositories.exception_repository import exception_repo
from app.repositories.reconciliation_repository import reconciliation_repo
from app.repositories.transaction_repository import transaction_repo
from app.schemas.schemas import (
    ExceptionType, RiskLevel, ExceptionStatus, DecisionType,
)
from app.utils.helpers import utc_now
from app.utils.normalizers import parse_date
from app import config


def _risk_from_confidence(conf: float) -> RiskLevel:
    if conf < 50:
        return RiskLevel.HIGH
    if conf < config.THRESHOLD_HUMAN_REVIEW:
        return RiskLevel.MEDIUM
    return RiskLevel.LOW


def _decision_type(conf: float) -> DecisionType:
    if conf >= config.THRESHOLD_AUTO_RESOLVE:
        return DecisionType.AUTO_RESOLVE
    if conf >= config.THRESHOLD_HUMAN_REVIEW:
        return DecisionType.HUMAN_APPROVAL_REQUIRED
    return DecisionType.MANUAL_INVESTIGATION


def detect_exceptions() -> List[dict]:
    """Scan reconciliation results and generate exception records."""
    created = []
    recon_results = reconciliation_repo.get_all_results()

    for result in recon_results:
        txn_id = result.get("transaction_id", "")
        status = result.get("status", "")
        conf = result.get("confidence", 0)
        bank_amt = result.get("bank_amount", 0)
        inv_amt = result.get("invoice_amount")
        diff = result.get("amount_difference", 0)
        vendor = result.get("vendor", "")
        v_sim = result.get("vendor_similarity", 0)

        exceptions_for_txn = []

        if status == "Unmatched" and inv_amt is None:
            exceptions_for_txn.append(_make_exception(
                txn_id, ExceptionType.MISSING_INVOICE, RiskLevel.HIGH,
                vendor, bank_amt, conf,
                "No matching invoice found for this bank transaction.",
                ["No invoice match in uploaded data", f"Vendor: {vendor}"],
                "Request invoice upload or search for a matching invoice.",
                False,
            ))

        elif status == "Unmatched" and v_sim < 50:
            exceptions_for_txn.append(_make_exception(
                txn_id, ExceptionType.UNKNOWN_VENDOR, RiskLevel.HIGH,
                vendor, bank_amt, conf,
                "Payment does not match any known vendor banking details on file.",
                ["No vendor match found", f"Vendor similarity: {v_sim:.0f}%",
                 f"Transaction value: ₹{bank_amt:,.0f}"],
                "Escalate for manual fraud review.",
                False,
            ))

        elif status == "Unmatched":
            exceptions_for_txn.append(_make_exception(
                txn_id, ExceptionType.LOW_CONFIDENCE, RiskLevel.HIGH,
                vendor, bank_amt, conf,
                f"Match confidence is only {conf:.0f}%, below the minimum threshold.",
                [f"Confidence: {conf:.0f}%", f"Vendor similarity: {v_sim:.0f}%"],
                "Investigate the transaction manually.",
                False,
            ))

        if status in ("Partial Match", "AI Review") and inv_amt is not None:
            abs_diff = abs(diff)
            pct_diff = (abs_diff / max(abs(inv_amt), 1)) * 100

            if 0 < abs_diff and pct_diff <= config.PARTIAL_PAYMENT_MAX_PERCENT and bank_amt < inv_amt:
                exceptions_for_txn.append(_make_exception(
                    txn_id, ExceptionType.PARTIAL_PAYMENT, RiskLevel.MEDIUM,
                    vendor, bank_amt, conf,
                    f"Vendor and date strongly match. ₹{abs_diff:,.0f} shortfall suggests partial payment.",
                    [f"Vendor match {v_sim:.0f}%", f"Amount delta ₹{abs_diff:,.0f}",
                     f"Difference: {pct_diff:.1f}%"],
                    f"Mark ₹{abs_diff:,.0f} as outstanding and link payment to the invoice.",
                    True,
                ))

            elif abs_diff > 0 and pct_diff > config.PARTIAL_PAYMENT_MAX_PERCENT:
                exceptions_for_txn.append(_make_exception(
                    txn_id, ExceptionType.AMOUNT_MISMATCH, RiskLevel.MEDIUM,
                    vendor, bank_amt, conf,
                    f"Amount difference of ₹{abs_diff:,.0f} ({pct_diff:.1f}%) exceeds partial payment threshold.",
                    [f"Bank: ₹{bank_amt:,.0f}", f"Invoice: ₹{inv_amt:,.0f}",
                     f"Difference: {pct_diff:.1f}%"],
                    "Review the amount difference and determine correct allocation.",
                    False,
                ))

            elif 0 < abs_diff <= 5 and pct_diff < 0.1:
                exceptions_for_txn.append(_make_exception(
                    txn_id, ExceptionType.CURRENCY_ROUNDING, RiskLevel.LOW,
                    vendor, bank_amt, conf,
                    f"Bank and invoice amounts differ by ₹{abs_diff:.0f}, consistent with rounding.",
                    [f"Amount delta < 0.1%", "Vendor exact match", "Date exact match"],
                    "Auto-resolve as rounding variance.",
                    True,
                ))

            date_diff = result.get("date_difference_days", 0)
            if date_diff > config.DATE_PARTIAL_MATCH_DAYS and abs_diff == 0:
                exceptions_for_txn.append(_make_exception(
                    txn_id, ExceptionType.DATE_MISMATCH, RiskLevel.LOW,
                    vendor, bank_amt, conf,
                    f"Payment date and invoice date differ by {date_diff} days.",
                    [f"Date gap: {date_diff} days", "Amount matches",
                     f"Vendor match: {v_sim:.0f}%"],
                    "Review settlement date and update reconciliation date if confirmed.",
                    True,
                ))

        if not exceptions_for_txn and status == "Matched":
            continue

        for exc in exceptions_for_txn:
            created.append(exc)

    exception_repo.save_exceptions(created)
    return created


def _make_exception(
    txn_id: str, exc_type: ExceptionType, risk: RiskLevel,
    vendor: str, amount: float, confidence: float,
    description: str, evidence: list, recommendation: str,
    resolvable: bool,
) -> dict:
    exc_id = store.next_id("exception")
    dt = _decision_type(confidence)

    initial_status = ExceptionStatus.OPEN
    if resolvable and confidence >= config.THRESHOLD_AUTO_RESOLVE:
        initial_status = ExceptionStatus.AUTO_RESOLVED

    return {
        "exception_id": exc_id,
        "transaction_id": txn_id,
        "exception_type": exc_type.value,
        "risk_level": risk.value,
        "vendor": vendor,
        "amount": amount,
        "description": description,
        "evidence": evidence,
        "recommended_action": recommendation,
        "confidence_score": confidence,
        "status": initial_status.value,
        "decision_type": dt.value,
        "decision_reason": f"Confidence {confidence:.0f}% → {dt.value}",
        "resolvable": resolvable,
        "created_at": utc_now(),
        "resolved_at": utc_now() if initial_status == ExceptionStatus.AUTO_RESOLVED else None,
        "resolved_by": "AI_CONTROLLER" if initial_status == ExceptionStatus.AUTO_RESOLVED else None,
    }


def detect_duplicates() -> List[dict]:
    """Detect potential duplicate payments in bank transactions."""
    created = []
    txns = transaction_repo.get_all_transactions()

    for i, t1 in enumerate(txns):
        for j, t2 in enumerate(txns):
            if j <= i:
                continue

            v1 = t1.get("vendor_name_normalized", "")
            v2 = t2.get("vendor_name_normalized", "")
            a1 = float(t1.get("amount", 0))
            a2 = float(t2.get("amount", 0))
            d1 = parse_date(t1.get("date_parsed", t1.get("date", "")))
            d2 = parse_date(t2.get("date_parsed", t2.get("date", "")))
            r1 = t1.get("reference", "")
            r2 = t2.get("reference", "")

            from rapidfuzz import fuzz as _fuzz
            v_sim = _fuzz.token_sort_ratio(v1, v2) if v1 and v2 else 0
            amt_match = abs(a1 - a2) / max(a1, a2, 1) <= config.DUPLICATE_AMOUNT_TOLERANCE if a1 > 0 else False
            date_close = abs((d1 - d2).days) <= config.DUPLICATE_DATE_WINDOW_DAYS if d1 and d2 else False
            ref_match = r1 and r2 and r1.strip().lower() == r2.strip().lower()

            if v_sim >= 85 and amt_match and date_close:
                confidence = min(99, (v_sim * 0.3 + (100 if amt_match else 0) * 0.3 +
                                      (100 if date_close else 0) * 0.2 +
                                      (100 if ref_match else 0) * 0.2))
                evidence = [f"Same vendor ({v_sim:.0f}% match)"]
                if amt_match:
                    evidence.append(f"Same amount (₹{a1:,.0f})")
                if ref_match:
                    evidence.append("Same reference number")
                if date_close:
                    evidence.append(f"Within {config.DUPLICATE_DATE_WINDOW_DAYS} days")

                exc = _make_exception(
                    t2.get("transaction_id", ""),
                    ExceptionType.DUPLICATE_PAYMENT, RiskLevel.HIGH,
                    t2.get("vendor_name", ""), a2, confidence,
                    f"A payment with the same vendor and amount was detected within {config.DUPLICATE_DATE_WINDOW_DAYS} days.",
                    evidence,
                    "Hold payment and investigate duplicate transaction.",
                    False,
                )
                already = any(
                    e.get("transaction_id") == t2.get("transaction_id") and
                    e.get("exception_type") == ExceptionType.DUPLICATE_PAYMENT.value
                    for e in store.exceptions.values()
                )
                if not already:
                    created.append(exc)

    if created:
        exception_repo.save_exceptions(created)

    return created
