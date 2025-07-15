# Web3 Authentication Module

Module for Web3 authentication via wallet signatures using the challenge/response protocol.

## Module Structure

```
auth/
├── __init__.py              # Module exports
├── crypto_utils.py          # Cryptographic functions
├── challenge_service.py     # Challenge/response service
├── auth_endpoints.py        # FastAPI endpoints
└── README.md               # This documentation
```

## Functionality

### 1. Cryptographic utilities (`crypto_utils.py`)

- **`verify_signature`** - Verifies a message signature using secp256k1 and SHA-256
- **`verify_wallet_auth`** - Comprehensive wallet authentication check
- **`generate_challenge_message`** - Generates a standard message for the challenge

### 2. Challenge/response service (`challenge_service.py`)

- **`ChallengeService`** - Main class for working with challenges
  - `create_challenge()` - Creates a new challenge
  - `verify_challenge()` - Verifies a challenge and signature
  - `cleanup_expired_challenges()` - Cleans up expired challenges

### 3. FastAPI endpoints (`auth_endpoints.py`)

- **`POST /auth/web3/challenge`** - Create a challenge
- **`POST /auth/web3/verify`** - Verify a challenge
- **`POST /auth/web3/cleanup`** - Clean up expired challenges

## Usage

### Basic signature verification

```python
from auth.crypto_utils import verify_signature

# Keplr wallet signature verification
is_valid = verify_signature(
    signature_b64="base64-signature",
    message="Sign this message to login",
    pubkey_b64="base64-public-key"
)
```

### Wallet authentication verification

```python
from auth.crypto_utils import verify_wallet_auth

# Simple check for public key and address match
is_valid = verify_wallet_auth(
    wallet_address="cyber14r6j7h4n2hmuam8tj224mw8g3earax5t4vvlkk",
    pub_key="base64-public-key"
)

# Full check with signature
is_valid = verify_wallet_auth(
    wallet_address="cyber14r6j7h4n2hmuam8tj224mw8g3earax5t4vvlkk",
    pub_key="base64-public-key",
    message="Challenge message",
    signature="base64-signature"
)
```

### Challenge/Response Flow

```python
from auth.challenge_service import ChallengeService

# Service initialization
service = ChallengeService(
    supabase_url="https://your-project.supabase.co",
    supabase_anon_key="your-anon-key"
)

# 1. Create a challenge
challenge = await service.create_challenge("cyber14r6j7h4n2hmuam8tj224mw8g3earax5t4vvlkk")
# Result: {"nonce": "...", "message": "..."}

# 2. User signs the message with their wallet

# 3. Verify the challenge
result = await service.verify_challenge(
    wallet_address="cyber14r6j7h4n2hmuam8tj224mw8g3earax5t4vvlkk",
    pub_key="base64-public-key",
    signature="base64-signature",
    nonce=challenge["nonce"]
)
# Result: {"success": True, "wallet_address": "..."} or {"success": False, "error": "..."}
```

## API Endpoints

### POST /auth/web3/challenge

Creates a new challenge for the specified wallet address.

**Request:**
```json
{
  "wallet_address": "cyber14r6j7h4n2hmuam8tj224mw8g3earax5t4vvlkk"
}
```

**Response:**
```json
{
  "nonce": "abcd1234...",
  "message": "Sign this message to authenticate with cyber14r6j7h4n2hmuam8tj224mw8g3earax5t4vvlkk.\nNonce: abcd1234..."
}
```

### POST /auth/web3/verify

Verifies the challenge signature.

**Request:**
```json
{
  "wallet_address": "cyber14r6j7h4n2hmuam8tj224mw8g3earax5t4vvlkk",
  "pub_key": "Ag3EI2K4aGNMdk/OVQbDCEn8OEPNylNhHNSv/l+ct9sQ",
  "signature": "base64-signature",
  "nonce": "abcd1234..."
}
```

**Response (success):**
```json
{
  "success": true,
  "wallet_address": "cyber14r6j7h4n2hmuam8tj224mw8g3earax5t4vvlkk"
}
```

**Response (error):**
```json
{
  "success": false,
  "error": "Invalid signature"
}
```

## Requirements

- Python 3.8+
- FastAPI
- coincurve (secp256k1)
- cosmospy (for Cosmos SDK addresses)
- cryptography (for DER encoding)
- aiohttp (for HTTP requests)

## Database

The module uses the `auth_challenges` table in Supabase:

```sql
CREATE TABLE IF NOT EXISTS public.auth_challenges (
    wallet_address TEXT PRIMARY KEY,
    nonce TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

## Security

1. **Challenge TTL**: Challenges expire after 10 minutes
2. **One-time use**: Each challenge can only be used once
3. **Signature verification**: Full cryptographic signature verification
4. **Address validation**: Public key must match the wallet address

## Improvements

The module replaces manual DER conversion with the built-in `encode_dss_signature` function from the `cryptography` library, making the code more reliable and readable.
