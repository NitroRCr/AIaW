from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException, Request, Response, UploadFile, Form, File
from fastapi.responses import FileResponse, StreamingResponse
from pydantic import BaseModel
import aiohttp
from typing import Optional, Dict, Any, AsyncIterator
from fastapi.staticfiles import StaticFiles
# from llama_parse import LlamaParse
import os
import jwt
import json
import base64
import hashlib
from datetime import datetime, timedelta, timezone
from dotenv import load_dotenv, find_dotenv
from fastapi.middleware.cors import CORSMiddleware
import requests
from coincurve import PublicKey
from cosmospy import pubkey_to_address
from cryptography.hazmat.primitives.asymmetric.utils import encode_dss_signature

# Загружаем переменные окружения из .env файла
load_dotenv()
# load_dotenv(find_dotenv('.env.local'), override=True)

http_client = None

@asynccontextmanager
async def lifespan(app: FastAPI):
    global http_client
    http_client = aiohttp.ClientSession()
    yield
    await http_client.close()

app = FastAPI(lifespan=lifespan)

origins = [
    "http://localhost",
    "http://localhost:9005",
    "http://localhost:9006",
    "https://chatcyber.ai",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_origin_regex=r"https?://.+\.chatcyber\.ai",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

ALLOWED_PREFIXES = [
    'https://lobehub.search1api.com/api/search',
    'https://pollinations.ai-chat.top/api/drawing',
    'https://web-crawler.chat-plugin.lobehub.com/api/v1'
]

# LiteLLM proxy settings
LITELLM_URL = os.environ.get('LITELLM_URL')
LITELLM_API_KEY = os.environ.get('LITELLM_API_KEY')
IS_PRODUCTION = os.environ.get('IS_PRODUCTION', 'false').lower() == 'true'

# JWT settings for Supabase compatibility
JWT_SECRET = os.environ.get('JWT_SECRET', 'super-secret-jwt-token-with-at-least-32-characters')
JWT_ALGORITHM = 'HS256'
JWT_EXPIRY = int(os.environ.get('JWT_EXPIRY', 3600))  # Default 1 hour

SUPABASE_URL = os.environ.get('SUPABASE_URL')
SUPABASE_SERVICE_KEY = os.environ.get('SERVICE_ROLE_KEY')

print("JWT_SECRET", JWT_SECRET)

def verify_wallet_auth(wallet_address: str, pubkey_b64: str) -> bool:
    """
    Простая проверка соответствия публичного ключа и адреса кошелька
    Более простой и надежный способ для Cosmos SDK
    """
    try:
        # Декодируем публичный ключ
        pubkey_bytes = base64.b64decode(pubkey_b64)

        # Генерируем адрес из публичного ключа
        generated_address = pubkey_to_address(pubkey_bytes, hrp='cyber')

        # Проверяем соответствие
        return wallet_address == generated_address

    except Exception as e:
        print(f"Error in verify_wallet_auth: {e}")
        return False

def verify_keplr_signature(pubkey_b64, message, signature_b64):
    """
    Проверяет подпись Keplr используя secp256k1
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

class ProxyRequest(BaseModel):
    method: str
    url: str
    headers: Optional[Dict[str, str]] = None
    body: Optional[Any] = None

class PrivyAuthRequest(BaseModel):
    privy_user_id: str
    wallet_address: Optional[str] = None
    email: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = None

class WalletAuthRequest(BaseModel):
    wallet_address: str
    pub_key: str
    message: Optional[str] = None
    signature: Optional[str] = None

class AuthResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    expires_in: int

async def get_or_create_user(wallet_address: str, email: str) -> str:
    """
    Find or create a Supabase user by wallet_address. Returns the UUID (as string).
    Uses async aiohttp client.
    """
    global http_client
    print(f"DEBUG: get_or_create_user called for wallet: {wallet_address}")
    headers = {
        'apikey': SUPABASE_SERVICE_KEY,
        'Authorization': f'Bearer {SUPABASE_SERVICE_KEY}',
        'Content-Type': 'application/json',
    }
    # Для служебных запросов важно обходить RLS
    search_headers = {**headers, 'x-supabase-bypass-rls': 'true'}

    # 1. Поиск по wallet_address в таблице profiles
    search_url = f"{SUPABASE_URL}/rest/v1/profiles?wallet_address=eq.{wallet_address}&select=id"
    print(f"DEBUG: Searching for existing user by wallet_address: {wallet_address}")
    async with http_client.get(search_url, headers=search_headers) as resp:
        print(f"DEBUG: Search response status: {resp.status}")
        response_text = await resp.text()

        if resp.status == 200:
            try:
                data = json.loads(response_text)
                if data:
                    supabase_uid = data[0]['id']
                    print(f"DEBUG: Found existing user: {supabase_uid}")
                    return supabase_uid
            except json.JSONDecodeError:
                raise Exception(f"Failed to parse JSON from Supabase search, content was: {response_text[:500]}")

    # 2. Если не найдено — создаём пользователя через Supabase Auth API
    print("DEBUG: User not found, creating new user")
    password = wallet_address + "_auto_pwd_1234"
    payload = {
        "email": email,
        "password": password,
        "user_metadata": {
            "wallet_address": wallet_address,
            "name": wallet_address[:8]
        }
    }
    create_user_url = f"{SUPABASE_URL}/auth/v1/admin/users"
    print(f"DEBUG: Creating user with payload: {payload}")
    async with http_client.post(create_user_url, headers=headers, json=payload) as auth_resp:
        print(f"DEBUG: Auth API response status: {auth_resp.status}")
        response_text = await auth_resp.text()

        if auth_resp.status in (200, 201):
            try:
                response_json = json.loads(response_text)
                user = response_json.get('user', response_json)
                supabase_uid = user['id']
                print(f"DEBUG: Created user with UUID: {supabase_uid}")
                return supabase_uid
            except json.JSONDecodeError:
                raise Exception(f"Failed to parse JSON from user creation: {response_text}")

        elif auth_resp.status == 422 and 'email_exists' in response_text:
            print("DEBUG: Email already exists, trying to link wallet.")
            # This part remains complex with sync logic, for now, focus on the main path
            # The ideal solution would involve refactoring this part to be fully async as well.
            # For now, we'll raise an exception to highlight the issue if it occurs.
            raise Exception("Email exists, linking not yet implemented asynchronously.")

        print(f"DEBUG: Failed to create user. Response: {response_text}")
        raise Exception(f"Failed to create/find user for wallet: {wallet_address}")


def generate_jwt_token_for_uuid(uuid: str, wallet_address: str = None, email: str = None, metadata: Optional[Dict[str, Any]] = None) -> str:
    now = datetime.now(timezone.utc)
    expires_at = now + timedelta(seconds=JWT_EXPIRY)
    payload = {
        'sub': uuid,  # UUID!
        'aud': 'authenticated',
        'role': 'authenticated',
        'iss': 'supabase',
        'iat': int(now.timestamp()),
        'exp': int(expires_at.timestamp()),
        'user_metadata': {
            'wallet_address': wallet_address,
            'email': email,
            **(metadata or {})
        }
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

@app.post('/cors/proxy')
async def proxy(request: ProxyRequest):
    if not any(request.url.startswith(prefix) for prefix in ALLOWED_PREFIXES):
        raise HTTPException(status_code=403, detail='URL not allowed')

    kwargs = {
        'method': request.method,
        'url': request.url,
        'headers': request.headers or {}
    }

    if request.body is not None:
        if isinstance(request.body, (dict, list)):
            kwargs['json'] = request.body
        else:
            kwargs['data'] = request.body

    try:
        async with http_client.request(**kwargs) as response:
            content = await response.read()
            return Response(content=content, status_code=response.status)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

async def stream_response(response: aiohttp.ClientResponse) -> AsyncIterator[bytes]:
    """Stream the response data in chunks and ensure the response is closed."""
    try:
        async for chunk in response.content.iter_any():
            yield chunk
    finally:
        response.release()

@app.post('/litellm/{path:path}')
@app.get('/litellm/{path:path}')
@app.put('/litellm/{path:path}')
@app.delete('/litellm/{path:path}')
async def litellm_proxy(request: Request, path: str):
    """
    Proxy endpoint for LiteLLM API requests with streaming support.
    This endpoint forwards all requests to the LiteLLM API service.
    """
    if not LITELLM_URL:
        raise HTTPException(status_code=502, detail="LITELLM_URL environment variable not set")

    # Build the target URL by combining the configured base URL with the path
    target_url = f"{LITELLM_URL}/{path}"
    print(target_url)
    # Get request headers and body
    headers = dict(request.headers)

    # Remove headers that might cause conflicts
    headers.pop('host', None)
    headers.pop('content-length', None)
    headers.pop('transfer-encoding', None)

    # Add LiteLLM API key if provided
    if LITELLM_API_KEY:
        headers['Authorization'] = f"Bearer {LITELLM_API_KEY}"
    # Get the request body if it exists
    body = await request.body()

    try:
        # Forward the request to LiteLLM
        response = await http_client.request(
            method=request.method,
            url=target_url,
            headers=headers,
            data=body or None,
            params=request.query_params,
            allow_redirects=False,
        )

        # For streaming responses, we need to return a StreamingResponse
        if 'text/event-stream' in response.headers.get('content-type', ''):
            return StreamingResponse(
                stream_response(response),
                status_code=response.status,
                headers=dict(response.headers),
                media_type=response.headers.get('content-type')
            )

        # For regular responses, read the entire content and return
        try:
            content = await response.read()
            return Response(
                content=content,
                status_code=response.status,
                headers=dict(response.headers),
                media_type=response.headers.get('content-type')
            )
        finally:
            response.release()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post('/doc-parse/parse')
async def parse_document(
    file: UploadFile = File(...),
    language: Optional[str] = Form(default='en'),
    target_pages: Optional[str] = Form(default=None)
):
    parser = LlamaParse(
        result_type='markdown',
        language=language,
        target_pages=target_pages
    )

    file_content = await file.read()

    try:
        documents = await parser.aload_data(
            file_content,
            {'file_name': file.filename}
        )

        return {
            'success': True,
            'content': [{'text': doc.text, 'meta': doc.metadata} for doc in documents]
        }

    except Exception as e:
        return {
            'success': False,
            'error': str(e)
        }

    finally:
        await file.close()

@app.get('/searxng')
async def searxng(request: Request):
    searxng_url = os.environ.get('SEARXNG_URL')

    if not searxng_url:
        raise HTTPException(status_code=502, detail="SEARXNG_URL environment variable not set")

    query_string = request.url.query
    target_url = f"{searxng_url}?{query_string}" if query_string else searxng_url

    headers = dict(request.headers)
    # Remove host header to avoid conflicts
    headers.pop('host', None)

    try:
        async with http_client.get(target_url, headers=headers) as response:
            content = await response.read()
            return Response(
                content=content,
                status_code=response.status
            )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post('/auth/wallet', response_model=AuthResponse)
async def authenticate_with_wallet(auth_request: WalletAuthRequest) -> AuthResponse:
    """
    Handles wallet-based authentication.
    Uses simple pubkey->address verification (recommended) or signature verification.
    """
    print(f"INFO: Received wallet auth request for: {auth_request.wallet_address}")
    try:
        # Primary verification: Check if public key matches wallet address
        if not verify_wallet_auth(auth_request.wallet_address, auth_request.pub_key):
            raise HTTPException(status_code=401, detail="Wallet address does not match public key")

        print(f"INFO: Wallet address verified successfully for: {auth_request.wallet_address}")

        # Optional: Additional signature verification if provided
        if auth_request.message and auth_request.signature:
            if not verify_keplr_signature(auth_request.pub_key, auth_request.message, auth_request.signature):
                raise HTTPException(status_code=401, detail="Invalid signature")
            print(f"INFO: Signature also verified successfully")

        # Generate a unique, deterministic email from the wallet address
        # This avoids requiring a real email for wallet-only users
        email_for_supabase = f"{auth_request.wallet_address}@wallet.cyber.ai"

        # Find or create a Supabase user
        user_uuid = await get_or_create_user(
            wallet_address=auth_request.wallet_address,
            email=email_for_supabase
        )
        print(f"DEBUG: Got UUID: {user_uuid}")
        print("DEBUG: About to generate JWT token")
        access_token = generate_jwt_token_for_uuid(
            uuid=user_uuid,
            wallet_address=auth_request.wallet_address,
            email=email_for_supabase
        )
        print("DEBUG: JWT token generated successfully")
        return AuthResponse(
            access_token=access_token,
            token_type="bearer",
            expires_in=JWT_EXPIRY
        )
    except HTTPException:
        raise
    except Exception as e:
        print(f"DEBUG: Exception in /auth/wallet: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to generate token: {str(e)}")

# if IS_PRODUCTION:
app.mount('/', StaticFiles(directory='static', html=True), name='static')

@app.exception_handler(404)
async def return_index(request: Request, exc: HTTPException):
    return FileResponse("static/index.html")
