import base64
import json
import os
from cosmospy import pubkey_to_address
from auth.crypto_utils import verify_signature, verify_wallet_auth, generate_challenge_message

TEST_DATA_PATH = os.path.join(os.path.dirname(__file__), 'signature-test-data.json')

def test_keplr_signature():
    """Test Keplr wallet signature verification"""
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
    """Test with incorrect wallet address"""
    with open(TEST_DATA_PATH, 'r') as f:
        data = json.load(f)
    pubkey_b64 = data['pub_key']['value']
    pubkey_bytes = base64.b64decode(pubkey_b64)
    pk_address = pubkey_to_address(pubkey_bytes, hrp='cyber')

    # Use wrong address to test negative case
    wrong_address = "cyber14r6j7h4n2hmuam8tj224mw8g3earax5t4vvlkl"  # Changed last character

    assert wrong_address != pk_address

def test_wallet_auth():
    """Test verify_wallet_auth function"""
    with open(TEST_DATA_PATH, 'r') as f:
        data = json.load(f)

    wallet_address = data['address']
    pub_key = data['pub_key']['value']
    message = data['message']
    signature = data['signature']

    # Test with full verification (address + signature)
    assert verify_wallet_auth(wallet_address, pub_key, message, signature) == True

    # Test only with address verification
    assert verify_wallet_auth(wallet_address, pub_key) == True

    # Test with incorrect address
    wrong_address = "cyber14r6j7h4n2hmuam8tj224mw8g3earax5t4vvlkl"
    assert verify_wallet_auth(wrong_address, pub_key, message, signature) == False

def test_challenge_message_generation():
    """Test challenge message generation"""
    wallet_address = "cyber14r6j7h4n2hmuam8tj224mw8g3earax5t4vvlkk"
    nonce = "test-nonce-123"

    message = generate_challenge_message(wallet_address, nonce)
    expected = f"Sign this message to authenticate with {wallet_address}.\nNonce: {nonce}"

    assert message == expected
