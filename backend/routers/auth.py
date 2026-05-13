"""
routers/auth.py — Firebase authentication dependency.
"""

from fastapi import Depends, HTTPException, status, APIRouter
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from config import settings
from schemas import UserInfo, ProfileRegister, RecaptchaVerifyRequest
from database import supabase
import firebase_admin
from firebase_admin import auth, credentials
import httpx
import os

router = APIRouter(prefix="/auth", tags=["Auth"])

# Initialize Firebase Admin SDK safely (only if not already initialized)
def _init_firebase():
    """Initialize Firebase Admin SDK, handling multiple imports gracefully."""
    try:
        # Check if Firebase app is already initialized
        firebase_admin.get_app()
    except ValueError:
        # App not initialized yet, so initialize it
        service_account_path = "firebase-service-account.json"
        if not os.path.exists(service_account_path):
            raise RuntimeError(
                f"Firebase service account file not found at {service_account_path}. "
                "Please ensure firebase-service-account.json is in the backend directory."
            )
        cred = credentials.Certificate(service_account_path)
        firebase_admin.initialize_app(cred)

_init_firebase()

# HTTPBearer extracts the "Authorization: Bearer <token>" header automatically
bearer_scheme = HTTPBearer()

async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
) -> UserInfo:
    """Validate Firebase JWT and return user info."""
    token = credentials.credentials

    try:
        decoded_token = auth.verify_id_token(token)
        user_id = decoded_token.get("uid")
        email = decoded_token.get("email")

        if not user_id:
            raise ValueError("Missing UID claim")

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Invalid or expired token: {str(e)}",
            headers={"WWW-Authenticate": "Bearer"},
        )

    profile = _get_profile(user_id)

    if not profile:
        # Auto-create minimal profile to satisfy foreign key constraints
        # This unblocks users who haven't completed the registration form yet
        print(f"[Auth] Auto-creating minimal profile for {user_id}")
        minimal_profile = {
            "id": user_id,
            "email": email or "",
            "plan": "free",
            "first_name": email.split("@")[0] if email else "New",
            "last_name": "User",
            "age": 0,
            "gender": "other"
        }
        try:
            res = supabase.table("profiles").upsert(minimal_profile).execute()
            print(f"[Auth] Profile creation result: {res.data}")
        except Exception as e:
            print(f"[Auth] !!! CRITICAL ERROR !!! Failed to auto-create profile for {user_id}: {str(e)}")

        return UserInfo(
            user_id=user_id,
            email=email or "",
            plan="free"
        )

    return UserInfo(
        user_id=user_id,
        email=email or profile.get("email", ""),
        first_name=profile.get("first_name"),
        last_name=profile.get("last_name"),
        age=profile.get("age"),
        gender=profile.get("gender"),
        plan=profile.get("plan", "free")
    )

def _get_profile(user_id: str):
    """Fetch profile from Supabase."""
    try:
        # Direct query now that both user_id and profile.id are TEXT
        res = supabase.table("profiles").select("*").eq("id", user_id).execute()
        if res.data and len(res.data) > 0:
            return res.data[0]
    except Exception as e:
        print(f"[Auth] Error fetching profile: {str(e)}")
    return None

@router.post("/register-profile")
async def register_profile(
    data: ProfileRegister,
    current_user: UserInfo = Depends(get_current_user)
):
    """
    Endpoint called after successful Supabase authentication.
    Stores the extra user data in Supabase.
    """
    # Check if email already exists
    try:
        existing = supabase.table("profiles").select("id").eq("email", data.email).execute()
        if existing.data and len(existing.data) > 0 and existing.data[0]["id"] != current_user.user_id:
            raise HTTPException(status_code=400, detail="Email already registered")
    except Exception as e:
        if "Email already registered" in str(e):
            raise e
        print(f"[Auth] Error checking email uniqueness: {str(e)}")

    new_profile = {
        "id": current_user.user_id,
        "first_name": data.firstName or (email.split("@")[0] if (email := data.email or current_user.email) else "User"),
        "last_name": data.lastName or "User",
        "age": data.age or 0,
        "gender": data.gender or "other",
        "email": data.email or current_user.email,
        "plan": "free"
    }

    try:
        supabase.table("profiles").upsert(new_profile).execute()
        return {"status": "success", "message": "Profile registered"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

def require_premium(current_user: UserInfo = Depends(get_current_user)) -> UserInfo:
    if current_user.plan != "premium":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="This feature requires a premium subscription",
        )
    return current_user

@router.post("/verify-recaptcha")
async def verify_recaptcha(data: RecaptchaVerifyRequest):
    """
    Verify a reCAPTCHA Enterprise token via Google's REST API.
    (Kept same as before as it's independent of Auth provider)
    """
    recaptcha_api_key = settings.recaptcha_api_key
    recaptcha_site_key = settings.recaptcha_site_key
    project_id = "sylq-5ee51"

    url = (
        f"https://recaptchaenterprise.googleapis.com/v1/"
        f"projects/{project_id}/assessments?key={recaptcha_api_key}"
    )

    payload = {
        "event": {
            "token": data.token,
            "expectedAction": data.action,
            "siteKey": recaptcha_site_key,
        }
    }

    try:
        async with httpx.AsyncClient() as client:
            resp = await client.post(url, json=payload)
            result = resp.json()

        token_props = result.get("tokenProperties", {})
        risk_analysis = result.get("riskAnalysis", {})
        score = risk_analysis.get("score", 0.0)
        valid = token_props.get("valid", False)
        action_match = token_props.get("action", "") == data.action

        is_legit = valid and action_match and score >= 0.5

        return {
            "success": is_legit,
            "score": score,
            "action_match": action_match,
            "valid": valid,
        }
    except Exception as e:
        print(f"[Auth] reCAPTCHA verification error: {str(e)}")
        if settings.app_env == "development":
            return {"success": True, "score": 1.0, "note": "dev-mode-bypass"}
        raise HTTPException(status_code=500, detail="reCAPTCHA verification failed")


@router.get("/me")
async def get_my_profile(current_user: UserInfo = Depends(get_current_user)):
    """Return the current authenticated user's info (used by frontend checks)."""
    return current_user.model_dump()

