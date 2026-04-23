'use client';

import { useEffect, useRef, useState } from 'react';
import type {
  AnalysisReport,
  Clause,
  ComplianceGap,
  Fix,
  Issue,
  RiskLabel,
  SSEProgressEvent,
} from '@/lib/types';

const STEPS = [
  'Extracting clauses…',
  'Finding loopholes…',
  'Checking Indian law…',
  'Generating fixes…',
  'Complete',
];

const SEVERITY_COLORS: Record<string, string> = {
  CRITICAL: 'bg-red-100 text-red-700 border-red-200',
  HIGH: 'bg-orange-100 text-orange-700 border-orange-200',
  MEDIUM: 'bg-yellow-100 text-yellow-700 border-yellow-200',
  LOW: 'bg-green-100 text-green-700 border-green-200',
};

const RISK_BADGE: Record<RiskLabel, string> = {
  CRITICAL: 'bg-red-600 text-white',
  HIGH: 'bg-orange-500 text-white',
  MEDIUM: 'bg-yellow-400 text-slate-800',
  LOW: 'bg-green-500 text-white',
};

function RiskScore({ score, label }: { score: number; label: RiskLabel }) {
  const color = {
    CRITICAL: 'text-red-600',
    HIGH: 'text-orange-500',
    MEDIUM: 'text-yellow-500',
    LOW: 'text-green-500',
  }[label];

  return (
    <div className="flex items-center gap-3">
      <span className={`text-5xl font-bold ${color}`}>{score}</span>
      <span className={`px-3 py-1 rounded-full text-sm font-semibold ${RISK_BADGE[label]}`}>
        {label}
      </span>
    </div>
  );
}

function SeverityBadge({ severity }: { severity: string }) {
  return (
    <span className={`inline-flex px-2 py-0.5 rounded text-xs font-semibold border ${SEVERITY_COLORS[severity] ?? 'bg-slate-100 text-slate-600 border-slate-200'}`}>
      {severity}
    </span>
  );
}

function IssuesForClause({ clauseId, issues, gaps }: { clauseId: string; issues: Issue[]; gaps: ComplianceGap[] }) {
  const clauseIssues = issues.filter((i) => i.clause_id === clauseId);
  const clauseGaps = gaps.filter((g) => g.clause_id === clauseId);
  if (!clauseIssues.length && !clauseGaps.length) return null;
  return (
    <div className="space-y-2 mt-3">
      {clauseIssues.map((issue, i) => (
        <div key={i} className="rounded-lg border border-slate-200 bg-white p-3">
          <div className="flex items-start justify-between gap-2 flex-wrap">
            <span className="text-xs font-mono text-slate-500">{issue.issue_type}</span>
            <SeverityBadge severity={issue.severity} />
          </div>
          <p className="mt-1 text-sm text-slate-700">{issue.description}</p>
          <p className="mt-1 text-xs text-slate-500">
            <span className="font-medium">Employee exploit:</span> {issue.employee_exploit}
          </p>
          <p className="mt-0.5 text-xs text-indigo-600">{issue.legal_basis}</p>
        </div>
      ))}
      {clauseGaps.map((gap, i) => (
        <div key={i} className="rounded-lg border border-red-200 bg-red-50 p-3">
          <div className="flex items-start justify-between gap-2 flex-wrap">
            <span className="text-xs font-medium text-red-700">{gap.law} — §{gap.section}</span>
            {gap.is_void && (
              <span className="px-2 py-0.5 rounded text-xs font-semibold bg-red-600 text-white">VOID</span>
            )}
          </div>
          <p className="mt-1 text-sm text-red-800">{gap.gap_description}</p>
          <p className="mt-0.5 text-xs text-red-600">
            <span className="font-medium">Risk:</span> {gap.risk_to_company}
          </p>
        </div>
      ))}
    </div>
  );
}

