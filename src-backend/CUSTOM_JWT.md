# Custom JWT Authentication (Web3 + Supabase)

## Overview

AIaW uses a custom authentication system based on Web3 wallets (e.g., Keplr/Cosmos) and custom JWT, fully compatible with Supabase Row Level Security (RLS). Authentication is implemented via a challenge/response protocol with cryptographic signature verification.

---

## Authentication Flow

1. **Client** requests a challenge for their wallet address.
2. **Backend** generates a unique challenge (nonce + message) and stores it in Supabase (`auth_challenges` table).
3. **Client** signs the message with their private key and sends the signature, public key, and nonce to the backend.
4. **Backend** verifies:
   - that the public key matches the wallet address
   - that the signature is valid for the given message
   - that the challenge has not expired and has not been used before
5. If all checks pass, the backend finds or creates a user in Supabase (by wallet address), generates a custom JWT, and returns it to the client.

---

## Database Schema

### `auth_challenges` Table
```sql
CREATE TABLE IF NOT EXISTS public.auth_challenges (
    wallet_address TEXT PRIMARY KEY,
    nonce TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```
- Challenge expires after 10 minutes and can only be used once.

---

## JWT Token Structure

- **sub**: Supabase user UUID (required for RLS)
- **aud**: 'authenticated'
- **role**: 'authenticated'
- **iss**: 'supabase'
- **iat**: issued at
- **exp**: expiration time (default 1 hour)
- **user_metadata**: object with wallet address and email

```json
{
  "sub": "83a33b62-6383-4263-bc28-8485b6d6d493",
  "aud": "authenticated",
  "role": "authenticated",
  "iss": "supabase",
  "iat": 1751524217,
  "exp": 1751527817,
  "user_metadata": {
    "wallet_address": "cyber14r6j7h4n2hmuam8tj224mw8g3earax5t4vvlkk",
    "email": "cyber14r6j7h4n2hmuam8tj224mw8g3earax5t4vvlkk@wallet.cyber.ai"
  }
}
```

---

## API Endpoints

### 1. POST `/auth/web3/challenge`
Create a challenge for the specified wallet address.

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

### 2. POST `/auth/web3/verify`
Verify the challenge signature and obtain a JWT.

**Request:**
```json
{
  "wallet_address": "cyber14r6j7h4n2hmuam8tj224mw8g3earax5t4vvlkk",
  "pub_key": "base64-public-key",
  "signature": "base64-signature",
  "nonce": "abcd1234..."
}
```
**Response (success):**
```json
{
  "success": true,
  "wallet_address": "cyber14r6j7h4n2hmuam8tj224mw8g3earax5t4vvlkk",
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "bearer",
  "expires_in": 3600
}
```
**Response (error):**
```json
{
  "success": false,
  "error": "Invalid signature"
}
```

---

## Implementation Details

- Signature verification uses secp256k1 (coincurve) and SHA-256.
- The public key must match the wallet address (Cosmos/Keplr).
- Challenge is stored in Supabase and deleted after successful verification or TTL expiration.
- User is created in Supabase automatically (email is generated as `<wallet_address>@wallet.cyber.ai`).
- JWT is generated using pyjwt and signed with the secret from environment variables.

---

## Environment Configuration

```bash
# .env
JWT_SECRET=your-super-secret-jwt-token-with-at-least-32-characters
JWT_EXPIRY=3600
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your-service-role-key
SUPABASE_ANON_KEY=your-anon-key
```

---

## Requirements

- Python 3.8+
- FastAPI
- aiohttp
- coincurve
- cosmospy
- cryptography
- pyjwt

---

## Security Considerations

1. **Challenge TTL**: 10 minutes, one-time use
2. **Signature verification**: Strict cryptographic validation
3. **Address validation**: Public key must match the address
4. **JWT Secret**: Store only in environment variables, at least 32 characters
5. **CORS**: Only trusted origins are allowed
6. **RLS**: All data access via Supabase is protected by RLS

---

## Troubleshooting

- **JWT Token Invalid**: Check that the secret matches Supabase, token is not expired, algorithm is HS256
- **User Creation Failed**: Check SERVICE_ROLE_KEY permissions and SUPABASE_URL correctness
- **Challenge Not Found/Expired**: Repeat the process, challenge expired or already used
- **Signature Invalid**: Ensure the message is signed correctly and not altered

---

## Useful Links

- [Supabase JWT Docs](https://supabase.com/docs/guides/auth/jwt)
- [FastAPI Security](https://fastapi.tiangolo.com/tutorial/security/)
- [JWT.io Debugger](https://jwt.io/)
