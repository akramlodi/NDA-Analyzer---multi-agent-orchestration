# NDA Analyzer — Sample Documents & Setup Guide

## Document Map

```
nda-analyzer-docs/
├── india_legal_statutes.txt       → ChromaDB collection: legal_statutes
├── nda_clause_templates.txt       → ChromaDB collection: nda_templates
├── company_hr_policy.txt          → ChromaDB collection: company_policies
├── sample_nda_with_loopholes.txt  → Upload this via the UI to demo the analyzer
└── README.md                      → This file
```

---

## ChromaDB Seeding Instructions

These three documents go into ChromaDB **before** any NDA is analyzed.
Run this seed script once at setup (or as part of your `npm run seed` command).

### Recommended chunking strategy

| Document | Chunk size | Overlap | Reason |
|---|---|---|---|
| india_legal_statutes.txt | 600 tokens | 80 tokens | Legal sections are self-contained; overlap catches cross-section references |
| nda_clause_templates.txt | 500 tokens | 60 tokens | Each clause template is a unit; overlap preserves clause + loophole note together |
| company_hr_policy.txt | 400 tokens | 50 tokens | Policy sections are shorter; tighter chunks improve precision |

### Python seed script (save as `scripts/seed_chromadb.py`)

```python
import chromadb
from chromadb.utils import embedding_functions
import os, re

chroma_client = chromadb.PersistentClient(path="./chroma_db")

# Use Gemini embeddings via Google Generative AI
# pip install chromadb google-generativeai
import google.generativeai as genai
genai.configure(api_key=os.environ["GEMINI_API_KEY"])

class GeminiEmbeddingFunction(embedding_functions.EmbeddingFunction):
    def __call__(self, input):
        result = genai.embed_content(
            model="models/text-embedding-004",
            content=input,
            task_type="retrieval_document"
        )
        return result["embedding"] if isinstance(input, str) else [r["embedding"] for r in result]

emb_fn = GeminiEmbeddingFunction()

DOCS = [
    {
        "collection": "legal_statutes",
        "file": "nda-analyzer-docs/india_legal_statutes.txt",
        "chunk_size": 600,
        "overlap": 80,
    },
    {
        "collection": "nda_templates",
        "file": "nda-analyzer-docs/nda_clause_templates.txt",
        "chunk_size": 500,
        "overlap": 60,
    },
    {
        "collection": "company_policies",
        "file": "nda-analyzer-docs/company_hr_policy.txt",
        "chunk_size": 400,
        "overlap": 50,
    },
]

def chunk_text(text, size, overlap):
    words = text.split()
    chunks, i = [], 0
    while i < len(words):
        chunk = " ".join(words[i:i+size])
        chunks.append(chunk)
        i += size - overlap
    return chunks

for doc in DOCS:
    col = chroma_client.get_or_create_collection(
        name=doc["collection"],
        embedding_function=emb_fn,
        metadata={"jurisdiction": "India"}
    )
    with open(doc["file"], "r") as f:
        text = f.read()
    chunks = chunk_text(text, doc["chunk_size"], doc["overlap"])
    col.add(
        documents=chunks,
        ids=[f"{doc['collection']}_{i}" for i in range(len(chunks))],
        metadatas=[{"source": doc["file"], "chunk_index": i} for i in range(len(chunks))]
    )
    print(f"Seeded {len(chunks)} chunks into '{doc['collection']}'")

print("ChromaDB seeding complete.")
```

---

## Intentional Loopholes in sample_nda_with_loopholes.txt

This NDA was written with **9 deliberate loopholes** for demo purposes.
The analyzer should catch all of them:

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

## Agent Prompt Templates (save in `lib/prompts/`)

### Agent 1 — Clause Extractor

```
You are a legal document analysis expert specializing in Indian employment law.

Analyze the following NDA text and extract every distinct clause. For each clause:
- Assign a clause type from this list: [CONFIDENTIALITY_DEFINITION, CONFIDENTIALITY_OBLIGATION, DURATION, NON_COMPETE, NON_SOLICITATION_EMPLOYEE, NON_SOLICITATION_CLIENT, IP_ASSIGNMENT, REMEDY, GOVERNING_LAW, AMENDMENT, CONSIDERATION, OTHER]
- Extract the exact clause text
- Note the clause number or heading if present

NDA TEXT:
{nda_text}

Respond ONLY in valid JSON with this structure:
{
  "clauses": [
    {
      "id": "c1",
      "type": "CLAUSE_TYPE",
      "heading": "clause heading or null",
      "text": "full clause text"
    }
  ]
}
```

