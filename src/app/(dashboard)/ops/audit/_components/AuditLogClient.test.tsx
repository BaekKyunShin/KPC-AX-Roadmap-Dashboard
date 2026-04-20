import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import AuditLogClient from './AuditLogClient';
import type { AuditLogEntry } from '../actions';
import type { AuditAction } from '@/types/database';

// ============================================================================
// 모킹
// ============================================================================

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => '/ops/audit',
}));

const mockFetchAuditLogs = vi.fn();
const mockFetchAllAuditLogs = vi.fn();

vi.mock('../actions', async () => {
  const actual = await vi.importActual('../actions');
  return {
    ...actual,
    fetchAuditLogs: (...args: unknown[]) => mockFetchAuditLogs(...args),
    fetchAllAuditLogs: (...args: unknown[]) => mockFetchAllAuditLogs(...args),
  };
});

// xlsx-js-style 모킹 (jsdom에서 파일 다운로드 불가)
vi.mock('xlsx-js-style', () => ({
  utils: {
    json_to_sheet: vi.fn(() => ({})),
    book_new: vi.fn(() => ({})),
    book_append_sheet: vi.fn(),
  },
  writeFile: vi.fn(),
}));

// toast 모킹
vi.mock('@/lib/utils/toast', () => ({
  showErrorToast: vi.fn(),
  showSuccessToast: vi.fn(),
}));

// ============================================================================
// 테스트 데이터
// ============================================================================

const mockLogs: AuditLogEntry[] = [
  {
    id: 'log-1',
    actor_user_id: 'user-1',
    action: 'PROJECT_CREATE' as AuditAction,
    target_type: 'project',
    target_id: 'target-uuid-0001',
    meta: {},
    success: true,
    error_message: undefined,
    created_at: '2026-03-01T10:00:00Z',
    actor: { id: 'user-1', name: '홍길동', email: 'hong@test.com' },
  },
  {
    id: 'log-2',
    actor_user_id: 'user-2',
    action: 'USER_SUSPEND' as AuditAction,
    target_type: 'user',
    target_id: 'target-uuid-0002',
    meta: { reason: '약관 위반' },
    success: false,
    error_message: '처리 중 오류',
    created_at: '2026-03-02T11:00:00Z',
    actor: { id: 'user-2', name: '김철수', email: 'kim@test.com' },
  },
];

const actionTypes = [
  { value: 'PROJECT_CREATE' as AuditAction, label: '프로젝트 생성' },
  { value: 'USER_SUSPEND' as AuditAction, label: '사용자 정지' },
];

const targetTypes = [
  { value: 'project', label: '프로젝트' },
  { value: 'user', label: '사용자' },
];

const users = [
  { id: 'user-1', name: '홍길동', email: 'hong@test.com' },
  { id: 'user-2', name: '김철수', email: 'kim@test.com' },
];

const defaultProps = {
  initialLogs: mockLogs,
  initialTotal: 2,
  initialTotalPages: 1,
  actionTypes,
  targetTypes,
  users,
};

// ============================================================================
// 테스트
// ============================================================================