function FixCard({ fix }: { fix: Fix }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="mt-3 border border-slate-200 rounded-lg overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-3 py-2 bg-slate-50 text-sm font-medium text-slate-700 hover:bg-slate-100 transition-colors"
      >
        <span>Suggested Fix</span>
        <span className="flex items-center gap-2">
          <span className={`text-xs px-2 py-0.5 rounded ${SEVERITY_COLORS[fix.risk_reduction] ?? 'bg-slate-100 text-slate-600 border-slate-200'}`}>
            Risk reduction: {fix.risk_reduction}
          </span>
          <svg className={`w-4 h-4 transition-transform ${open ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </span>
      </button>
      {open && (
        <div className="p-3 space-y-3">
          <p className="text-xs text-slate-500 italic">{fix.changes_summary}</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <p className="text-xs font-semibold text-slate-500 mb-1">Original</p>
              <pre className="text-xs text-slate-600 bg-red-50 rounded p-2 whitespace-pre-wrap border border-red-100">{fix.original_text}</pre>
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-500 mb-1">Fixed</p>
              <pre className="text-xs text-slate-700 bg-green-50 rounded p-2 whitespace-pre-wrap border border-green-100">{fix.fixed_text}</pre>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ClauseAccordion({ clause, issues, gaps, fixes }: { clause: Clause; issues: Issue[]; gaps: ComplianceGap[]; fixes: Fix[] }) {
  const [open, setOpen] = useState(false);
  const clauseIssues = issues.filter((i) => i.clause_id === clause.id);
  const fix = fixes.find((f) => f.clause_id === clause.id);
  const highestSeverity = clauseIssues.reduce<string | null>((acc, i) => {
    const order = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'];
    if (!acc) return i.severity;
    return order.indexOf(i.severity) < order.indexOf(acc) ? i.severity : acc;
  }, null);

  return (
    <div className="border border-slate-200 rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-3 px-4 py-3 bg-white hover:bg-slate-50 transition-colors text-left"
      >
        <span className="text-xs font-mono text-indigo-600 shrink-0">{clause.id}</span>
        <span className="flex-1 text-sm font-medium text-slate-700 truncate">
          {clause.heading ?? clause.type}
        </span>
        <div className="flex items-center gap-2 shrink-0">
          {highestSeverity && <SeverityBadge severity={highestSeverity} />}
          <span className="text-xs text-slate-400">{clause.type}</span>
          <svg className={`w-4 h-4 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>
      {open && (
        <div className="px-4 pb-4 bg-slate-50 border-t border-slate-100">
          <pre className="mt-3 text-xs text-slate-600 whitespace-pre-wrap bg-white rounded-lg border border-slate-200 p-3 max-h-40 overflow-y-auto">
            {clause.text}
          </pre>
          <IssuesForClause clauseId={clause.id} issues={issues} gaps={gaps} />
          {fix && <FixCard fix={fix} />}
        </div>
      )}
    </div>
  );
}

