from datetime import datetime
from fastapi import APIRouter, Depends, Header, HTTPException
from sqlalchemy.orm import Session

from ..auth import require_admin, verify_lyra_token
from ..db import get_db
from ..models import Proposal, Project
from ..schemas import ProposalCreate, Proposal as ProposalSchema, ProposalReviewResponse

router = APIRouter(prefix="/api/proposals", tags=["proposals"])


@router.post("", response_model=ProposalSchema)
def create_proposal(
    payload: ProposalCreate,
    db: Session = Depends(get_db),
    x_lyra_token: str | None = Header(default=None, alias="X-Lyra-Token"),
) -> ProposalSchema:
    verify_lyra_token(x_lyra_token)
    project = db.get(Project, payload.project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    proposal = Proposal(
        project_id=payload.project_id,
        patch=payload.patch.model_dump(exclude_unset=True),
        reason=payload.reason,
        source=payload.source,
        status="pending",
        created_at=datetime.utcnow(),
    )
    db.add(proposal)
    db.commit()
    db.refresh(proposal)
    return proposal


@router.get("", response_model=list[ProposalSchema])
def list_proposals(db: Session = Depends(get_db), _: str = Depends(require_admin)) -> list[ProposalSchema]:
    return db.query(Proposal).order_by(Proposal.created_at.desc()).all()


def apply_patch(project: Project, patch: dict) -> None:
    for key, value in patch.items():
        if key == "links" and value is not None:
            project.links = value
        else:
            setattr(project, key, value)
    project.last_updated = datetime.utcnow()


@router.post("/{proposal_id}/approve", response_model=ProposalReviewResponse)
def approve_proposal(proposal_id: int, db: Session = Depends(get_db), _: str = Depends(require_admin)) -> ProposalReviewResponse:
    proposal = db.get(Proposal, proposal_id)
    if not proposal:
        raise HTTPException(status_code=404, detail="Proposal not found")
    if proposal.status != "pending":
        raise HTTPException(status_code=400, detail="Proposal already reviewed")
    project = db.get(Project, proposal.project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    apply_patch(project, proposal.patch)
    proposal.status = "approved"
    proposal.reviewed_at = datetime.utcnow()
    db.commit()
    db.refresh(project)
    db.refresh(proposal)
    return ProposalReviewResponse(proposal=proposal, project=project)


@router.post("/{proposal_id}/reject", response_model=ProposalSchema)
def reject_proposal(proposal_id: int, db: Session = Depends(get_db), _: str = Depends(require_admin)) -> ProposalSchema:
    proposal = db.get(Proposal, proposal_id)
    if not proposal:
        raise HTTPException(status_code=404, detail="Proposal not found")
    if proposal.status != "pending":
        raise HTTPException(status_code=400, detail="Proposal already reviewed")
    proposal.status = "rejected"
    proposal.reviewed_at = datetime.utcnow()
    db.commit()
    db.refresh(proposal)
    return proposal
