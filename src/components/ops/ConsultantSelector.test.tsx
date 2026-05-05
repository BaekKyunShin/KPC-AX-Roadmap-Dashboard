import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import ConsultantSelector from './ConsultantSelector';
import type { ConsultantCandidate } from '@/app/(dashboard)/ops/projects/actions';

// ============================================================================
// 모킹
// ============================================================================

vi.mock('@/app/(dashboard)/ops/projects/actions', () => ({
  fetchConsultantCandidates: vi.fn(),
  fetchConsultantFilterOptions: vi.fn(),
}));

vi.mock('./assignment', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./assignment')>();
  return {
    ...actual,
    getLevelLabel: (level: string) => level,
    CheckIcon: ({ className }: { className?: string }) => (
      <svg data-testid="check-icon" className={className} />
    ),
    SpinnerIcon: ({ className }: { className?: string }) => (
      <svg data-testid="spinner-icon" className={className} />
    ),
  };
});

// ============================================================================
// 테스트 데이터 팩토리
// ============================================================================

function makeConsultantCandidate(
  overrides: Partial<ConsultantCandidate> = {},
): ConsultantCandidate {
  return {
    id: 'consultant-1',
    name: '김컨설턴트',
    email: 'kim@test.com',
    consultant_profile: {
      available_industries: ['제조업', 'IT'],
      expertise_domains: ['AI/ML', '데이터 분석'],
      teaching_levels: ['BEGINNER', 'INTERMEDIATE'],
      skill_tags: [],
      years_of_experience: 5,
    },
    ...overrides,
  };
}

function makeCandidateListResult(
  consultants: ConsultantCandidate[],
  overrides: { total?: number; totalPages?: number; page?: number } = {},
) {
  return {
    consultants,
    total: overrides.total ?? consultants.length,
    totalPages: overrides.totalPages ?? 1,
    page: overrides.page ?? 1,
  };
}

// ============================================================================
// 공통 모킹 임포트
// ============================================================================

import {
  fetchConsultantCandidates,
  fetchConsultantFilterOptions,
} from '@/app/(dashboard)/ops/projects/actions';

const mockFetchCandidates = vi.mocked(fetchConsultantCandidates);
const mockFetchFilterOptions = vi.mocked(fetchConsultantFilterOptions);

// ============================================================================
// 헬퍼
// ============================================================================

function renderSelector(
  props: Partial<React.ComponentProps<typeof ConsultantSelector>> = {},
) {
  const defaultProps: React.ComponentProps<typeof ConsultantSelector> = {
    selectedConsultantId: null,
    onSelect: vi.fn(),
    ...props,
  };
  return render(<ConsultantSelector {...defaultProps} />);
}

/** 로딩 완료까지 기다리는 헬퍼 */
async function waitForLoaded() {
  await waitFor(() =>
    expect(screen.queryByText('로딩 중...')).not.toBeInTheDocument(),
  );
}

// ============================================================================
// 테스트
// ============================================================================

