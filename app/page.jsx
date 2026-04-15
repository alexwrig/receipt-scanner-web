'use client';

import { useState, useCallback, useRef, useEffect } from 'react';

const ACCEPTED = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf'];

function formatAmount(raw) {
  const n = parseFloat(raw);
  return isNaN(n) ? '—' : `$${n.toFixed(2)}`;
}

function formatCard(raw) {
  if (raw === '' || raw == null) return '—';
  const digits = String(raw).replace(/\D/g, '');
  return digits ? `···${digits.slice(-4)}` : '—';
}

// ── Icons ────────────────────────────────────────────────────────────────────

function IconUpload() {
  return (
    <svg className="w-10 h-10 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
        d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
    </svg>
  );
}

function IconSpinner() {
  return (
    <svg className="w-4 h-4 animate-spin text-indigo-500" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  );
}

function IconCheck() {
  return (
    <svg className="w-4 h-4 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4.5 12.75l6 6 9-13.5" />
    </svg>
  );
}

function IconError() {
  return (
    <svg className="w-4 h-4 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}

function IconDownload() {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
    </svg>
  );
}

function IconTrash() {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
    </svg>
  );
}

// ── Category badge colors ─────────────────────────────────────────────────────

const CATEGORY_COLORS = {
  'Housing & food': 'bg-orange-100 text-orange-700',
  'Transportation': 'bg-blue-100 text-blue-700',
  'Shopping':       'bg-purple-100 text-purple-700',
  'Health':         'bg-green-100 text-green-700',
  'Entertainment':  'bg-pink-100 text-pink-700',
  'Travel':         'bg-sky-100 text-sky-700',
  'Other':          'bg-gray-100 text-gray-600',
};

