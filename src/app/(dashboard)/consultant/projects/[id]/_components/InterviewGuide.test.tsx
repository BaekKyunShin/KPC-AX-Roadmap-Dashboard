import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';

// =============================================================================
// 모킹 (최상단)
// =============================================================================

const mockGenerateInterviewGuide = vi.fn();
vi.mock('../actions', () => ({
  generateInterviewGuide: (...args: unknown[]) => mockGenerateInterviewGuide(...args),
}));

vi.mock('@/lib/utils/toast', () => ({
  showSuccessToast: vi.fn(),
  showErrorToast: vi.fn(),
}));

vi.mock('@/lib/constants/toast-messages', () => ({
  TOAST_ERROR: { NETWORK: '네트워크 오류' },
}));

vi.mock('./InterviewGuideEmpty', () => ({
  InterviewGuideEmpty: ({
    hasSelfAssessment,
    onGenerate,
  }: {
    hasSelfAssessment: boolean;
    onGenerate: () => void;
  }) => (
    <div data-testid="interview-guide-empty">
      <span data-testid="has-self-assessment">{String(hasSelfAssessment)}</span>
      <button onClick={onGenerate}>분석 시작</button>
    </div>
  ),
}));

vi.mock('./GuideKeyPoints', () => ({
  GuideKeyPoints: () => <div data-testid="guide-key-points">핵심 포인트</div>,
}));

vi.mock('./GuideQuestions', () => ({
  GuideQuestions: ({
    onQuestionsChange,
  }: {
    projectId: string;
    questions: unknown[];
    onQuestionsChange: (q: unknown[]) => void;
  }) => (
    <div data-testid="guide-questions">
      <button onClick={() => onQuestionsChange([])}>질문 변경</button>
    </div>
  ),
}));

vi.mock('./GuideCautions', () => ({
  GuideCautions: () => <div data-testid="guide-cautions">주의사항</div>,
}));

vi.mock('./AnalysisProgress', () => ({
  AnalysisProgress: () => <div data-testid="analysis-progress">분석 중...</div>,
}));

// =============================================================================
// Import
// =============================================================================

import { InterviewGuide } from './InterviewGuide';
import type { GuideData } from '@/lib/schemas/interview-guide';

// =============================================================================
// 테스트 데이터
// =============================================================================

const sampleGuideData: GuideData = {
  company_summary: '이 기업은 제조업 분야의 중소기업입니다.',
  key_points: [
    { dimension: '데이터', score_percent: 30, status: 'warning', insight: '데이터 수집 미흡' },
  ],
  questions: [
    { id: 'q-1', dimension: '데이터', question: '데이터 체계가 있나요?', intent: '현황 파악', checked: true, is_custom: false },
  ],
  cautions: ['개인정보 주의'],
};

// =============================================================================
// 테스트
// =============================================================================

