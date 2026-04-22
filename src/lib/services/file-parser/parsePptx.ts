/**
 * parsePptx — PPTX 슬라이드 텍스트 추출
 *
 * jszip 으로 ppt/slides/slide{N}.xml 을 풀고 <a:t> 정규식으로 텍스트 추출.
 * 슬라이드 번호 순서대로 결합한다.
 */

export async function parsePptx(buffer: Buffer | Uint8Array): Promise<string> {
  const JSZip = (await import('jszip')).default;
  const zip = await JSZip.loadAsync(buffer);

  const slideFiles = Object.keys(zip.files)
    .filter((n) => /^ppt\/slides\/slide\d+\.xml$/.test(n))
    .sort((a, b) => {
      const numA = parseInt(a.match(/slide(\d+)\.xml/)?.[1] ?? '0', 10);
      const numB = parseInt(b.match(/slide(\d+)\.xml/)?.[1] ?? '0', 10);
      return numA - numB;
    });

  const texts: string[] = [];
  for (const name of slideFiles) {
    const file = zip.file(name);
    if (!file) continue;
    const xml = await file.async('text');
    const matches = [...xml.matchAll(/<a:t[^>]*>([^<]+)<\/a:t>/g)];
    texts.push(matches.map((m) => m[1]).join(' '));
  }

  return texts.join('\n');
}
