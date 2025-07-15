"""
Сервис для работы с challenge/response авторизацией
"""

import secrets
import string
from datetime import datetime, timedelta
from typing import Optional, Dict, Any
import aiohttp
from .crypto_utils import generate_challenge_message, verify_wallet_auth

class ChallengeService:
    """Сервис для управления challenges для Web3 авторизации"""

    def __init__(self, supabase_url: str, supabase_anon_key: str, challenge_ttl_minutes: int = 10):
        """
        :param supabase_url: URL Supabase проекта
        :param supabase_anon_key: Anon ключ Supabase
        :param challenge_ttl_minutes: Время жизни challenge в минутах
        """
        self.supabase_url = supabase_url
        self.supabase_anon_key = supabase_anon_key
        self.challenge_ttl = timedelta(minutes=challenge_ttl_minutes)

    def generate_nonce(self, length: int = 32) -> str:
        """Генерирует случайный nonce"""
        alphabet = string.ascii_letters + string.digits
        return ''.join(secrets.choice(alphabet) for _ in range(length))

    async def create_challenge(self, wallet_address: str) -> Dict[str, str]:
        """
        Создает новый challenge для кошелька

        :param wallet_address: адрес кошелька
        :return: словарь с nonce и message для подписи
        """
        nonce = self.generate_nonce()
        message = generate_challenge_message(wallet_address, nonce)

        # Сохраняем challenge в базу данных
        await self._store_challenge(wallet_address, nonce)

        return {
            "nonce": nonce,
            "message": message
        }

    async def verify_challenge(self, wallet_address: str, pub_key: str,
                             signature: str, nonce: str) -> Dict[str, Any]:
        """
        Проверяет challenge и подпись

        :param wallet_address: адрес кошелька
        :param pub_key: публичный ключ
        :param signature: подпись сообщения
        :param nonce: nonce из challenge
        :return: результат проверки
        """
        # Проверяем, что challenge существует и не истек
        stored_challenge = await self._get_challenge(wallet_address)
        if not stored_challenge:
            return {"success": False, "error": "Challenge not found or expired"}

        if stored_challenge["nonce"] != nonce:
            return {"success": False, "error": "Invalid nonce"}

        # Генерируем сообщение для проверки
        message = generate_challenge_message(wallet_address, nonce)

        # Проверяем подпись
        if verify_wallet_auth(wallet_address, pub_key, message, signature):
            # Удаляем использованный challenge
            await self._delete_challenge(wallet_address)
            return {"success": True, "wallet_address": wallet_address}
        else:
            return {"success": False, "error": "Invalid signature"}

    async def _store_challenge(self, wallet_address: str, nonce: str) -> None:
        """Сохраняет challenge в базу данных"""
        headers = {
            'apikey': self.supabase_anon_key,
            'Authorization': f'Bearer {self.supabase_anon_key}',
            'Content-Type': 'application/json',
            'Prefer': 'return=minimal'
        }

        payload = {
            'wallet_address': wallet_address,
            'nonce': nonce,
            'created_at': datetime.utcnow().isoformat()
        }

        url = f"{self.supabase_url}/rest/v1/auth_challenges"

        async with aiohttp.ClientSession() as session:
            # Сначала удаляем старый challenge если есть
            await self._delete_challenge(wallet_address)

            # Создаем новый challenge
            async with session.post(url, headers=headers, json=payload) as resp:
                if resp.status not in [200, 201]:
                    raise Exception(f"Failed to store challenge: {resp.status}")

    async def _get_challenge(self, wallet_address: str) -> Optional[Dict[str, Any]]:
        """Получает challenge из базы данных"""
        headers = {
            'apikey': self.supabase_anon_key,
            'Authorization': f'Bearer {self.supabase_anon_key}',
        }

        # Вычисляем время истечения
        expiry_time = datetime.utcnow() - self.challenge_ttl
        expiry_iso = expiry_time.isoformat()

        url = f"{self.supabase_url}/rest/v1/auth_challenges"
        params = {
            'wallet_address': f'eq.{wallet_address}',
            'created_at': f'gte.{expiry_iso}',
            'select': 'wallet_address,nonce,created_at'
        }

        async with aiohttp.ClientSession() as session:
            async with session.get(url, headers=headers, params=params) as resp:
                if resp.status == 200:
                    data = await resp.json()
                    if data:
                        return data[0]
                return None

    async def _delete_challenge(self, wallet_address: str) -> None:
        """Удаляет challenge из базы данных"""
        headers = {
            'apikey': self.supabase_anon_key,
            'Authorization': f'Bearer {self.supabase_anon_key}',
        }

        url = f"{self.supabase_url}/rest/v1/auth_challenges"
        params = {'wallet_address': f'eq.{wallet_address}'}

        async with aiohttp.ClientSession() as session:
            async with session.delete(url, headers=headers, params=params) as resp:
                # Игнорируем ошибки удаления - не критично
                pass

    async def cleanup_expired_challenges(self) -> int:
        """
        Очищает истекшие challenges

        :return: количество удаленных записей
        """
        expiry_time = datetime.utcnow() - self.challenge_ttl
        expiry_iso = expiry_time.isoformat()

        headers = {
            'apikey': self.supabase_anon_key,
            'Authorization': f'Bearer {self.supabase_anon_key}',
            'Prefer': 'return=minimal'
        }

        url = f"{self.supabase_url}/rest/v1/auth_challenges"
        params = {'created_at': f'lt.{expiry_iso}'}

        async with aiohttp.ClientSession() as session:
            async with session.delete(url, headers=headers, params=params) as resp:
                if resp.status == 200:
                    # Supabase возвращает количество удаленных записей в заголовке
                    count_header = resp.headers.get('Content-Range', '0')
                    if '/' in count_header:
                        return int(count_header.split('/')[-1])
                return 0
