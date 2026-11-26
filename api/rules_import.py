"""Rule import from Excel, with validation, as a new rule version.

Kiyos's tax team keeps rules in a spreadsheet. An upload is read row by row (Excel .xlsx or
.csv), each row checked (ID format, country, tax year, category, a section and a summary),
and the valid rows saved as one new rule version, marked "pending validation". Imported rules
are not used by the agent until Kiyos's tax team validates them: an import never changes how
Kiyos answers. The same file can't be imported twice (versions are identified by a hash).
"""

from __future__ import annotations

import base64
import csv
import hashlib
import io
import re
import zipfile
from datetime import datetime, timezone
from typing import Any, Optional
from xml.etree import ElementTree as ET

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import Response
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from db import get_session
from infra.schema import RuleVersion

router = APIRouter()

COLUMNS = ["id", "jurisdiction", "tax_year", "category", "section", "summary"]
CATEGORIES = {"residency", "salary", "capital-gains", "property", "retirement", "reporting", "deductions", "investments"}
NS = {"m": "http://schemas.openxmlformats.org/spreadsheetml/2006/main"}


# ------------------------------------------------------------------ reading the file


def _read_xlsx(data: bytes) -> list[list[str]]:
    z = zipfile.ZipFile(io.BytesIO(data))
    shared: list[str] = []
    if "xl/sharedStrings.xml" in z.namelist():
        for si in ET.fromstring(z.read("xl/sharedStrings.xml")).findall("m:si", NS):
            shared.append("".join(t.text or "" for t in si.iter(f"{{{NS['m']}}}t")))
    sheet = next(n for n in z.namelist() if n.startswith("xl/worksheets/sheet"))
    rows: list[list[str]] = []
    for r in ET.fromstring(z.read(sheet)).iter(f"{{{NS['m']}}}row"):
        cells: dict[int, str] = {}
        for c in r.findall("m:c", NS):
            ref = c.get("r", "")
            col = 0
            for ch in re.match(r"[A-Z]+", ref).group(0) if ref else "A":
                col = col * 26 + (ord(ch) - 64)
            t = c.get("t")
            if t == "inlineStr":
                val = "".join(x.text or "" for x in c.iter(f"{{{NS['m']}}}t"))
            else:
                v = c.find("m:v", NS)
                val = (v.text or "") if v is not None else ""
                if t == "s" and val:
                    val = shared[int(val)]
            cells[col - 1] = val.strip()
        if cells:
            rows.append([cells.get(i, "") for i in range(max(cells) + 1)])
    return rows


def _read(filename: str, data: bytes) -> list[list[str]]:
    if filename.lower().endswith(".xlsx"):
        return _read_xlsx(data)
    if filename.lower().endswith(".csv"):
        return [[c.strip() for c in row] for row in csv.reader(io.StringIO(data.decode("utf-8-sig")))]
    raise HTTPException(status_code=422, detail="Upload an Excel (.xlsx) or CSV file")


def _validate(rows: list[list[str]]) -> list[dict[str, Any]]:
    if not rows:
        raise HTTPException(status_code=422, detail="The file is empty")
    header = [h.strip().lower().replace(" ", "_") for h in rows[0]]
    missing = [c for c in COLUMNS if c not in header]
    if missing:
        raise HTTPException(status_code=422, detail=f"Missing columns: {', '.join(missing)}. Use the template.")
    idx = {c: header.index(c) for c in COLUMNS}
    out, seen = [], set()
    for n, raw in enumerate(rows[1:], start=2):
        if not any(raw):
            continue
        r = {c: (raw[idx[c]] if idx[c] < len(raw) else "").strip() for c in COLUMNS}
        errors: list[str] = []
        if not re.fullmatch(r"(IN|US)-[A-Z0-9-]{2,40}", r["id"]):
            errors.append("ID must look like IN-RES-182 or US-SPT-183")
        if r["jurisdiction"] not in ("IN", "US"):
            errors.append("Jurisdiction must be IN or US")
        elif r["id"][:2] in ("IN", "US") and r["id"][:2] != r["jurisdiction"]:
            errors.append("ID prefix doesn't match the jurisdiction")
        if r["jurisdiction"] == "IN" and not re.fullmatch(r"20\d\d-\d\d", r["tax_year"]):
            errors.append("India tax year must look like 2026-27")
        if r["jurisdiction"] == "US" and not re.fullmatch(r"20\d\d", r["tax_year"]):
            errors.append("US tax year must look like 2026")
        if r["category"].lower() not in CATEGORIES:
            errors.append(f"Category must be one of: {', '.join(sorted(CATEGORIES))}")
        if not r["section"]:
            errors.append("Section of the law is required")
        if len(r["summary"]) < 20:
            errors.append("Summary is too short (at least 20 characters)")
        if r["id"] in seen:
            errors.append("Duplicate ID in this file")
        seen.add(r["id"])
        out.append({"row": n, **r, "category": r["category"].lower(), "errors": errors})
    return out


