import { ChromaClient, type EmbeddingFunction } from 'chromadb';
import { InferenceClient } from '@huggingface/inference';
import * as fs from 'fs';
import * as path from 'path';

const HF_EMBEDDING_MODEL = 'sentence-transformers/all-MiniLM-L6-v2';

const HF_TOKEN = process.env.HF_TOKEN;
if (!HF_TOKEN) {
  console.error('Error: HF_TOKEN environment variable is not set.');
  process.exit(1);
}

class HuggingFaceEmbeddingFunction implements EmbeddingFunction {
  name = 'hf-all-MiniLM-L6-v2';
  private hf: InferenceClient;

  constructor(apiKey: string) {
    this.hf = new InferenceClient(apiKey);
  }

  async generate(texts: string[]): Promise<number[][]> {
    const results = await Promise.all(
      texts.map(async (text) => {
        const output = await this.hf.featureExtraction({
          model: HF_EMBEDDING_MODEL,
          inputs: text,
        });
        return output as number[];
      })
    );
    return results;
  }
}

function chunkText(text: string, chunkSize: number, overlap: number): string[] {
  const words = text.split(/\s+/);
  const chunks: string[] = [];
  let i = 0;
  while (i < words.length) {
    chunks.push(words.slice(i, i + chunkSize).join(' '));
    i += chunkSize - overlap;
  }
  return chunks;
}

const DOCS = [
  {
    collection: 'legal_statutes' as const,
    file: 'nda-analyzer-docs/india_legal_statutes.txt',
    chunkSize: 600,
    overlap: 80,
  },
  {
    collection: 'nda_templates' as const,
    file: 'nda-analyzer-docs/nda_clause_templates.txt',
    chunkSize: 500,
    overlap: 60,
  },
  {
    collection: 'company_policies' as const,
    file: 'nda-analyzer-docs/company_hr_policy.txt',
    chunkSize: 400,
    overlap: 50,
  },
];

async function main() {
  console.log('Connecting to ChromaDB at localhost:8000…');
  const client = new ChromaClient({ host: 'localhost', port: 8000 });

  try {
    const version = await client.version();
    console.log(`ChromaDB version: ${version}`);
  } catch {
    console.error('\nFailed to connect to ChromaDB.');
    console.error('Start it first: chroma run --path ./chroma_db');
    process.exit(1);
  }

  const embFn = new HuggingFaceEmbeddingFunction(HF_TOKEN!);
  const root = path.resolve(process.cwd());

  for (const doc of DOCS) {
    const filePath = path.join(root, doc.file);
    if (!fs.existsSync(filePath)) {
      console.error(`File not found: ${filePath}`);
      process.exit(1);
    }

    console.log(`\nSeeding collection: ${doc.collection}`);
    const text = fs.readFileSync(filePath, 'utf-8');
    const chunks = chunkText(text, doc.chunkSize, doc.overlap);
    console.log(`  ${chunks.length} chunks from ${doc.file}`);

    const collection = await client.getOrCreateCollection({
      name: doc.collection,
      embeddingFunction: embFn,
      metadata: { jurisdiction: 'India' },
    });

    const BATCH = 10;
    for (let i = 0; i < chunks.length; i += BATCH) {
      const batch = chunks.slice(i, i + BATCH);
      const ids = batch.map((_, j) => `${doc.collection}_${i + j}`);
      const metadatas = batch.map((_, j) => ({ source: doc.file, chunk_index: i + j }));
      await collection.add({ ids, documents: batch, metadatas });
      process.stdout.write(`  [${Math.min(i + BATCH, chunks.length)}/${chunks.length}]\r`);
    }
    console.log(`\n  Done: ${doc.collection}`);
  }

  console.log('\nChromaDB seeding complete.');
}

main().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