describe('ConsultantSelector', () => {
  beforeEach(() => {
    mockFetchFilterOptions.mockResolvedValue({ industries: [], skills: [] });
    mockFetchCandidates.mockResolvedValue(
      makeCandidateListResult([makeConsultantCandidate()]),
    );
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  // --------------------------------------------------------------------------
  // 초기 로딩 상태
  // --------------------------------------------------------------------------

  describe('초기 로딩 상태', () => {
    it('컴포넌트 마운트 직후 행 형태 스켈레톤 4개 이상이 표시된다', () => {
      const { container } = renderSelector();
      const skeletonRows = container.querySelectorAll(
        '[data-testid="consultant-loading-row"]',
      );
      expect(skeletonRows.length).toBeGreaterThanOrEqual(4);
      // sr-only "로딩 중..." 은 스크린리더용으로 유지 (시각적으로는 안 보임)
      expect(screen.getByText('로딩 중...')).toBeInTheDocument();
    });

    it('로딩 완료 후 스켈레톤 행이 사라진다', async () => {
      const { container } = renderSelector();
      await waitForLoaded();
      const skeletonRows = container.querySelectorAll(
        '[data-testid="consultant-loading-row"]',
      );
      expect(skeletonRows.length).toBe(0);
    });
  });

  // --------------------------------------------------------------------------
  // 컨설턴트 목록 렌더링
  // --------------------------------------------------------------------------

  describe('컨설턴트 목록 렌더링', () => {
    it('로딩 완료 후 컨설턴트 이름이 표시된다', async () => {
      renderSelector();
      await waitForLoaded();
      expect(screen.getByText('김컨설턴트')).toBeInTheDocument();
    });

    it('컨설턴트 이메일이 표시된다', async () => {
      renderSelector();
      await waitForLoaded();
      expect(screen.getByText('kim@test.com')).toBeInTheDocument();
    });

    it('총 컨설턴트 수가 표시된다', async () => {
      renderSelector();
      await waitForLoaded();
      expect(screen.getByText('총 1명의 컨설턴트')).toBeInTheDocument();
    });

    it('여러 컨설턴트가 모두 렌더링된다', async () => {
      mockFetchCandidates.mockResolvedValue(
        makeCandidateListResult(
          [
            makeConsultantCandidate({ id: 'c1', name: '김컨설턴트' }),
            makeConsultantCandidate({ id: 'c2', name: '이컨설턴트', email: 'lee@test.com' }),
          ],
          { total: 2 },
        ),
      );
      renderSelector();
      await waitForLoaded();
      expect(screen.getByText('김컨설턴트')).toBeInTheDocument();
      expect(screen.getByText('이컨설턴트')).toBeInTheDocument();
    });

    it('컨설턴트 프로필의 업종 태그가 표시된다', async () => {
      renderSelector();
      await waitForLoaded();
      expect(screen.getByText('제조업')).toBeInTheDocument();
    });

    it('경력 연수가 표시된다', async () => {
      renderSelector();
      await waitForLoaded();
      expect(screen.getByText('경력 5년')).toBeInTheDocument();
    });
  });

  // --------------------------------------------------------------------------
  // 선택/해제 토글
  // --------------------------------------------------------------------------

  describe('선택/해제 토글', () => {
    it('컨설턴트 클릭 시 onSelect 콜백이 호출된다', async () => {
      const onSelect = vi.fn();
      renderSelector({ onSelect });
      await waitForLoaded();

      const item = screen.getByText('김컨설턴트').closest('[class*="cursor-pointer"]')!;
      fireEvent.click(item);

      expect(onSelect).toHaveBeenCalledTimes(1);
      expect(onSelect).toHaveBeenCalledWith(expect.objectContaining({ id: 'consultant-1' }));
    });

    it('이미 선택된 컨설턴트를 클릭하면 onSelect(null)이 호출된다', async () => {
      const onSelect = vi.fn();
      renderSelector({ selectedConsultantId: 'consultant-1', onSelect });
      await waitForLoaded();

      const item = screen.getByText('김컨설턴트').closest('[class*="cursor-pointer"]')!;
      fireEvent.click(item);

      expect(onSelect).toHaveBeenCalledWith(null);
    });

    it('선택된 컨설턴트에는 "선택됨" 배지가 표시된다', async () => {
      renderSelector({ selectedConsultantId: 'consultant-1' });
      await waitForLoaded();
      expect(screen.getByText('선택됨')).toBeInTheDocument();
    });

    it('선택된 컨설턴트에는 체크 아이콘이 표시된다', async () => {
      renderSelector({ selectedConsultantId: 'consultant-1' });
      await waitForLoaded();
      expect(screen.getByTestId('check-icon')).toBeInTheDocument();
    });

    it('선택된 컨설턴트 수 정보가 표시된다', async () => {
      renderSelector({ selectedConsultantId: 'consultant-1' });
      await waitForLoaded();
      expect(screen.getByText('1명 선택됨')).toBeInTheDocument();
    });
  });

  // --------------------------------------------------------------------------
  // 검색 입력 (디바운싱)
  // --------------------------------------------------------------------------

  describe('검색 입력', () => {
    it('검색 입력 후 300ms 경과 시 fetchConsultantCandidates가 재호출된다', async () => {
      renderSelector();
      await waitForLoaded();
      const initialCallCount = mockFetchCandidates.mock.calls.length;

      const input = screen.getByPlaceholderText('컨설턴트 이름 또는 이메일 검색...');
      fireEvent.change(input, { target: { value: '홍' } });

      // 디바운스 300ms 경과 후 재호출 확인
      await waitFor(
        () =>
          expect(mockFetchCandidates.mock.calls.length).toBeGreaterThan(initialCallCount),
        { timeout: 1000 },
      );
    }, 10000);

    it('검색어가 있으면 fetchConsultantCandidates에 search 파라미터가 전달된다', async () => {
      renderSelector();
      await waitForLoaded();

      const input = screen.getByPlaceholderText('컨설턴트 이름 또는 이메일 검색...');
      fireEvent.change(input, { target: { value: '홍길동' } });

      await waitFor(
        () => {
          const lastCall = mockFetchCandidates.mock.calls.at(-1)?.[0];
          expect(lastCall?.search).toBe('홍길동');
        },
        { timeout: 1000 },
      );
    }, 10000);
  });

  // --------------------------------------------------------------------------
  // 빈 상태
  // --------------------------------------------------------------------------

  describe('빈 상태', () => {
    it('검색 결과가 없으면 "검색 조건에 맞는 컨설턴트가 없습니다." 메시지를 표시한다', async () => {
      mockFetchCandidates.mockResolvedValue(makeCandidateListResult([]));
      renderSelector();
      await waitForLoaded();

      const input = screen.getByPlaceholderText('컨설턴트 이름 또는 이메일 검색...');
      fireEvent.change(input, { target: { value: '존재하지않는이름' } });

      await waitFor(
        () =>
          expect(
            screen.getByText('검색 조건에 맞는 컨설턴트가 없습니다.'),
          ).toBeInTheDocument(),
        { timeout: 1000 },
      );
    }, 10000);

    it('필터 없이 목록이 비어있으면 "등록된 컨설턴트가 없습니다." 메시지를 표시한다', async () => {
      mockFetchCandidates.mockResolvedValue(makeCandidateListResult([]));
      renderSelector();
      await waitForLoaded();
      expect(screen.getByText('등록된 컨설턴트가 없습니다.')).toBeInTheDocument();
    });
  });

  // --------------------------------------------------------------------------
  // 에러 상태
  // --------------------------------------------------------------------------

  describe('에러 상태', () => {
    it('fetchConsultantCandidates 실패 시 빈 목록으로 폴백한다', async () => {
      // console.error 억제
      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
      mockFetchCandidates.mockRejectedValue(new Error('네트워크 오류'));
      renderSelector();
      await waitForLoaded();
      // 에러 후 isLoading=false, consultants=[] 상태
      expect(screen.getByText('등록된 컨설턴트가 없습니다.')).toBeInTheDocument();
      consoleError.mockRestore();
    });
  });

  // --------------------------------------------------------------------------
  // 페이지네이션
  // --------------------------------------------------------------------------

  describe('페이지네이션', () => {
    it('totalPages가 1이면 페이지네이션이 표시되지 않는다', async () => {
      renderSelector();
      await waitForLoaded();
      expect(screen.queryByRole('button', { name: '이전' })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: '다음' })).not.toBeInTheDocument();
    });

    it('totalPages가 2 이상이면 이전/다음 버튼이 표시된다', async () => {
      mockFetchCandidates.mockResolvedValue(
        makeCandidateListResult([makeConsultantCandidate()], { total: 15, totalPages: 2 }),
      );
      renderSelector();
      await waitForLoaded();
      expect(screen.getByRole('button', { name: '이전' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: '다음' })).toBeInTheDocument();
    });

    it('첫 페이지에서 "이전" 버튼은 비활성화된다', async () => {
      mockFetchCandidates.mockResolvedValue(
        makeCandidateListResult([makeConsultantCandidate()], { total: 15, totalPages: 2 }),
      );
      renderSelector();
      await waitForLoaded();
      expect(screen.getByRole('button', { name: '이전' })).toBeDisabled();
    });

    it('"다음" 버튼 클릭 시 page가 2로 증가하여 재호출된다', async () => {
      mockFetchCandidates.mockResolvedValue(
        makeCandidateListResult([makeConsultantCandidate()], { total: 15, totalPages: 2 }),
      );
      renderSelector();
      await waitForLoaded();

      const nextBtn = screen.getByRole('button', { name: '다음' });
      fireEvent.click(nextBtn);

      await waitFor(() => {
        const lastCall = mockFetchCandidates.mock.calls.at(-1)?.[0];
        expect(lastCall?.page).toBe(2);
      });
    });

    it('현재 페이지와 전체 페이지 수를 표시한다', async () => {
      mockFetchCandidates.mockResolvedValue(
        makeCandidateListResult([makeConsultantCandidate()], { total: 15, totalPages: 3 }),
      );
      renderSelector();
      await waitForLoaded();
      expect(screen.getByText('1 / 3')).toBeInTheDocument();
    });
  });

  // --------------------------------------------------------------------------
  // 필터 패널
  // --------------------------------------------------------------------------

  describe('필터 패널', () => {
    it('초기에는 필터 패널이 숨겨져 있다', async () => {
      mockFetchFilterOptions.mockResolvedValue({
        industries: ['제조업', 'IT'],
        skills: ['Python'],
      });
      renderSelector();
      await waitForLoaded();
      expect(screen.queryByText('필터 옵션')).not.toBeInTheDocument();
    });

    it('"필터" 버튼 클릭 시 필터 패널이 표시된다', async () => {
      mockFetchFilterOptions.mockResolvedValue({
        industries: ['제조업', 'IT'],
        skills: ['Python'],
      });
      renderSelector();
      await waitForLoaded();

      const filterBtn = screen.getByRole('button', { name: /필터/ });
      fireEvent.click(filterBtn);

      expect(screen.getByText('필터 옵션')).toBeInTheDocument();
    });
  });
});
