import { callGemini } from '../gemini';
import { FIX_SUGGESTER_PROMPT } from '../prompts/agentPrompts';
import { queryMultiple } from '../rag/chromaRetriever';
import type {
  ClauseExtractionResult,
  FixSuggesterResult,
  LegalComparatorResult,
  LoopholeFinderResult,
} from '../types';

export async function suggestFixes(
  clauses: ClauseExtractionResult,
  issues: LoopholeFinderResult,
  complianceGaps: LegalComparatorResult
): Promise<FixSuggesterResult> {
  const clausesJson = JSON.stringify(clauses, null, 2);
  const issuesJson = JSON.stringify(issues, null, 2);
  const gapsJson = JSON.stringify(complianceGaps, null, 2);
  const ragContext = await queryMultiple(
    ['nda_templates', 'company_policies'],
    'NDA clause best practice compliant template Indian employment'
  );
  const prompt = FIX_SUGGESTER_PROMPT(clausesJson, issuesJson, gapsJson, ragContext);
  return callGemini<FixSuggesterResult>(prompt);
}
