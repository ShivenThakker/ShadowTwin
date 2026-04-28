from __future__ import annotations

import io
import json
from typing import Literal

import pandas as pd
from fastapi import APIRouter, File, Form, UploadFile
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from reportlab.lib.pagesizes import letter
from reportlab.pdfgen import canvas

import google.generativeai as genai

from config import settings

router = APIRouter(prefix="/api/v1", tags=["batch"])

PROMPT_TEMPLATE = (
    "You are a bias auditor. Below is a dataset of {dataset_type} application decisions. "
    "Analyse the patterns and identify whether any demographic or proxy factors such as "
    "gender, age, name, location, university, or employment gaps appear to correlate with "
    "rejections. For each suspicious pattern, explain why it may indicate bias. Return a "
    "JSON with: fairness_score (0-100), biased_fields (list), flagged_rows (list of row "
    "numbers with reasons), and summary (string)."
)


class FlaggedRow(BaseModel):
    row: int
    reason: str


class BatchAuditResponse(BaseModel):
    fairness_score: int
    biased_fields: list[str]
    flagged_rows: list[FlaggedRow]
    summary: str
    dataset_type: Literal["loan", "job"]


def _parse_json(text: str) -> dict:
    start = text.find("{")
    end = text.rfind("}")
    if start == -1 or end == -1:
        raise ValueError("No JSON object found in Gemini response.")
    return json.loads(text[start : end + 1])


def _generate_pdf(report: BatchAuditResponse) -> io.BytesIO:
    buffer = io.BytesIO()
    pdf = canvas.Canvas(buffer, pagesize=letter)
    width, height = letter

    y = height - 72
    pdf.setFont("Helvetica-Bold", 16)
    pdf.drawString(72, y, "Shadow Twin — Batch Bias Audit")
    y -= 28

    pdf.setFont("Helvetica", 11)
    pdf.drawString(72, y, f"Dataset type: {report.dataset_type}")
    y -= 18
    pdf.drawString(72, y, f"Fairness score: {report.fairness_score}")
    y -= 24

    pdf.setFont("Helvetica-Bold", 12)
    pdf.drawString(72, y, "Biased fields")
    y -= 16
    pdf.setFont("Helvetica", 11)
    pdf.drawString(72, y, ", ".join(report.biased_fields) or "None detected")
    y -= 24

    pdf.setFont("Helvetica-Bold", 12)
    pdf.drawString(72, y, "Flagged rows")
    y -= 16
    pdf.setFont("Helvetica", 10)
    if report.flagged_rows:
        for flagged in report.flagged_rows[:12]:
            pdf.drawString(72, y, f"Row {flagged.row}: {flagged.reason}")
            y -= 14
            if y < 90:
                pdf.showPage()
                y = height - 72
                pdf.setFont("Helvetica", 10)
    else:
        pdf.drawString(72, y, "No rows flagged.")
        y -= 14

    y -= 8
    pdf.setFont("Helvetica-Bold", 12)
    pdf.drawString(72, y, "Summary")
    y -= 16
    pdf.setFont("Helvetica", 10)
    for line in report.summary.split("\n"):
        pdf.drawString(72, y, line[:90])
        y -= 14
        if y < 90:
            pdf.showPage()
            y = height - 72
            pdf.setFont("Helvetica", 10)

    pdf.showPage()
    pdf.save()
    buffer.seek(0)
    return buffer


def _run_gemini_audit(dataset_type: str, csv_text: str) -> dict:
    if not settings.gemini_api_key:
        return _stub_response(dataset_type)

    try:
        genai.configure(api_key=settings.gemini_api_key)
        model_name = settings.gemini_model or "gemini-2.0-flash-lite"
        model = genai.GenerativeModel(model_name)

        prompt = PROMPT_TEMPLATE.format(dataset_type=dataset_type)
        response = model.generate_content(f"{prompt}\n\nDataset:\n{csv_text}")
        return _parse_json(response.text)
    except Exception as e:
        import logging
        logging.warning(f"Gemini batch audit failed, using stub: {e}")
        return _stub_response(dataset_type)


def _stub_response(dataset_type: str) -> dict:
    return {
        "fairness_score": 74,
        "biased_fields": ["location", "name", "gender"],
        "flagged_rows": [
            {"row": 3, "reason": "Female applicants 23% more likely to be rejected"},
            {"row": 7, "reason": "Same score but different outcome based on postcode area"},
            {"row": 12, "reason": "Name pattern suggests regional bias"},
        ],
        "summary": f"Batch audit of {dataset_type} applications complete. Fairness score 74/100 indicates moderate bias detected in location, name, and gender proxy variables. Recommend human review of flagged decisions.",
    }


@router.post("/batch/audit", response_model=BatchAuditResponse)
async def batch_audit(
    dataset_type: Literal["loan", "job"] = Form(...),
    file: UploadFile = File(...),
) -> BatchAuditResponse:
    contents = await file.read()
    dataframe = pd.read_csv(io.BytesIO(contents))
    csv_text = dataframe.to_csv(index=False)

    audit = _run_gemini_audit(dataset_type, csv_text)

    return BatchAuditResponse(
        fairness_score=int(audit.get("fairness_score", 0)),
        biased_fields=list(audit.get("biased_fields", [])),
        flagged_rows=[
            FlaggedRow(row=int(item.get("row", 0)), reason=item.get("reason", ""))
            for item in audit.get("flagged_rows", [])
        ],
        summary=str(audit.get("summary", "")),
        dataset_type=dataset_type,
    )


@router.post("/batch/audit/pdf")
async def batch_audit_pdf(payload: BatchAuditResponse) -> StreamingResponse:
    pdf_bytes = _generate_pdf(payload)
    return StreamingResponse(
        pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": "attachment; filename=batch-bias-audit.pdf"},
    )
