import { v4 as uuidv4 } from 'uuid';
import { extractText } from '@/lib/parsers/documentParser';
import { jobStore } from '@/lib/store';

export async function POST(request: Request): Promise<Response> {
  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return Response.json({ error: 'Invalid form data' }, { status: 400 });
  }

  const file = formData.get('file');
  if (!(file instanceof File)) {
    return Response.json({ error: 'No file provided' }, { status: 400 });
  }

  const filename = file.name;
  const lower = filename.toLowerCase();
  if (!lower.endsWith('.pdf') && !lower.endsWith('.docx') && !lower.endsWith('.doc')) {
    return Response.json({ error: 'Only PDF and DOCX files are supported' }, { status: 400 });
  }

  let text: string;
  try {
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    text = await extractText(buffer, filename);
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Failed to parse document';
    return Response.json({ error: msg }, { status: 422 });
  }

  if (!text || text.trim().length < 50) {
    return Response.json({ error: 'Document appears to be empty or unreadable' }, { status: 422 });
  }

  const id = uuidv4();
  jobStore.set(id, { text, filename });

  return Response.json({ id });
}
