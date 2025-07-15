"""
Криптографические утилиты для Web3 авторизации
"""

import base64
import hashlib
from typing import Optional

from coincurve import PublicKey
from cosmospy import pubkey_to_address
from cryptography.hazmat.primitives.asymmetric.utils import encode_dss_signature


def verify_signature(signature_b64: str, message: str, pubkey_b64: str) -> bool:
    """
    Проверяет подпись сообщения с использованием secp256k1 и SHA-256.
    Использует coincurve для более простой работы с Keplr подписями.

    :param signature_b64: base64-подпись из Keplr (raw формат, 64 байта)
    :param message: строка, которую подписывали
    :param pubkey_b64: base64-представление сжатого публичного ключа (33 байта)
    :return: True если подпись валидна, иначе False
    """
    try:
        # Декодируем данные
        compressed_pubkey = base64.b64decode(pubkey_b64)
        signature = base64.b64decode(signature_b64)

        # Создаем PublicKey из сжатого ключа
        pubkey = PublicKey(compressed_pubkey)

        # Хешируем сообщение SHA256
        message_hash = hashlib.sha256(message.encode()).digest()

        # Разделяем подпись на r и s компоненты (по 32 байта каждый)
        r = signature[:32]
        s = signature[32:]

        # Конвертируем r и s в integers
        r_int = int.from_bytes(r, byteorder='big')
        s_int = int.from_bytes(s, byteorder='big')

        # Используем встроенную функцию для создания DER-кодированной подписи
        der_signature = encode_dss_signature(r_int, s_int)

        # Проверяем подпись
        try:
            pubkey.verify(der_signature, message_hash)
            return True
        except Exception:
            return False

    except Exception as e:
        return False


def verify_wallet_auth(wallet_address: str, pub_key: str, message: Optional[str] = None,
                      signature: Optional[str] = None, hrp: str = 'cyber') -> bool:
    """
    Проверяет аутентификацию кошелька.

    Первичная проверка: проверяет, что публичный ключ соответствует адресу кошелька.
    Дополнительная проверка: если предоставлены message и signature, проверяет подпись.

    :param wallet_address: адрес кошелька (например, cyber...)
    :param pub_key: base64-представление публичного ключа
    :param message: опциональное сообщение для проверки подписи
    :param signature: опциональная подпись для проверки
    :param hrp: human readable part для адреса (по умолчанию 'cyber')
    :return: True если аутентификация прошла успешно
    """
    try:
        # Основная проверка: соответствие публичного ключа адресу
        pubkey_bytes = base64.b64decode(pub_key)
        derived_address = pubkey_to_address(pubkey_bytes, hrp=hrp)

        if derived_address != wallet_address:
            return False

        # Дополнительная проверка подписи (если предоставлены данные)
        if message and signature:
            return verify_signature(signature, message, pub_key)

        return True

    except Exception:
        return False


def generate_challenge_message(wallet_address: str, nonce: str) -> str:
    """
    Генерирует стандартное сообщение для подписи challenge

    :param wallet_address: адрес кошелька
    :param nonce: уникальный nonce
    :return: сообщение для подписи
    """
    return f"Sign this message to authenticate with {wallet_address}.\nNonce: {nonce}"
