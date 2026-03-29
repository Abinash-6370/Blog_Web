"""
Modern Blog API - Database Manager
SQLite connection and CRUD operations
"""

import sqlite3
import os
from datetime import datetime
from typing import Optional

from models import PostCreate, PostUpdate, PostResponse

DB_PATH = os.path.join(os.path.dirname(__file__), "blog.db")


class DatabaseManager:
    """Manages all SQLite database operations for the blog."""

    def __init__(self, db_path: str = DB_PATH):
        self.db_path = db_path

    def _connect(self) -> sqlite3.Connection:
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row  # Access columns by name
        return conn

    def init_db(self):
        """Create tables and seed sample data if the DB is empty."""
        with self._connect() as conn:
            conn.execute("""
                CREATE TABLE IF NOT EXISTS posts (
                    id         INTEGER PRIMARY KEY AUTOINCREMENT,
                    title      TEXT    NOT NULL,
                    content    TEXT    NOT NULL,
                    author     TEXT    NOT NULL DEFAULT 'Anonymous',
                    tags       TEXT    NOT NULL DEFAULT '',
                    created_at TEXT    NOT NULL,
                    updated_at TEXT    NOT NULL
                )
            """)
            conn.commit()

            # Seed sample data on first run
            count = conn.execute("SELECT COUNT(*) FROM posts").fetchone()[0]
            if count == 0:
                self._seed_data(conn)

    def _seed_data(self, conn: sqlite3.Connection):
        now = datetime.utcnow().isoformat()
        samples = [
            (
                "Welcome to Modern Blog",
                "This is a fully-featured blog built with FastAPI and vanilla JavaScript. "
                "Explore the features: create posts, search, edit, and delete. "
                "The backend uses SQLite for persistence and exposes a clean REST API.",
                "Admin",
                "welcome,intro",
            ),
            (
                "Why FastAPI is Blazingly Fast",
                "FastAPI leverages Python type hints and Pydantic to deliver automatic "
                "validation, serialization, and OpenAPI documentation — all with near-zero "
                "overhead. Benchmarks consistently show it outperforming Flask and Django REST "
                "for high-throughput scenarios.",
                "Dev Team",
                "python,fastapi,backend",
            ),
            (
                "Designing with Glassmorphism",
                "Glassmorphism is a UI trend characterised by frosted-glass surfaces, "
                "subtle borders, and layered depth. Combined with a rich dark background, "
                "it creates an immersive, modern look that feels both futuristic and warm.",
                "UI Designer",
                "design,css,frontend",
            ),
        ]
        conn.executemany(
            "INSERT INTO posts (title, content, author, tags, created_at, updated_at) "
            "VALUES (?, ?, ?, ?, ?, ?)",
            [(t, c, a, tg, now, now) for t, c, a, tg in samples],
        )
        conn.commit()

    # ── Read ───────────────────────────────────────────────────────────────────

    def get_posts(
        self,
        search: Optional[str] = None,
        page: int = 1,
        limit: int = 10,
    ) -> list[PostResponse]:
        offset = (page - 1) * limit
        with self._connect() as conn:
            if search:
                like = f"%{search}%"
                rows = conn.execute(
                    "SELECT * FROM posts "
                    "WHERE title LIKE ? OR content LIKE ? "
                    "ORDER BY created_at DESC LIMIT ? OFFSET ?",
                    (like, like, limit, offset),
                ).fetchall()
            else:
                rows = conn.execute(
                    "SELECT * FROM posts ORDER BY created_at DESC LIMIT ? OFFSET ?",
                    (limit, offset),
                ).fetchall()
        return [PostResponse(**dict(row)) for row in rows]

    def get_post_by_id(self, post_id: int) -> Optional[PostResponse]:
        with self._connect() as conn:
            row = conn.execute(
                "SELECT * FROM posts WHERE id = ?", (post_id,)
            ).fetchone()
        return PostResponse(**dict(row)) if row else None

    # ── Create ─────────────────────────────────────────────────────────────────

    def create_post(self, post: PostCreate) -> PostResponse:
        now = datetime.utcnow().isoformat()
        with self._connect() as conn:
            cur = conn.execute(
                "INSERT INTO posts (title, content, author, tags, created_at, updated_at) "
                "VALUES (?, ?, ?, ?, ?, ?)",
                (post.title, post.content, post.author, post.tags or "", now, now),
            )
            conn.commit()
            row = conn.execute(
                "SELECT * FROM posts WHERE id = ?", (cur.lastrowid,)
            ).fetchone()
        return PostResponse(**dict(row))

    # ── Update ─────────────────────────────────────────────────────────────────

    def update_post(self, post_id: int, post: PostUpdate) -> Optional[PostResponse]:
        existing = self.get_post_by_id(post_id)
        if not existing:
            return None

        updated_at = datetime.utcnow().isoformat()
        new_title   = post.title   if post.title   is not None else existing.title
        new_content = post.content if post.content is not None else existing.content
        new_author  = post.author  if post.author  is not None else existing.author
        new_tags    = post.tags    if post.tags    is not None else existing.tags

        with self._connect() as conn:
            conn.execute(
                "UPDATE posts SET title=?, content=?, author=?, tags=?, updated_at=? "
                "WHERE id=?",
                (new_title, new_content, new_author, new_tags, updated_at, post_id),
            )
            conn.commit()
        return self.get_post_by_id(post_id)

    # ── Delete ─────────────────────────────────────────────────────────────────

    def delete_post(self, post_id: int) -> bool:
        with self._connect() as conn:
            cur = conn.execute("DELETE FROM posts WHERE id = ?", (post_id,))
            conn.commit()
        return cur.rowcount > 0

    # ── Stats ──────────────────────────────────────────────────────────────────

    def get_stats(self) -> dict:
        with self._connect() as conn:
            total = conn.execute("SELECT COUNT(*) FROM posts").fetchone()[0]
            latest = conn.execute(
                "SELECT created_at FROM posts ORDER BY created_at DESC LIMIT 1"
            ).fetchone()
        return {
            "total_posts": total,
            "latest_post": latest[0] if latest else None,
        }
