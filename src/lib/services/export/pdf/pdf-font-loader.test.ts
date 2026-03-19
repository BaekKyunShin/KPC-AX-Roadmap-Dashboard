/**
 * pdf-font-loader.ts 테스트
 *
 * loadFonts:
 *   - 폰트 파일 로드 성공 시 doc에 폰트 등록 + true 반환
 *   - fetch 응답이 ok=false 시 false 반환
 *   - fetch 자체 예외 발생 시 false 반환
 *   - 캐시된 폰트 재사용 (두 번째 호출 시 fetch 스킵)
 *   - 빈 폰트 데이터(0 바이트) 방어 처리
 */

import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';

// ─── fetch mock ────────────────────────────────────────────────────────────

const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

// ─── btoa mock (Node 환경 보완) ────────────────────────────────────────────

// Node 18+에는 btoa가 있지만, 안전을 위해 stub
vi.stubGlobal('btoa', (str: string) => Buffer.from(str, 'binary').toString('base64'));

// ─── pdf-constants mock ────────────────────────────────────────────────────

vi.mock('./pdf-constants', () => ({
  FONT: {
    REGULAR: 'Pretendard',
    BOLD: 'PretendardBold',
  },
}));

// ─── 테스트용 jsPDF doc mock ───────────────────────────────────────────────

function createMockDoc() {
  return {
    addFileToVFS: vi.fn(),
    addFont: vi.fn(),
    setFont: vi.fn(),
  };
}

// ─── 헬퍼: 성공적인 fetch Response 생성 ───────────────────────────────────

function createFontResponse(byteLength = 4) {
  const buffer = new ArrayBuffer(byteLength);
  if (byteLength > 0) {
    const view = new Uint8Array(buffer);
    for (let i = 0; i < byteLength; i++) {
      view[i] = 65 + (i % 26); // A-Z 반복
    }
  }
  return {
    ok: true,
    arrayBuffer: vi.fn().mockResolvedValue(buffer),
  };
}

// ─── 테스트 ────────────────────────────────────────────────────────────────

describe('loadFonts', () => {
  beforeEach(() => {
    vi.resetModules();
    mockFetch.mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('폰트 파일 로드 성공 시 doc에 폰트를 등록하고 true를 반환한다', async () => {
    const regularResponse = createFontResponse(100);
    const boldResponse = createFontResponse(100);
    mockFetch
      .mockResolvedValueOnce(regularResponse)
      .mockResolvedValueOnce(boldResponse);

    const { loadFonts } = await import('./pdf-font-loader');
    const doc = createMockDoc();
    const result = await loadFonts(doc as never);

    expect(result).toBe(true);
    // Regular 폰트 VFS 등록
    expect(doc.addFileToVFS).toHaveBeenCalledWith(
      'Pretendard-Regular.ttf',
      expect.any(String),
    );
    // Bold 폰트 VFS 등록
    expect(doc.addFileToVFS).toHaveBeenCalledWith(
      'Pretendard-Bold.ttf',
      expect.any(String),
    );
    // addFont 호출 확인
    expect(doc.addFont).toHaveBeenCalledWith('Pretendard-Regular.ttf', 'Pretendard', 'normal');
    expect(doc.addFont).toHaveBeenCalledWith('Pretendard-Bold.ttf', 'PretendardBold', 'normal');
    // setFont으로 기본 폰트 설정
    expect(doc.setFont).toHaveBeenCalledWith('Pretendard');
  });

  it('Regular 폰트 로드 실패(ok=false) 시 false를 반환한다', async () => {
    const failResponse = { ok: false, status: 404 };
    const boldResponse = createFontResponse(100);
    mockFetch
      .mockResolvedValueOnce(failResponse)
      .mockResolvedValueOnce(boldResponse);

    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const { loadFonts } = await import('./pdf-font-loader');
    const doc = createMockDoc();
    const result = await loadFonts(doc as never);

    expect(result).toBe(false);
    expect(warnSpy).toHaveBeenCalled();
    // Regular 실패 → setFont 미호출
    expect(doc.setFont).not.toHaveBeenCalled();
    warnSpy.mockRestore();
  });

  it('Bold 폰트만 로드 실패 시 false를 반환하지만 Regular은 등록된다', async () => {
    const regularResponse = createFontResponse(100);
    const failResponse = { ok: false, status: 500 };
    mockFetch
      .mockResolvedValueOnce(regularResponse)
      .mockResolvedValueOnce(failResponse);

    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const { loadFonts } = await import('./pdf-font-loader');
    const doc = createMockDoc();
    const result = await loadFonts(doc as never);

    // regular && bold → true && false → false
    expect(result).toBe(false);
    // Regular은 성공했으므로 setFont 호출됨
    expect(doc.setFont).toHaveBeenCalledWith('Pretendard');
    warnSpy.mockRestore();
  });

  it('fetch 자체 예외 발생 시 false를 반환하고 경고를 출력한다', async () => {
    mockFetch.mockRejectedValue(new TypeError('네트워크 오류'));

    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const { loadFonts } = await import('./pdf-font-loader');
    const doc = createMockDoc();
    const result = await loadFonts(doc as never);

    expect(result).toBe(false);
    expect(warnSpy).toHaveBeenCalled();
    warnSpy.mockRestore();
  });

  it('캐시된 폰트 재사용 — 두 번째 호출 시 fetch를 다시 호출하지 않는다', async () => {
    const regularResponse = createFontResponse(50);
    const boldResponse = createFontResponse(50);
    mockFetch
      .mockResolvedValueOnce(regularResponse)
      .mockResolvedValueOnce(boldResponse);

    const { loadFonts } = await import('./pdf-font-loader');

    // 첫 번째 호출: fetch 2회
    const doc1 = createMockDoc();
    await loadFonts(doc1 as never);
    expect(mockFetch).toHaveBeenCalledTimes(2);

    // 두 번째 호출: 캐시 사용으로 fetch 추가 호출 없음
    const doc2 = createMockDoc();
    const result = await loadFonts(doc2 as never);

    expect(result).toBe(true);
    expect(mockFetch).toHaveBeenCalledTimes(2); // 여전히 2회
    // 두 번째 doc에도 폰트가 등록됨
    expect(doc2.addFileToVFS).toHaveBeenCalledTimes(2);
    expect(doc2.addFont).toHaveBeenCalledTimes(2);
  });

  it('빈 폰트 데이터(0 바이트)도 base64 변환하여 등록한다', async () => {
    const emptyRegular = createFontResponse(0);
    const emptyBold = createFontResponse(0);
    mockFetch
      .mockResolvedValueOnce(emptyRegular)
      .mockResolvedValueOnce(emptyBold);

    const { loadFonts } = await import('./pdf-font-loader');
    const doc = createMockDoc();
    const result = await loadFonts(doc as never);

    expect(result).toBe(true);
    // 빈 ArrayBuffer의 base64 → 빈 문자열
    expect(doc.addFileToVFS).toHaveBeenCalledWith('Pretendard-Regular.ttf', '');
    expect(doc.addFileToVFS).toHaveBeenCalledWith('Pretendard-Bold.ttf', '');
  });
});
