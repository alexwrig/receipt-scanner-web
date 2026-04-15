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

  // SendGrid sends multipart/form-data
  let formData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: 'Invalid form data' }, { status: 400 });
  }

  // Attachments arrive as attachment1, attachment2, ...
  const attachments = [];
  let i = 1;
  while (formData.has(`attachment${i}`)) {
    attachments.push(formData.get(`attachment${i}`));
    i++;
  }

  const valid = attachments.filter(a => RECEIPT_TYPES.includes(a.type));

  if (valid.length === 0) {
    return NextResponse.json({ processed: 0, message: 'No receipt attachments found' });
  }

  let processed = 0;
  const errors = [];

  for (const attachment of valid) {
    try {
      const buffer = Buffer.from(await attachment.arrayBuffer());
      const base64 = buffer.toString('base64');
      const data = await extractReceiptData(base64, attachment.type);
      data.receipt_source = 'Email';
      await appendReceipt(data);
      processed++;
    } catch (err) {
      console.error('Failed to process attachment:', attachment.name, err.message);
      errors.push({ file: attachment.name, error: err.message });
    }
  }

  return NextResponse.json({ processed, errors });
}
