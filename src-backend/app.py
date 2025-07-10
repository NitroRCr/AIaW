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
from datetime import datetime, timedelta, timezone
from dotenv import load_dotenv, find_dotenv
from fastapi.middleware.cors import CORSMiddleware
import requests

# Загружаем переменные окружения из .env файла
load_dotenv()
load_dotenv(find_dotenv('.env.local'), override=True)

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

class AuthResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    expires_in: int

def get_or_create_user(wallet_address: str, email: str) -> str:
    """
    Find or create a Supabase user by wallet_address. Returns the UUID (as string).
    """
    print(f"DEBUG: get_or_create_user called for wallet: {wallet_address}")
    headers = {
        'apikey': SUPABASE_SERVICE_KEY,
        'Authorization': f'Bearer {SUPABASE_SERVICE_KEY}',
        'Content-Type': 'application/json',
        'x-supabase-bypass-rls': 'true'  # Обходим RLS
    }

    # 1. Поиск по wallet_address в таблице profiles
    print(f"DEBUG: Searching for existing user by wallet_address: {wallet_address}")
    resp = requests.get(
        f"{SUPABASE_URL}/rest/v1/profiles?wallet_address=eq.{wallet_address}&select=id",
        headers=headers
    )
    print(f"DEBUG: Search response status: {resp.status_code}")
    if resp.status_code == 200 and resp.json():
        supabase_uid = resp.json()[0]['id']
        print(f"DEBUG: Found existing user: {supabase_uid}")
        return supabase_uid

    # 2. Если не найдено — создаём пользователя через Supabase Auth API
    print("DEBUG: User not found, creating new user")
    password = wallet_address + "_auto_pwd_1234"
    payload = {
        "email": email,
        "password": password,
        "user_metadata": {
            "wallet_address": wallet_address,
            # Добавляем имя, чтобы оно не было пустым в профиле
            "name": wallet_address[:8]
        }
    }
    print(f"DEBUG: Creating user with payload: {payload}")
    auth_resp = requests.post(
        f"{SUPABASE_URL}/auth/v1/admin/users",
        headers=headers,
        data=json.dumps(payload)
    )
    print(f"DEBUG: Auth API response status: {auth_resp.status_code}")

    if auth_resp.status_code in (200, 201):
        user = auth_resp.json()['user'] if 'user' in auth_resp.json() else auth_resp.json()
        supabase_uid = user['id']
        print(f"DEBUG: Created user with UUID: {supabase_uid}")

        # Профиль будет обновлен триггером в БД.
        # Этот код больше не нужен.
        # profile_update_payload = {"wallet_address": wallet_address}
        # profile_update_headers = {**headers, 'Prefer': 'return=representation'}
        # profile_update_resp = requests.patch(
        #     f"{SUPABASE_URL}/rest/v1/profiles?id=eq.{supabase_uid}",
        #     headers=profile_update_headers,
        #     json=profile_update_payload
        # )
        # print(f"DEBUG: Profile update response status: {profile_update_resp.status_code}")

        return supabase_uid

    elif auth_resp.status_code == 422 and 'email_exists' in auth_resp.text:
        print("DEBUG: Email already exists, trying to link wallet.")
        # Находим пользователя по email
        user_search_resp = requests.get(
            f"{SUPABASE_URL}/auth/v1/admin/users?email={email}",
            headers=headers
        )
        user_data = user_search_resp.json()
        if user_search_resp.status_code == 200 and user_data.get('users'):
            user = user_data['users'][0]
            supabase_uid = user['id']
            print(f"DEBUG: Found user by email with UUID: {supabase_uid}")

            # Обновляем `user_metadata` с `wallet_address`
            update_payload = {"user_metadata": {**user.get('user_metadata', {}), "wallet_address": wallet_address}}
            requests.put(f"{SUPABASE_URL}/auth/v1/admin/users/{supabase_uid}", headers=headers, json=update_payload)

            # Обновляем профиль с `wallet_address`
            profile_update_payload = {"wallet_address": wallet_address}
            requests.patch(
                f"{SUPABASE_URL}/rest/v1/profiles?id=eq.{supabase_uid}",
                headers=headers,
                json=profile_update_payload
            )
            return supabase_uid
        else:
            raise Exception("Email exists, but could not retrieve user to link wallet.")

    print(f"DEBUG: Failed to create user. Response: {auth_resp.text}")
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
    # 移除 host header 以避免冲突
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
async def authenticate_with_wallet(auth_request: WalletAuthRequest):
    wallet_address = auth_request.wallet_address
    email = f"{wallet_address}@cyberchat.ai"
    try:
        print("DEBUG: About to call get_or_create_user")
        uuid = get_or_create_user(
            wallet_address=wallet_address,
            email=email
        )
        print(f"DEBUG: Got UUID: {uuid}")
        print("DEBUG: About to generate JWT token")
        access_token = generate_jwt_token_for_uuid(
            uuid=uuid,
            wallet_address=wallet_address,
            email=email
        )
        print("DEBUG: JWT token generated successfully")
        return AuthResponse(
            access_token=access_token,
            token_type="bearer",
            expires_in=JWT_EXPIRY
        )
    except Exception as e:
        print(f"DEBUG: Exception in /auth/wallet: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to generate token: {str(e)}")

# if IS_PRODUCTION:
app.mount('/', StaticFiles(directory='static', html=True), name='static')

@app.exception_handler(404)
async def return_index(request: Request, exc: HTTPException):
    return FileResponse("static/index.html")
