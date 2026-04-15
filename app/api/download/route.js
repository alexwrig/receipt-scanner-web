import { getReceipts } from '@/lib/store';
import { generateExcel } from '@/lib/excel';

export async function GET() {
  const receipts = getReceipts();
  const buffer = await generateExcel(receipts);

  return new Response(buffer, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': 'attachment; filename="receipts.xlsx"',
    },
  });
}
