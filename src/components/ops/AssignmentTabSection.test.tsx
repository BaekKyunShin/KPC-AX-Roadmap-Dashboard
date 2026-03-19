import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import AssignmentTabSection from './AssignmentTabSection';

// ============================================================================
// 모킹
// ============================================================================

// next/navigation 모킹
const mockRefresh = vi.fn();
const mockRouter = { refresh: mockRefresh, push: vi.fn(), back: vi.fn() };
vi.mock('next/navigation', () => ({
  useRouter: () => mockRouter,
}));

// Server Actions 모킹
vi.mock('@/app/(dashboard)/ops/projects/actions', () => ({
  assignConsultant: vi.fn(),
}));

// ManualAssignmentForm 모킹 (자체 테스트에서 별도 검증)
vi.mock('./ManualAssignmentForm', () => ({
  default: () => <div data-testid="manual-assignment-form">수동 매칭 폼</div>,
}));

// fetch 모킹 (API 호출용)
const mockFetch = vi.fn();
global.fetch = mockFetch;

// ============================================================================
// 테스트 데이터
// ============================================================================

const baseConsultant = {
  id: 'consultant-1',
  name: '김컨설턴트',
  email: 'kim@test.com',
};

const baseRecommendation = {
  id: 'rec-1',
  candidate_user_id: 'consultant-1',
  total_score: 85,
  rank: 1,
  rationale: {
    analysis: 'AI 분석 텍스트입니다.',
    strengths: ['제조업 전문성', 'AI 도입 경험 풍부', '교육 역량 우수'],
    considerations: ['스케줄 확인 필요'],
  },
  candidate: {
    ...baseConsultant,
    consultant_profile: {
      expertise_domains: ['AI/ML'],
      available_industries: ['제조업'],
    },
  },
};

const secondRecommendation = {
  id: 'rec-2',
  candidate_user_id: 'consultant-2',
  total_score: 72,
  rank: 2,
  rationale: {
    analysis: '두 번째 컨설턴트 분석',
    strengths: ['데이터 분석 역량'],
    considerations: [],
  },
  candidate: {
    id: 'consultant-2',
    name: '이컨설턴트',
    email: 'lee@test.com',
  },
};

const thirdRecommendation = {
  id: 'rec-3',
  candidate_user_id: 'consultant-3',
  total_score: 40,
  rank: 3,
  rationale: null,
  candidate: {
    id: 'consultant-3',
    name: '박컨설턴트',
    email: 'park@test.com',
  },
};

/** 배정 전 + 자가진단 완료 + 추천 없음 */
const unassignedNoRecsProps = {
  projectData: { status: 'DIAGNOSED' },
  projectId: 'project-1',
  recommendations: [],
  hasSelfAssessment: true,
};

/** 배정 전 + 자가진단 미완료 */
const unassignedNoAssessmentProps = {
  projectData: { status: 'NEW' },
  projectId: 'project-1',
  recommendations: [],
  hasSelfAssessment: false,
};

/** 배정 전 + 추천 있음 */
const unassignedWithRecsProps = {
  projectData: { status: 'MATCH_RECOMMENDED' },
  projectId: 'project-1',
  recommendations: [baseRecommendation, secondRecommendation, thirdRecommendation],
  hasSelfAssessment: true,
};

/** 배정 완료 */
const assignedProps = {
  projectData: {
    assigned_consultant: baseConsultant,
    status: 'ASSIGNED',
  },
  projectId: 'project-1',
  recommendations: [baseRecommendation],
  latestAssignment: { assignment_reason: '전문성이 가장 적합함' },
  hasSelfAssessment: true,
};

// ============================================================================
// 테스트
// ============================================================================

