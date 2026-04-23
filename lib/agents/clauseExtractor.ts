import { callGemini } from '../gemini';
import { CLAUSE_EXTRACTOR_PROMPT } from '../prompts/agentPrompts';
import type { ClauseExtractionResult } from '../types';

export async function extractClauses(ndaText: string): Promise<ClauseExtractionResult> {
  const prompt = CLAUSE_EXTRACTOR_PROMPT(ndaText);
  return callGemini<ClauseExtractionResult>(prompt);
}