### Agent 2 — Loophole Finder

```
You are a legal expert specializing in Indian employment NDAs. Your job is to identify loopholes and weaknesses in NDA clauses that an employee could exploit.

You have been provided with:
1. The extracted NDA clauses (JSON)
2. Relevant context from Indian legal statutes and standard NDA templates (from RAG retrieval)

For each clause, identify any loopholes, weaknesses, or enforceability issues.

CLAUSES:
{clauses_json}

RETRIEVED LEGAL CONTEXT:
{rag_context}

For each issue found, respond ONLY in valid JSON:
{
  "issues": [
    {
      "clause_id": "c1",
      "issue_type": "VAGUE_DEFINITION | MISSING_CARVE_OUT | VOID_RESTRAINT | OVERBROAD_SCOPE | ILLEGAL_REMEDY | UNENFORCEABLE_DURATION | ONE_SIDED | NO_CONSIDERATION | OTHER",
      "severity": "CRITICAL | HIGH | MEDIUM | LOW",
      "description": "Plain English explanation of the loophole",
      "employee_exploit": "How an employee could use this loophole",
      "legal_basis": "Relevant Indian law section or case"
    }
  ]
}
```

### Agent 3 — Legal Comparator

```
You are an Indian employment law expert. Compare the NDA clauses against Indian legal requirements and identify compliance gaps.

Jurisdiction: India
Applicable laws: Indian Contract Act 1872, IT Act 2000, POSH Act 2013, Industrial Disputes Act 1947, Payment of Gratuity Act 1972

CLAUSES:
{clauses_json}

ISSUES FOUND:
{issues_json}

RETRIEVED STATUTE CONTEXT:
{rag_context}

For each non-compliant clause, respond ONLY in valid JSON:
{
  "compliance_gaps": [
    {
      "clause_id": "c1",
      "law": "Name of Indian law",
      "section": "Section number",
      "gap_description": "What the clause violates or fails to include",
      "risk_to_company": "Legal risk if this clause is challenged",
      "is_void": true | false
    }
  ]
}
```

### Agent 4 — Fix Suggester

```
You are a senior legal drafter specializing in Indian employment law. Your task is to suggest improved replacement text for each problematic NDA clause.

ORIGINAL CLAUSES:
{clauses_json}

ISSUES IDENTIFIED:
{issues_json}

COMPLIANCE GAPS:
{compliance_gaps_json}

RETRIEVED BEST-PRACTICE TEMPLATES:
{rag_context}

For each problematic clause, provide a corrected version. Respond ONLY in valid JSON:
{
  "fixes": [
    {
      "clause_id": "c1",
      "original_text": "...",
      "fixed_text": "...",
      "changes_summary": "Plain English summary of what was changed and why",
      "risk_reduction": "HIGH | MEDIUM | LOW"
    }
  ],
  "overall_risk_score": 0-100,
  "overall_risk_label": "CRITICAL | HIGH | MEDIUM | LOW",
  "executive_summary": "2-3 sentence summary for HR leadership"
}
```

---

## Folder Structure for Next.js Project

```
nda-analyzer/
├── app/
│   ├── page.tsx                    # Upload UI
│   ├── results/[id]/page.tsx       # Analysis results
│   └── api/
│       ├── analyze/route.ts        # Main pipeline endpoint
│       └── upload/route.ts         # File upload handler
├── lib/
│   ├── agents/
│   │   ├── clauseExtractor.ts
│   │   ├── loopholeFinder.ts
│   │   ├── legalComparator.ts
│   │   └── fixSuggester.ts
│   ├── rag/
│   │   └── chromaRetriever.ts      # Query ChromaDB
│   ├── parsers/
│   │   └── documentParser.ts       # PDF + DOCX text extraction
│   └── prompts/
│       └── agentPrompts.ts
├── scripts/
│   └── seed_chromadb.py
├── chroma_db/                      # ChromaDB persistent storage
└── nda-analyzer-docs/              # Source documents (this folder)
```
