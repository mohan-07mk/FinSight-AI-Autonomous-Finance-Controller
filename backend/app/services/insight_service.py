"""
FinSight AI — Insight Service
Rule-based pattern detection across reconciliation data with repository persistence.
"""
from __future__ import annotations
from collections import Counter
from typing import List

from app.models import store
from app.repositories.insight_repository import insight_repo
from app.repositories.exception_repository import exception_repo
from app.repositories.reconciliation_repository import reconciliation_repo
from app.schemas.schemas import RiskLevel


def generate_insights() -> List[dict]:
    """Scan exceptions and reconciliation results for patterns."""
    insights: List[dict] = []

    exceptions = exception_repo.get_all_exceptions()
    recon = reconciliation_repo.get_all_results()

    if not exceptions and not recon:
        return insights

    vendor_counts = Counter(e.get("vendor", "") for e in exceptions if e.get("vendor"))
    for vendor, count in vendor_counts.most_common(3):
        if count >= 2:
            total_exc = len(exceptions)
            pct = count / total_exc * 100 if total_exc else 0
            ins = _make_insight(
                "root-cause",
                f"Vendor-related exceptions concentrated: {vendor}",
                f"{count} out of {total_exc} exceptions ({pct:.0f}%) involve {vendor}.",
                f"Exceptions: {count} for this vendor",
                f"Possible systematic issue with vendor {vendor} (invoice format, payment terms, etc.)",
                min(95, 60 + count * 8),
                RiskLevel.MEDIUM if count < 4 else RiskLevel.HIGH,
            )
            insights.append(ins)

    dup_count = sum(1 for e in exceptions if "Duplicate" in e.get("exception_type", ""))
    if dup_count >= 1:
        ins = _make_insight(
            "duplicate",
            "Duplicate payment risk detected",
            f"{dup_count} suspected duplicate payment(s) found across transactions.",
            f"{dup_count} duplicate exceptions",
            "Review payment approval workflow for double-processing risk.",
            min(95, 75 + dup_count * 5),
            RiskLevel.HIGH if dup_count >= 3 else RiskLevel.MEDIUM,
        )
        insights.append(ins)

    mismatch_count = sum(1 for e in exceptions
                         if e.get("exception_type") in ("Amount Mismatch", "Partial Payment Detected"))
    if mismatch_count >= 2:
        ins = _make_insight(
            "amount-mismatch",
            "Increase in amount mismatches",
            f"{mismatch_count} transactions show amount differences between bank and invoice records.",
            f"{mismatch_count} mismatches detected",
            "Invoice pricing or payment calculation inconsistencies.",
            min(90, 65 + mismatch_count * 6),
            RiskLevel.MEDIUM,
        )
        insights.append(ins)

    missing_inv = sum(1 for e in exceptions if e.get("exception_type") == "Missing Invoice")
    if missing_inv >= 1:
        ins = _make_insight(
            "data-quality",
            "Missing invoices detected",
            f"{missing_inv} bank transactions have no matching invoice in uploaded data.",
            f"{missing_inv} missing invoices",
            "Invoice upload may be incomplete or delayed.",
            min(85, 60 + missing_inv * 7),
            RiskLevel.MEDIUM if missing_inv < 5 else RiskLevel.HIGH,
        )
        insights.append(ins)

    if recon:
        matched = sum(1 for r in recon if r.get("status") == "Matched")
        match_rate = matched / len(recon) * 100
        if match_rate < 80:
            ins = _make_insight(
                "data-quality",
                "Low overall match rate",
                f"Only {match_rate:.1f}% of transactions are fully matched.",
                f"Match rate: {match_rate:.1f}%",
                "Data quality issues or missing records from one or more sources.",
                min(90, 50 + (100 - match_rate) * 0.5),
                RiskLevel.HIGH,
            )
            insights.append(ins)

    insight_repo.save_insights(insights)
    return insights


def _make_insight(
    kind: str, title: str, description: str, evidence: str,
    root_cause: str, confidence: float, severity: RiskLevel,
) -> dict:
    return {
        "insight_id": store.next_id("insight"),
        "kind": kind,
        "title": title,
        "description": description,
        "evidence": evidence,
        "possible_root_cause": root_cause,
        "confidence": round(confidence, 1),
        "severity": severity.value,
    }
