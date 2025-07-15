"""
FastAPI endpoints для Web3 авторизации
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Dict, Any
import os
from .challenge_service import ChallengeService

# Создаем роутер для авторизации
auth_router = APIRouter(prefix="/auth/web3", tags=["Web3 Authentication"])

# Модели данных
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

# Инициализируем сервис
challenge_service = None

def init_challenge_service():
    """Инициализирует сервис challenges"""
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
    Создает новый challenge для Web3 авторизации

    Клиент должен подписать возвращенное сообщение своим приватным ключом
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
    Проверяет подпись challenge для Web3 авторизации

    Если подпись валидна, пользователь считается аутентифицированным
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
    Очищает истекшие challenges (служебный endpoint)
    """
    init_challenge_service()

    try:
        deleted_count = await challenge_service.cleanup_expired_challenges()
        return {"deleted_count": deleted_count}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to cleanup challenges: {str(e)}")

# Функции для использования в основном приложении
async def create_challenge(wallet_address: str) -> Dict[str, str]:
    """Создает challenge для указанного адреса кошелька"""
    init_challenge_service()
    return await challenge_service.create_challenge(wallet_address)

async def verify_challenge(wallet_address: str, pub_key: str, signature: str, nonce: str) -> Dict[str, Any]:
    """Проверяет challenge и подпись"""
    init_challenge_service()
    return await challenge_service.verify_challenge(wallet_address, pub_key, signature, nonce)
