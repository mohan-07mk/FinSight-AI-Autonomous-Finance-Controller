"""
FinSight AI — Pydantic Schemas for all request / response models.
"""
from __future__ import annotations
from datetime import date, datetime
from enum import Enum
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field


# ═══════════════════════════════════════════════════════════════════════
#  ENUMS
# ═══════════════════════════════════════════════════════════════════════

class MatchStatus(str, Enum):
    MATCHED = "Matched"
    PARTIAL_MATCH = "Partial Match"
    UNMATCHED = "Unmatched"
    AI_REVIEW = "AI Review"


class ExceptionType(str, Enum):
    AMOUNT_MISMATCH = "Amount Mismatch"
    PARTIAL_PAYMENT = "Partial Payment Detected"
    MISSING_INVOICE = "Missing Invoice"
    MISSING_LEDGER = "Missing Ledger Entry"
    DUPLICATE_PAYMENT = "Duplicate Payment Suspected"
    DATE_MISMATCH = "Date Mismatch"
    UNKNOWN_VENDOR = "Unknown Vendor"
    LOW_CONFIDENCE = "Low Confidence Match"
    INVOICE_FORMAT_MISMATCH = "Invoice Format Mismatch"
    CURRENCY_ROUNDING = "Currency Rounding Difference"
    LATE_INVOICE = "Late Invoice Upload"


class RiskLevel(str, Enum):
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"


class ExceptionStatus(str, Enum):
    OPEN = "OPEN"
    PENDING_APPROVAL = "PENDING_APPROVAL"
    APPROVED = "APPROVED"
    REJECTED = "REJECTED"
    AUTO_RESOLVED = "AUTO_RESOLVED"
    ESCALATED = "ESCALATED"


class DecisionType(str, Enum):
    AUTO_RESOLVE = "AUTO_RESOLVE"
    HUMAN_APPROVAL_REQUIRED = "HUMAN_APPROVAL_REQUIRED"
    MANUAL_INVESTIGATION = "MANUAL_INVESTIGATION"


class AuditEventType(str, Enum):
    FILE_UPLOADED = "FILE_UPLOADED"
    RECONCILIATION_RUN = "RECONCILIATION_RUN"
    EXCEPTION_CREATED = "EXCEPTION_CREATED"
    EXCEPTION_AUTO_RESOLVED = "EXCEPTION_AUTO_RESOLVED"
    EXCEPTION_APPROVED = "EXCEPTION_APPROVED"
    EXCEPTION_REJECTED = "EXCEPTION_REJECTED"
    EXCEPTION_ESCALATED = "EXCEPTION_ESCALATED"
    INSIGHT_GENERATED = "INSIGHT_GENERATED"
    RISK_RADAR_GENERATED = "RISK_RADAR_GENERATED"
    AI_EXPLANATION_VIEWED_OR_GENERATED = "AI_EXPLANATION_VIEWED_OR_GENERATED"
    WHAT_IF_SIMULATION_RUN = "WHAT_IF_SIMULATION_RUN"


class CashRisk(str, Enum):
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"


# ═══════════════════════════════════════════════════════════════════════
#  CORE DATA MODELS
# ═══════════════════════════════════════════════════════════════════════

class BankTransaction(BaseModel):
    transaction_id: str
    date: str
    vendor_name: str
    amount: float
    reference: str = ""
    type: str = "payment"
    vendor_name_normalized: str = ""
    date_parsed: Optional[str] = None


class Invoice(BaseModel):
    invoice_id: str
    date: str
    vendor_name: str
    amount: float
    invoice_reference: str = ""
    status: str = "open"
    vendor_name_normalized: str = ""
    date_parsed: Optional[str] = None


class LedgerEntry(BaseModel):
    ledger_id: str
    date: str
    vendor_name: str
    amount: float
    reference: str = ""
    account_type: str = ""
    vendor_name_normalized: str = ""
    date_parsed: Optional[str] = None


