"""
FinSight AI — Upload API Routes
"""
from fastapi import APIRouter, UploadFile, File, HTTPException
from app.schemas.schemas import APIResponse, AuditEventType
from app.services.file_processor import (
    process_bank_file, process_invoice_file, process_ledger_file,
)
from app.services.audit_service import create_audit_entry

router = APIRouter(prefix="/api/upload", tags=["Upload"])


@router.post("/bank", response_model=APIResponse)
async def upload_bank(file: UploadFile = File(...)):
    try:
        content = await file.read()
        if not content:
            raise HTTPException(400, "Uploaded file is empty.")
        count, records = process_bank_file(content, file.filename or "upload.csv")
        create_audit_entry(
            AuditEventType.FILE_UPLOADED,
            original_data=f"Bank statement: {file.filename}",
            final_action=f"Uploaded {count} bank transactions",
        )
        return APIResponse(
            success=True,
            message=f"Successfully processed {count} bank transactions.",
            data={"count": count, "filename": file.filename},
        )
    except ValueError as e:
        raise HTTPException(400, str(e))


@router.post("/invoices", response_model=APIResponse)
async def upload_invoices(file: UploadFile = File(...)):
    try:
        content = await file.read()
        if not content:
            raise HTTPException(400, "Uploaded file is empty.")
        count, records = process_invoice_file(content, file.filename or "upload.csv")
        create_audit_entry(
            AuditEventType.FILE_UPLOADED,
            original_data=f"Invoice data: {file.filename}",
            final_action=f"Uploaded {count} invoices",
        )
        return APIResponse(
            success=True,
            message=f"Successfully processed {count} invoices.",
            data={"count": count, "filename": file.filename},
        )
    except ValueError as e:
        raise HTTPException(400, str(e))


@router.post("/ledger", response_model=APIResponse)
async def upload_ledger(file: UploadFile = File(...)):
    try:
        content = await file.read()
        if not content:
            raise HTTPException(400, "Uploaded file is empty.")
        count, records = process_ledger_file(content, file.filename or "upload.csv")
        create_audit_entry(
            AuditEventType.FILE_UPLOADED,
            original_data=f"Ledger data: {file.filename}",
            final_action=f"Uploaded {count} ledger entries",
        )
        return APIResponse(
            success=True,
            message=f"Successfully processed {count} ledger entries.",
            data={"count": count, "filename": file.filename},
        )
    except ValueError as e:
        raise HTTPException(400, str(e))
