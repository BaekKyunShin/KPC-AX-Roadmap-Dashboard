/**
 * parseDocx — DOCX 텍스트 추출
 *
 * mammoth.extractRawText 사용. 구버전 .doc 는 지원하지 않으므로
 * 호출 측에서 mime type 화이트리스트로 사전 차단.
 */

export async function parseDocx(buffer: Buffer | Uint8Array): Promise<string> {
  const mammoth = await import('mammoth');
  const buf = buffer instanceof Buffer ? buffer : Buffer.from(buffer);
  const { value } = await mammoth.extractRawText({ buffer: buf });
  return value;
}
