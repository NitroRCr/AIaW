from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException, Request, Response, UploadFile, Form, File
from fastapi.responses import FileResponse, StreamingResponse
from pydantic import BaseModel
import aiohttp
from typing import Optional, Dict, Any, AsyncIterator
from fastapi.staticfiles import StaticFiles
from llama_parse import LlamaParse
import os
from dotenv import load_dotenv

# Загружаем переменные окружения из .env файла
load_dotenv()

http_client = None

@asynccontextmanager
async def lifespan(app: FastAPI):
    global http_client
    http_client = aiohttp.ClientSession()
    yield
    await http_client.close()

app = FastAPI(lifespan=lifespan)

ALLOWED_PREFIXES = [
    'https://lobehub.search1api.com/api/search',
    'https://pollinations.ai-chat.top/api/drawing',
    'https://web-crawler.chat-plugin.lobehub.com/api/v1'
]

# LiteLLM proxy settings
LITELLM_URL = os.environ.get('LITELLM_URL')
LITELLM_API_KEY = os.environ.get('LITELLM_API_KEY')

class ProxyRequest(BaseModel):
    method: str
    url: str
    headers: Optional[Dict[str, str]] = None
    body: Optional[Any] = None

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
    """Stream the response data in chunks."""
    async for chunk in response.content.iter_any():
        yield chunk

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
    
    # Get request headers and body
    headers = dict(request.headers)
    
    # Remove headers that might cause conflicts
    headers.pop('host', None)
    headers.pop('content-length', None)
    
    # Add LiteLLM API key if provided
    if LITELLM_API_KEY:
        headers['Authorization'] = f"Bearer {LITELLM_API_KEY}"
    
    # Get the request body if it exists
    body = await request.body()
    
    try:
        # Forward the request to LiteLLM
        async with http_client.request(
            method=request.method,
            url=target_url,
            headers=headers,
            data=body or None,
            params=request.query_params,
            allow_redirects=False,
        ) as response:
            # For streaming responses, we need to return a StreamingResponse
            if 'text/event-stream' in response.headers.get('content-type', ''):
                return StreamingResponse(
                    stream_response(response),
                    status_code=response.status,
                    headers=dict(response.headers),
                    media_type=response.headers.get('content-type')
                )
            
            # For regular responses, read the entire content and return
            content = await response.read()
            return Response(
                content=content,
                status_code=response.status,
                headers=dict(response.headers),
                media_type=response.headers.get('content-type')
            )
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

app.mount('/', StaticFiles(directory='static', html=True), name='static')

@app.exception_handler(404)
async def return_index(request: Request, exc: HTTPException):
    return FileResponse("static/index.html")
