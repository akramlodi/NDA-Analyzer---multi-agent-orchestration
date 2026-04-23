export type ClauseType =
  | 'CONFIDENTIALITY_DEFINITION'
  | 'CONFIDENTIALITY_OBLIGATION'
  | 'DURATION'
  | 'NON_COMPETE'
  | 'NON_SOLICITATION_EMPLOYEE'
  | 'NON_SOLICITATION_CLIENT'
  | 'IP_ASSIGNMENT'
  | 'REMEDY'
  | 'GOVERNING_LAW'
  | 'AMENDMENT'
  | 'CONSIDERATION'
  | 'OTHER';

export interface Clause {
  id: string;
  type: ClauseType;
  heading: string | null;
  text: string;
}

export interface ClauseExtractionResult {
  clauses: Clause[];
}

export type IssueType =
  | 'VAGUE_DEFINITION'
  | 'MISSING_CARVE_OUT'
  | 'VOID_RESTRAINT'
  | 'OVERBROAD_SCOPE'
  | 'ILLEGAL_REMEDY'
  | 'UNENFORCEABLE_DURATION'
  | 'ONE_SIDED'
  | 'NO_CONSIDERATION'
  | 'OTHER';

export type Severity = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';

export interface Issue {
  clause_id: string;
  issue_type: IssueType;
  severity: Severity;
  description: string;
  employee_exploit: string;
  legal_basis: string;
}

export interface LoopholeFinderResult {
  issues: Issue[];
}

export interface ComplianceGap {
  clause_id: string;
  law: string;
  section: string;
  gap_description: string;
  risk_to_company: string;
  is_void: boolean;
}

export interface LegalComparatorResult {
  compliance_gaps: ComplianceGap[];
}

export type RiskReduction = 'HIGH' | 'MEDIUM' | 'LOW';
export type RiskLabel = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';

export interface Fix {
  clause_id: string;
  original_text: string;
  fixed_text: string;
  changes_summary: string;
  risk_reduction: RiskReduction;
}

export interface FixSuggesterResult {
  fixes: Fix[];
  overall_risk_score: number;
  overall_risk_label: RiskLabel;
  executive_summary: string;
}

export interface AnalysisReport {
  id: string;
  clauses: Clause[];
  issues: Issue[];
  compliance_gaps: ComplianceGap[];
  fixes: Fix[];
  overall_risk_score: number;
  overall_risk_label: RiskLabel;
  executive_summary: string;
  analyzed_at: string;
}

export interface JobData {
  text: string;
  filename: string;
  report?: AnalysisReport;
}

export interface SSEProgressEvent {
  step: number;
  message: string;
  report?: AnalysisReport;
  error?: string;
}
