import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect } from 'vitest';
import { vi } from 'vitest';

// ─── Mocks ───────────────────────────────────────────────────────────────────
// 탭 본문 5종은 각각 자체 테스트가 있으므로 여기서는 "어느 탭이 렌더됐는지"만 본다.
// 코드 분할(next/dynamic) 도입 후에도 이 mock 은 그대로 동작한다 —
// vi.mock 이 모듈 해석을 가로채므로 dynamic import 도 같은 가짜를 받는다.

vi.mock('@/components/gallery/LikeButton', () => ({
  LikeButton: ({ initialCount }: { initialCount: number }) => (
    <button data-testid="like-button">좋아요 {initialCount}</button>
  ),
}));

vi.mock('@/components/pbl/PBLOverview', () => ({
  PBLOverview: ({ value }: { value: { companyName: string } }) => (
    <div data-testid="tab-overview">개요: {value.companyName}</div>
  ),
}));

vi.mock('@/components/pbl/PBLTrainingTargets', () => ({
  PBLTrainingTargets: ({ trainingNeedsAnalysis }: { trainingNeedsAnalysis: string }) => (
    <div data-testid="tab-targets">훈련대상: {trainingNeedsAnalysis}</div>
  ),
}));

vi.mock('@/components/pbl/PBLToolUsagePlan', () => ({
  PBLToolUsagePlan: ({ value }: { value: unknown[] }) => (
    <div data-testid="tab-tools">도구 {value.length}개</div>
  ),
}));

vi.mock('@/components/pbl/PBLTrainingPlan', () => ({
  PBLTrainingPlan: () => <div data-testid="tab-training">훈련 실시 계획</div>,
}));

vi.mock('@/components/pbl/PBLEvaluationPlan', () => ({
  PBLEvaluationPlan: () => <div data-testid="tab-evaluation">평가 계획</div>,
}));

import { GalleryPBLDetailContent } from './GalleryPBLDetailContent';
import type { PBLReportDetailView } from '../../actions';

// ─── 테스트 데이터 ────────────────────────────────────────────────────────────

const mockDetail: PBLReportDetailView = {
  id: 'pbl-1',
  track: 'PBL',
  title: '제조업 PBL 보고서',
  industry: '제조업',
  companySize: '50-299',
  companyName: '테스트 제조회사',
  createdByName: '홍길동',
  diagnosisSummary: '진단 요약입니다',
  pblContent: {
    overview_summary: {
      companyName: '개요상 회사명',
      courseName: 'AI 활용 과정',
      trainingHours: 40,
      traineeCount: 20,
      trainingJob: '생산관리',
      aiLevel: 'AI기초형',
      trainingGoals: [],
    },
    targets_summary: {
      trainingNeedsAnalysis: '요구분석 내용',
      selectionReason: '선정 사유',
      details: [],
    },
    operation_plan: {
      ai_tool_usage_plan: [{ tool: 'ChatGPT' }, { tool: 'Claude' }],
      training_plan: { subject_profile: { course_name: 'AI 활용 과정', total_hours: 40 } },
      evaluation_plan: { items: [] },
    },
  },
  likeCount: 3,
  isLiked: false,
  isShared: true,
  status: 'FINAL',
  versionNumber: 1,
  createdAt: '2026-08-01T00:00:00.000Z',
};

/** operation_plan 이 비어 Ⅳ-3·Ⅳ-4 탭 본문이 없는 경우 */
const detailWithoutOperationPlan: PBLReportDetailView = {
  ...mockDetail,
  pblContent: {
    overview_summary: (mockDetail.pblContent as Record<string, unknown>).overview_summary,
  },
};

const TAB_LABELS = [
  'Ⅰ 개요',
  'Ⅱ·Ⅲ 요구분석/훈련대상',
  'Ⅳ-2 AI 도구 활용',
  'Ⅳ-3 훈련 실시 계획',
  'Ⅳ-4 평가 계획',
] as const;

