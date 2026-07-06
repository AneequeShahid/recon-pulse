import os
import json
from fastapi import APIRouter, HTTPException
from fastapi.responses import JSONResponse

router = APIRouter(prefix="/api/playbooks", tags=["playbooks"])

PLAYBOOKS_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "static", "playbooks")


def _list_playbook_ids() -> list[str]:
    if not os.path.isdir(PLAYBOOKS_DIR):
        return []
    return [f.replace(".json", "") for f in os.listdir(PLAYBOOKS_DIR) if f.endswith(".json")]


@router.get("")
async def list_playbooks():
    ids = _list_playbook_ids()
    return {"playbooks": ids, "count": len(ids)}


@router.get("/{playbook_id}")
async def get_playbook(playbook_id: str):
    safe = playbook_id.replace("..", "").replace("/", "").replace("\\", "")
    path = os.path.join(PLAYBOOKS_DIR, f"{safe}.json")
    if not os.path.isfile(path):
        raise HTTPException(status_code=404, detail="Playbook not found")
    try:
        with open(path, "r") as f:
            data = json.load(f)
        return data
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error reading playbook: {e}")
