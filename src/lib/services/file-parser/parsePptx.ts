/**
 * parsePptx — PPTX 슬라이드 텍스트 추출
 *
 * jszip 으로 ppt/slides/slide{N}.xml 을 풀고 <a:t> 정규식으로 텍스트 추출.
 * 슬라이드 번호 순서대로 결합한다.
 *
 * 구버전 .ppt(OLE compound) 입력 시 jszip 이 unzip 실패 → 명시적 안내로 변환.
 * (parseDocx 의 .doc 안내와 동일 패턴)
 */

const LEGACY_PPT_MESSAGE =
  '구버전 .ppt 형식은 지원하지 않습니다. .pptx 로 변환 후 다시 업로드해 주세요.';

/** OLE compound document magic byte: D0 CF 11 E0 A1 B1 1A E1 (구 .ppt/.doc/.xls 공통) */
function isLegacyOleCompound(buffer: Buffer | Uint8Array): boolean {
  if (buffer.length < 8) return false;
  const buf = buffer instanceof Buffer ? buffer : Buffer.from(buffer);
  return (
    buf[0] === 0xd0 &&
    buf[1] === 0xcf &&
    buf[2] === 0x11 &&
    buf[3] === 0xe0 &&
    buf[4] === 0xa1 &&
    buf[5] === 0xb1 &&
    buf[6] === 0x1a &&
    buf[7] === 0xe1
  );
}

export async function parsePptx(buffer: Buffer | Uint8Array): Promise<string> {
  // 구버전 .ppt(OLE) 사전 차단 — jszip 호출 전에 magic byte 검사
  if (isLegacyOleCompound(buffer)) {
    throw new Error(LEGACY_PPT_MESSAGE);
  }

  const JSZip = (await import('jszip')).default;
  let zip: Awaited<ReturnType<typeof JSZip.loadAsync>>;
  try {
    zip = await JSZip.loadAsync(buffer);
  } catch (error) {
    // jszip unzip 실패 (손상되었거나 OLE 가 아닌 다른 비-zip 포맷) → 사용자 안내로 통일
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`${LEGACY_PPT_MESSAGE} (원인: ${message})`);
  }

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
