"""
Verifies Supabase-issued access tokens by asking Supabase's own Auth server
whether the token is valid, rather than decoding it locally with a shared
secret. This is Supabase's recommended approach and works regardless of
whether the project uses symmetric or asymmetric JWT signing keys.

Docs: https://supabase.com/docs/guides/auth/jwts
"""

import os

import httpx
from dotenv import load_dotenv
from fastapi import Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_ANON_KEY = os.getenv("SUPABASE_ANON_KEY")

bearer_scheme = HTTPBearer(auto_error=False)


def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme)) -> dict:
    """FastAPI dependency: raises 401 if the request has no valid Supabase session."""
    if not SUPABASE_URL or not SUPABASE_ANON_KEY:
        raise HTTPException(
            status_code=500,
            detail="SUPABASE_URL / SUPABASE_ANON_KEY are not set on the server. See .env.example.",
        )

    if credentials is None:
        raise HTTPException(status_code=401, detail="Missing Authorization header. Please log in.")

    token = credentials.credentials

    try:
        response = httpx.get(
            f"{SUPABASE_URL}/auth/v1/user",
            headers={
                "Authorization": f"Bearer {token}",
                "apikey": SUPABASE_ANON_KEY,
            },
            timeout=10.0,
        )
    except httpx.HTTPError as exc:
        raise HTTPException(status_code=502, detail=f"Could not reach Supabase Auth server: {exc}")

    if response.status_code != 200:
        raise HTTPException(status_code=401, detail="Invalid or expired session. Please log in again.")

    data = response.json()
    return {"id": data.get("id"), "email": data.get("email")}