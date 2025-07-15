"""
Web3 Authentication Module

Module for working with Web3 authentication via wallet signatures
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