describe('GalleryPBLDetailContent', () => {
  describe('탭 네비게이션', () => {
    it('5개 탭 버튼이 모두 렌더된다', () => {
      render(<GalleryPBLDetailContent detail={mockDetail} isConsultant={false} />);

      const tabs = screen.getByRole('navigation').querySelectorAll('button');
      expect(tabs).toHaveLength(5);
      TAB_LABELS.forEach((label) => {
        expect(screen.getByRole('button', { name: label })).toBeInTheDocument();
      });
    });

    it('초기 진입 시 Ⅰ 개요 탭이 활성화되고 나머지 탭 본문은 렌더되지 않는다', async () => {
      render(<GalleryPBLDetailContent detail={mockDetail} isConsultant={false} />);

      expect(await screen.findByTestId('tab-overview')).toBeInTheDocument();
      expect(screen.queryByTestId('tab-targets')).not.toBeInTheDocument();
      expect(screen.queryByTestId('tab-tools')).not.toBeInTheDocument();
      expect(screen.queryByTestId('tab-training')).not.toBeInTheDocument();
      expect(screen.queryByTestId('tab-evaluation')).not.toBeInTheDocument();
    });

    it.each([
      ['Ⅱ·Ⅲ 요구분석/훈련대상', 'tab-targets'],
      ['Ⅳ-2 AI 도구 활용', 'tab-tools'],
      ['Ⅳ-3 훈련 실시 계획', 'tab-training'],
      ['Ⅳ-4 평가 계획', 'tab-evaluation'],
    ])('%s 탭을 클릭하면 해당 본문이 렌더되고 이전 탭 본문은 사라진다', async (label, testId) => {
      const user = userEvent.setup();
      render(<GalleryPBLDetailContent detail={mockDetail} isConsultant={false} />);

      expect(await screen.findByTestId('tab-overview')).toBeInTheDocument();

      await user.click(screen.getByRole('button', { name: label }));

      expect(await screen.findByTestId(testId)).toBeInTheDocument();
      expect(screen.queryByTestId('tab-overview')).not.toBeInTheDocument();
    });

    it('탭을 연속 전환해도 매번 해당 본문만 남는다', async () => {
      const user = userEvent.setup();
      render(<GalleryPBLDetailContent detail={mockDetail} isConsultant={false} />);

      await user.click(screen.getByRole('button', { name: 'Ⅳ-3 훈련 실시 계획' }));
      expect(await screen.findByTestId('tab-training')).toBeInTheDocument();

      await user.click(screen.getByRole('button', { name: 'Ⅳ-4 평가 계획' }));
      expect(await screen.findByTestId('tab-evaluation')).toBeInTheDocument();
      expect(screen.queryByTestId('tab-training')).not.toBeInTheDocument();

      await user.click(screen.getByRole('button', { name: 'Ⅰ 개요' }));
      expect(await screen.findByTestId('tab-overview')).toBeInTheDocument();
      expect(screen.queryByTestId('tab-evaluation')).not.toBeInTheDocument();
    });
  });

  describe('데이터 전달', () => {
    it('개요 탭에 overview_summary 의 회사명이 전달된다', async () => {
      render(<GalleryPBLDetailContent detail={mockDetail} isConsultant={false} />);

      expect(await screen.findByTestId('tab-overview')).toHaveTextContent('개요상 회사명');
    });

    it('요구분석 탭에 targets_summary 가 전달된다', async () => {
      const user = userEvent.setup();
      render(<GalleryPBLDetailContent detail={mockDetail} isConsultant={false} />);

      await user.click(screen.getByRole('button', { name: 'Ⅱ·Ⅲ 요구분석/훈련대상' }));

      expect(await screen.findByTestId('tab-targets')).toHaveTextContent('요구분석 내용');
    });

    it('AI 도구 탭에 ai_tool_usage_plan 배열이 전달된다', async () => {
      const user = userEvent.setup();
      render(<GalleryPBLDetailContent detail={mockDetail} isConsultant={false} />);

      await user.click(screen.getByRole('button', { name: 'Ⅳ-2 AI 도구 활용' }));

      expect(await screen.findByTestId('tab-tools')).toHaveTextContent('도구 2개');
    });
  });

  describe('데이터 없음 처리', () => {
    it('training_plan 이 없으면 Ⅳ-3 탭을 눌러도 본문이 렌더되지 않는다', async () => {
      const user = userEvent.setup();
      render(<GalleryPBLDetailContent detail={detailWithoutOperationPlan} isConsultant={false} />);

      await user.click(screen.getByRole('button', { name: 'Ⅳ-3 훈련 실시 계획' }));

      expect(screen.queryByTestId('tab-overview')).not.toBeInTheDocument();
      expect(screen.queryByTestId('tab-training')).not.toBeInTheDocument();
    });

    it('evaluation_plan 이 없으면 Ⅳ-4 탭을 눌러도 본문이 렌더되지 않는다', async () => {
      const user = userEvent.setup();
      render(<GalleryPBLDetailContent detail={detailWithoutOperationPlan} isConsultant={false} />);

      await user.click(screen.getByRole('button', { name: 'Ⅳ-4 평가 계획' }));

      expect(screen.queryByTestId('tab-evaluation')).not.toBeInTheDocument();
    });
  });

  describe('액션 바', () => {
    it('컨설턴트에게는 "이 PBL 사용하기" 버튼이 보인다 (비활성)', () => {
      render(<GalleryPBLDetailContent detail={mockDetail} isConsultant={true} />);

      const button = screen.getByRole('button', { name: /이 PBL 사용하기/ });
      expect(button).toBeInTheDocument();
      expect(button).toBeDisabled();
    });

    it('컨설턴트가 아니면 "이 PBL 사용하기" 버튼이 없다', () => {
      render(<GalleryPBLDetailContent detail={mockDetail} isConsultant={false} />);

      expect(screen.queryByRole('button', { name: /이 PBL 사용하기/ })).not.toBeInTheDocument();
    });

    it('진단 요약이 있으면 표시된다', () => {
      render(<GalleryPBLDetailContent detail={mockDetail} isConsultant={false} />);

      expect(screen.getByText('진단 요약입니다')).toBeInTheDocument();
    });
  });
});
