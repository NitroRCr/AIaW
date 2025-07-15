"""
FastAPI endpoints for Web3 authentication
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Dict, Any
import os
from .challenge_service import ChallengeService

# Create a router for authentication
auth_router = APIRouter(prefix="/auth/web3", tags=["Web3 Authentication"])

# Data models
class ChallengeRequest(BaseModel):
    wallet_address: str

class ChallengeResponse(BaseModel):
    nonce: str
    message: str

class VerifyRequest(BaseModel):
    wallet_address: str
    pub_key: str
    signature: str
    nonce: str

class VerifyResponse(BaseModel):
    success: bool
    wallet_address: str = None
    error: str = None

# Initialize the service
challenge_service = None

def init_challenge_service():
    """Initializes the challenges service"""
    global challenge_service
    if challenge_service is None:
        supabase_url = os.getenv('SUPABASE_URL')
        supabase_anon_key = os.getenv('SUPABASE_ANON_KEY')

        if not supabase_url or not supabase_anon_key:
            raise ValueError("SUPABASE_URL and SUPABASE_ANON_KEY must be set")

        challenge_service = ChallengeService(supabase_url, supabase_anon_key)

@auth_router.post("/challenge", response_model=ChallengeResponse)
async def create_challenge(request: ChallengeRequest) -> ChallengeResponse:
    """
    Creates a new challenge for Web3 authentication

    The client must sign the returned message with their private key
    """
    init_challenge_service()

    try:
        challenge_data = await challenge_service.create_challenge(request.wallet_address)
        return ChallengeResponse(**challenge_data)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to create challenge: {str(e)}")

@auth_router.post("/verify", response_model=VerifyResponse)
async def verify_challenge(request: VerifyRequest) -> VerifyResponse:
    """
    Verifies the challenge signature for Web3 authentication

    If the signature is valid, the user is considered authenticated
    """
    init_challenge_service()

    try:
        result = await challenge_service.verify_challenge(
            request.wallet_address,
            request.pub_key,
            request.signature,
            request.nonce
        )

        if result["success"]:
            return VerifyResponse(success=True, wallet_address=result["wallet_address"])
        else:
            return VerifyResponse(success=False, error=result["error"])

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to verify challenge: {str(e)}")

@auth_router.post("/cleanup")
async def cleanup_expired_challenges() -> Dict[str, Any]:
    """
    Cleans up expired challenges (service endpoint)
    """
    init_challenge_service()

    try:
        deleted_count = await challenge_service.cleanup_expired_challenges()
        return {"deleted_count": deleted_count}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to cleanup challenges: {str(e)}")

# Functions for use in the main application
async def create_challenge(wallet_address: str) -> Dict[str, str]:
    """Creates a challenge for the specified wallet address"""
    init_challenge_service()
    return await challenge_service.create_challenge(wallet_address)

async def verify_challenge(wallet_address: str, pub_key: str, signature: str, nonce: str) -> Dict[str, Any]:
    """Verifies the challenge and signature"""
    init_challenge_service()
    return await challenge_service.verify_challenge(wallet_address, pub_key, signature, nonce)
