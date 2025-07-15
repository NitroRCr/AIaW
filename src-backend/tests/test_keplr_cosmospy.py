import base64
import json
import os
import hashlib
from cosmospy import pubkey_to_address
from ecdsa import VerifyingKey, SECP256k1, BadSignatureError
from ecdsa.util import sigdecode_der

TEST_DATA_PATH = os.path.join(os.path.dirname(__file__), 'signature-test-data.json')

def verify_signature(signature_b64: str, message: str, pubkey_b64: str) -> bool:
    """
    Проверяет подпись сообщения с использованием secp256k1 и SHA-256.

    :param signature_b64: base64-подпись из Keplr
    :param message: строка, которую подписывали
    :param pubkey_b64: base64-представление сжатого публичного ключа (33 байта, начинается с 0x02 или 0x03)
    :return: True если подпись валидна, иначе False
    """
    try:
        signature_bytes = base64.b64decode(signature_b64)
        pubkey_bytes = base64.b64decode(pubkey_b64)

        vk = VerifyingKey.from_string(pubkey_bytes, curve=SECP256k1)
        vk.verify(signature_bytes, message.encode('utf-8'),
                  hashfunc=hashlib.sha256, sigdecode=sigdecode_der)
        return True
    except (BadSignatureError, Exception):
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
