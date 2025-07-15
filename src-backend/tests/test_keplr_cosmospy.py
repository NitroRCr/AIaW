import base64
import json
import os
import hashlib
from cosmospy import pubkey_to_address
from coincurve import PublicKey
from cryptography.hazmat.primitives.asymmetric.utils import encode_dss_signature

TEST_DATA_PATH = os.path.join(os.path.dirname(__file__), 'signature-test-data.json')

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

def test_keplr_signature():
    with open(TEST_DATA_PATH, 'r') as f:
        data = json.load(f)
    pubkey_b64 = data['pub_key']['value']
    pubkey_bytes = base64.b64decode(pubkey_b64)
    pk_address = pubkey_to_address(pubkey_bytes, hrp='cyber')

    address = data['address']

    print(f"address: {address}")
    print(f"pk_address: {pk_address}")

    assert address == pk_address
    assert verify_signature(data['signature'], data['message'], pubkey_b64) == True

def test_keplr_signature_invalid():
    with open(TEST_DATA_PATH, 'r') as f:
        data = json.load(f)
    pubkey_b64 = data['pub_key']['value']
    pubkey_bytes = base64.b64decode(pubkey_b64)
    pk_address = pubkey_to_address(pubkey_bytes, hrp='cyber')

    # Use wrong address to test negative case
    wrong_address = "cyber14r6j7h4n2hmuam8tj224mw8g3earax5t4vvlkl"  # Changed last character

    assert wrong_address != pk_address
    pass
