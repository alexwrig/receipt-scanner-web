import ExcelJS from 'exceljs';

const HEADERS = ['Date', 'Merchant', 'Amount', 'Category', 'Purpose', 'Card', 'Receipt'];
const COL_WIDTHS = [12, 22, 12, 20, 14, 8, 10];

function fmtAmount(raw) {
  const n = parseFloat(raw);
  return isNaN(n) ? '' : `$${n.toFixed(2)}`;
}

function fmtCard(raw) {
  if (raw === '' || raw == null) return '';
  const digits = String(raw).replace(/\D/g, '');
  return digits ? parseInt(digits.slice(-4), 10) : '';
}

export async function generateExcel(receipts) {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Receipts');

  sheet.addRow(HEADERS);

  const headerRow = sheet.getRow(1);
  headerRow.font = { bold: true };
  headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD9E1F2' } };
  headerRow.alignment = { horizontal: 'center' };

  COL_WIDTHS.forEach((w, i) => { sheet.getColumn(i + 1).width = w; });

  for (const r of receipts) {
    sheet.addRow([
      r.date || '',
      r.merchant || '',
      fmtAmount(r.amount),
      r.category || '',
      r.purpose || '',
      fmtCard(r.card),
      r.receipt_source || '',
    ]);
  }

  return workbook.xlsx.writeBuffer();
}
