import { jobStore } from '@/lib/store';
import { extractClauses } from '@/lib/agents/clauseExtractor';
import { findLoopholes } from '@/lib/agents/loopholeFinder';
import { compareWithLaw } from '@/lib/agents/legalComparator';
import { suggestFixes } from '@/lib/agents/fixSuggester';
import type { AnalysisReport, SSEProgressEvent } from '@/lib/types';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
): Promise<Response> {
  const { id } = await params;
  const job = jobStore.get(id);

  if (!job) {
    return Response.json({ error: 'Job not found' }, { status: 404 });
  }

  if (job.report) {
    const encoder = new TextEncoder();
    const event: SSEProgressEvent = { step: 5, message: 'complete', report: job.report };
    const body = encoder.encode(`data: ${JSON.stringify(event)}\n\n`);
    return new Response(body, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  }

  const encoder = new TextEncoder();
  const { readable, writable } = new TransformStream<Uint8Array, Uint8Array>();
  const writer = writable.getWriter();

  const send = (event: SSEProgressEvent) =>
    writer.write(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));

  (async () => {
    try {
      await send({ step: 1, message: 'Extracting clauses…' });
      const clauses = await extractClauses(job.text);

      await send({ step: 2, message: 'Finding loopholes…' });
      const issues = await findLoopholes(clauses);

      await send({ step: 3, message: 'Checking Indian law…' });
      const gaps = await compareWithLaw(clauses, issues);

      await send({ step: 4, message: 'Generating fixes…' });
      const fixes = await suggestFixes(clauses, issues, gaps);

      const report: AnalysisReport = {
        id,
        clauses: clauses.clauses,
        issues: issues.issues,
        compliance_gaps: gaps.compliance_gaps,
        fixes: fixes.fixes,
        overall_risk_score: fixes.overall_risk_score,
        overall_risk_label: fixes.overall_risk_label,
        executive_summary: fixes.executive_summary,
        analyzed_at: new Date().toISOString(),
      };

      job.report = report;
      await send({ step: 5, message: 'complete', report });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Analysis failed';
      await send({ step: 0, message: 'error', error: msg });
    } finally {
      await writer.close();
    }
  })();

  return new Response(readable, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}
