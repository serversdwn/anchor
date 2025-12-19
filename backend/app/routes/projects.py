from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ..db import get_db
from ..models import Project
from ..schemas import ProjectCreate, ProjectUpdate, Project as ProjectSchema
from ..auth import require_admin

router = APIRouter(prefix="/api/projects", tags=["projects"])


@router.get("", response_model=list[ProjectSchema])
def list_projects(db: Session = Depends(get_db)) -> list[ProjectSchema]:
    return db.query(Project).order_by(Project.status, Project.name).all()


@router.post("", response_model=ProjectSchema)
def create_project(payload: ProjectCreate, db: Session = Depends(get_db), _: str = Depends(require_admin)) -> ProjectSchema:
    project = Project(
        name=payload.name,
        status=payload.status,
        current_objective=payload.current_objective,
        next_action=payload.next_action,
        links=payload.links.model_dump() if payload.links else {},
        last_updated=datetime.utcnow(),
    )
    db.add(project)
    db.commit()
    db.refresh(project)
    return project


@router.get("/{project_id}", response_model=ProjectSchema)
def get_project(project_id: int, db: Session = Depends(get_db)) -> ProjectSchema:
    project = db.get(Project, project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    return project


@router.put("/{project_id}", response_model=ProjectSchema)
def update_project(project_id: int, payload: ProjectUpdate, db: Session = Depends(get_db), _: str = Depends(require_admin)) -> ProjectSchema:
    project = db.get(Project, project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    data = payload.model_dump(exclude_unset=True)
    if "links" in data and data["links"] is not None:
        data["links"] = data["links"].model_dump()
    for key, value in data.items():
        setattr(project, key, value)
    project.last_updated = datetime.utcnow()
    db.commit()
    db.refresh(project)
    return project


@router.delete("/{project_id}")
def delete_project(project_id: int, db: Session = Depends(get_db), _: str = Depends(require_admin)) -> dict:
    project = db.get(Project, project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    db.delete(project)
    db.commit()
    return {"ok": True}
