import { PDFParse } from 'pdf-parse';
import mammoth from 'mammoth';

export async function extractText(buffer: Buffer, filename: string): Promise<string> {
  const lower = filename.toLowerCase();

  if (lower.endsWith('.pdf')) {
    return extractPdf(buffer);
  }

  if (lower.endsWith('.docx') || lower.endsWith('.doc')) {
    return extractDocx(buffer);
  }

  throw new Error(`Unsupported file type: ${filename}`);
}

async function extractPdf(buffer: Buffer): Promise<string> {
  const parser = new PDFParse({ data: buffer });
  const result = await parser.getText();
  await parser.destroy();
  return result.text.trim();
}

async function extractDocx(buffer: Buffer): Promise<string> {
  const result = await mammoth.extractRawText({ buffer });
  return result.value.trim();
}
