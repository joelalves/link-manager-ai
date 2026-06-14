from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, EmailStr, Field


# ---- Users / auth ----
class UserCreate(BaseModel):
    username: str = Field(min_length=3, max_length=80)
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)


class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    username: str
    email: EmailStr
    created_at: datetime


class LoginRequest(BaseModel):
    username: str
    password: str


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"


# ---- Links ----
class LinkBase(BaseModel):
    title: Optional[str] = ""
    description: Optional[str] = ""
    category: Optional[str] = ""
    tags: list[str] = Field(default_factory=list)


class LinkCreate(LinkBase):
    url: str = Field(min_length=1, max_length=2048)
    # When true, missing fields are filled by the AI analyzer.
    use_ai: bool = True


class LinkUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    category: Optional[str] = None
    tags: Optional[list[str]] = None


class LinkOut(LinkBase):
    model_config = ConfigDict(from_attributes=True)
    id: int
    url: str
    created_at: datetime
    updated_at: datetime


# ---- AI analysis ----
class AnalyzeRequest(BaseModel):
    url: str = Field(min_length=1, max_length=2048)


class AnalyzeResponse(BaseModel):
    title: str
    description: str
    category: str
    tags: list[str]
