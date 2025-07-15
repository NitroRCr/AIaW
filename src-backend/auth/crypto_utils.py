"""
Cryptographic utilities for Web3 authentication
"""

import base64
import hashlib
from typing import Optional

from coincurve import PublicKey
from cosmospy import pubkey_to_address
from cryptography.hazmat.primitives.asymmetric.utils import encode_dss_signature


def verify_signature(signature_b64: str, message: str, pubkey_b64: str) -> bool:
    """
    Verifies a message signature using secp256k1 and SHA-256.
    Uses coincurve for easier work with Keplr signatures.

    :param signature_b64: base64 signature from Keplr (raw format, 64 bytes)
    :param message: string that was signed
    :param pubkey_b64: base64 representation of the compressed public key (33 bytes)
    :return: True if the signature is valid, otherwise False
    """
    try:
        # Decode data
        compressed_pubkey = base64.b64decode(pubkey_b64)
        signature = base64.b64decode(signature_b64)

        # Create PublicKey from compressed key
        pubkey = PublicKey(compressed_pubkey)

        # Hash the message with SHA256
        message_hash = hashlib.sha256(message.encode()).digest()

        # Split the signature into r and s components (32 bytes each)
        r = signature[:32]
        s = signature[32:]

        # Convert r and s to integers
        r_int = int.from_bytes(r, byteorder='big')
        s_int = int.from_bytes(s, byteorder='big')

        # Use the built-in function to create a DER-encoded signature
        der_signature = encode_dss_signature(r_int, s_int)

        # Verify the signature
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
    Verifies wallet authentication.

    Primary check: verifies that the public key matches the wallet address.
    Additional check: if message and signature are provided, verifies the signature.

    :param wallet_address: wallet address (e.g., cyber...)
    :param pub_key: base64 representation of the public key
    :param message: optional message for signature verification
    :param signature: optional signature for verification
    :param hrp: human readable part for the address (default 'cyber')
    :return: True if authentication is successful
    """
    try:
        # Main check: public key matches the address
        pubkey_bytes = base64.b64decode(pub_key)
        derived_address = pubkey_to_address(pubkey_bytes, hrp=hrp)

        if derived_address != wallet_address:
            return False

        # Additional signature verification (if data is provided)
        if message and signature:
            return verify_signature(signature, message, pub_key)

        return True

    except Exception:
        return False


def generate_challenge_message(wallet_address: str, nonce: str) -> str:
    """
    Generates a standard message for signing a challenge

    :param wallet_address: wallet address
    :param nonce: unique nonce
    :return: message for signing
    """
    return f"Sign this message to authenticate with {wallet_address}.\nNonce: {nonce}"
