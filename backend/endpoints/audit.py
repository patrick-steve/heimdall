"""Audit report generation via Gemini Pro (with PDF/MD export).

POST /api/audit/report/{chain_id} returns a streamed Markdown incident
report. /api/audit/report/{chain_id}/pdf returns it as a downloadable PDF.
"""
from __future__ import annotations

import io
import uuid
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import Response, StreamingResponse
from sqlalchemy.orm import Session

from backend.audit import generate_incident_report_md
from backend.db import ChainCredential, Incident, RuleEvaluation, get_db
from backend.policy_loader import get_active_vertical

router = APIRouter()


def _build_chain_summary(creds: list[ChainCredential]) -> str:
    if not creds:
        return "(empty chain)"
    lines = []
    for i, c in enumerate(creds):
        lines.append(
            f"Hop {i + 1}: {c.caller_id} → {c.callee_id}  action={c.action}  "
            f"scope={c.scope}  tenant={c.tenant_id}  intent=\"{c.declared_intent or ''}\""
        )
    return "\n".join(lines)


def _build_violations_summary(evals: list[RuleEvaluation]) -> str:
    blockers = [e for e in evals if e.result in ("DENY", "FLAG")]
    if not blockers:
        return "(no violations)"
    return "\n".join(
        f"- [{e.layer.upper()}] {e.rule_name} ({e.result}): {e.reason}" for e in blockers
    )


@router.post("/audit/report/{chain_id}")
async def create_report(
    chain_id: str,
    request: Request,
    db: Session = Depends(get_db),
) -> StreamingResponse:
    creds = (
        db.query(ChainCredential)
        .filter_by(chain_id=chain_id)
        .order_by(ChainCredential.issued_at)
        .all()
    )
    if not creds:
        raise HTTPException(status_code=404, detail="chain not found")

    evals = db.query(RuleEvaluation).filter_by(chain_id=chain_id).all()
    chain_log = _build_chain_summary(creds)
    violations = _build_violations_summary(evals)
    vertical = get_active_vertical()

    ws_manager = request.app.state.ws_manager
    incident_id = f"inc-{uuid.uuid4().hex[:8]}"
    severity = "HIGH" if any(e.result == "DENY" for e in evals) else "INFO"

    async def stream() -> Any:
        buffer = []
        await ws_manager.broadcast({
            "type": "incident_report_start",
            "incident_id": incident_id,
            "chain_id": chain_id,
            "vertical": vertical,
        })
        async for chunk in generate_incident_report_md(chain_log, violations, vertical):
            buffer.append(chunk)
            await ws_manager.broadcast({
                "type": "incident_report_chunk",
                "incident_id": incident_id,
                "chunk": chunk,
            })
            yield chunk

        full = "".join(buffer)
        # Persist incident
        db.add(Incident(
            id=incident_id,
            chain_id=chain_id,
            vertical=vertical,
            severity=severity,
            summary=violations.split("\n")[0][:200],
            full_report=full,
        ))
        db.commit()
        await ws_manager.broadcast({
            "type": "incident_report_end",
            "incident_id": incident_id,
        })

    return StreamingResponse(stream(), media_type="text/markdown")


@router.get("/audit/report/{chain_id}.md")
async def download_md(chain_id: str, db: Session = Depends(get_db)) -> Response:
    inc = (
        db.query(Incident)
        .filter_by(chain_id=chain_id)
        .order_by(Incident.created_at.desc())
        .first()
    )
    if not inc:
        raise HTTPException(status_code=404, detail="no incident report; POST first")
    headers = {"Content-Disposition": f'attachment; filename="{inc.id}.md"'}
    return Response(content=inc.full_report or "", media_type="text/markdown", headers=headers)


@router.get("/audit/report/{chain_id}.pdf")
async def download_pdf(chain_id: str, db: Session = Depends(get_db)) -> Response:
    inc = (
        db.query(Incident)
        .filter_by(chain_id=chain_id)
        .order_by(Incident.created_at.desc())
        .first()
    )
    if not inc:
        raise HTTPException(status_code=404, detail="no incident report; POST first")

    pdf_bytes = _markdown_to_pdf_bytes(
        title=f"Heimdall Incident Report — {inc.id}",
        markdown=inc.full_report or "",
        meta=[
            f"Chain ID: {inc.chain_id}",
            f"Vertical: {inc.vertical}",
            f"Severity: {inc.severity}",
            f"Generated: {inc.created_at.isoformat() if inc.created_at else ''}",
        ],
    )
    headers = {"Content-Disposition": f'attachment; filename="{inc.id}.pdf"'}
    return Response(content=pdf_bytes, media_type="application/pdf", headers=headers)


def _markdown_to_pdf_bytes(title: str, markdown: str, meta: list[str]) -> bytes:
    """Minimal MD→PDF renderer using reportlab. Headers, bullets, paragraphs."""
    from reportlab.lib.pagesizes import LETTER
    from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
    from reportlab.lib.units import inch
    from reportlab.platypus import (
        Paragraph,
        SimpleDocTemplate,
        Spacer,
    )

    buf = io.BytesIO()
    doc = SimpleDocTemplate(
        buf,
        pagesize=LETTER,
        leftMargin=0.75 * inch,
        rightMargin=0.75 * inch,
        topMargin=0.75 * inch,
        bottomMargin=0.75 * inch,
        title=title,
    )

    styles = getSampleStyleSheet()
    h1 = styles["Heading1"]
    h2 = styles["Heading2"]
    body = styles["BodyText"]
    _ = ParagraphStyle  # keep import in scope; reserved for future code blocks

    story = [Paragraph(title, h1), Spacer(1, 8)]
    for line in meta:
        story.append(Paragraph(line, body))
    story.append(Spacer(1, 12))

    for raw in markdown.splitlines():
        line = raw.rstrip()
        if not line:
            story.append(Spacer(1, 6))
            continue
        if line.startswith("# "):
            story.append(Paragraph(line[2:], h1))
        elif line.startswith("## "):
            story.append(Paragraph(line[3:], h2))
        elif line.startswith("### "):
            story.append(Paragraph(line[4:], h2))
        elif line.startswith("- ") or line.startswith("* "):
            story.append(Paragraph("• " + line[2:], body))
        elif line.startswith("```"):
            continue
        else:
            story.append(Paragraph(line.replace("<", "&lt;").replace(">", "&gt;"), body))

    doc.build(story)
    return buf.getvalue()
