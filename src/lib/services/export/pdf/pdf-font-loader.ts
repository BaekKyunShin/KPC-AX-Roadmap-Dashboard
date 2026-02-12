/**
 * PDF 폰트 로딩
 * Pretendard Regular/Bold 폰트를 jsPDF에 등록
 */

import type { jsPDF } from 'jspdf';
import { FONT } from './pdf-constants';

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

const fontCache: Record<string, string> = {};

async function loadFont(doc: jsPDF, path: string, vfsName: string, fontName: string, style: string): Promise<boolean> {
  try {
    if (!fontCache[path]) {
      const response = await fetch(path);
      if (!response.ok) {
        console.warn(`[PDF] 폰트 로드 실패: ${path}`, response.status);
        return false;
      }
      fontCache[path] = arrayBufferToBase64(await response.arrayBuffer());
    }
    doc.addFileToVFS(vfsName, fontCache[path]);
    doc.addFont(vfsName, fontName, style);
    return true;
  } catch (error) {
    console.warn(`[PDF] 폰트 로드 오류: ${path}`, error);
    return false;
  }
}

export async function loadFonts(doc: jsPDF): Promise<boolean> {
  const [regular, bold] = await Promise.all([
    loadFont(doc, '/fonts/Pretendard-Regular.ttf', 'Pretendard-Regular.ttf', FONT.REGULAR, 'normal'),
    loadFont(doc, '/fonts/Pretendard-Bold.ttf', 'Pretendard-Bold.ttf', FONT.BOLD, 'normal'),
  ]);
  if (regular) doc.setFont(FONT.REGULAR);
  return regular && bold;
}
