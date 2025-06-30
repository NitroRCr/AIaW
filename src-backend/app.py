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

def generate_jwt_token(privy_user_id: str, wallet_address: Optional[str] = None,
                      email: Optional[str] = None, metadata: Optional[Dict[str, Any]] = None) -> str:
    """
    Generate JWT token compatible with Supabase auth
    """
    now = datetime.now(timezone.utc)
    expires_at = now + timedelta(seconds=JWT_EXPIRY)

    payload = {
        'sub': privy_user_id,  # Subject - stable user identifier
        'aud': 'authenticated',  # Audience - Supabase role
        'role': 'authenticated',  # User role
        'iss': 'aiaw-backend',  # Issuer
        'iat': int(now.timestamp()),  # Issued at
        'exp': int(expires_at.timestamp()),  # Expires at
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
    """
    Authenticate user with Privy and generate JWT token for Supabase
    """
    try:
        # Generate JWT token
        access_token = generate_jwt_token(
            privy_user_id=auth_request.privy_user_id,
            wallet_address=auth_request.wallet_address,
            email=auth_request.email,
            metadata=auth_request.metadata
        )

        return AuthResponse(
            access_token=access_token,
            token_type="bearer",
            expires_in=JWT_EXPIRY
        )

    except Exception as e:
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
        access_token = generate_jwt_token(
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
