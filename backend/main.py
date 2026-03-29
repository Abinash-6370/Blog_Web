"""
Modern Blog API - FastAPI Backend
Main application entry point
"""

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from typing import Optional
from datetime import datetime

from models import PostCreate, PostUpdate, PostResponse
from database import DatabaseManager

# ── App Setup ──────────────────────────────────────────────────────────────────
app = FastAPI(
    title="Modern Blog API",
    description="A clean REST API for a modern blog application",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],          # In production, restrict to your frontend domain
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

db = DatabaseManager()


# ── Routes ─────────────────────────────────────────────────────────────────────

@app.on_event("startup")
async def startup():
    """Initialize the database on startup."""
    db.init_db()


@app.get("/", tags=["Health"])
def root():
    return {"status": "ok", "message": "Modern Blog API is running 🚀"}


@app.get("/posts", response_model=list[PostResponse], tags=["Posts"])
def get_posts(
    search: Optional[str] = Query(None, description="Search in title or content"),
    page: int = Query(1, ge=1, description="Page number"),
    limit: int = Query(10, ge=1, le=100, description="Posts per page"),
):
    """
    Fetch all blog posts with optional search and pagination.
    - **search**: Filter posts by keyword in title or content
    - **page**: Page number (default 1)
    - **limit**: Number of posts per page (default 10)
    """
    return db.get_posts(search=search, page=page, limit=limit)


@app.get("/posts/{post_id}", response_model=PostResponse, tags=["Posts"])
def get_post(post_id: int):
    """Fetch a single blog post by ID."""
    post = db.get_post_by_id(post_id)
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    return post


@app.post("/posts", response_model=PostResponse, status_code=201, tags=["Posts"])
def create_post(post: PostCreate):
    """
    Create a new blog post.
    - **title**: Post title (required, 1–200 chars)
    - **content**: Post body (required)
    - **author**: Author name (optional, defaults to 'Anonymous')
    - **tags**: Comma-separated list of tags (optional)
    """
    return db.create_post(post)


@app.put("/posts/{post_id}", response_model=PostResponse, tags=["Posts"])
def update_post(post_id: int, post: PostUpdate):
    """Update an existing blog post."""
    updated = db.update_post(post_id, post)
    if not updated:
        raise HTTPException(status_code=404, detail="Post not found")
    return updated


@app.delete("/posts/{post_id}", tags=["Posts"])
def delete_post(post_id: int):
    """Delete a blog post by ID."""
    deleted = db.delete_post(post_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Post not found")
    return {"success": True, "message": f"Post {post_id} deleted successfully"}


@app.get("/stats", tags=["Stats"])
def get_stats():
    """Get blog statistics."""
    return db.get_stats()
