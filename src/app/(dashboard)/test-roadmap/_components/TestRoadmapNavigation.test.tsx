import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import '@/test/helpers/mock-next-link';

import React from 'react';
import TestRoadmapNavigation from './TestRoadmapNavigation';
import type { GenerationState } from '../_hooks/useTestRoadmapActions';

// ─── 기본 props ────────────────────────────────────────────────────────────────

const idleGenerationState: GenerationState = {
  isSubmitting: false,
  isGenerating: false,
  isComplete: false,
};

const submittingGenerationState: GenerationState = {
  isSubmitting: true,
  isGenerating: false,
  isComplete: false,
};

const defaultProps = {
  currentStep: 1,
  goToNextStep: vi.fn(),
  goToPrevStep: vi.fn(),
  handleSubmit: vi.fn(),
  generationState: idleGenerationState,
  isAllRequiredStepsValid: true,
  incompleteRequiredSteps: [],
  isOpsAdmin: false,
};

// INTERVIEW_STEPS.length = 6 (마지막 스텝)
const LAST_STEP = 6;

// ─── 테스트 ────────────────────────────────────────────────────────────────────

describe('TestRoadmapNavigation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('이전 버튼', () => {
    it('첫 번째 스텝에서 이전 버튼이 비활성화된다', () => {
      render(<TestRoadmapNavigation {...defaultProps} currentStep={1} />);
      const prevBtn = screen.getByRole('button', { name: /이전/ });
      expect(prevBtn).toBeDisabled();
    });

    it('두 번째 스텝에서 이전 버튼이 활성화된다', () => {
      render(<TestRoadmapNavigation {...defaultProps} currentStep={2} />);
      const prevBtn = screen.getByRole('button', { name: /이전/ });
      expect(prevBtn).not.toBeDisabled();
    });

    it('이전 버튼 클릭 시 goToPrevStep이 호출된다', async () => {
      const user = userEvent.setup();
      const goToPrevStep = vi.fn();
      render(
        <TestRoadmapNavigation {...defaultProps} currentStep={3} goToPrevStep={goToPrevStep} />
      );
      await user.click(screen.getByRole('button', { name: /이전/ }));
      expect(goToPrevStep).toHaveBeenCalledTimes(1);
    });
  });

  describe('다음 버튼', () => {
    it('마지막 스텝이 아닌 경우 "다음" 버튼이 표시된다', () => {
      render(<TestRoadmapNavigation {...defaultProps} currentStep={1} />);
      expect(screen.getByRole('button', { name: /다음/ })).toBeInTheDocument();
    });

    it('다음 버튼 클릭 시 goToNextStep이 호출된다', async () => {
      const user = userEvent.setup();
      const goToNextStep = vi.fn();
      render(
        <TestRoadmapNavigation {...defaultProps} currentStep={2} goToNextStep={goToNextStep} />
      );
      await user.click(screen.getByRole('button', { name: /다음/ }));
      expect(goToNextStep).toHaveBeenCalledTimes(1);
    });

    it('마지막 스텝에서는 "다음" 버튼이 표시되지 않는다', () => {
      render(<TestRoadmapNavigation {...defaultProps} currentStep={LAST_STEP} />);
      expect(screen.queryByRole('button', { name: /다음/ })).not.toBeInTheDocument();
    });
  });

  describe('로드맵 테스트 생성 버튼 (마지막 스텝)', () => {
    it('마지막 스텝에서 "로드맵 테스트 생성" 버튼이 표시된다', () => {
      render(<TestRoadmapNavigation {...defaultProps} currentStep={LAST_STEP} />);
      expect(screen.getByRole('button', { name: /로드맵 테스트 생성/ })).toBeInTheDocument();
    });

    it('모든 필수 스텝이 완료된 경우 생성 버튼이 활성화된다', () => {
      render(
        <TestRoadmapNavigation
          {...defaultProps}
          currentStep={LAST_STEP}
          isAllRequiredStepsValid={true}
        />
      );
      expect(screen.getByRole('button', { name: /로드맵 테스트 생성/ })).not.toBeDisabled();
    });

    it('필수 스텝 미완료 시 생성 버튼이 비활성화된다', () => {
      render(
        <TestRoadmapNavigation
          {...defaultProps}
          currentStep={LAST_STEP}
          isAllRequiredStepsValid={false}
          incompleteRequiredSteps={[3, 4]}
        />
      );
      expect(screen.getByRole('button', { name: /로드맵 테스트 생성/ })).toBeDisabled();
    });

    it('미완료 스텝 수가 표시된다', () => {
      render(
        <TestRoadmapNavigation
          {...defaultProps}
          currentStep={LAST_STEP}
          isAllRequiredStepsValid={false}
          incompleteRequiredSteps={[3, 4]}
        />
      );
      expect(screen.getByText(/2개 필수 단계 미완료/)).toBeInTheDocument();
    });

    it('모든 필수 스텝 완료 시 미완료 경고가 표시되지 않는다', () => {
      render(
        <TestRoadmapNavigation
          {...defaultProps}
          currentStep={LAST_STEP}
          isAllRequiredStepsValid={true}
          incompleteRequiredSteps={[]}
        />
      );
      expect(screen.queryByText(/필수 단계 미완료/)).not.toBeInTheDocument();
    });

    it('생성 버튼 클릭 시 handleSubmit이 호출된다', async () => {
      const user = userEvent.setup();
      const handleSubmit = vi.fn();
      render(
        <TestRoadmapNavigation
          {...defaultProps}
          currentStep={LAST_STEP}
          handleSubmit={handleSubmit}
          isAllRequiredStepsValid={true}
        />
      );
      await user.click(screen.getByRole('button', { name: /로드맵 테스트 생성/ }));
      expect(handleSubmit).toHaveBeenCalledTimes(1);
    });
  });

  describe('생성 중 상태', () => {
    it('isSubmitting이 true이면 "생성 중..." 텍스트가 표시된다', () => {
      render(
        <TestRoadmapNavigation
          {...defaultProps}
          currentStep={LAST_STEP}
          generationState={submittingGenerationState}
          isAllRequiredStepsValid={true}
        />
      );
      expect(screen.getByText('생성 중...')).toBeInTheDocument();
    });

    it('isSubmitting이 true이면 생성 버튼이 비활성화된다', () => {
      render(
        <TestRoadmapNavigation
          {...defaultProps}
          currentStep={LAST_STEP}
          generationState={submittingGenerationState}
          isAllRequiredStepsValid={true}
        />
      );
      expect(screen.getByRole('button', { name: /생성 중/ })).toBeDisabled();
    });
  });

  describe('취소 링크', () => {
    it('isOpsAdmin이 false이면 컨설턴트 프로젝트 경로로 링크된다', () => {
      render(<TestRoadmapNavigation {...defaultProps} isOpsAdmin={false} />);
      const link = screen.getByRole('link', { name: '취소' });
      expect(link).toHaveAttribute('href', '/consultant/projects');
    });

    it('isOpsAdmin이 true이면 운영 프로젝트 경로로 링크된다', () => {
      render(<TestRoadmapNavigation {...defaultProps} isOpsAdmin={true} />);
      const link = screen.getByRole('link', { name: '취소' });
      expect(link).toHaveAttribute('href', '/ops/projects');
    });
  });
});
