# Anchor SSOT

Anchor is a tiny “Single Source of Truth” dashboard that shows the reality of Brian’s projects on one screen.

## Features
- FastAPI backend (SQLite + SQLAlchemy) with OpenAPI docs.
- React + Vite + Tailwind front end with a compact, one-screen dashboard.
- PWA installable for mobile.
- Tauri desktop wrapper with always-on-top + auto-launch toggles.
- Lyra proposal endpoint with token auth and admin review workflow.

## Quickstart (Docker)
```bash
cp .env.example .env
# edit ADMIN_USER, ADMIN_PASS, LYRA_TOKEN, JWT_SECRET

docker compose up --build
```
- Frontend: http://localhost:5173
- Backend: http://localhost:7085/docs

## Quickstart (No Docker)
### Backend
```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp ../.env.example ../.env
uvicorn app.main:app --reload --port 7085
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```

### Desktop (Tauri)
```bash
cd desktop
npm install
npm run dev
```

## Lyra proposal example
```bash
curl -X POST http://localhost:7085/api/proposals \
  -H "Content-Type: application/json" \
  -H "X-Lyra-Token: $LYRA_TOKEN" \
  -d '{
    "project_id": 1,
    "patch": {"next_action": "Send updated summary to Brian"},
    "reason": "Daily sync",
    "source": "lyra"
  }'
```

## Security notes
- **ADMIN_USER / ADMIN_PASS** control the admin login.
- **JWT_SECRET** signs admin tokens.
- **LYRA_TOKEN** is required for `/api/proposals` POSTs.
- Store secrets in `.env` and never commit real values.

## Release Checklist
- Set env vars in `.env`
- `docker compose up --build`
- Create desktop build (`cd desktop && npm run build`)
- Test PWA install on mobile
- Backup `anchor.db`

## Docs
- [Concept + Boundaries](docs/CONCEPT.md)