# ------------------------------------------------------------------ endpoints


class FileIn(BaseModel):
    filename: str
    content_b64: str
    by: Optional[str] = None


def _decode(body: FileIn) -> bytes:
    try:
        return base64.b64decode(body.content_b64)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail="Couldn't read the file") from exc


@router.post("/rules/import/preview")
async def preview(body: FileIn, session: AsyncSession = Depends(get_session)):
    data = _decode(body)
    rows = _validate(_read(body.filename, data))
    digest = hashlib.sha256(data).hexdigest()
    dup = (await session.execute(select(RuleVersion).where(RuleVersion.hash == digest))).scalars().first()
    return {"filename": body.filename, "rows": rows, "valid": sum(1 for r in rows if not r["errors"]),
            "invalid": sum(1 for r in rows if r["errors"]), "already_imported_as": dup.id if dup else None}


@router.post("/rules/import/commit")
async def commit(body: FileIn, session: AsyncSession = Depends(get_session)):
    data = _decode(body)
    rows = _validate(_read(body.filename, data))
    valid = [{k: v for k, v in r.items() if k != "errors"} for r in rows if not r["errors"]]
    if not valid:
        raise HTTPException(status_code=422, detail="No valid rows to import")
    digest = hashlib.sha256(data).hexdigest()
    if (await session.execute(select(RuleVersion).where(RuleVersion.hash == digest))).scalars().first():
        raise HTTPException(status_code=409, detail="This file has already been imported")
    v = RuleVersion(hash=digest, created_at=datetime.now(timezone.utc), snapshot={
        "source": body.filename, "imported_by": body.by or "Kiyos tax team", "status": "pending_validation",
        "rules": valid, "skipped": len(rows) - len(valid)})
    session.add(v)
    await session.commit()
    return {"version": v.id, "imported": len(valid), "skipped": len(rows) - len(valid)}


@router.get("/rules/versions")
async def versions(session: AsyncSession = Depends(get_session)):
    rows = (await session.execute(select(RuleVersion).order_by(RuleVersion.id.desc()))).scalars().all()
    return [{"version": r.id, "hash": r.hash[:10], "created_at": r.created_at, **(r.snapshot or {})} for r in rows]


# ------------------------------------------------------------------ a sample spreadsheet

SAMPLE = [
    COLUMNS,
    ["IN-LTCG-112A", "IN", "2026-27", "Capital-gains", "112A", "Long-term gains on listed equity shares and equity funds above the exempt amount are taxed at a special rate."],
    ["IN-54EC", "IN", "2026-27", "Property", "54EC", "Long-term gains from land or a building are exempt to the extent invested in specified bonds within six months."],
    ["US-FBAR", "US", "2026", "Reporting", "31 CFR 1010.350", "A US person with foreign accounts above the reporting threshold at any time in the year files an FBAR."],
    ["US-FTC", "IN", "2026", "Reporting", "§901", "Credit for foreign income taxes paid."],
]


def _xlsx(rows: list[list[str]]) -> bytes:
    def col(i: int) -> str:
        return chr(65 + i)

    def esc(s: str) -> str:
        return s.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")

    sheet_rows = "".join(
        f'<row r="{ri + 1}">' + "".join(f'<c r="{col(ci)}{ri + 1}" t="inlineStr"><is><t>{esc(v)}</t></is></c>' for ci, v in enumerate(r)) + "</row>"
        for ri, r in enumerate(rows)
    )
    files = {
        "[Content_Types].xml": '<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/></Types>',
        "_rels/.rels": '<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>',
        "xl/workbook.xml": '<?xml version="1.0" encoding="UTF-8"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="Rules" sheetId="1" r:id="rId1"/></sheets></workbook>',
        "xl/_rels/workbook.xml.rels": '<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/></Relationships>',
        "xl/worksheets/sheet1.xml": f'<?xml version="1.0" encoding="UTF-8"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>{sheet_rows}</sheetData></worksheet>',
    }
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w", zipfile.ZIP_DEFLATED) as z:
        for name, xml in files.items():
            z.writestr(name, xml)
    return buf.getvalue()


@router.get("/rules/import/sample.xlsx")
async def sample():
    return Response(_xlsx(SAMPLE), media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                    headers={"Content-Disposition": 'attachment; filename="kiyos-rules-sample.xlsx"'})
