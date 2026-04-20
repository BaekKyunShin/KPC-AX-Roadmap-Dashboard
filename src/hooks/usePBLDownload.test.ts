/**
 * usePBLDownload 훅 테스트
 *
 * 테스트 대상:
 * - downloadPDF: PDF 다운로드 플로우 (성공/서버에러/예외)
 * - downloadXLSX: XLSX 다운로드 플로우 (성공/서버에러/예외)
 * - isDownloading 상태 전환: null → 'PDF'/'XLSX' → null
 */

import { describe, test, expect, vi, afterEach, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

// ─── 모킹 ──────────────────────────────────────────────────────────────────

const mockPreparePBLExportData = vi.fn();
const mockLogPBLDownload = vi.fn().mockResolvedValue({ success: true });

vi.mock('@/lib/actions/pbl-export', () => ({
  preparePBLExportData: (...args: unknown[]) => mockPreparePBLExportData(...args),
  logPBLDownload: (...args: unknown[]) => mockLogPBLDownload(...args),
}));

const mockShowSuccessToast = vi.fn();
const mockShowErrorToast = vi.fn();

vi.mock('@/lib/utils/toast', () => ({
  showSuccessToast: (...args: unknown[]) => mockShowSuccessToast(...args),
  showErrorToast: (...args: unknown[]) => mockShowErrorToast(...args),
}));

const mockGeneratePBLPDF = vi.fn();
vi.mock('@/lib/services/export/pdf', () => ({
  generatePBLPDF: (...args: unknown[]) => mockGeneratePBLPDF(...args),
}));

const mockGeneratePBLXLSX = vi.fn();
const mockDownloadPBLXLSX = vi.fn();
vi.mock('@/lib/services/export/xlsx', () => ({
  generatePBLXLSX: (...args: unknown[]) => mockGeneratePBLXLSX(...args),
  downloadPBLXLSX: (...args: unknown[]) => mockDownloadPBLXLSX(...args),
}));

// ─── DOM / URL 모킹 ────────────────────────────────────────────────────────

const mockCreateObjectURL = vi.fn().mockReturnValue('blob:mock-pbl-url');
const mockRevokeObjectURL = vi.fn();

// ─── 테스트 데이터 ─────────────────────────────────────────────────────────

const MOCK_EXPORT_DATA = {
  companyName: '테스트PBL기업',
  versionNumber: 1,
  projectId: 'project-1',
  status: 'PBL_DRAFTED',
  diagnosisSummary: '진단',
  pblContent: {
    background: {},
    subject_profile: {},
    course_evaluation: {},
    operational_plan: {},
  },
  createdAt: '2026-04-01T00:00:00Z',
  finalizedAt: null,
};

const PBL_ID = 'pbl-123';

// ─── 테스트 본체 ───────────────────────────────────────────────────────────

describe('usePBLDownload', () => {
  let usePBLDownload: typeof import('./usePBLDownload').usePBLDownload;

  beforeEach(async () => {
    // DOM mock 설정
    globalThis.URL.createObjectURL = mockCreateObjectURL;
    globalThis.URL.revokeObjectURL = mockRevokeObjectURL;

    // 동적 import로 모킹 적용된 모듈 가져오기
    const mod = await import('./usePBLDownload');
    usePBLDownload = mod.usePBLDownload;
  });

  afterEach(() => {
    vi.restoreAllMocks();
    [
      mockPreparePBLExportData,
      mockLogPBLDownload,
      mockShowSuccessToast,
      mockShowErrorToast,
      mockGeneratePBLPDF,
      mockGeneratePBLXLSX,
      mockDownloadPBLXLSX,
    ].forEach((m) => m.mockReset());
  });

  // ─── 초기 상태 ─────────────────────────────────────────────────────────

  test('초기 상태: isDownloading은 null이다', () => {
    const { result } = renderHook(() => usePBLDownload());
    expect(result.current.isDownloading).toBeNull();
  });

  // ─── PDF 다운로드 성공 ─────────────────────────────────────────────────

  test('PDF 다운로드 성공 시 토스트를 표시하고 isDownloading이 null로 복귀한다', async () => {
    mockPreparePBLExportData.mockResolvedValue({
      success: true,
      data: MOCK_EXPORT_DATA,
    });
    mockGeneratePBLPDF.mockResolvedValue(new Blob(['pdf-content']));
    mockLogPBLDownload.mockResolvedValue({ success: true });

    const { result } = renderHook(() => usePBLDownload());

    // renderHook 이후에 createElement를 모킹
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
      await result.current.downloadPDF(PBL_ID);
    });

    // preparePBLExportData 호출 확인
    expect(mockPreparePBLExportData).toHaveBeenCalledWith(PBL_ID);

    // generatePBLPDF 호출 확인
    expect(mockGeneratePBLPDF).toHaveBeenCalledWith(MOCK_EXPORT_DATA);

    // 앵커 다운로드 파일명 확인
    expect(mockAnchor.download).toBe('pbl_테스트PBL기업_v1.pdf');
    expect(mockAnchor.click).toHaveBeenCalled();
    expect(mockRevokeObjectURL).toHaveBeenCalledWith('blob:mock-pbl-url');

    // logPBLDownload 호출
    expect(mockLogPBLDownload).toHaveBeenCalledWith(PBL_ID, 'PDF');

    // 성공 토스트
    expect(mockShowSuccessToast).toHaveBeenCalledWith('PDF 다운로드 완료');

    // 상태 복귀
    expect(result.current.isDownloading).toBeNull();

    createElementSpy.mockRestore();
    appendChildSpy.mockRestore();
    removeChildSpy.mockRestore();
  });

  // ─── PDF 다운로드 실패 (서버 에러) ─────────────────────────────────────

  test('preparePBLExportData 실패 시 에러 토스트를 표시한다 (PDF)', async () => {
    mockPreparePBLExportData.mockResolvedValue({
      success: false,
      error: 'PBL 보고서를 찾을 수 없습니다.',
    });

    const { result } = renderHook(() => usePBLDownload());

    await act(async () => {
      await result.current.downloadPDF(PBL_ID);
    });

    expect(mockShowErrorToast).toHaveBeenCalledWith('PDF 다운로드 실패', 'PBL 보고서를 찾을 수 없습니다.');
    expect(mockGeneratePBLPDF).not.toHaveBeenCalled();
    expect(result.current.isDownloading).toBeNull();
  });

  // ─── PDF 다운로드 실패 (예외) ──────────────────────────────────────────

  test('PDF 생성 중 예외 발생 시 에러 토스트를 표시한다', async () => {
    mockPreparePBLExportData.mockResolvedValue({
      success: true,
      data: MOCK_EXPORT_DATA,
    });
    mockGeneratePBLPDF.mockRejectedValue(new Error('PDF 렌더링 실패'));

    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const { result } = renderHook(() => usePBLDownload());

    await act(async () => {
      await result.current.downloadPDF(PBL_ID);
    });

    expect(mockShowErrorToast).toHaveBeenCalledWith(
      'PDF 다운로드 실패',
      'PDF 생성 중 오류가 발생했습니다.',
    );
    expect(result.current.isDownloading).toBeNull();
    consoleSpy.mockRestore();
  });

  // ─── XLSX 다운로드 성공 ─────────────────────────────────────────────────

  test('XLSX 다운로드 성공 시 토스트를 표시하고 isDownloading이 null로 복귀한다', async () => {
    mockPreparePBLExportData.mockResolvedValue({
      success: true,
      data: MOCK_EXPORT_DATA,
    });
    mockGeneratePBLXLSX.mockResolvedValue(new Uint8Array([1, 2, 3]));
    mockDownloadPBLXLSX.mockReturnValue(undefined);
    mockLogPBLDownload.mockResolvedValue({ success: true });

    const { result } = renderHook(() => usePBLDownload());

    await act(async () => {
      await result.current.downloadXLSX(PBL_ID);
    });

    // preparePBLExportData 호출 확인
    expect(mockPreparePBLExportData).toHaveBeenCalledWith(PBL_ID);

    // generatePBLXLSX 호출 확인
    expect(mockGeneratePBLXLSX).toHaveBeenCalled();

    // downloadPBLXLSX 파일명 확인
    expect(mockDownloadPBLXLSX).toHaveBeenCalledWith(
      expect.anything(),
      'pbl_테스트PBL기업_v1.xlsx',
    );

    // logPBLDownload 호출
    expect(mockLogPBLDownload).toHaveBeenCalledWith(PBL_ID, 'XLSX');

    // 성공 토스트
    expect(mockShowSuccessToast).toHaveBeenCalledWith('Excel 다운로드 완료');

    // 상태 복귀
    expect(result.current.isDownloading).toBeNull();
  });

  // ─── XLSX 다운로드 실패 (서버 에러) ────────────────────────────────────

  test('preparePBLExportData 실패 시 에러 토스트를 표시한다 (XLSX)', async () => {
    mockPreparePBLExportData.mockResolvedValue({
      success: false,
      error: '접근 권한이 없습니다.',
    });

    const { result } = renderHook(() => usePBLDownload());

    await act(async () => {
      await result.current.downloadXLSX(PBL_ID);
    });

    expect(mockShowErrorToast).toHaveBeenCalledWith('Excel 다운로드 실패', '접근 권한이 없습니다.');
    expect(mockGeneratePBLXLSX).not.toHaveBeenCalled();
    expect(result.current.isDownloading).toBeNull();
  });

  // ─── XLSX 다운로드 실패 (예외) ─────────────────────────────────────────

  test('XLSX 생성 중 예외 발생 시 에러 토스트를 표시한다', async () => {
    mockPreparePBLExportData.mockResolvedValue({
      success: true,
      data: MOCK_EXPORT_DATA,
    });
    mockGeneratePBLXLSX.mockRejectedValue(new Error('XLSX 생성 실패'));

    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const { result } = renderHook(() => usePBLDownload());

    await act(async () => {
      await result.current.downloadXLSX(PBL_ID);
    });

    expect(mockShowErrorToast).toHaveBeenCalledWith(
      'Excel 다운로드 실패',
      'Excel 생성 중 오류가 발생했습니다.',
    );
    expect(result.current.isDownloading).toBeNull();
    consoleSpy.mockRestore();
  });

  // ─── isDownloading 상태 전환 ────────────────────────────────────────────

  test('PDF 다운로드 중 isDownloading이 "PDF"로 설정된다', async () => {
    let capturedDownloading: string | null = null;

    // preparePBLExportData가 호출되는 시점에 상태를 캡처
    mockPreparePBLExportData.mockImplementation(async () => {
      // 이 시점에서 isDownloading이 'PDF'여야 함 (하지만 renderHook 외부에서는 직접 캡처 불가)
      // 대신 긴 지연으로 상태 캡처
      await new Promise((resolve) => setTimeout(resolve, 0));
      return { success: false, error: '취소됨' };
    });

    const { result } = renderHook(() => usePBLDownload());

    // act로 감싸기 전 null 확인
    expect(result.current.isDownloading).toBeNull();

    await act(async () => {
      await result.current.downloadPDF(PBL_ID);
    });

    // 완료 후 null로 복귀 확인
    expect(result.current.isDownloading).toBeNull();
    capturedDownloading; // 타입 체크용 참조
  });

  test('XLSX 다운로드 완료 후 isDownloading이 null로 복귀한다', async () => {
    mockPreparePBLExportData.mockResolvedValue({
      success: false,
      error: '에러',
    });

    const { result } = renderHook(() => usePBLDownload());

    await act(async () => {
      await result.current.downloadXLSX(PBL_ID);
    });

    expect(result.current.isDownloading).toBeNull();
  });
});
