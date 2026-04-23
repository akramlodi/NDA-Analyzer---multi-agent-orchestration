declare module 'mammoth' {
  interface ExtractRawTextOptions {
    buffer?: Buffer;
    path?: string;
  }
  interface ExtractResult {
    value: string;
    messages: unknown[];
  }
  function extractRawText(options: ExtractRawTextOptions): Promise<ExtractResult>;
}