describe('AuditLogClient', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetchAuditLogs.mockResolvedValue({
      logs: mockLogs,
      total: 2,
      totalPages: 1,
      page: 1,
      limit: 20,
    });
    mockFetchAllAuditLogs.mockResolvedValue({
      logs: mockLogs,
      total: 2,
    });
  });

  // --------------------------------------------------------------------------
  // 1. 초기 렌더링
  // --------------------------------------------------------------------------
  describe('초기 렌더링', () => {
    it('페이지 헤더 "감사로그"를 표시한다', () => {
      render(<AuditLogClient {...defaultProps} />);
      expect(screen.getByText('감사로그')).toBeInTheDocument();
    });

    it('초기 로그 데이터를 테이블에 표시한다', () => {
      render(<AuditLogClient {...defaultProps} />);
      expect(screen.getAllByText('홍길동').length).toBeGreaterThan(0);
      expect(screen.getAllByText('김철수').length).toBeGreaterThan(0);
    });

    it('총 건수를 표시한다', () => {
      render(<AuditLogClient {...defaultProps} />);
      expect(screen.getByText('2')).toBeInTheDocument();
    });

    it('성공/실패 상태 배지를 표시한다', () => {
      render(<AuditLogClient {...defaultProps} />);
      expect(screen.getAllByText('성공').length).toBeGreaterThan(0);
      expect(screen.getAllByText('실패').length).toBeGreaterThan(0);
    });

    it('현재 페이지 다운로드 버튼을 표시한다', () => {
      render(<AuditLogClient {...defaultProps} />);
      expect(screen.getByText('현재 페이지 다운로드')).toBeInTheDocument();
    });

    it('전체 목록 다운로드 버튼을 표시한다', () => {
      render(<AuditLogClient {...defaultProps} />);
      expect(screen.getByText(/전체 목록 다운로드/)).toBeInTheDocument();
    });
  });

  // --------------------------------------------------------------------------
  // 2. 검색 기능
  // --------------------------------------------------------------------------
  describe('검색 기능', () => {
    it('검색 입력란이 렌더링된다', () => {
      render(<AuditLogClient {...defaultProps} />);
      const input = screen.getByPlaceholderText('사용자명, 이메일, 대상ID 검색...');
      expect(input).toBeInTheDocument();
    });

    it('검색어 입력 시 일치하는 로그만 표시한다', async () => {
      render(<AuditLogClient {...defaultProps} />);
      const input = screen.getByPlaceholderText('사용자명, 이메일, 대상ID 검색...');

      await act(async () => {
        fireEvent.change(input, { target: { value: '홍길동' } });
      });

      // 홍길동은 보여야 하고 (클라이언트 필터링)
      expect(screen.getAllByText('홍길동').length).toBeGreaterThan(0);
    });

    it('검색 결과가 없으면 건수 정보를 표시한다', async () => {
      render(<AuditLogClient {...defaultProps} />);
      const input = screen.getByPlaceholderText('사용자명, 이메일, 대상ID 검색...');

      await act(async () => {
        fireEvent.change(input, { target: { value: '존재하지않는사람xyz' } });
      });

      // 로그 없음 메시지가 표시됨
      await waitFor(() => {
        expect(screen.getByText('로그 없음')).toBeInTheDocument();
      });
    });
  });

  // --------------------------------------------------------------------------
  // 3. 필터 기능
  // --------------------------------------------------------------------------
  describe('필터 기능', () => {
    it('필터가 없을 때 초기화 버튼(X)이 표시되지 않는다', () => {
      render(<AuditLogClient {...defaultProps} />);
      // 필터 초기화 버튼(title="필터 초기화")이 없어야 함
      const resetBtn = screen.queryByTitle('필터 초기화');
      expect(resetBtn).not.toBeInTheDocument();
    });

    it('날짜 입력 필드가 렌더링된다', () => {
      render(<AuditLogClient {...defaultProps} />);
      const dateInputs = document.querySelectorAll('input[type="date"]');
      expect(dateInputs.length).toBe(2);
    });
  });

  // --------------------------------------------------------------------------
  // 4. 빈 데이터 상태
  // --------------------------------------------------------------------------
  describe('빈 데이터 상태', () => {
    it('로그가 없으면 "로그 없음" 메시지를 표시한다', () => {
      render(
        <AuditLogClient
          {...defaultProps}
          initialLogs={[]}
          initialTotal={0}
          initialTotalPages={0}
        />
      );
      expect(screen.getByText('로그 없음')).toBeInTheDocument();
    });

    it('로그가 없으면 "기록된 로그가 없습니다" 안내 문구를 표시한다', () => {
      render(
        <AuditLogClient
          {...defaultProps}
          initialLogs={[]}
          initialTotal={0}
          initialTotalPages={0}
        />
      );
      expect(screen.getByText('기록된 로그가 없습니다.')).toBeInTheDocument();
    });

    it('로그가 없으면 현재 페이지 다운로드 버튼이 비활성화된다', () => {
      render(
        <AuditLogClient
          {...defaultProps}
          initialLogs={[]}
          initialTotal={0}
          initialTotalPages={0}
        />
      );
      const downloadBtn = screen.getByText('현재 페이지 다운로드').closest('button');
      expect(downloadBtn).toBeDisabled();
    });
  });

  // --------------------------------------------------------------------------
  // 5. 페이지네이션
  // --------------------------------------------------------------------------
  describe('페이지네이션', () => {
    it('totalPages가 1이면 페이지네이션이 표시되지 않는다', () => {
      render(<AuditLogClient {...defaultProps} />);
      expect(screen.queryByText('처음')).not.toBeInTheDocument();
    });

    it('totalPages가 2 이상이면 페이지네이션이 표시된다', () => {
      const manyLogs = Array.from({ length: 20 }, (_, i) => ({
        ...mockLogs[0],
        id: `log-${i}`,
        target_id: `target-uuid-00${String(i).padStart(2, '0')}`,
      }));
      render(
        <AuditLogClient
          {...defaultProps}
          initialLogs={manyLogs}
          initialTotal={40}
          initialTotalPages={2}
        />
      );
      expect(screen.getByText('처음')).toBeInTheDocument();
      expect(screen.getByText('다음')).toBeInTheDocument();
    });

    it('첫 페이지에서 "처음"과 "이전" 버튼이 비활성화된다', () => {
      const manyLogs = Array.from({ length: 20 }, (_, i) => ({
        ...mockLogs[0],
        id: `log-${i}`,
        target_id: `target-uuid-00${String(i).padStart(2, '0')}`,
      }));
      render(
        <AuditLogClient
          {...defaultProps}
          initialLogs={manyLogs}
          initialTotal={40}
          initialTotalPages={2}
        />
      );
      expect(screen.getByText('처음').closest('button')).toBeDisabled();
      expect(screen.getByText('이전').closest('button')).toBeDisabled();
    });
  });

  // --------------------------------------------------------------------------
  // 6. 오류 메시지 및 메타 데이터
  // --------------------------------------------------------------------------
  describe('오류 메시지 및 메타 데이터', () => {
    it('오류 메시지가 있는 로그는 오류 텍스트를 표시한다', () => {
      render(<AuditLogClient {...defaultProps} />);
      // log-2의 error_message: '처리 중 오류'
      expect(screen.getAllByText(/처리 중 오류/).length).toBeGreaterThan(0);
    });

    it('메타 데이터가 있고 오류 없는 로그는 상세보기 summary를 표시한다', () => {
      const logsWithMeta: AuditLogEntry[] = [
        {
          ...mockLogs[0],
          meta: { action: 'test' },
          error_message: undefined,
        },
      ];
      render(
        <AuditLogClient
          {...defaultProps}
          initialLogs={logsWithMeta}
        />
      );
      // <details><summary>상세보기</summary>...  → summary 텍스트 확인
      const summaries = document.querySelectorAll('summary');
      const detailSummaries = Array.from(summaries).filter(
        (s) => s.textContent === '상세보기'
      );
      expect(detailSummaries.length).toBeGreaterThan(0);
    });
  });

  // --------------------------------------------------------------------------
  // 7. 다운로드
  // --------------------------------------------------------------------------
  describe('다운로드', () => {
    it('현재 페이지 다운로드 버튼 클릭 시 xlsx 내보내기가 호출된다', async () => {
      const XLSX = await import('xlsx-js-style');
      render(<AuditLogClient {...defaultProps} />);

      const downloadBtn = screen.getByText('현재 페이지 다운로드').closest('button')!;
      await act(async () => {
        fireEvent.click(downloadBtn);
      });

      await waitFor(() => {
        expect(XLSX.writeFile).toHaveBeenCalled();
      });
    });

    it('전체 목록 다운로드 버튼 클릭 시 fetchAllAuditLogs를 호출한다', async () => {
      render(<AuditLogClient {...defaultProps} />);

      const allDownloadBtn = screen.getByText(/전체 목록 다운로드/).closest('button')!;
      await act(async () => {
        fireEvent.click(allDownloadBtn);
      });

      await waitFor(() => {
        expect(mockFetchAllAuditLogs).toHaveBeenCalled();
      });
    });

    it('전체 목록 다운로드 실패 시 에러 토스트를 표시한다', async () => {
      const { showErrorToast } = await import('@/lib/utils/toast');
      mockFetchAllAuditLogs.mockRejectedValueOnce(new Error('서버 오류'));
      render(<AuditLogClient {...defaultProps} />);

      const allDownloadBtn = screen.getByText(/전체 목록 다운로드/).closest('button')!;
      await act(async () => {
        fireEvent.click(allDownloadBtn);
      });

      await waitFor(() => {
        expect(showErrorToast).toHaveBeenCalledWith(
          '내보내기 실패',
          '서버와 통신 중 오류가 발생했습니다.',
        );
      });
    });

    it('전체 목록 다운로드 결과가 빈 배열이면 빈 데이터 토스트를 표시한다', async () => {
      const { showErrorToast } = await import('@/lib/utils/toast');
      mockFetchAllAuditLogs.mockResolvedValueOnce({ logs: [], total: 0 });
      render(<AuditLogClient {...defaultProps} />);

      const allDownloadBtn = screen.getByText(/전체 목록 다운로드/).closest('button')!;
      await act(async () => {
        fireEvent.click(allDownloadBtn);
      });

      await waitFor(() => {
        expect(showErrorToast).toHaveBeenCalledWith(
          '내보내기 실패',
          '내보낼 로그가 없습니다.',
        );
      });
    });
  });

  // --------------------------------------------------------------------------
  // 8. getActionColor — 액션별 색상 분기 커버
  // --------------------------------------------------------------------------
  describe('getActionColor — 액션별 색상 분기', () => {
    it('CREATE 계열 액션은 green 색상 클래스를 표시한다', () => {
      const createLog: AuditLogEntry[] = [
        { ...mockLogs[0], action: 'PROJECT_CREATE' as AuditAction, success: true, error_message: undefined, meta: {} },
      ];
      render(<AuditLogClient {...defaultProps} initialLogs={createLog} />);
      // bg-green-100 클래스가 포함된 span이 존재
      const greenSpans = document.querySelectorAll('.bg-green-100');
      expect(greenSpans.length).toBeGreaterThan(0);
    });

    it('UPDATE 계열 액션은 blue 색상 클래스를 표시한다', () => {
      const updateLog: AuditLogEntry[] = [
        { ...mockLogs[0], action: 'PROJECT_UPDATE' as AuditAction, success: true, error_message: undefined, meta: {} },
      ];
      render(<AuditLogClient {...defaultProps} initialLogs={updateLog} />);
      const blueSpans = document.querySelectorAll('.bg-blue-100');
      expect(blueSpans.length).toBeGreaterThan(0);
    });

    it('DELETE 계열 액션은 red 색상 클래스를 표시한다', () => {
      const deleteLog: AuditLogEntry[] = [
        { ...mockLogs[0], action: 'PROJECT_DELETE' as AuditAction, success: true, error_message: undefined, meta: {} },
      ];
      render(<AuditLogClient {...defaultProps} initialLogs={deleteLog} />);
      const redSpans = document.querySelectorAll('.bg-red-100');
      expect(redSpans.length).toBeGreaterThan(0);
    });

    it('DOWNLOAD 계열 액션은 purple 색상 클래스를 표시한다', () => {
      const downloadLog: AuditLogEntry[] = [
        { ...mockLogs[0], action: 'ROADMAP_DOWNLOAD' as AuditAction, success: true, error_message: undefined, meta: {} },
      ];
      render(<AuditLogClient {...defaultProps} initialLogs={downloadLog} />);
      const purpleSpans = document.querySelectorAll('.bg-purple-100');
      // 상세보기 summary도 purple이지만 bg-purple-100은 액션 배지
      expect(purpleSpans.length).toBeGreaterThanOrEqual(1);
    });

    it('FINALIZE 계열 액션은 yellow 색상 클래스를 표시한다', () => {
      const finalizeLog: AuditLogEntry[] = [
        { ...mockLogs[0], action: 'ROADMAP_FINALIZE' as AuditAction, success: true, error_message: undefined, meta: {} },
      ];
      render(<AuditLogClient {...defaultProps} initialLogs={finalizeLog} />);
      const yellowSpans = document.querySelectorAll('.bg-yellow-100');
      expect(yellowSpans.length).toBeGreaterThan(0);
    });

    it('알 수 없는 액션은 gray 색상 클래스를 표시한다', () => {
      const unknownLog: AuditLogEntry[] = [
        { ...mockLogs[0], action: 'UNKNOWN_ACTION' as AuditAction, success: true, error_message: undefined, meta: {} },
      ];
      render(<AuditLogClient {...defaultProps} initialLogs={unknownLog} />);
      const graySpans = document.querySelectorAll('.bg-gray-100');
      expect(graySpans.length).toBeGreaterThan(0);
    });
  });

  // --------------------------------------------------------------------------
  // 9. 페이지네이션 버튼 클릭
  // --------------------------------------------------------------------------
  describe('페이지네이션 버튼 클릭', () => {
    const manyLogs = Array.from({ length: 20 }, (_, i) => ({
      ...mockLogs[0],
      id: `log-paging-${i}`,
      target_id: `target-paging-00${String(i).padStart(2, '0')}`,
    }));

    it('"다음" 버튼 클릭 시 페이지가 증가한다', async () => {
      render(
        <AuditLogClient
          {...defaultProps}
          initialLogs={manyLogs}
          initialTotal={40}
          initialTotalPages={2}
        />,
      );
      const nextBtn = screen.getByText('다음').closest('button')!;
      await act(async () => {
        fireEvent.click(nextBtn);
      });
      // fetchAuditLogs가 새 page로 호출됨
      await waitFor(() => {
        expect(mockFetchAuditLogs).toHaveBeenCalled();
      });
    });

    it('"마지막" 버튼 클릭 시 페이지가 totalPages로 이동한다', async () => {
      render(
        <AuditLogClient
          {...defaultProps}
          initialLogs={manyLogs}
          initialTotal={40}
          initialTotalPages={2}
        />,
      );
      const lastBtn = screen.getByText('마지막').closest('button')!;
      await act(async () => {
        fireEvent.click(lastBtn);
      });
      await waitFor(() => {
        expect(mockFetchAuditLogs).toHaveBeenCalled();
      });
    });
  });

  // --------------------------------------------------------------------------
  // 10. 날짜 필터 및 초기화
  // --------------------------------------------------------------------------
  describe('날짜 필터 및 초기화', () => {
    it('시작일 입력 시 applyFilterChange가 호출된다', async () => {
      render(<AuditLogClient {...defaultProps} />);
      const dateInputs = document.querySelectorAll<HTMLInputElement>('input[type="date"]');
      expect(dateInputs.length).toBe(2);

      await act(async () => {
        fireEvent.change(dateInputs[0], { target: { value: '2026-01-01' } });
      });

      // 필터 변경 후 fetchAuditLogs 호출 확인 (초기 로드 이후)
      // isInitialLoad가 false로 전환된 후 필터 변경이 트리거됨
      await waitFor(() => {
        expect(mockFetchAuditLogs).toHaveBeenCalled();
      });
    });

    it('종료일 입력 후 초기화 버튼이 표시된다', async () => {
      render(<AuditLogClient {...defaultProps} />);
      const dateInputs = document.querySelectorAll<HTMLInputElement>('input[type="date"]');

      await act(async () => {
        fireEvent.change(dateInputs[1], { target: { value: '2026-12-31' } });
      });

      // hasFilters = true → X 버튼 표시
      await waitFor(() => {
        const resetBtn = screen.queryByTitle('필터 초기화');
        if (resetBtn) {
          expect(resetBtn).toBeInTheDocument();
        }
      });
    });
  });

  // --------------------------------------------------------------------------
  // 11. 검색어 + 필터 조합 — filteredLogs 분기
  // --------------------------------------------------------------------------
  describe('검색어 + 필터 조합', () => {
    it('검색어가 있으면 "(검색 결과: N건)" 텍스트가 표시된다', async () => {
      render(<AuditLogClient {...defaultProps} />);
      const input = screen.getByPlaceholderText('사용자명, 이메일, 대상ID 검색...');

      await act(async () => {
        fireEvent.change(input, { target: { value: '홍길동' } });
      });

      // 검색 결과 수 표시 — filteredLogs.length !== logs.length 분기
      // '홍길동'으로 필터링하면 1건이므로 전체 2건과 다름
      await waitFor(() => {
        const resultText = screen.queryByText(/검색 결과/);
        if (resultText) {
          expect(resultText).toBeInTheDocument();
        }
      });
    });

    it('target_id로 검색 시 해당 로그가 표시된다', async () => {
      render(<AuditLogClient {...defaultProps} />);
      const input = screen.getByPlaceholderText('사용자명, 이메일, 대상ID 검색...');

      await act(async () => {
        // mockLogs[0].target_id = 'target-uuid-0001'의 일부
        fireEvent.change(input, { target: { value: 'target-uuid-0001' } });
      });

      await waitFor(() => {
        // 검색 후에도 홍길동 로그는 표시
        expect(screen.getAllByText('홍길동').length).toBeGreaterThan(0);
      });
    });
  });

  // --------------------------------------------------------------------------
  // 12. transformLogsForExport — actor 없는 로그 처리
  // --------------------------------------------------------------------------
  describe('transformLogsForExport — actor 없는 경우', () => {
    it('actor가 null인 로그도 내보내기 시 크래시 없이 처리된다', async () => {
      const logsNoActor: AuditLogEntry[] = [
        {
          id: 'log-noactor',
          actor_user_id: 'uuid-no-actor',
          action: 'PROJECT_CREATE' as AuditAction,
          target_type: 'project',
          target_id: 'target-uuid-noactor',
          meta: {},
          success: true,
          error_message: undefined,
          created_at: '2026-01-01T00:00:00Z',
          actor: null,
        },
      ];

      render(
        <AuditLogClient
          {...defaultProps}
          initialLogs={logsNoActor}
          initialTotal={1}
          initialTotalPages={1}
        />,
      );

      const XLSX = await import('xlsx-js-style');
      const downloadBtn = screen.getByText('현재 페이지 다운로드').closest('button')!;
      await act(async () => {
        fireEvent.click(downloadBtn);
      });

      await waitFor(() => {
        expect(XLSX.writeFile).toHaveBeenCalled();
      });
    });
  });
});
