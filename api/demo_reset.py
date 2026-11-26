"""The screen-recording demo, reset from the browser: the same as `make demo-retake`.

Only works once `make demo-stage` has saved a staged snapshot. Restoring copies that snapshot
into the live database with SQLite's online backup, then turns the agent fixes off.
"""

from __future__ import annotations

import asyncio
import importlib.util
import os

from fastapi import APIRouter, HTTPException

router = APIRouter()

_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
_spec = importlib.util.spec_from_file_location("demo_stage", os.path.join(_ROOT, "scripts", "demo_stage.py"))
demo_stage = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(demo_stage)


def _state() -> dict:
    link = demo_stage._presenter_link() if os.path.exists(demo_stage.STAGED) else None
    return {"staged": os.path.exists(demo_stage.STAGED), "presenter": link.replace("http://localhost:3000", "") if link else None}


@router.get("/demo/recording")
async def recording():
    return _state()


@router.post("/demo/recording/reset")
async def reset_recording():
    if not os.path.exists(demo_stage.STAGED):
        raise HTTPException(status_code=404, detail="Nothing staged: run `make demo-stage` once first")
    await asyncio.to_thread(demo_stage._copy, demo_stage.STAGED, demo_stage.DB)
    demo_stage._fixes_off()
    return _state()
