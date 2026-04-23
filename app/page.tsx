'use client';

import { useCallback, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function UploadPage() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const accept = (f: File) => {
    const lower = f.name.toLowerCase();
    if (!lower.endsWith('.pdf') && !lower.endsWith('.docx') && !lower.endsWith('.doc')) {
      setError('Please upload a PDF or DOCX file.');
      return;
    }
    setError(null);
    setFile(f);
  };

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragging(false);
      const dropped = e.dataTransfer.files[0];
      if (dropped) accept(dropped);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  const onInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (selected) accept(selected);
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;
    setUploading(true);
    setError(null);

    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch('/api/upload', { method: 'POST', body: fd });
      const data = await res.json() as { id?: string; error?: string };
      if (!res.ok || !data.id) throw new Error(data.error ?? 'Upload failed');
      router.push(`/results/${data.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
      setUploading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-lg">
        <div className="mb-10 text-center">
          <div className="inline-flex items-center gap-2 mb-3">
            <div className="w-8 h-8 rounded-md bg-indigo-600 flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <span className="text-xl font-semibold text-slate-800">NDA Analyzer</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900">Analyze your NDA</h1>
          <p className="mt-1 text-sm text-slate-500">
            Upload an NDA to identify loopholes, legal risks, and get suggested fixes — under Indian law.
          </p>
        </div>

        <form onSubmit={onSubmit} className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
          <div
            className={`relative border-2 border-dashed rounded-xl p-10 text-center transition-colors cursor-pointer
              ${dragging ? 'border-indigo-500 bg-indigo-50' : 'border-slate-200 hover:border-indigo-400 hover:bg-slate-50'}
              ${file ? 'border-indigo-400 bg-indigo-50/40' : ''}`}
            onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={onDrop}
            onClick={() => inputRef.current?.click()}
          >
            <input
              ref={inputRef}
              type="file"
              accept=".pdf,.docx,.doc"
              className="sr-only"
              onChange={onInputChange}
            />

            {file ? (
              <div className="flex flex-col items-center gap-2">
                <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center">
                  <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <p className="font-medium text-slate-700 text-sm">{file.name}</p>
                <p className="text-xs text-slate-400">{(file.size / 1024).toFixed(1)} KB</p>
                <p className="text-xs text-indigo-500 mt-1">Click or drag to change file</p>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2">
                <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mb-1">
                  <svg className="w-6 h-6 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                      d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                </div>
                <p className="text-sm text-slate-600">
                  <span className="font-medium text-indigo-600">Click to upload</span> or drag and drop
                </p>
                <p className="text-xs text-slate-400">PDF or DOCX</p>
              </div>
            )}
          </div>

          {error && (
            <p className="mt-3 text-sm text-red-600 text-center">{error}</p>
          )}

          <button
            type="submit"
            disabled={!file || uploading}
            className="mt-5 w-full py-3 px-4 rounded-xl bg-indigo-600 text-white font-medium text-sm
              hover:bg-indigo-700 active:bg-indigo-800 transition-colors
              disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {uploading ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Uploading…
              </span>
            ) : (
              'Analyze NDA'
            )}
          </button>
        </form>

        <p className="mt-6 text-center text-xs text-slate-400">
          Jurisdiction: India only · Powered by Gemini 1.5 Pro
        </p>
      </div>
    </div>
  );
}
