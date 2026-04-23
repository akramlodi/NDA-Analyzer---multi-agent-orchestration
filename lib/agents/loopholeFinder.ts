import { callGemini } from '../gemini';
import { LOOPHOLE_FINDER_PROMPT } from '../prompts/agentPrompts';
import { queryMultiple } from '../rag/chromaRetriever';
import type { ClauseExtractionResult, LoopholeFinderResult } from '../types';

export async function findLoopholes(
  clauses: ClauseExtractionResult
): Promise<LoopholeFinderResult> {
  const clausesJson = JSON.stringify(clauses, null, 2);
  const ragContext = await queryMultiple(
    ['legal_statutes', 'nda_templates'],
    'NDA employment loopholes Indian law enforceability'
  );
  const prompt = LOOPHOLE_FINDER_PROMPT(clausesJson, ragContext);
  return callGemini<LoopholeFinderResult>(prompt);
}
