import json
import uuid
from datetime import datetime
from fastapi import APIRouter, Header
from pydantic import BaseModel
from typing import Optional, List
from app.database import DB_PATH

router = APIRouter(prefix="/api/workspace", tags=["collaboration"])


class CommentPayload(BaseModel):
    workspace_id: str
    finding_hash: str
    author: str
    comment: str


class CommentResponse(BaseModel):
    id: str
    workspace_id: str
    finding_hash: str
    author: str
    comment: str
    created_at: str


def _init_comments_table():
    import sqlite3
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS workspace_comments (
            id TEXT PRIMARY KEY,
            workspace_id TEXT NOT NULL,
            finding_hash TEXT NOT NULL,
            author TEXT NOT NULL,
            comment TEXT NOT NULL,
            created_at TEXT NOT NULL
        )
    """)
    conn.commit()
    conn.close()


_init_comments_table()


@router.post("/comment")
async def add_comment(payload: CommentPayload):
    import sqlite3
    comment_id = str(uuid.uuid4())[:8]
    now = datetime.now().isoformat()
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute(
        "INSERT INTO workspace_comments (id, workspace_id, finding_hash, author, comment, created_at) VALUES (?, ?, ?, ?, ?, ?)",
        (comment_id, payload.workspace_id, payload.finding_hash, payload.author, payload.comment, now),
    )
    conn.commit()
    conn.close()
    return {
        "id": comment_id,
        "status": "created",
        "created_at": now,
    }


@router.get("/comments/{workspace_id}")
async def get_comments(workspace_id: str):
    import sqlite3
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute(
        "SELECT id, workspace_id, finding_hash, author, comment, created_at FROM workspace_comments WHERE workspace_id = ? ORDER BY created_at ASC",
        (workspace_id,),
    )
    rows = cursor.fetchall()
    conn.close()
    return {
        "comments": [
            {
                "id": r[0],
                "workspace_id": r[1],
                "finding_hash": r[2],
                "author": r[3],
                "comment": r[4],
                "created_at": r[5],
            }
            for r in rows
        ]
    }
