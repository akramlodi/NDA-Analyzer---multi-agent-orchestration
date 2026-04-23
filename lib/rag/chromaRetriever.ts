import { ChromaClient, type EmbeddingFunction } from 'chromadb';
import { InferenceClient } from '@huggingface/inference';

type CollectionName = 'legal_statutes' | 'nda_templates' | 'company_policies';

const HF_EMBEDDING_MODEL = 'sentence-transformers/all-MiniLM-L6-v2';

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

let clientInstance: ChromaClient | null = null;
let embFnInstance: HuggingFaceEmbeddingFunction | null = null;

function getClient(): ChromaClient {
  if (!clientInstance) {
    clientInstance = new ChromaClient({ host: 'localhost', port: 8000 });
  }
  return clientInstance;
}

function getEmbeddingFn(): HuggingFaceEmbeddingFunction {
  if (!embFnInstance) {
    const key = process.env.HF_TOKEN;
    if (!key) throw new Error('HF_TOKEN is not set');
    embFnInstance = new HuggingFaceEmbeddingFunction(key);
  }
  return embFnInstance;
}

export async function queryCollection(
  collectionName: CollectionName,
  queryText: string,
  nResults = 5
): Promise<string[]> {
  try {
    const client = getClient();
    const collection = await client.getOrCreateCollection({
      name: collectionName,
      embeddingFunction: getEmbeddingFn(),
    });
    const result = await collection.query({ queryTexts: [queryText], nResults });
    return (result.documents[0] ?? []).filter((d): d is string => d !== null);
  } catch {
    return [];
  }
}

export async function queryMultiple(
  collections: CollectionName[],
  queryText: string,
  nResultsEach = 4
): Promise<string> {
  const chunks = await Promise.all(
    collections.map((c) => queryCollection(c, queryText, nResultsEach))
  );
  return chunks
    .flat()
    .filter(Boolean)
    .join('\n\n---\n\n');
}
