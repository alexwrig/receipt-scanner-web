// Uses Vercel KV in production (KV_REST_API_URL set), file storage in local dev.

const USE_KV = Boolean(process.env.KV_REST_API_URL);

// ── Vercel KV (production) ────────────────────────────────────────────────────

async function kvGet() {
  const { kv } = await import('@vercel/kv');
  const items = await kv.lrange('receipts', 0, -1);
  return items.map(r => (typeof r === 'string' ? JSON.parse(r) : r));
}

async function kvAppend(data) {
  const { kv } = await import('@vercel/kv');
  await kv.lpush('receipts', JSON.stringify({ ...data, _id: Date.now() }));
}

async function kvClear() {
  const { kv } = await import('@vercel/kv');
  await kv.del('receipts');
}

// ── File storage (local dev) ──────────────────────────────────────────────────

import fs from 'fs';
import path from 'path';

const DATA_FILE = path.join(process.cwd(), 'data', 'receipts.json');

function ensureDir() {
  const dir = path.dirname(DATA_FILE);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function fileGet() {
  ensureDir();
  if (!fs.existsSync(DATA_FILE)) return [];
  try { return JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8')); } catch { return []; }
}

function fileAppend(data) {
  ensureDir();
  const receipts = fileGet();
  receipts.unshift({ ...data, _id: Date.now() });
  fs.writeFileSync(DATA_FILE, JSON.stringify(receipts, null, 2));
}

function fileClear() {
  ensureDir();
  fs.writeFileSync(DATA_FILE, JSON.stringify([], null, 2));
}

// ── Public API ────────────────────────────────────────────────────────────────

export async function getReceipts() {
  return USE_KV ? kvGet() : fileGet();
}

export async function appendReceipt(data) {
  return USE_KV ? kvAppend(data) : fileAppend(data);
}

export async function clearReceipts() {
  return USE_KV ? kvClear() : fileClear();
}
