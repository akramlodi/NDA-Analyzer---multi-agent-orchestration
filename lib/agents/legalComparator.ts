import { callGemini } from '../gemini';
import { LEGAL_COMPARATOR_PROMPT } from '../prompts/agentPrompts';
import { queryMultiple } from '../rag/chromaRetriever';
import type { ClauseExtractionResult, LegalComparatorResult, LoopholeFinderResult } from '../types';

export async function compareWithLaw(
  clauses: ClauseExtractionResult,
  issues: LoopholeFinderResult
): Promise<LegalComparatorResult> {
  const clausesJson = JSON.stringify(clauses, null, 2);
  const issuesJson = JSON.stringify(issues, null, 2);
  const ragContext = await queryMultiple(
    ['legal_statutes'],
    'Indian Contract Act Section 27 void agreement restraint of trade POSH gratuity'
  );
  const prompt = LEGAL_COMPARATOR_PROMPT(clausesJson, issuesJson, ragContext);
  return callGemini<LegalComparatorResult>(prompt);
}
