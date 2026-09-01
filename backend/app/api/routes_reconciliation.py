"""
FinSight AI — Reconciliation API Routes
"""
from fastapi import APIRouter, HTTPException
from app.schemas.schemas import APIResponse, AuditEventType
from app.models import store
from app.services.reconciliation_service import run_reconciliation
from app.services.exception_service import detect_exceptions, detect_duplicates
from app.services.audit_service import create_audit_entry

router = APIRouter(prefix="/api/reconciliation", tags=["Reconciliation"])


@router.post("/run", response_model=APIResponse)
async def run_recon():
    if not store.bank_transactions:
        raise HTTPException(400, "No bank transactions uploaded. Upload data first.")

    # Clear previous results
    store.reconciliation_results.clear()
    store.exceptions.clear()

    # Run reconciliation
    results = run_reconciliation()

    # Detect exceptions from results
    exceptions = detect_exceptions()

    # Detect duplicates
    duplicates = detect_duplicates()

    # Auto-resolve audit entries
    for exc in exceptions + duplicates:
        if exc.get("status") == "AUTO_RESOLVED":
            create_audit_entry(
                AuditEventType.EXCEPTION_AUTO_RESOLVED,
                transaction_id=exc.get("transaction_id", ""),
                exception_id=exc.get("exception_id", ""),
                evidence=", ".join(exc.get("evidence", [])),
                confidence_score=exc.get("confidence_score", 0),
                ai_recommendation=exc.get("recommended_action", ""),
                decision_type="AUTO_RESOLVE",
                final_action="Auto-resolved by AI Controller",
                actor="AI_CONTROLLER",
            )
        else:
            create_audit_entry(
                AuditEventType.EXCEPTION_CREATED,
                transaction_id=exc.get("transaction_id", ""),
                exception_id=exc.get("exception_id", ""),
                evidence=", ".join(exc.get("evidence", [])),
                confidence_score=exc.get("confidence_score", 0),
                ai_recommendation=exc.get("recommended_action", ""),
                decision_type=exc.get("decision_type", ""),
                final_action="Pending review",
                actor="AI_CONTROLLER",
            )

    matched = sum(1 for r in results if r.get("status") == "Matched")
    create_audit_entry(
        AuditEventType.RECONCILIATION_RUN,
        original_data=f"{len(results)} transactions processed",
        final_action=f"Matched: {matched}, Exceptions: {len(exceptions) + len(duplicates)}",
        actor="SYSTEM",
    )

    return APIResponse(
        success=True,
        message=f"Reconciliation complete. {len(results)} transactions processed.",
        data={
            "total_transactions": len(results),
            "matched": matched,
            "partial_match": sum(1 for r in results if r.get("status") == "Partial Match"),
            "unmatched": sum(1 for r in results if r.get("status") in ("Unmatched", "AI Review")),
            "exceptions_created": len(exceptions) + len(duplicates),
        },
    )


@router.get("/results", response_model=APIResponse)
async def get_results():
    results = list(store.reconciliation_results.values())
    return APIResponse(success=True, message=f"{len(results)} results.", data=results)


@router.get("/{transaction_id}", response_model=APIResponse)
async def get_result_detail(transaction_id: str):
    result = store.reconciliation_results.get(transaction_id)
    if not result:
        raise HTTPException(404, f"Transaction {transaction_id} not found.")
    return APIResponse(success=True, message="OK", data=result)