describe('InterviewGuide', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(window, 'confirm').mockReturnValue(true);
  });

  describe('가이드 미생성 상태 (guideData=null)', () => {
    it('InterviewGuideEmpty 컴포넌트를 렌더링한다', () => {
      render(
        <InterviewGuide
          projectId="proj-1"
          hasSelfAssessment={true}
          guideData={null}
          guideCreatedAt={null}
        />,
      );
      expect(screen.getByTestId('interview-guide-empty')).toBeInTheDocument();
    });

    it('hasSelfAssessment props를 InterviewGuideEmpty에 전달한다', () => {
      render(
        <InterviewGuide
          projectId="proj-1"
          hasSelfAssessment={false}
          guideData={null}
          guideCreatedAt={null}
        />,
      );
      expect(screen.getByTestId('has-self-assessment').textContent).toBe('false');
    });

    it('분석 시작 버튼 클릭 시 generateInterviewGuide가 호출된다', async () => {
      mockGenerateInterviewGuide.mockResolvedValue({ success: true, data: sampleGuideData });
      const user = userEvent.setup();

      render(
        <InterviewGuide
          projectId="proj-1"
          hasSelfAssessment={true}
          guideData={null}
          guideCreatedAt={null}
        />,
      );

      await user.click(screen.getByText('분석 시작'));

      await waitFor(() => {
        expect(mockGenerateInterviewGuide).toHaveBeenCalledWith('proj-1');
      });
    });

    it('생성 중에 AnalysisProgress를 표시한다', async () => {
      // 프로미스를 보류 상태로 유지
      let resolveGenerate!: (v: unknown) => void;
      mockGenerateInterviewGuide.mockReturnValue(
        new Promise((resolve) => {
          resolveGenerate = resolve;
        }),
      );

      const user = userEvent.setup();
      render(
        <InterviewGuide
          projectId="proj-1"
          hasSelfAssessment={true}
          guideData={null}
          guideCreatedAt={null}
        />,
      );

      await user.click(screen.getByText('분석 시작'));

      expect(screen.getByTestId('analysis-progress')).toBeInTheDocument();

      // 정리
      resolveGenerate({ success: false, error: '취소됨' });
    });
  });

  describe('가이드 생성된 상태', () => {
    it('기업 현황 요약이 표시된다', () => {
      render(
        <InterviewGuide
          projectId="proj-1"
          hasSelfAssessment={true}
          guideData={sampleGuideData}
          guideCreatedAt={null}
        />,
      );
      expect(screen.getByText('이 기업은 제조업 분야의 중소기업입니다.')).toBeInTheDocument();
    });

    it('"인터뷰 사전 분석" 제목이 표시된다', () => {
      render(
        <InterviewGuide
          projectId="proj-1"
          hasSelfAssessment={true}
          guideData={sampleGuideData}
          guideCreatedAt={null}
        />,
      );
      expect(screen.getByText('인터뷰 사전 분석')).toBeInTheDocument();
    });

    it('GuideKeyPoints 컴포넌트가 렌더링된다', () => {
      render(
        <InterviewGuide
          projectId="proj-1"
          hasSelfAssessment={true}
          guideData={sampleGuideData}
          guideCreatedAt={null}
        />,
      );
      expect(screen.getByTestId('guide-key-points')).toBeInTheDocument();
    });

    it('GuideQuestions 컴포넌트가 렌더링된다', () => {
      render(
        <InterviewGuide
          projectId="proj-1"
          hasSelfAssessment={true}
          guideData={sampleGuideData}
          guideCreatedAt={null}
        />,
      );
      expect(screen.getByTestId('guide-questions')).toBeInTheDocument();
    });

    it('GuideCautions 컴포넌트가 렌더링된다', () => {
      render(
        <InterviewGuide
          projectId="proj-1"
          hasSelfAssessment={true}
          guideData={sampleGuideData}
          guideCreatedAt={null}
        />,
      );
      expect(screen.getByTestId('guide-cautions')).toBeInTheDocument();
    });

    it('guideCreatedAt이 있을 때 생성 날짜를 표시한다', () => {
      const { container } = render(
        <InterviewGuide
          projectId="proj-1"
          hasSelfAssessment={true}
          guideData={sampleGuideData}
          guideCreatedAt="2026-03-21T10:00:00Z"
        />,
      );
      // "2026. 3. 21. 생성" 형태의 날짜 span
      const dateSpan = container.querySelector('span.text-xs.text-gray-400');
      expect(dateSpan).toBeInTheDocument();
      expect(dateSpan?.textContent).toMatch(/생성/);
    });

    it('추천 질문 개수가 표시된다', () => {
      render(
        <InterviewGuide
          projectId="proj-1"
          hasSelfAssessment={true}
          guideData={sampleGuideData}
          guideCreatedAt={null}
        />,
      );
      expect(screen.getByText('추천 질문 (1개)')).toBeInTheDocument();
    });
  });

  describe('분석 재생성', () => {
    it('"분석 재생성" 버튼이 표시된다', () => {
      render(
        <InterviewGuide
          projectId="proj-1"
          hasSelfAssessment={true}
          guideData={sampleGuideData}
          guideCreatedAt={null}
        />,
      );
      expect(screen.getByText('분석 재생성')).toBeInTheDocument();
    });

    it('"분석 재생성" 클릭 후 confirm 확인 시 generateInterviewGuide가 호출된다', async () => {
      mockGenerateInterviewGuide.mockResolvedValue({ success: true, data: sampleGuideData });
      const user = userEvent.setup();

      render(
        <InterviewGuide
          projectId="proj-1"
          hasSelfAssessment={true}
          guideData={sampleGuideData}
          guideCreatedAt={null}
        />,
      );

      await user.click(screen.getByText('분석 재생성'));

      await waitFor(() => {
        expect(mockGenerateInterviewGuide).toHaveBeenCalledWith('proj-1');
      });
    });

    it('"분석 재생성" 클릭 후 confirm 취소 시 generateInterviewGuide가 호출되지 않는다', async () => {
      vi.spyOn(window, 'confirm').mockReturnValue(false);
      const user = userEvent.setup();

      render(
        <InterviewGuide
          projectId="proj-1"
          hasSelfAssessment={true}
          guideData={sampleGuideData}
          guideCreatedAt={null}
        />,
      );

      await user.click(screen.getByText('분석 재생성'));

      expect(mockGenerateInterviewGuide).not.toHaveBeenCalled();
    });
  });

  describe('PDF 내보내기', () => {
    it('"PDF" 버튼이 표시된다', () => {
      render(
        <InterviewGuide
          projectId="proj-1"
          hasSelfAssessment={true}
          guideData={sampleGuideData}
          guideCreatedAt={null}
        />,
      );
      expect(screen.getByText('PDF')).toBeInTheDocument();
    });
  });
});
