from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException, Request, Response, UploadFile, Form, File
from fastapi.responses import FileResponse, StreamingResponse
from pydantic import BaseModel
import aiohttp
from typing import Optional, Dict, Any, AsyncIterator
from fastapi.staticfiles import StaticFiles
from llama_parse import LlamaParse
import os
import jwt
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

class AuthResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    expires_in: int

def get_or_create_supabase_user(privy_user_id: str, wallet_address: str = None, email: str = None) -> str:
    """
    Find or create a Supabase user by privy_user_id. Returns the UUID (as string).
    """
    print(f"DEBUG: get_or_create_supabase_user called for privy_user_id: {privy_user_id}")
    print(f"DEBUG: SUPABASE_URL: {SUPABASE_URL}")
    print(f"DEBUG: SERVICE_ROLE_KEY available: {bool(SUPABASE_SERVICE_KEY)}")

    headers = {
        'apikey': SUPABASE_SERVICE_KEY,
        'Authorization': f'Bearer {SUPABASE_SERVICE_KEY}',
        'Content-Type': 'application/json',
    }
    # 1. Поиск в privy_users
    print("DEBUG: Searching for existing user in privy_users table")
    resp = requests.get(
        f"{SUPABASE_URL}/rest/v1/privy_users?privy_user_id=eq.{privy_user_id}&select=supabase_uid",
        headers=headers
    )
    print(f"DEBUG: Search response status: {resp.status_code}")
    if resp.status_code == 200 and resp.json():
        print(f"DEBUG: Found existing user: {resp.json()[0]['supabase_uid']}")
        return resp.json()[0]['supabase_uid']

    # 2. Если не найдено — создаём пользователя через Supabase Auth API
    print("DEBUG: User not found, creating new user")
    payload = {
        "email": email or f"{privy_user_id}@privy.local",
        "password": privy_user_id + "_auto_pwd_1234",
        "data": {
            "privy_user_id": privy_user_id,
            "wallet_address": wallet_address
        }
    }
    print(f"DEBUG: Creating user with payload: {payload}")
    auth_resp = requests.post(
        f"{SUPABASE_URL}/auth/v1/admin/users",
        headers=headers,
        json=payload
    )
    print(f"DEBUG: Auth API response status: {auth_resp.status_code}")
    if auth_resp.status_code in (200, 201):
        user = auth_resp.json()['user'] if 'user' in auth_resp.json() else auth_resp.json()
        supabase_uid = user['id']
        print(f"DEBUG: Created user with UUID: {supabase_uid}")
        # Добавляем в privy_users
        privy_payload = {
            "supabase_uid": supabase_uid,
            "privy_user_id": privy_user_id,
            "wallet_address": wallet_address,
            "email": email
        }
        print("DEBUG: Adding user to privy_users table")
        privy_resp = requests.post(f"{SUPABASE_URL}/rest/v1/privy_users", headers=headers, json=privy_payload)
        print(f"DEBUG: privy_users insert response status: {privy_resp.status_code}")
        return supabase_uid
    print(f"DEBUG: Failed to create user. Response: {auth_resp.text}")
    raise Exception(f"Failed to create/find user for privy_user_id: {privy_user_id}")

def generate_jwt_token_for_uuid(uuid: str, privy_user_id: str, wallet_address: str = None, email: str = None, metadata: Optional[Dict[str, Any]] = None) -> str:
    now = datetime.now(timezone.utc)
    expires_at = now + timedelta(seconds=JWT_EXPIRY)
    payload = {
        'sub': uuid,  # UUID!
        'aud': 'authenticated',
        'role': 'authenticated',
        'iss': 'aiaw-backend',
        'iat': int(now.timestamp()),
        'exp': int(expires_at.timestamp()),
        'user_metadata': {
            'privy_user_id': privy_user_id,
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

@app.post('/auth/privy', response_model=AuthResponse)
async def authenticate_with_privy(auth_request: PrivyAuthRequest):
    print(f"DEBUG: /auth/privy endpoint called with privy_user_id: {auth_request.privy_user_id}")
    try:
        print("DEBUG: About to call get_or_create_supabase_user")
        uuid = get_or_create_supabase_user(
            privy_user_id=auth_request.privy_user_id,
            wallet_address=auth_request.wallet_address,
            email=auth_request.email
        )
        print(f"DEBUG: Got UUID: {uuid}")
        print("DEBUG: About to generate JWT token")
        access_token = generate_jwt_token_for_uuid(
            uuid=uuid,
            privy_user_id=auth_request.privy_user_id,
            wallet_address=auth_request.wallet_address,
            email=auth_request.email,
            metadata=auth_request.metadata
        )
        print("DEBUG: JWT token generated successfully")
        return AuthResponse(
            access_token=access_token,
            token_type="bearer",
            expires_in=JWT_EXPIRY
        )
    except Exception as e:
        print(f"DEBUG: Exception in /auth/privy: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to generate token: {str(e)}")

@app.get('/auth/test')
async def test_auth():
    """
    Test endpoint to generate a fake JWT token for development
    """
    fake_user_id = "test-privy-user-123"
    fake_wallet = "0x1234567890123456789012345678901234567890"
    fake_email = "test@example.com"

    try:
        access_token = generate_jwt_token_for_uuid(
            uuid=fake_user_id,
            privy_user_id=fake_user_id,
            wallet_address=fake_wallet,
            email=fake_email,
            metadata={"test": True}
        )

        return {
            "message": "Test token generated successfully",
            "access_token": access_token,
            "token_type": "bearer",
            "expires_in": JWT_EXPIRY,
            "user_info": {
                "privy_user_id": fake_user_id,
                "wallet_address": fake_wallet,
                "email": fake_email
            }
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate test token: {str(e)}")

# if IS_PRODUCTION:
app.mount('/', StaticFiles(directory='static', html=True), name='static')

@app.exception_handler(404)
async def return_index(request: Request, exc: HTTPException):
    return FileResponse("static/index.html")
