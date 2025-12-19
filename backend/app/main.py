from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session

from .config import settings
from .db import engine, SessionLocal
from .models import Base, Project
from .routes import auth as auth_routes
from .routes import projects as projects_routes
from .routes import proposals as proposals_routes

app = FastAPI(title="Anchor SSOT", version="0.1.0")

origins = [origin.strip() for origin in settings.cors_origins.split(",") if origin.strip()]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_routes.router)
app.include_router(projects_routes.router)
app.include_router(proposals_routes.router)


SEED_PROJECTS = [
    {
        "name": "Lyra",
        "status": "active",
        "current_objective": "Ship proposal flow for Anchor",
        "next_action": "Test POST /api/proposals with sample payload",
        "links": {"repo": "https://example.com/lyra"},
    },
    {
        "name": "SFM",
        "status": "parked",
        "current_objective": "Clarify next milestone",
        "next_action": "Review roadmap notes",
        "links": {"docs": "https://example.com/sfm"},
    },
    {
        "name": "Tesseract",
        "status": "dormant",
        "current_objective": "Hold pending resource availability",
        "next_action": "Revisit in Q4",
        "links": {"tesseract": "https://example.com/tesseract"},
    },
]


def seed_data(db: Session) -> None:
    if db.query(Project).count() > 0:
        return
    for item in SEED_PROJECTS:
        project = Project(**item)
        db.add(project)
    db.commit()


@app.on_event("startup")
def on_startup() -> None:
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        seed_data(db)
    finally:
        db.close()


@app.get("/health")
def health() -> dict:
    return {"ok": True}
