from fastapi import APIRouter, Depends, HTTPException
import razorpay
from config import settings
from database import supabase
from routers.auth import get_current_user
from schemas import UserInfo
from pydantic import BaseModel

router = APIRouter(prefix="/payments", tags=["Payments"])

client = razorpay.Client(auth=(settings.razorpay_key_id, settings.razorpay_key_secret))

class OrderRequest(BaseModel):
    plan_id: str

class VerifyRequest(BaseModel):
    razorpay_order_id: str
    razorpay_payment_id: str
    razorpay_signature: str

PLAN_AMOUNTS = {
    "premium_monthly": 29900,  # ₹299 in paise
    "premium_yearly": 249900, # ₹2499 in paise
}

@router.post("/create-order")
async def create_order(body: OrderRequest, current_user: UserInfo = Depends(get_current_user)):
    amount = PLAN_AMOUNTS.get(body.plan_id)
    if not amount:
        raise HTTPException(status_code=400, detail="Invalid plan ID")

    try:
        data = {
            "amount": amount,
            "currency": "INR",
            "receipt": f"receipt_{current_user.user_id[:8]}",
            "notes": {
                "user_id": current_user.user_id,
                "plan_id": body.plan_id
            }
        }
        order = client.order.create(data=data)
        return {
            "order_id": order["id"],
            "amount": order["amount"],
            "key_id": settings.razorpay_key_id,
            "user_email": current_user.email
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/verify")
async def verify_payment(body: VerifyRequest, current_user: UserInfo = Depends(get_current_user)):
    try:
        # Verify signature
        client.utility.verify_payment_signature({
            'razorpay_order_id': body.razorpay_order_id,
            'razorpay_payment_id': body.razorpay_payment_id,
            'razorpay_signature': body.razorpay_signature
        })

        # Fetch order to get plan info
        order = client.order.fetch(body.razorpay_order_id)
        plan_id = order.get("notes", {}).get("plan_id", "premium")

        # Update user in Supabase
        supabase.table("profiles").update({
            "plan": "premium",
            "subscription_id": body.razorpay_payment_id,
            "updated_at": "now()"
        }).eq("id", current_user.user_id).execute()

        return {"status": "success"}
    except Exception as e:
        raise HTTPException(status_code=400, detail="Payment verification failed")
