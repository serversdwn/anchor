from datetime import datetime
from typing import Optional, Literal

from pydantic import BaseModel, HttpUrl, Field


class Links(BaseModel):
    tesseract: Optional[HttpUrl] = None
    repo: Optional[HttpUrl] = None
    logs: Optional[HttpUrl] = None
    docs: Optional[HttpUrl] = None


Status = Literal["active", "parked", "dormant"]


class ProjectBase(BaseModel):
    name: str = Field(max_length=100)
    status: Status
    current_objective: str = Field(max_length=140)
    next_action: str = Field(max_length=140)
    links: Links = Links()


class ProjectCreate(ProjectBase):
    pass


class ProjectUpdate(BaseModel):
    name: Optional[str] = Field(default=None, max_length=100)
    status: Optional[Status] = None
    current_objective: Optional[str] = Field(default=None, max_length=140)
    next_action: Optional[str] = Field(default=None, max_length=140)
    links: Optional[Links] = None


class Project(ProjectBase):
    id: int
    last_updated: datetime

    class Config:
        from_attributes = True


class ProposalPatch(BaseModel):
    status: Optional[Status] = None
    current_objective: Optional[str] = Field(default=None, max_length=140)
    next_action: Optional[str] = Field(default=None, max_length=140)
    links: Optional[Links] = None


class ProposalCreate(BaseModel):
    project_id: int
    patch: ProposalPatch
    reason: Optional[str] = Field(default=None, max_length=280)
    source: str = "lyra"


class Proposal(BaseModel):
    id: int
    project_id: int
    patch: ProposalPatch
    reason: Optional[str]
    source: str
    status: str
    created_at: datetime
    reviewed_at: Optional[datetime]

    class Config:
        from_attributes = True


class LoginRequest(BaseModel):
    username: str
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


class AdminInfo(BaseModel):
    username: str


class ProposalReviewResponse(BaseModel):
    proposal: Proposal
    project: Project