function CategoryBadge({ value }) {
  const cls = CATEGORY_COLORS[value] || 'bg-gray-100 text-gray-600';
  return (
    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${cls}`}>
      {value || '—'}
    </span>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function Home() {
  const [receipts, setReceipts]   = useState([]);
  const [queue, setQueue]         = useState([]);
  const [dragging, setDragging]   = useState(false);
  const [clearing, setClearing]   = useState(false);
  const fileInputRef              = useRef(null);

  // Load persisted receipts on mount
  useEffect(() => {
    fetch('/api/receipts')
      .then(r => r.json())
      .then(data => setReceipts([...data].reverse()))
      .catch(() => {});
  }, []);

  const processFiles = useCallback(async (files) => {
    const valid = Array.from(files).filter(f => ACCEPTED.includes(f.type));
    if (!valid.length) return;

    const items = valid.map(f => ({
      id: crypto.randomUUID(),
      name: f.name,
      status: 'processing',
    }));

    setQueue(prev => [...prev, ...items]);

    await Promise.allSettled(
      valid.map(async (file, i) => {
        const id   = items[i].id;
        const form = new FormData();
        form.append('image', file);

        try {
          const res  = await fetch('/api/scan', { method: 'POST', body: form });
          const data = await res.json();
          if (!res.ok) throw new Error(data.error || 'Unknown error');

          setReceipts(prev => [{ ...data, _id: id, _file: file.name }, ...prev]);
          setQueue(prev => prev.map(q => q.id === id ? { ...q, status: 'done' } : q));
        } catch (err) {
          setQueue(prev =>
            prev.map(q => q.id === id ? { ...q, status: 'error', error: err.message } : q)
          );
        }
      })
    );
  }, []);

  const onDrop = useCallback((e) => {
    e.preventDefault();
    setDragging(false);
    processFiles(e.dataTransfer.files);
  }, [processFiles]);

  const onDragOver = (e) => { e.preventDefault(); setDragging(true); };
  const onDragLeave = () => setDragging(false);

  const onFileChange = (e) => {
    processFiles(e.target.files);
    e.target.value = '';
  };

  const handleClear = async () => {
    if (!receipts.length) return;
    setClearing(true);
    await fetch('/api/receipts', { method: 'DELETE' });
    setReceipts([]);
    setQueue([]);
    setClearing(false);
  };

  const isProcessing = queue.some(q => q.status === 'processing');

  return (
    <main className="max-w-5xl mx-auto px-4 py-10">

      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-gray-900">Receipt Scanner</h1>
        <p className="text-sm text-gray-500 mt-1">
          Upload receipt images — Claude extracts the data and saves it to Excel.
        </p>
      </div>

      {/* Upload zone */}
      <div
        className={`relative border-2 border-dashed rounded-2xl p-12 text-center cursor-pointer
          transition-colors duration-150 select-none
          ${dragging
            ? 'border-indigo-400 bg-indigo-50'
            : 'border-gray-300 hover:border-indigo-300 hover:bg-gray-50'}`}
        onDrop={onDrop}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onClick={() => fileInputRef.current?.click()}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/gif,image/webp,application/pdf"
          multiple
          className="hidden"
          onChange={onFileChange}
        />
        <div className="flex flex-col items-center gap-3 pointer-events-none">
          <IconUpload />
          <div>
            <p className="font-medium text-gray-700">Drop receipt images here</p>
            <p className="text-sm text-gray-400 mt-0.5">or click to browse</p>
          </div>
          <p className="text-xs text-gray-400">JPG · PNG · WEBP · GIF · PDF</p>
        </div>
      </div>

      {/* Processing queue */}
      {queue.length > 0 && (
        <div className="mt-4 space-y-1.5">
          {queue.map(item => (
            <div key={item.id}
              className="flex items-center gap-3 px-4 py-2.5 bg-white border border-gray-200
                         rounded-lg text-sm shadow-sm">
              <span className="flex-shrink-0">
                {item.status === 'processing' && <IconSpinner />}
                {item.status === 'done'       && <IconCheck />}
                {item.status === 'error'      && <IconError />}
              </span>
              <span className="text-gray-700 truncate flex-1">{item.name}</span>
              <span className={`text-xs flex-shrink-0 ${
                item.status === 'processing' ? 'text-indigo-500' :
                item.status === 'done'       ? 'text-green-600'  :
                                               'text-red-500'
              }`}>
                {item.status === 'processing' && 'Extracting…'}
                {item.status === 'done'       && 'Done'}
                {item.status === 'error'      && (item.error || 'Failed')}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Results table */}
      {receipts.length > 0 && (
        <div className="mt-8">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
              {receipts.length} Receipt{receipts.length !== 1 ? 's' : ''}
            </h2>
            <div className="flex gap-2">
              <a
                href="/api/download"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium
                           bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
              >
                <IconDownload />
                Download Excel
              </a>
              <button
                onClick={handleClear}
                disabled={clearing || isProcessing}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium
                           text-gray-600 border border-gray-300 rounded-lg bg-white
                           hover:bg-gray-50 disabled:opacity-40 transition-colors"
              >
                <IconTrash />
                {clearing ? 'Clearing…' : 'Clear All'}
              </button>
            </div>
          </div>

          <div className="overflow-x-auto rounded-xl border border-gray-200 shadow-sm">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200 text-left">
                  {['Date', 'Merchant', 'Amount', 'Category', 'Purpose', 'Card', 'Receipt'].map(h => (
                    <th key={h} className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {receipts.map((r, i) => (
                  <tr key={r._id || i}
                    className={`border-b border-gray-100 last:border-0 hover:bg-gray-50 transition-colors
                      ${i % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}`}>
                    <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{r.date || '—'}</td>
                    <td className="px-4 py-3 font-medium text-gray-900 whitespace-nowrap">{r.merchant || '—'}</td>
                    <td className="px-4 py-3 font-mono text-gray-800 whitespace-nowrap">{formatAmount(r.amount)}</td>
                    <td className="px-4 py-3 whitespace-nowrap"><CategoryBadge value={r.category} /></td>
                    <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{r.purpose || '—'}</td>
                    <td className="px-4 py-3 text-gray-500 font-mono whitespace-nowrap">{formatCard(r.card)}</td>
                    <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{r.receipt_source || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Empty state */}
      {receipts.length === 0 && queue.length === 0 && (
        <p className="text-center text-sm text-gray-400 mt-12">
          No receipts yet — upload an image above to get started.
        </p>
      )}
    </main>
  );
}
