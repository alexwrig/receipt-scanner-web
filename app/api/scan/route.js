import { NextResponse } from 'next/server';
import { extractReceiptData } from '@/lib/extract';
import { appendReceipt } from '@/lib/store';

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf'];

export async function POST(request) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: 'ANTHROPIC_API_KEY is not set' }, { status: 500 });
  }

  let formData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: 'Invalid form data' }, { status: 400 });
  }

  const file = formData.get('image');
  if (!file || typeof file === 'string') {
    return NextResponse.json({ error: 'No image file provided' }, { status: 400 });
  }

  const mediaType = file.type || 'image/jpeg';
  if (!ALLOWED_TYPES.includes(mediaType)) {
    return NextResponse.json({ error: `Unsupported file type: ${mediaType}` }, { status: 400 });
  }

  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    const base64 = buffer.toString('base64');
    const data = await extractReceiptData(base64, mediaType);
    await appendReceipt(data);
    return NextResponse.json(data);
  } catch (err) {
    console.error('Scan error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
