/**
 * parsePdf — PDF 텍스트 추출
 *
 * pdfjs-dist legacy 빌드를 dynamic import 로 사용한다.
 * - server-side 전용 (Next.js Server Action / API Route)
 * - worker 비활성화 (legacy build 는 sync 동작)
 * - 파싱 실패 시 throw — 호출자(extractText 디스패처)가 try/catch 로 격리한다
 */

export async function parsePdf(buffer: Buffer | Uint8Array): Promise<string> {
  // pdfjs-dist legacy build 는 ESM. dynamic import 로 server-side 만 로드.
  const pdfjsLib = await import('pdfjs-dist/legacy/build/pdf.mjs');

  const data =
    buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);

  const loadingTask = pdfjsLib.getDocument({
    data,
    // worker 비활성화 (Node 환경)
    isEvalSupported: false,
    useSystemFonts: true,
    // standardFontDataUrl 미설정 시 경고 로그가 나오나 텍스트 추출에는 영향 없음
  });

  const pdf = await loadingTask.promise;
  const texts: string[] = [];

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const pageText = content.items
      .map((item) => {
        if (typeof item === 'object' && item !== null && 'str' in item) {
          return (item as { str: string }).str;
        }
        return '';
      })
      .join(' ');
    texts.push(pageText);
  }

  return texts.join('\n');
}