function IssuesTable({ issues }: { issues: Issue[] }) {
  const sorted = [...issues].sort((a, b) => {
    const order = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'];
    return order.indexOf(a.severity) - order.indexOf(b.severity);
  });

  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-slate-50 border-b border-slate-200">
            <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500">Clause</th>
            <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500">Issue</th>
            <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500">Severity</th>
            <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 hidden md:table-cell">Legal Basis</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((issue, i) => (
            <tr key={i} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
              <td className="px-4 py-3 font-mono text-xs text-indigo-600">{issue.clause_id}</td>
              <td className="px-4 py-3 text-slate-700 max-w-xs">
                <p className="font-medium text-xs">{issue.issue_type}</p>
                <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">{issue.description}</p>
              </td>
              <td className="px-4 py-3">
                <SeverityBadge severity={issue.severity} />
              </td>
              <td className="px-4 py-3 text-xs text-slate-500 hidden md:table-cell max-w-xs">
                <span className="line-clamp-2">{issue.legal_basis}</span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function ResultsClient({ id }: { id: string }) {
  const [step, setStep] = useState(0);
  const [statusText, setStatusText] = useState('Connecting…');
  const [report, setReport] = useState<AnalysisReport | null>(null);
  const [error, setError] = useState<string | null>(null);
  const esRef = useRef<EventSource | null>(null);

  useEffect(() => {
    const es = new EventSource(`/api/analyze/${id}`);
    esRef.current = es;

    es.onmessage = (event: MessageEvent) => {
      const data = JSON.parse(event.data as string) as SSEProgressEvent;
      if (data.error) {
        setError(data.error);
        es.close();
      } else if (data.report) {
        setReport(data.report);
        setStep(5);
        setStatusText('Complete');
        es.close();
      } else {
        setStep(data.step);
        setStatusText(data.message);
      }
    };

    es.onerror = () => {
      if (!report) setError('Connection error. Please try refreshing.');
      es.close();
    };

    return () => es.close();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const downloadReport = () => {
    if (!report) return;
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `nda-analysis-${id.slice(0, 8)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (error) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
        <div className="bg-white rounded-2xl shadow-sm border border-red-200 p-8 max-w-md w-full text-center">
          <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-3">
            <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <h2 className="text-lg font-semibold text-slate-800">Analysis Failed</h2>
          <p className="mt-2 text-sm text-slate-500">{error}</p>
          <a href="/" className="mt-5 inline-block px-5 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700">
            Try Again
          </a>
        </div>
      </div>
    );
  }

  if (!report) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 max-w-md w-full">
          <h2 className="text-lg font-semibold text-slate-800 mb-6 text-center">Analyzing NDA…</h2>
          <div className="space-y-3">
            {STEPS.map((label, i) => {
              const idx = i + 1;
              const done = step > idx;
              const active = step === idx;
              return (
                <div key={i} className="flex items-center gap-3">
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 text-xs font-bold
                    ${done ? 'bg-indigo-600 text-white' : active ? 'bg-indigo-100 text-indigo-600 ring-2 ring-indigo-300' : 'bg-slate-100 text-slate-400'}`}>
                    {done ? (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    ) : (
                      idx
                    )}
                  </div>
                  <span className={`text-sm ${active ? 'text-indigo-700 font-medium' : done ? 'text-slate-400 line-through' : 'text-slate-400'}`}>
                    {label}
                    {active && (
                      <span className="ml-2 inline-flex gap-0.5">
                        {[0, 1, 2].map((j) => (
                          <span key={j} className="w-1 h-1 rounded-full bg-indigo-400 animate-bounce" style={{ animationDelay: `${j * 0.15}s` }} />
                        ))}
                      </span>
                    )}
                  </span>
                </div>
              );
            })}
          </div>
          <p className="mt-5 text-center text-xs text-slate-400">{statusText}</p>
        </div>
      </div>
    );
  }

  const critCount = report.issues.filter((i) => i.severity === 'CRITICAL').length;
  const highCount = report.issues.filter((i) => i.severity === 'HIGH').length;

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-5xl mx-auto px-4 py-10 space-y-8">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <a href="/" className="text-xs text-indigo-600 hover:underline">← Upload another NDA</a>
            <h1 className="mt-1 text-2xl font-bold text-slate-900">NDA Analysis Report</h1>
            <p className="text-xs text-slate-400 mt-0.5">
              Analyzed {new Date(report.analyzed_at).toLocaleString()} · {report.clauses.length} clauses · {report.issues.length} issues
            </p>
          </div>
          <button
            onClick={downloadReport}
            className="flex items-center gap-2 px-4 py-2 rounded-lg border border-slate-200 bg-white text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Download Report
          </button>
        </div>

        {/* Executive Summary */}
        <div className={`rounded-2xl p-6 border ${
          report.overall_risk_label === 'CRITICAL' ? 'bg-red-50 border-red-200' :
          report.overall_risk_label === 'HIGH' ? 'bg-orange-50 border-orange-200' :
          report.overall_risk_label === 'MEDIUM' ? 'bg-yellow-50 border-yellow-200' :
          'bg-green-50 border-green-200'
        }`}>
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <h2 className="text-sm font-semibold text-slate-600 mb-2">Overall Risk Assessment</h2>
              <RiskScore score={report.overall_risk_score} label={report.overall_risk_label} />
              <p className="mt-3 text-sm text-slate-700 max-w-2xl">{report.executive_summary}</p>
            </div>
            <div className="flex gap-4 text-center">
              <div>
                <p className="text-2xl font-bold text-red-600">{critCount}</p>
                <p className="text-xs text-slate-500">Critical</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-orange-500">{highCount}</p>
                <p className="text-xs text-slate-500">High</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-600">{report.issues.length}</p>
                <p className="text-xs text-slate-500">Total Issues</p>
              </div>
            </div>
          </div>
        </div>

        {/* Issues Table */}
        {report.issues.length > 0 && (
          <div>
            <h2 className="text-base font-semibold text-slate-800 mb-3">Issues Summary</h2>
            <IssuesTable issues={report.issues} />
          </div>
        )}

        {/* Clause Accordion */}
        <div>
          <h2 className="text-base font-semibold text-slate-800 mb-3">Clause-by-Clause Analysis</h2>
          <div className="space-y-2">
            {report.clauses.map((clause) => (
              <ClauseAccordion
                key={clause.id}
                clause={clause}
                issues={report.issues}
                gaps={report.compliance_gaps}
                fixes={report.fixes}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
