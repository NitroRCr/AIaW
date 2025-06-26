# Cyber Collaborative (AI as Workspace)
[![Ask DeepWiki](https://deepwiki.com/badge.svg)](https://deepwiki.com/dasein108/AIaW)
> **Forked from [AIaW by NitroRCr](https://github.com/NitroRCr/AIaW)**

---

## About

AIaW Collaborative is a next-generation, multi-user AI workspace platform. This project is a fork of AIaW, reimagined for real-time collaboration, team chat, and extensibility. The database layer has been rewritten to use [Supabase](https://supabase.com/), enabling robust user management, roles, and live chat features. **A Web3 layer has also been added for decentralized features and future integrations.**

---

## Key Features

- **Multi-user collaboration:** Real-time chat and workspace sharing
- **Supabase backend:** Modern, scalable DB layer for authentication, roles, and data
- **User roles:** Fine-grained access control for teams and organizations
- **Real-time chat:** Synchronized conversations for all workspace members
- **Web3 layer:** Decentralized features and integrations
- **Extensible:** (TODO) Collaborative agents (LiteLLM/Plugin-based)

---

## Quick Start

### 1. Install dependencies

```bash
pnpm install
```

### 2. Setup Supabase

You can use either a local Supabase instance (recommended for development) or connect to a cloud Supabase project.

#### Local Supabase (via Docker Compose)

1. Copy the environment file and fill in your secrets:
   ```bash
   cp env.docker-compose.example .env.docker-compose
   # Edit .env.docker-compose with your values
   ```
2. Start Supabase services:
   ```bash
   docker compose up -d
   ```
   This will launch all Supabase services including:
   - **Studio** (Dashboard): http://localhost:8000
   - **Kong** (API Gateway): http://localhost:8000
   - **PostgREST** (REST API): http://localhost:8000/rest/v1/
   - **Auth** (GoTrue): http://localhost:8000/auth/v1/
   - **Storage**: http://localhost:8000/storage/v1/
   - **Realtime**: http://localhost:8000/realtime/v1/
   - **Analytics**: http://localhost:4000

   **Default Dashboard Credentials:**
   - Username: `supabase`
   - Password: `this_password_is_insecure_and_should_be_updated`

#### Cloud Supabase

- [Sign up for Supabase](https://supabase.com/) and create a new project.
- Update your environment variables to point to your cloud instance.

### 3. Start the app

```bash
quasar dev
```

---

## Roadmap

- [ ] Collaborative agents (LiteLLM/Plugin-based)
- [ ] Use Celestia-hosted graph as agent collaboration layer
- [ ] More granular permissions and workspace management
- [ ] Enhanced plugin system

---

## License

BSD 3-Clause License

Copyright (c) 2025, dasein108

See [LICENSE](LICENSE) for details.