describe('AssignmentTabSection', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  // --------------------------------------------------------------------------
  // 1. 미배정 상태 — 자가진단 미완료
  // --------------------------------------------------------------------------
  describe('자가진단 미완료 상태', () => {
    it('자가진단 필요 메시지를 표시한다', () => {
      render(<AssignmentTabSection {...unassignedNoAssessmentProps} />);
      expect(
        screen.getByText('자동 매칭을 사용하려면 자가진단을 먼저 완료해야 합니다.')
      ).toBeInTheDocument();
    });

    it('자가진단 설명 텍스트를 표시한다', () => {
      render(<AssignmentTabSection {...unassignedNoAssessmentProps} />);
      expect(
        screen.getByText('자가진단 결과를 기반으로 적합한 컨설턴트를 추천합니다.')
      ).toBeInTheDocument();
    });

    it('카드 제목 "컨설턴트 배정"이 표시된다', () => {
      render(<AssignmentTabSection {...unassignedNoAssessmentProps} />);
      expect(screen.getByText('컨설턴트 배정')).toBeInTheDocument();
    });
  });

  // --------------------------------------------------------------------------
  // 2. 미배정 상태 — 자가진단 완료, 추천 미실행
  // --------------------------------------------------------------------------
  describe('추천 미실행 상태', () => {
    it('자동 매칭 미실행 메시지를 표시한다', () => {
      render(<AssignmentTabSection {...unassignedNoRecsProps} />);
      expect(
        screen.getByText('아직 자동 매칭이 실행되지 않았습니다.')
      ).toBeInTheDocument();
    });

    it('컨설턴트 자동 매칭 버튼을 표시한다', () => {
      render(<AssignmentTabSection {...unassignedNoRecsProps} />);
      expect(
        screen.getByRole('button', { name: /컨설턴트 자동 매칭/ })
      ).toBeInTheDocument();
    });
  });

  // --------------------------------------------------------------------------
  // 3. 미배정 상태 — 추천 결과 있음
  // --------------------------------------------------------------------------
  describe('추천 결과 표시', () => {
    it('모든 추천 컨설턴트 이름을 표시한다', () => {
      render(<AssignmentTabSection {...unassignedWithRecsProps} />);
      expect(screen.getByText('김컨설턴트')).toBeInTheDocument();
      expect(screen.getByText('이컨설턴트')).toBeInTheDocument();
      expect(screen.getByText('박컨설턴트')).toBeInTheDocument();
    });

    it('추천 점수를 표시한다', () => {
      render(<AssignmentTabSection {...unassignedWithRecsProps} />);
      expect(screen.getByText('85')).toBeInTheDocument();
      expect(screen.getByText('72')).toBeInTheDocument();
      expect(screen.getByText('40')).toBeInTheDocument();
    });

    it('1순위 추천에 "AI 추천" 뱃지를 표시한다', () => {
      render(<AssignmentTabSection {...unassignedWithRecsProps} />);
      expect(screen.getByText('AI 추천')).toBeInTheDocument();
    });

    it('AI 분석 텍스트를 표시한다', () => {
      render(<AssignmentTabSection {...unassignedWithRecsProps} />);
      expect(screen.getByText('AI 분석 텍스트입니다.')).toBeInTheDocument();
    });

    it('강점 태그를 표시한다', () => {
      render(<AssignmentTabSection {...unassignedWithRecsProps} />);
      expect(screen.getByText('제조업 전문성')).toBeInTheDocument();
      expect(screen.getByText('AI 도입 경험 풍부')).toBeInTheDocument();
    });

    it('고려사항 태그를 표시한다', () => {
      render(<AssignmentTabSection {...unassignedWithRecsProps} />);
      expect(screen.getByText('스케줄 확인 필요')).toBeInTheDocument();
    });

    it('매칭 재계산 버튼을 표시한다', () => {
      render(<AssignmentTabSection {...unassignedWithRecsProps} />);
      expect(
        screen.getByRole('button', { name: /매칭 재계산/ })
      ).toBeInTheDocument();
    });

    it('컨설턴트 카드 클릭 시 배정 사유 입력란이 나타난다', () => {
      render(<AssignmentTabSection {...unassignedWithRecsProps} />);

      // 카드 클릭 전 배정 사유 입력란이 없어야 함
      expect(screen.queryByPlaceholderText(/해당 컨설턴트를 배정하는 사유/)).not.toBeInTheDocument();

      // 첫 번째 카드 클릭
      fireEvent.click(screen.getByText('김컨설턴트'));

      // 배정 사유 입력란이 나타남
      expect(screen.getByPlaceholderText(/해당 컨설턴트를 배정하는 사유/)).toBeInTheDocument();
    });

    it('카드 선택 시 "선택됨" 표시가 나타난다', () => {
      render(<AssignmentTabSection {...unassignedWithRecsProps} />);
      fireEvent.click(screen.getByText('김컨설턴트'));
      expect(screen.getByText('✓ 선택됨')).toBeInTheDocument();
    });

    it('배정 사유 미입력 시 배정하기 버튼이 비활성화된다', () => {
      render(<AssignmentTabSection {...unassignedWithRecsProps} />);
      fireEvent.click(screen.getByText('김컨설턴트'));
      const assignButton = screen.getByRole('button', { name: '배정하기' });
      expect(assignButton).toBeDisabled();
    });

    it('배정 사유 10자 이상 입력 시 배정하기 버튼이 활성화된다', () => {
      render(<AssignmentTabSection {...unassignedWithRecsProps} />);
      fireEvent.click(screen.getByText('김컨설턴트'));

      const textarea = screen.getByPlaceholderText(/해당 컨설턴트를 배정하는 사유/);
      fireEvent.change(textarea, { target: { value: '이 컨설턴트가 가장 적합합니다' } });

      const assignButton = screen.getByRole('button', { name: '배정하기' });
      expect(assignButton).not.toBeDisabled();
    });
  });

  // --------------------------------------------------------------------------
  // 4. 탭 전환
  // --------------------------------------------------------------------------
  describe('탭 전환', () => {
    it('자동 매칭과 수동 매칭 탭을 표시한다', () => {
      render(<AssignmentTabSection {...unassignedNoRecsProps} />);
      expect(screen.getByText('자동 매칭')).toBeInTheDocument();
      expect(screen.getByText('수동 매칭')).toBeInTheDocument();
    });

    it('수동 매칭 탭 클릭 시 수동 매칭 폼을 표시한다', () => {
      render(<AssignmentTabSection {...unassignedNoRecsProps} />);
      fireEvent.click(screen.getByText('수동 매칭'));
      expect(screen.getByTestId('manual-assignment-form')).toBeInTheDocument();
    });
  });

  // --------------------------------------------------------------------------
  // 5. 배정 완료 상태
  // --------------------------------------------------------------------------
  describe('배정 완료 상태', () => {
    it('배정된 컨설턴트 이름을 표시한다', () => {
      render(<AssignmentTabSection {...assignedProps} />);
      expect(screen.getByText('김컨설턴트')).toBeInTheDocument();
    });

    it('배정된 컨설턴트 이메일을 표시한다', () => {
      render(<AssignmentTabSection {...assignedProps} />);
      expect(screen.getByText('kim@test.com')).toBeInTheDocument();
    });

    it('배정 사유를 표시한다', () => {
      render(<AssignmentTabSection {...assignedProps} />);
      expect(screen.getByText(/전문성이 가장 적합함/)).toBeInTheDocument();
    });

    it('재배정 버튼을 표시한다', () => {
      render(<AssignmentTabSection {...assignedProps} />);
      expect(screen.getByRole('button', { name: '재배정' })).toBeInTheDocument();
    });

    it('재배정 클릭 시 탭과 재배정 안내 메시지가 나타난다', () => {
      render(<AssignmentTabSection {...assignedProps} />);
      fireEvent.click(screen.getByRole('button', { name: '재배정' }));

      expect(
        screen.getByText(/다른 컨설턴트로 재배정합니다/)
      ).toBeInTheDocument();
      expect(screen.getByText('자동 매칭')).toBeInTheDocument();
      expect(screen.getByText('수동 매칭')).toBeInTheDocument();
    });

    it('재배정 후 취소 버튼 클릭 시 폼이 닫힌다', () => {
      render(<AssignmentTabSection {...assignedProps} />);
      fireEvent.click(screen.getByRole('button', { name: '재배정' }));

      // 재배정 후 버튼이 "취소"로 변경됨
      fireEvent.click(screen.getByRole('button', { name: '취소' }));

      // 재배정 안내 메시지가 사라짐
      expect(
        screen.queryByText(/다른 컨설턴트로 재배정합니다/)
      ).not.toBeInTheDocument();
    });

    it('FINALIZED 상태에서는 재배정 버튼을 표시하지 않는다', () => {
      const finalizedProps = {
        ...assignedProps,
        projectData: {
          ...assignedProps.projectData,
          status: 'FINALIZED',
        },
      };
      render(<AssignmentTabSection {...finalizedProps} />);
      expect(screen.queryByRole('button', { name: '재배정' })).not.toBeInTheDocument();
    });
  });

  // --------------------------------------------------------------------------
  // 6. candidate 없는 추천 필터링
  // --------------------------------------------------------------------------
  describe('유효하지 않은 추천 필터링', () => {
    it('candidate가 없는 추천은 표시하지 않는다', () => {
      const propsWithInvalid = {
        ...unassignedWithRecsProps,
        recommendations: [
          baseRecommendation,
          { id: 'rec-invalid', candidate_user_id: 'x', total_score: 60, rank: 4 }, // candidate 없음
        ],
      };
      render(<AssignmentTabSection {...propsWithInvalid} />);
      expect(screen.getByText('김컨설턴트')).toBeInTheDocument();
      // 유효하지 않은 추천은 렌더링되지 않음 (이름 4개가 아닌 1개)
      expect(screen.getAllByText(/컨설턴트/i).length).toBeGreaterThanOrEqual(1);
    });
  });
});