# ═══════════════════════════════════════════════════════════════════════
#  RECONCILIATION
# ═══════════════════════════════════════════════════════════════════════

class MatchDetail(BaseModel):
    transaction_id: str
    date: str
    vendor: str
    bank_amount: float
    invoice_amount: Optional[float] = None
    ledger_amount: Optional[float] = None
    possible_invoice_id: Optional[str] = None
    possible_ledger_id: Optional[str] = None
    status: MatchStatus
    confidence: float
    vendor_similarity: float = 0.0
    amount_similarity: float = 0.0
    date_similarity: float = 0.0
    reference_similarity: float = 0.0
    amount_difference: float = 0.0
    date_difference_days: int = 0
    explanation: str = ""


# ═══════════════════════════════════════════════════════════════════════
#  EXCEPTIONS
# ═══════════════════════════════════════════════════════════════════════

class ExceptionRecord(BaseModel):
    exception_id: str
    transaction_id: str
    exception_type: ExceptionType
    risk_level: RiskLevel
    vendor: str = ""
    amount: float = 0.0
    description: str = ""
    evidence: List[str] = []
    recommended_action: str = ""
    confidence_score: float = 0.0
    status: ExceptionStatus = ExceptionStatus.OPEN
    decision_type: Optional[DecisionType] = None
    decision_reason: str = ""
    resolvable: bool = False
    created_at: str = ""
    resolved_at: Optional[str] = None
    resolved_by: Optional[str] = None


# ═══════════════════════════════════════════════════════════════════════
#  AUDIT
# ═══════════════════════════════════════════════════════════════════════

class AuditRecord(BaseModel):
    audit_id: str
    timestamp: str
    transaction_id: str = ""
    exception_id: str = ""
    event_type: AuditEventType
    original_data: str = ""
    match_analysis: str = ""
    evidence: str = ""
    confidence_score: float = 0.0
    ai_recommendation: str = ""
    decision_type: str = ""
    final_action: str = ""
    actor: str = "SYSTEM"


# ═══════════════════════════════════════════════════════════════════════
#  INSIGHTS
# ═══════════════════════════════════════════════════════════════════════

class InsightRecord(BaseModel):
    insight_id: str
    kind: str
    title: str
    description: str
    evidence: str = ""
    possible_root_cause: str = ""
    confidence: float = 0.0
    severity: RiskLevel = RiskLevel.MEDIUM


# ═══════════════════════════════════════════════════════════════════════
#  FORECAST
# ═══════════════════════════════════════════════════════════════════════

class ForecastDay(BaseModel):
    day_offset: int
    label: str
    actual: Optional[float] = None
    forecast: Optional[float] = None


class ForecastResponse(BaseModel):
    current_cash_position: float
    projected_30_day: float
    lowest_expected_balance: float
    lowest_balance_date: str = ""
    risk_level: CashRisk
    recommendation: str = ""
    daily_forecast: List[ForecastDay] = []


# ═══════════════════════════════════════════════════════════════════════
#  DASHBOARD
# ═══════════════════════════════════════════════════════════════════════

class DashboardResponse(BaseModel):
    finance_control_score: float
    finance_control_score_trend: float
    reconciliation: Dict[str, Any]
    exceptions: Dict[str, Any]
    cash_position: float
    ai_actions: Dict[str, Any]
    priority_actions: List[Dict[str, Any]]
    workflow_summary: Dict[str, Any]
    recon_performance: List[Dict[str, Any]]


# ═══════════════════════════════════════════════════════════════════════
#  API RESPONSE WRAPPER
# ═══════════════════════════════════════════════════════════════════════

class APIResponse(BaseModel):
    success: bool
    message: str
    data: Any = None
    error: Any = None


# ═══════════════════════════════════════════════════════════════════════
#  ACTION REQUESTS
# ═══════════════════════════════════════════════════════════════════════

class ApprovalRequest(BaseModel):
    actor: str = "Finance Team"
    notes: str = ""
