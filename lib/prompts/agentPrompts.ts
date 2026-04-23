export const CLAUSE_EXTRACTOR_PROMPT = (ndaText: string) => `
You are a legal document analysis expert specializing in Indian employment law.

Analyze the following NDA text and extract every distinct clause. For each clause:
- Assign a clause type from this list: [CONFIDENTIALITY_DEFINITION, CONFIDENTIALITY_OBLIGATION, DURATION, NON_COMPETE, NON_SOLICITATION_EMPLOYEE, NON_SOLICITATION_CLIENT, IP_ASSIGNMENT, REMEDY, GOVERNING_LAW, AMENDMENT, CONSIDERATION, OTHER]
- Extract the exact clause text
- Note the clause number or heading if present

NDA TEXT:
${ndaText}

Respond ONLY in valid JSON with this exact structure:
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
`.trim();

export const LOOPHOLE_FINDER_PROMPT = (clausesJson: string, ragContext: string) => `
You are a legal expert specializing in Indian employment NDAs. Your job is to identify loopholes and weaknesses in NDA clauses that an employee could exploit.

You have been provided with:
1. The extracted NDA clauses (JSON)
2. Relevant context from Indian legal statutes and standard NDA templates (from RAG retrieval)

For each clause, identify any loopholes, weaknesses, or enforceability issues.

CLAUSES:
${clausesJson}

RETRIEVED LEGAL CONTEXT:
${ragContext}

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
`.trim();

export const LEGAL_COMPARATOR_PROMPT = (clausesJson: string, issuesJson: string, ragContext: string) => `
You are an Indian employment law expert. Compare the NDA clauses against Indian legal requirements and identify compliance gaps.

Jurisdiction: India
Applicable laws: Indian Contract Act 1872, IT Act 2000, POSH Act 2013, Industrial Disputes Act 1947, Payment of Gratuity Act 1972

CLAUSES:
${clausesJson}

ISSUES FOUND:
${issuesJson}

RETRIEVED STATUTE CONTEXT:
${ragContext}

For each non-compliant clause, respond ONLY in valid JSON:
{
  "compliance_gaps": [
    {
      "clause_id": "c1",
      "law": "Name of Indian law",
      "section": "Section number",
      "gap_description": "What the clause violates or fails to include",
      "risk_to_company": "Legal risk if this clause is challenged",
      "is_void": true
    }
  ]
}
`.trim();

export const FIX_SUGGESTER_PROMPT = (
  clausesJson: string,
  issuesJson: string,
  complianceGapsJson: string,
  ragContext: string
) => `
You are a senior legal drafter specializing in Indian employment law. Your task is to suggest improved replacement text for each problematic NDA clause.

ORIGINAL CLAUSES:
${clausesJson}

ISSUES IDENTIFIED:
${issuesJson}

COMPLIANCE GAPS:
${complianceGapsJson}

RETRIEVED BEST-PRACTICE TEMPLATES:
${ragContext}

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
  "overall_risk_score": 0,
  "overall_risk_label": "CRITICAL | HIGH | MEDIUM | LOW",
  "executive_summary": "2-3 sentence summary for HR leadership"
}
`.trim();
