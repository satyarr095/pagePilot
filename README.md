# PagePilot — AI Document Intelligence System

Production-grade multimodal RAG pipeline for PDF ingestion, enrichment, and conversational retrieval.

## Architecture

```
frontend/          React + TypeScript + Tailwind (Vite)
backend/           FastAPI + SQLAlchemy + LangChain
  app/
    api/           REST endpoints (projects, documents, chat)
    core/          Config, logging, exceptions, error handlers
    db/            Async engine, session, declarative base
    ingestion/     PDF parsing, chunking, content separation, AI enrichment
    models/        SQLAlchemy ORM (Project, Document, ChunkMeta, ChatSession, Message)
    rag/           Vector store (ChromaDB), retriever, chat engine (SSE streaming)
    schemas/       Pydantic request/response models
    services/      Business logic (project, document, chat)
    utils/         Storage abstraction layer
scripts/           Setup and start scripts
```

### Tech Stack

| Layer       | Technology                                                          |
|-------------|---------------------------------------------------------------------|
| Frontend    | React 19, TypeScript, Vite 8, Tailwind CSS 4, React Query, Zustand |
| Backend     | Python 3.11+, FastAPI, SQLAlchemy (async), Pydantic v2              |
| AI / RAG    | LangChain, OpenAI (gpt-4o, text-embedding-3-small), ChromaDB       |
| Ingestion   | Unstructured.io (hi_res PDF, table extraction, image payloads)      |
| Database    | PostgreSQL (local), ChromaDB (persistent local)                     |
| Streaming   | Server-Sent Events (SSE) via sse-starlette                         |

### Ingestion Pipeline

1. **Parse** — `partition_pdf(strategy="hi_res", infer_table_structure=True, extract_image_block_types=["Image"], extract_image_block_to_payload=True)`
2. **Chunk** — `chunk_by_title(max_characters=3000, new_after_n_chars=2400, combine_text_under_n_chars=500)`
3. **Separate** — Split each chunk into raw text, table HTML, and base64 images
4. **Enrich** — GPT-4o multimodal summary for chunks containing tables or images
5. **Embed** — `text-embedding-3-small` into ChromaDB with project/document metadata
6. **Persist** — ChunkMeta rows in PostgreSQL for observability and debugging

## Prerequisites

- **Python 3.11+**
- **Node.js 22+** (Vite 8 requirement)
- **PostgreSQL** running locally
- **System libraries** for Unstructured.io:
  - macOS: `brew install poppler tesseract libmagic`
  - Ubuntu: `apt-get install poppler-utils tesseract-ocr libmagic1`
- **OpenAI API key**

## Quick Start

### 1. Clone and setup

```bash
git clone <repo-url> pagePilot && cd pagePilot
./scripts/setup.sh
```

The setup script creates a Python venv, installs dependencies, copies `.env.example` to `.env`, creates data directories, and installs frontend packages.

### 2. Configure

Edit `backend/.env` and set your OpenAI API key:

```
OPENAI_API_KEY=sk-your-key-here
```

### 3. Create the database

```bash
createdb -U postgres pagepilot
```

Tables are auto-created on first startup via `init_db()`.

### 4. Run

```bash
# Terminal 1 — Backend (port 8000)
./scripts/start-backend.sh

# Terminal 2 — Frontend (port 5173)
./scripts/start-frontend.sh
```

Open [http://localhost:5173](http://localhost:5173).

## Manual Setup (without scripts)

```bash
# Backend
cd backend
python3 -m venv venv && source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env   # then edit OPENAI_API_KEY
mkdir -p data/uploads data/chroma_db
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload

# Frontend (separate terminal)
cd frontend
npm install
npm run dev
```

## API Endpoints

| Method | Path                                              | Description                  |
|--------|----------------------------------------------------|------------------------------|
| POST   | `/api/v1/projects`                                 | Create project               |
| GET    | `/api/v1/projects`                                 | List projects                |
| GET    | `/api/v1/projects/{id}`                            | Get project                  |
| POST   | `/api/v1/documents/upload`                         | Upload PDF (multipart form)  |
| GET    | `/api/v1/documents/{project_id}`                   | List documents for project   |
| POST   | `/api/v1/documents/process/{project_id}`           | Trigger background ingestion |
| POST   | `/api/v1/chat/{project_id}`                        | Stream chat (SSE)            |
| GET    | `/api/v1/chat/{project_id}/sessions`               | List chat sessions           |
| POST   | `/api/v1/chat/{project_id}/sessions`               | Create chat session          |
| GET    | `/api/v1/chat/{project_id}/sessions/{sid}/messages`| Get session messages         |
| GET    | `/api/v1/chat/{project_id}/history`                | Full history (all sessions)  |
| GET    | `/api/v1/health`                                   | Health check                 |

## Environment Variables

See `backend/.env.example` for all options. Key variables:

| Variable         | Required | Default                              |
|------------------|----------|--------------------------------------|
| `OPENAI_API_KEY` | Yes      | —                                    |
| `DATABASE_URL`   | No       | `postgresql+asyncpg://postgres:postgres@localhost:5432/pagepilot` |
| `LLM_MODEL`      | No       | `gpt-4o`                             |
| `EMBEDDING_MODEL` | No      | `text-embedding-3-small`             |
| `RETRIEVAL_TOP_K` | No      | `5`                                  |

## AWS Deployment

The project is fully deployable to AWS using Terraform. See [`infra/README.md`](infra/README.md) for the complete deployment guide, architecture diagram, and operational runbooks.

**Live URLs:**

| Resource | URL |
|----------|-----|
| Frontend | `https://daqpw6pocqhjr.cloudfront.net` |
| API | `https://daqpw6pocqhjr.cloudfront.net/api/v1` |

## Design Decisions

- **Storage abstraction**: `StorageBackend` ABC in `utils/storage.py` — swap `LocalStorageBackend` for S3 later without touching services.
- **Background processing**: Uses `FastAPI.BackgroundTasks` — designed to be replaceable with Celery by wrapping `IngestPipeline.run` in a task.
- **Singleton vector store**: Thread-safe `VectorStoreManager` with `get_vectorstore()` — avoids creating Chroma clients per request.
- **SSE streaming**: Token-by-token streaming via `sse-starlette.EventSourceResponse` — frontend reads with `fetch` + `ReadableStream`.
- **Dual storage**: ChromaDB stores embeddings and enriched content; PostgreSQL stores metadata for observability and future queries.
- **Structured logging**: Via `structlog` for consistent JSON output in production.
