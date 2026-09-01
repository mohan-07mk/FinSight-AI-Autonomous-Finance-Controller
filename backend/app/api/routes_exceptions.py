"""
FinSight AI — Exception API Routes
"""
from fastapi import APIRouter, HTTPException
from app.schemas.schemas import APIResponse, ApprovalRequest
from app.models import store
from app.services.approval_service import (
    approve_exception, reject_exception, escalate_exception,
)

router = APIRouter(prefix="/api/exceptions", tags=["Exceptions"])


@router.get("", response_model=APIResponse)
async def get_exceptions(risk: str = None, status: str = None):
    excs = list(store.exceptions.values())
    if risk:
        excs = [e for e in excs if e.get("risk_level") == risk]
    if status:
        excs = [e for e in excs if e.get("status") == status]
    return APIResponse(success=True, message=f"{len(excs)} exceptions.", data=excs)


@router.get("/{exception_id}", response_model=APIResponse)
async def get_exception_detail(exception_id: str):
    exc = store.exceptions.get(exception_id)
    if not exc:
        raise HTTPException(404, f"Exception {exception_id} not found.")
    return APIResponse(success=True, message="OK", data=exc)


@router.post("/{exception_id}/approve", response_model=APIResponse)
async def approve(exception_id: str, body: ApprovalRequest = None):
    try:
        actor = body.actor if body else "Finance Team"
        notes = body.notes if body else ""
        exc = approve_exception(exception_id, actor, notes)
        return APIResponse(success=True, message=f"Exception {exception_id} approved.", data=exc)
    except ValueError as e:
        raise HTTPException(400, str(e))


@router.post("/{exception_id}/reject", response_model=APIResponse)
async def reject(exception_id: str, body: ApprovalRequest = None):
    try:
        actor = body.actor if body else "Finance Team"
        notes = body.notes if body else ""
        exc = reject_exception(exception_id, actor, notes)
        return APIResponse(success=True, message=f"Exception {exception_id} rejected.", data=exc)
    except ValueError as e:
        raise HTTPException(400, str(e))


@router.post("/{exception_id}/escalate", response_model=APIResponse)
async def escalate(exception_id: str, body: ApprovalRequest = None):
    try:
        actor = body.actor if body else "Finance Team"
        notes = body.notes if body else ""
        exc = escalate_exception(exception_id, actor, notes)
        return APIResponse(success=True, message=f"Exception {exception_id} escalated.", data=exc)
    except ValueError as e:
        raise HTTPException(400, str(e))
