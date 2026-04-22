/**
 * parseXlsx — XLSX 텍스트 추출
 *
 * xlsx-js-style 로 워크북을 열고 모든 시트를 CSV 로 직렬화한 뒤
 * 줄 단위로 합친다. 빈 줄은 제거한다.
 */

import * as XLSX from 'xlsx-js-style';

export async function parseXlsx(buffer: Buffer | Uint8Array): Promise<string> {
  const wb = XLSX.read(buffer, { type: 'buffer' });
  if (!wb.SheetNames || wb.SheetNames.length === 0) {
    throw new Error('xlsx: 시트가 없습니다.');
  }

  const sheetTexts = wb.SheetNames.map((name) => {
    const sheet = wb.Sheets[name];
    const csv = XLSX.utils.sheet_to_csv(sheet);
    const lines = csv.split('\n').map((l) => l.trim()).filter(Boolean);
    return [`[${name}]`, ...lines].join('\n');
  });

  return sheetTexts.join('\n\n');
}
