# Custom JWT Authentication (Web3 + Supabase)

## Overview

AIaW использует собственную систему аутентификации на основе Web3-кошельков (например, Keplr/Cosmos) и custom JWT, полностью совместимую с Supabase Row Level Security (RLS). Авторизация реализована через challenge/response протокол с криптографической проверкой подписи.

---

## Authentication Flow

1. **Клиент** запрашивает challenge для своего адреса кошелька.
2. **Backend** генерирует уникальный challenge (nonce + message) и сохраняет его в Supabase (таблица `auth_challenges`).
3. **Клиент** подписывает message своим приватным ключом и отправляет подпись, публичный ключ и nonce на backend.
4. **Backend** проверяет:
   - что публичный ключ соответствует адресу кошелька
   - что подпись валидна для данного сообщения
   - что challenge не истёк и не был использован ранее
5. Если всё успешно — backend ищет или создает пользователя в Supabase (по адресу кошелька), генерирует custom JWT и возвращает его клиенту.

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
- Challenge истекает через 10 минут и может быть использован только один раз.

---

## JWT Token Structure

- **sub**: UUID пользователя из Supabase (требуется для RLS)
- **aud**: 'authenticated'
- **role**: 'authenticated'
- **iss**: 'supabase'
- **iat**: время выпуска
- **exp**: время истечения (по умолчанию 1 час)
- **user_metadata**: объект с адресом кошелька и email

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
Создать challenge для указанного адреса кошелька.

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
Проверить подпись challenge и получить JWT.

**Request:**
```json
{
  "wallet_address": "cyber14r6j7h4n2hmuam8tj224mw8g3earax5t4vvlkk",
  "pub_key": "base64-public-key",
  "signature": "base64-signature",
  "nonce": "abcd1234..."
}
```
**Response (успех):**
```json
{
  "success": true,
  "wallet_address": "cyber14r6j7h4n2hmuam8tj224mw8g3earax5t4vvlkk",
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "bearer",
  "expires_in": 3600
}
```
**Response (ошибка):**
```json
{
  "success": false,
  "error": "Invalid signature"
}
```

---

## Implementation Details

- Для проверки подписи используется secp256k1 (coincurve) и SHA-256.
- Публичный ключ должен соответствовать адресу кошелька (Cosmos/Keplr).
- Challenge хранится в Supabase и удаляется после успешной проверки или истечения TTL.
- Пользователь создается в Supabase автоматически (email формируется как `<wallet_address>@wallet.cyber.ai`).
- JWT генерируется с помощью pyjwt и подписывается секретом из переменных окружения.

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

1. **Challenge TTL**: 10 минут, одноразовый
2. **Signature verification**: Строгая криптографическая проверка
3. **Address validation**: Публичный ключ должен соответствовать адресу
4. **JWT Secret**: Хранить только в переменных окружения, минимум 32 символа
5. **CORS**: Разрешены только доверенные origin
6. **RLS**: Все доступы к данным через Supabase защищены RLS

---

## Troubleshooting

- **JWT Token Invalid**: Проверьте, что секрет совпадает с Supabase, токен не истёк, алгоритм HS256
- **User Creation Failed**: Проверьте права SERVICE_ROLE_KEY и корректность SUPABASE_URL
- **Challenge Not Found/Expired**: Повторите процесс, challenge истёк или уже использован
- **Signature Invalid**: Проверьте, что сообщение подписано корректно и не изменено

---

## Useful Links

- [Supabase JWT Docs](https://supabase.com/docs/guides/auth/jwt)
- [FastAPI Security](https://fastapi.tiangolo.com/tutorial/security/)
- [JWT.io Debugger](https://jwt.io/)
