import { GoogleGenerativeAI } from '@google/generative-ai';

let genaiInstance: GoogleGenerativeAI | null = null;
const GENERATION_MODEL = process.env.GEMINI_GENERATION_MODEL ?? 'gemini-2.5-flash-lite';

function getGenai(): GoogleGenerativeAI {
  if (!genaiInstance) {
    const key = process.env.GEMINI_API_KEY;
    if (!key) throw new Error('GEMINI_API_KEY is not set');
    genaiInstance = new GoogleGenerativeAI(key);
  }
  return genaiInstance;
}

export async function callGemini<T>(prompt: string): Promise<T> {
  const genai = getGenai();
  const model = genai.getGenerativeModel({
    model: GENERATION_MODEL,
    generationConfig: { responseMimeType: 'application/json' },
  });

  const result = await model.generateContent(prompt);
  const text = result.response.text();

  try {
    return JSON.parse(text) as T;
  } catch {
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) return JSON.parse(jsonMatch[0]) as T;
    throw new Error(`Failed to parse Gemini JSON response: ${text.slice(0, 200)}`);
  }
}
