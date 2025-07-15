# Web3 Authentication Module

Модуль для Web3 авторизации через подписи кошельков с использованием challenge/response протокола.

## Структура модуля

```
auth/
├── __init__.py              # Экспорты модуля
├── crypto_utils.py          # Криптографические функции
├── challenge_service.py     # Сервис challenge/response
├── auth_endpoints.py        # FastAPI endpoints
└── README.md               # Эта документация
```

## Функциональность

### 1. Криптографические утилиты (`crypto_utils.py`)

- **`verify_signature`** - Проверяет подпись сообщения с использованием secp256k1 и SHA-256
- **`verify_wallet_auth`** - Комплексная проверка аутентификации кошелька
- **`generate_challenge_message`** - Генерирует стандартное сообщение для challenge

### 2. Сервис challenge/response (`challenge_service.py`)

- **`ChallengeService`** - Основной класс для работы с challenges
  - `create_challenge()` - Создает новый challenge
  - `verify_challenge()` - Проверяет challenge и подпись
  - `cleanup_expired_challenges()` - Очищает истекшие challenges

### 3. FastAPI endpoints (`auth_endpoints.py`)

- **`POST /auth/web3/challenge`** - Создание challenge
- **`POST /auth/web3/verify`** - Проверка challenge
- **`POST /auth/web3/cleanup`** - Очистка истекших challenges

## Использование

### Базовая проверка подписи

```python
from auth.crypto_utils import verify_signature

# Проверка подписи Keplr кошелька
is_valid = verify_signature(
    signature_b64="base64-signature",
    message="Sign this message to login",
    pubkey_b64="base64-public-key"
)
```

### Проверка аутентификации кошелька

```python
from auth.crypto_utils import verify_wallet_auth

# Простая проверка соответствия адреса и публичного ключа
is_valid = verify_wallet_auth(
    wallet_address="cyber14r6j7h4n2hmuam8tj224mw8g3earax5t4vvlkk",
    pub_key="base64-public-key"
)

# Полная проверка с подписью
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

# Инициализация сервиса
service = ChallengeService(
    supabase_url="https://your-project.supabase.co",
    supabase_anon_key="your-anon-key"
)

# 1. Создание challenge
challenge = await service.create_challenge("cyber14r6j7h4n2hmuam8tj224mw8g3earax5t4vvlkk")
# Результат: {"nonce": "...", "message": "..."}

# 2. Пользователь подписывает message своим кошельком

# 3. Проверка challenge
result = await service.verify_challenge(
    wallet_address="cyber14r6j7h4n2hmuam8tj224mw8g3earax5t4vvlkk",
    pub_key="base64-public-key",
    signature="base64-signature",
    nonce=challenge["nonce"]
)
# Результат: {"success": True, "wallet_address": "..."} или {"success": False, "error": "..."}
```

## API Endpoints

### POST /auth/web3/challenge

Создает новый challenge для указанного адреса кошелька.

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

Проверяет подпись challenge.

**Request:**
```json
{
  "wallet_address": "cyber14r6j7h4n2hmuam8tj224mw8g3earax5t4vvlkk",
  "pub_key": "Ag3EI2K4aGNMdk/OVQbDCEn8OEPNylNhHNSv/l+ct9sQ",
  "signature": "base64-signature",
  "nonce": "abcd1234..."
}
```

**Response (успех):**
```json
{
  "success": true,
  "wallet_address": "cyber14r6j7h4n2hmuam8tj224mw8g3earax5t4vvlkk"
}
```

**Response (ошибка):**
```json
{
  "success": false,
  "error": "Invalid signature"
}
```

## Требования

- Python 3.8+
- FastAPI
- coincurve (secp256k1)
- cosmospy (для Cosmos SDK адресов)
- cryptography (для DER кодирования)
- aiohttp (для HTTP запросов)

## База данных

Модуль использует таблицу `auth_challenges` в Supabase:

```sql
CREATE TABLE IF NOT EXISTS public.auth_challenges (
    wallet_address TEXT PRIMARY KEY,
    nonce TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

## Безопасность

1. **Challenge TTL**: Challenges истекают через 10 минут
2. **One-time use**: Каждый challenge может быть использован только один раз
3. **Signature verification**: Полная криптографическая проверка подписей
4. **Address validation**: Проверка соответствия публичного ключа адресу кошелька

## Улучшения

Модуль заменяет ручную DER конвертацию на использование встроенной функции `encode_dss_signature` из библиотеки `cryptography`, что делает код более надежным и читаемым.
