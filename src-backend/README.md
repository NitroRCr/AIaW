# AIaW Backend

Backend service for the AIaW application, built on FastAPI.

## Installation and Setup

1. Install Python 3.8 or higher.
2. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

3. Configure environment variables:
   ```bash
   cp env.example .env
   # Edit the .env file and add your settings
   ```

4. Start the development server:
   ```bash
   uvicorn app:app --reload
   ```

## Environment Variables

Create a `.env` file in the root directory of `src-backend` with the following variables:

- `SEARXNG_URL` - URL for SearxNG search
- `LLAMA_CLOUD_API_KEY` - API key for LlamaParse

## API Endpoints

- `POST /cors/proxy` - CORS proxy for external requests
- `POST /doc-parse/parse` - Document parsing via LlamaParse
- `GET /searxng` - Proxy for SearxNG search

## File Structure

- `app.py` - Main FastAPI application
- `requirements.txt` - Python dependencies
- `env.example` - Example environment variables
- `static/` - Static files for the frontend
