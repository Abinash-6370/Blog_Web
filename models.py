"""
Modern Blog API - Pydantic Models
Request/response validation schemas
"""

from pydantic import BaseModel, Field, validator
from typing import Optional
from datetime import datetime


class PostCreate(BaseModel):
    """Schema for creating a new blog post."""
    title: str = Field(..., min_length=1, max_length=200, description="Post title")
    content: str = Field(..., min_length=1, description="Post content")
    author: Optional[str] = Field(default="Anonymous", max_length=100)
    tags: Optional[str] = Field(default="", description="Comma-separated tags")

    @validator("title")
    def strip_title(cls, v):
        return v.strip()

    @validator("content")
    def strip_content(cls, v):
        return v.strip()

    @validator("author")
    def strip_author(cls, v):
        return (v or "Anonymous").strip() or "Anonymous"

    class Config:
        json_schema_extra = {
            "example": {
                "title": "My First Blog Post",
                "content": "This is the content of my first blog post. It's really exciting!",
                "author": "Jane Doe",
                "tags": "tech,python,web",
            }
        }


class PostUpdate(BaseModel):
    """Schema for updating an existing blog post (all fields optional)."""
    title: Optional[str] = Field(None, min_length=1, max_length=200)
    content: Optional[str] = Field(None, min_length=1)
    author: Optional[str] = Field(None, max_length=100)
    tags: Optional[str] = None

    @validator("title")
    def strip_title(cls, v):
        return v.strip() if v else v

    @validator("content")
    def strip_content(cls, v):
        return v.strip() if v else v


class PostResponse(BaseModel):
    """Schema for returning a blog post."""
    id: int
    title: str
    content: str
    author: str
    tags: str
    created_at: str
    updated_at: str

    class Config:
        from_attributes = True
