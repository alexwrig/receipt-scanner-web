import { NextResponse } from 'next/server';
import { getReceipts, clearReceipts } from '@/lib/store';

export async function GET() {
  return NextResponse.json(await getReceipts());
}

export async function DELETE() {
  await clearReceipts();
  return NextResponse.json({ ok: true });
}
