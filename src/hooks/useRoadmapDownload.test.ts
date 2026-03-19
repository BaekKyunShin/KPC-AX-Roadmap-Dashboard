import { describe, test, expect, vi, afterEach, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

// ─── 모킹 ──────────────────────────────────────────────────────────────────

const mockPrepareExportData = vi.fn();
const mockLogDownload = vi.fn().mockResolvedValue(undefined);

vi.mock('@/lib/actions/roadmap-export', () => ({
  prepareExportData: (...args: unknown[]) => mockPrepareExportData(...args),
  logDownload: (...args: unknown[]) => mockLogDownload(...args),
}));

const mockShowSuccessToast = vi.fn();
const mockShowErrorToast = vi.fn();

vi.mock('@/lib/utils/toast', () => ({
  showSuccessToast: (...args: unknown[]) => mockShowSuccessToast(...args),
  showErrorToast: (...args: unknown[]) => mockShowErrorToast(...args),
}));

const mockGeneratePDF = vi.fn();
vi.mock('@/lib/services/export-pdf', () => ({
  generatePDF: (...args: unknown[]) => mockGeneratePDF(...args),
}));

const mockDownloadExcel = vi.fn();
vi.mock('@/lib/services/export-xlsx', () => ({
  downloadXLSX: (...args: unknown[]) => mockDownloadExcel(...args),
}));

// ─── DOM / URL 모킹 ────────────────────────────────────────────────────────

const mockCreateObjectURL = vi.fn().mockReturnValue('blob:mock-url');
const mockRevokeObjectURL = vi.fn();

// ─── 테스트 데이터 ─────────────────────────────────────────────────────────

const MOCK_EXPORT_DATA = {
  companyName: '테스트기업',
  versionNumber: 1,
  modules: [],
};

const ROADMAP_ID = 'roadmap-123';

// ─── 테스트 본체 ───────────────────────────────────────────────────────────

describe('useRoadmapDownload', () => {
  let useRoadmapDownload: typeof import('./useRoadmapDownload').useRoadmapDownload;

  beforeEach(async () => {
    // DOM mock 설정
    globalThis.URL.createObjectURL = mockCreateObjectURL;
    globalThis.URL.revokeObjectURL = mockRevokeObjectURL;

    // 동적 import로 모킹 적용된 모듈 가져오기
    const mod = await import('./useRoadmapDownload');
    useRoadmapDownload = mod.useRoadmapDownload;
  });

  afterEach(() => {
    vi.restoreAllMocks();
    // vi.restoreAllMocks()는 스파이만 복원 — 모듈 스코프 vi.fn()은 수동 리셋 필요
    [mockPrepareExportData, mockLogDownload, mockShowSuccessToast,
     mockShowErrorToast, mockGeneratePDF, mockDownloadExcel].forEach(m => m.mockReset());
  });

  // ─── 초기 상태 ──────────────────────────────────────────────────────────

  test('초기 상태: isDownloading은 null이다', () => {
    const { result } = renderHook(() => useRoadmapDownload());
    expect(result.current.isDownloading).toBeNull();
  });

  // ─── PDF 다운로드 성공 ──────────────────────────────────────────────────

  test('PDF 다운로드 성공 시 토스트를 표시하고 isDownloading이 null로 복귀한다', async () => {
    mockPrepareExportData.mockResolvedValue({
      success: true,
      data: MOCK_EXPORT_DATA,
    });
    mockGeneratePDF.mockResolvedValue(new Blob(['pdf-content']));
    mockLogDownload.mockResolvedValue({ success: true });

    const { result } = renderHook(() => useRoadmapDownload());

    // renderHook 이후에 createElement를 모킹 (renderHook이 내부적으로 createElement('div')를 사용하므로)
    const mockAnchor = {
      href: '',
      download: '',
      click: vi.fn(),
    } as unknown as HTMLAnchorElement;
    const originalCreateElement = document.createElement.bind(document);
    const createElementSpy = vi.spyOn(document, 'createElement').mockImplementation((tag: string) => {
      if (tag === 'a') return mockAnchor;
      return originalCreateElement(tag);
    });
    const appendChildSpy = vi.spyOn(document.body, 'appendChild').mockReturnValue(mockAnchor as unknown as Node);
    const removeChildSpy = vi.spyOn(document.body, 'removeChild').mockReturnValue(mockAnchor as unknown as Node);

    await act(async () => {
      await result.current.downloadPDF(ROADMAP_ID);
    });

    // prepareExportData 호출 확인
    expect(mockPrepareExportData).toHaveBeenCalledWith(ROADMAP_ID);

    // generatePDF 호출 확인
    expect(mockGeneratePDF).toHaveBeenCalledWith(MOCK_EXPORT_DATA);

    // 앵커 클릭 + URL 정리
    expect(mockAnchor.click).toHaveBeenCalled();
    expect(mockAnchor.download).toBe('roadmap_테스트기업_v1.pdf');
    expect(mockRevokeObjectURL).toHaveBeenCalledWith('blob:mock-url');

    // logDownload 호출
    expect(mockLogDownload).toHaveBeenCalledWith(ROADMAP_ID, 'PDF');

    // 성공 토스트
    expect(mockShowSuccessToast).toHaveBeenCalledWith('PDF 다운로드 완료');

    // 상태 복귀
    expect(result.current.isDownloading).toBeNull();

    createElementSpy.mockRestore();
    appendChildSpy.mockRestore();
    removeChildSpy.mockRestore();
  });

  // ─── PDF 다운로드 실패 (서버 에러) ─────────────────────────────────────

  test('prepareExportData 실패 시 에러 토스트를 표시한다 (PDF)', async () => {
    mockPrepareExportData.mockResolvedValue({
      success: false,
      error: '로드맵을 찾을 수 없습니다.',
    });

    const { result } = renderHook(() => useRoadmapDownload());

    await act(async () => {
      await result.current.downloadPDF(ROADMAP_ID);
    });

    expect(mockShowErrorToast).toHaveBeenCalledWith('PDF 다운로드 실패', '로드맵을 찾을 수 없습니다.');
    expect(mockGeneratePDF).not.toHaveBeenCalled();
    expect(result.current.isDownloading).toBeNull();
  });

  // ─── PDF 다운로드 실패 (예외) ──────────────────────────────────────────

  test('PDF 생성 중 예외 발생 시 에러 토스트를 표시한다', async () => {
    mockPrepareExportData.mockResolvedValue({
      success: true,
      data: MOCK_EXPORT_DATA,
    });
    mockGeneratePDF.mockRejectedValue(new Error('PDF 렌더링 실패'));

    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const { result } = renderHook(() => useRoadmapDownload());

    await act(async () => {
      await result.current.downloadPDF(ROADMAP_ID);
    });

    expect(mockShowErrorToast).toHaveBeenCalledWith(
      'PDF 다운로드 실패',
      'PDF 다운로드 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.',
    );
    expect(result.current.isDownloading).toBeNull();

    consoleSpy.mockRestore();
  });

  // ─── XLSX 다운로드 성공 ─────────────────────────────────────────────────

  test('XLSX 다운로드 성공 시 토스트를 표시하고 isDownloading이 null로 복귀한다', async () => {
    mockPrepareExportData.mockResolvedValue({
      success: true,
      data: MOCK_EXPORT_DATA,
    });
    mockDownloadExcel.mockResolvedValue(undefined);
    mockLogDownload.mockResolvedValue({ success: true });

    const { result } = renderHook(() => useRoadmapDownload());

    await act(async () => {
      await result.current.downloadXLSX(ROADMAP_ID);
    });

    // prepareExportData 호출 확인
    expect(mockPrepareExportData).toHaveBeenCalledWith(ROADMAP_ID);

    // downloadExcel 호출 확인 (파일명 포함)
    expect(mockDownloadExcel).toHaveBeenCalledWith(
      MOCK_EXPORT_DATA,
      'roadmap_테스트기업_v1.xlsx',
    );

    // logDownload 호출
    expect(mockLogDownload).toHaveBeenCalledWith(ROADMAP_ID, 'XLSX');

    // 성공 토스트
    expect(mockShowSuccessToast).toHaveBeenCalledWith('Excel 다운로드 완료');

    // 상태 복귀
    expect(result.current.isDownloading).toBeNull();
  });

  // ─── XLSX 다운로드 실패 (서버 에러) ────────────────────────────────────

  test('prepareExportData 실패 시 에러 토스트를 표시한다 (XLSX)', async () => {
    mockPrepareExportData.mockResolvedValue({
      success: false,
      error: '접근 권한이 없습니다.',
    });

    const { result } = renderHook(() => useRoadmapDownload());

    await act(async () => {
      await result.current.downloadXLSX(ROADMAP_ID);
    });

    expect(mockShowErrorToast).toHaveBeenCalledWith('Excel 다운로드 실패', '접근 권한이 없습니다.');
    expect(mockDownloadExcel).not.toHaveBeenCalled();
    expect(result.current.isDownloading).toBeNull();
  });

  // ─── XLSX 다운로드 실패 (예외) ─────────────────────────────────────────

  test('XLSX 생성 중 예외 발생 시 에러 토스트를 표시한다', async () => {
    mockPrepareExportData.mockResolvedValue({
      success: true,
      data: MOCK_EXPORT_DATA,
    });
    mockDownloadExcel.mockRejectedValue(new Error('XLSX 생성 실패'));

    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const { result } = renderHook(() => useRoadmapDownload());

    await act(async () => {
      await result.current.downloadXLSX(ROADMAP_ID);
    });

    expect(mockShowErrorToast).toHaveBeenCalledWith(
      'Excel 다운로드 실패',
      'Excel 다운로드 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.',
    );
    expect(result.current.isDownloading).toBeNull();

    consoleSpy.mockRestore();
  });
});
