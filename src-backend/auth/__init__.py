"""
Web3 Authentication Module

Модуль для работы с Web3 авторизацией через wallet подписи
"""

from .crypto_utils import verify_signature, verify_wallet_auth
from .challenge_service import ChallengeService
from .auth_endpoints import create_challenge, verify_challenge

__all__ = [
    'verify_signature',
    'verify_wallet_auth',
    'ChallengeService',
    'create_challenge',
    'verify_challenge'
]
