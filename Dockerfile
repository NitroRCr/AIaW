FROM node:22.14-alpine AS builder
WORKDIR /app

COPY . .
COPY .env.docker .env.local
RUN apk --no-cache add --virtual .builds-deps build-base python3
RUN npm install -g pnpm
RUN pnpm install && pnpm build -m pwa

FROM python:3.12.7-slim
WORKDIR /app

COPY src-backend/ .
COPY --from=builder /app/dist/pwa ./static
RUN pip install --no-cache-dir -r requirements.txt

EXPOSE 9010
CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "9010"]
