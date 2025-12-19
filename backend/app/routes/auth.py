from fastapi import APIRouter, HTTPException, status, Depends

from ..config import settings
from ..schemas import LoginRequest, TokenResponse, AdminInfo
from ..auth import create_access_token, require_admin

router = APIRouter(prefix="/api/auth", tags=["auth"])


@router.post("/login", response_model=TokenResponse)
def login(payload: LoginRequest) -> TokenResponse:
    if payload.username != settings.admin_user or payload.password != settings.admin_pass:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")
    token = create_access_token(payload.username)
    return TokenResponse(access_token=token)


@router.post("/logout")
def logout(_: str = Depends(require_admin)) -> dict:
    return {"ok": True}


@router.get("/me", response_model=AdminInfo)
def me(user: str = Depends(require_admin)) -> AdminInfo:
    return AdminInfo(username=user)
