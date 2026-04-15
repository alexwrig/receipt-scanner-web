import { NextResponse } from 'next/server';
import { extractReceiptData } from '@/lib/extract';
import { appendReceipt } from '@/lib/store';

const RECEIPT_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf'];

export async function POST(request) {
  // Verify webhook secret if configured
  const secret = request.nextUrl.searchParams.get('secret');
  if (process.env.EMAIL_WEBHOOK_SECRET && secret !== process.env.EMAIL_WEBHOOK_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const attachments = (body.attachments || []).filter(a =>
    RECEIPT_TYPES.includes(a.mimeType)
  );

  if (attachments.length === 0) {
    return NextResponse.json({ processed: 0, message: 'No receipt attachments found' });
  }

  let processed = 0;
  const errors = [];

  for (const attachment of attachments) {
    try {
      const data = await extractReceiptData(attachment.content, attachment.mimeType);
      data.receipt_source = 'Email';
      await appendReceipt(data);
      processed++;
    } catch (err) {
      console.error('Failed to process attachment:', attachment.filename, err.message);
      errors.push({ file: attachment.filename, error: err.message });
    }
  }

  return NextResponse.json({ processed, errors });
}
