# NDA Analyzer

A full-stack web application that analyzes Indian employment NDAs using a 4-agent AI pipeline. Upload a PDF or DOCX and get a structured report of every loophole, compliance gap under Indian law, and a suggested fix for each problematic clause.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router) + TypeScript |
| Styling | Tailwind CSS v4 |
| LLM (text generation) | Gemini 2.5 Flash Lite (`gemini-2.5-flash-lite`) |
| Embeddings | HuggingFace Inference API — `sentence-transformers/all-MiniLM-L6-v2` |
| Vector store | ChromaDB v3 (local server, persistent at `./chroma_db`) |
| PDF parsing | pdf-parse v2 |
| DOCX parsing | mammoth |
| Jurisdiction | India only |

---

## Prerequisites

- Node.js 20+
- Python 3.9+ with `chromadb` installed (`pip install chromadb`)
- A **Gemini API key** (for text generation)
- A **HuggingFace token** (for embeddings — free tier works)

---

## Environment Variables

Create `.env.local` in the project root:

```
GEMINI_API_KEY=your_gemini_api_key_here
HF_TOKEN=your_huggingface_token_here
```

> `GEMINI_GENERATION_MODEL` is optional — defaults to `gemini-2.5-flash-lite`.

---

## Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Start ChromaDB

ChromaDB must be running before seeding or starting the app.

```bash
pip install chromadb
chroma run --path ./chroma_db
```

Keep this terminal open. ChromaDB listens on `http://localhost:8000`.

### 3. Seed ChromaDB (one-time)

```bash
npm run seed
```

This seeds 3 collections from the reference documents in `nda-analyzer-docs/`:

| Collection | Source file | Chunk size | Overlap |
|---|---|---|---|
| `legal_statutes` | `india_legal_statutes.txt` | 600 words | 80 words |
| `nda_templates` | `nda_clause_templates.txt` | 500 words | 60 words |
| `company_policies` | `company_hr_policy.txt` | 400 words | 50 words |

Embeddings are generated using `sentence-transformers/all-MiniLM-L6-v2` via the HuggingFace Inference API.

### 4. Start the app

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## How It Works

### Upload flow

1. HR uploads a PDF or DOCX on the home page
2. `POST /api/upload` extracts text and stores it in an in-memory map keyed by UUID
3. Browser redirects to `/results/[id]`

### Analysis pipeline (sequential, streamed via SSE)

The results page opens a Server-Sent Events connection to `GET /api/analyze/[id]`, which runs 4 agents in sequence and streams progress after each step:

| Step | Agent | Input | Output |
|---|---|---|---|
| 1 | **Clause Extractor** | Raw NDA text | Labelled clauses JSON |
| 2 | **Loophole Finder** | Clauses + RAG from `legal_statutes` & `nda_templates` | Issues JSON |
| 3 | **Legal Comparator** | Clauses + Issues + RAG from `legal_statutes` | Compliance gaps JSON |
| 4 | **Fix Suggester** | All prior outputs + RAG from `nda_templates` & `company_policies` | Fixes + risk score + executive summary |

### RAG retrieval

Each agent that uses RAG queries ChromaDB with a natural-language string. The `sentence-transformers/all-MiniLM-L6-v2` embedding model (384 dimensions) is used consistently for both seeding and querying. If ChromaDB is unreachable, the agents continue with empty context rather than failing.

---

## Project Structure

```
nda_analysis/
├── app/
│   ├── page.tsx                       # Upload page (drag-and-drop)
│   ├── results/[id]/
│   │   ├── page.tsx                   # Server component (unwraps params)
│   │   └── ResultsClient.tsx          # Client component (SSE + full report UI)
│   └── api/
│       ├── upload/route.ts            # POST — parse file, store text, return UUID
│       └── analyze/[id]/route.ts      # GET — run 4-agent pipeline, stream SSE
├── lib/
│   ├── agents/
│   │   ├── clauseExtractor.ts         # Agent 1
│   │   ├── loopholeFinder.ts          # Agent 2
│   │   ├── legalComparator.ts         # Agent 3
│   │   └── fixSuggester.ts            # Agent 4
│   ├── rag/
│   │   └── chromaRetriever.ts         # HuggingFace embeddings + ChromaDB queries
│   ├── parsers/
│   │   └── documentParser.ts          # PDF (pdf-parse) + DOCX (mammoth)
│   ├── prompts/
│   │   └── agentPrompts.ts            # All 4 prompt templates
│   ├── gemini.ts                      # Shared Gemini API helper (JSON mode)
│   ├── store.ts                       # In-memory job store (global Map)
│   └── types.ts                       # TypeScript interfaces for all agent I/O
├── scripts/
│   └── seedChroma.ts                  # One-time ChromaDB seeding script
├── nda-analyzer-docs/
│   ├── india_legal_statutes.txt       → seeds legal_statutes collection
│   ├── nda_clause_templates.txt       → seeds nda_templates collection
│   ├── company_hr_policy.txt          → seeds company_policies collection
│   └── sample_nda_with_loopholes.txt  → demo file to upload
└── chroma_db/                         # ChromaDB persistent storage (auto-created)
```

---

## Sample NDA — Known Loopholes

`nda-analyzer-docs/sample_nda_with_loopholes.txt` contains **9 deliberate loopholes** for demo purposes. The analyzer should catch all of them:

| Clause | Loophole | Legal basis | Severity |
|---|---|---|---|
| Clause 1 | Vague "anything you see or hear" definition | No legitimate interest shown; overbroad | High |
| Clause 2 | No POSH / legal disclosure carve-out | Void under Section 23, Indian Contract Act; POSH Act 2013 | Critical |
| Clause 3 | Perpetual duration | Unreasonable; courts will reduce | Medium |
| Clause 4 | Post-termination non-compete (2 years, all India) | Void under Section 27, Indian Contract Act | Critical |
| Clause 5 | IP assignment covers personal-time work | Overreach; no legitimate interest in purely personal IP | High |
| Clause 6 | Non-solicitation of all clients ever (no contact requirement) | Overbroad; unenf. without "material contact" limit | High |
| Clause 7 | Withholds gratuity / PF to enforce NDA | Cannot withhold statutory dues; illegal | Critical |
| Clause 9 | One-sided amendment right | No mutual consent; employee never agrees to modifications | Medium |
| Clause 10 | No independent consideration for post-employment obligations | Obligations after employment need fresh consideration | Medium |

---

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start Next.js dev server on port 3000 |
| `npm run build` | Production build |
| `npm run seed` | Seed ChromaDB collections (requires ChromaDB running) |
| `npm run lint` | Run ESLint |
