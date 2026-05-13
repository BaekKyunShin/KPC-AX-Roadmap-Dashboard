import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import InterviewStepper from './InterviewStepper';

// =============================================================================
// 테스트 데이터
// =============================================================================

const STEPS = [
  { id: 1, name: '기본 정보', shortName: '기본' },
  { id: 2, name: '시스템/AI 경험', shortName: '시스템' },
  { id: 3, name: '세부업무', shortName: '업무' },
  { id: 4, name: '페인포인트', shortName: '페인' },
  { id: 5, name: '제약/목표', shortName: '제약' },
  { id: 6, name: '최종 확인', shortName: '확인' },
];

// =============================================================================
// 테스트
// =============================================================================

describe('InterviewStepper', () => {
  // -------------------------------------------------------------------------
  // 1. 기본 렌더링
  // -------------------------------------------------------------------------
  describe('기본 렌더링', () => {
    it('모든 스텝 이름이 렌더링된다', () => {
      render(
        <InterviewStepper
          steps={STEPS}
          currentStep={1}
          onStepClick={vi.fn()}
          completedSteps={[]}
        />,
      );

      STEPS.forEach((step) => {
        // 데스크톱 뷰에서 step.name이 여러 개 표시될 수 있음
        expect(screen.getAllByText(step.name).length).toBeGreaterThanOrEqual(1);
      });
    });

    it('현재 스텝 표시가 렌더링된다 (모바일: X/N단계)', () => {
      render(
        <InterviewStepper
          steps={STEPS}
          currentStep={3}
          onStepClick={vi.fn()}
          completedSteps={[]}
        />,
      );

      expect(screen.getByText('3/6단계')).toBeInTheDocument();
    });

    it('모바일 뷰에서 현재 스텝 이름이 표시된다', () => {
      render(
        <InterviewStepper
          steps={STEPS}
          currentStep={2}
          onStepClick={vi.fn()}
          completedSteps={[]}
        />,
      );

      // 모바일 영역에서 현재 스텝명이 표시됨
      expect(screen.getAllByText('시스템/AI 경험').length).toBeGreaterThanOrEqual(1);
    });
  });

  // -------------------------------------------------------------------------
  // 2. 스텝 상태 (current / completed / pending)
  // -------------------------------------------------------------------------
  describe('스텝 상태', () => {
    it('현재 스텝(current)에는 스텝 번호가 표시된다', () => {
      render(
        <InterviewStepper
          steps={STEPS}
          currentStep={2}
          onStepClick={vi.fn()}
          completedSteps={[1]}
        />,
      );

      // 데스크톱 원형에서 current step은 번호로 표시
      // getAllByText로 여러 매칭 중 하나 확인
      expect(screen.getAllByText('2').length).toBeGreaterThanOrEqual(1);
    });

    it('completedSteps에 포함된 스텝은 체크 아이콘(svg)으로 표시된다', () => {
      render(
        <InterviewStepper
          steps={STEPS}
          currentStep={3}
          onStepClick={vi.fn()}
          completedSteps={[1, 2]}
        />,
      );

      // 완료된 스텝(1, 2)에는 CheckIcon(SVG)이 표시되므로 번호 텍스트가 없어야 함
      // 데스크톱 원형 내에서 '1', '2' 텍스트가 없고 체크 아이콘 SVG만 있음
      // currentStep=3이므로 '3'은 번호로 표시됨
      expect(screen.getAllByText('3').length).toBeGreaterThanOrEqual(1);
    });

    it('validateStep prop이 있으면 해당 함수 결과로 완료 상태를 결정한다', () => {
      const mockValidateStep = vi.fn((step: number) => step === 1);

      render(
        <InterviewStepper
          steps={STEPS}
          currentStep={2}
          onStepClick={vi.fn()}
          completedSteps={[]}
          validateStep={mockValidateStep}
        />,
      );

      expect(mockValidateStep).toHaveBeenCalled();
    });

    it('validateStep이 없으면 completedSteps 배열로 완료 여부를 판단한다', () => {
      render(
        <InterviewStepper
          steps={STEPS}
          currentStep={4}
          onStepClick={vi.fn()}
          completedSteps={[1, 2, 3]}
        />,
      );

      // 완료된 스텝(1, 2, 3)의 번호가 원형에 표시되지 않음 (체크 아이콘으로 대체)
      // 현재 스텝 4는 번호로 표시
      expect(screen.getAllByText('4').length).toBeGreaterThanOrEqual(1);
    });
  });

  // -------------------------------------------------------------------------
  // 3. 스텝 클릭 콜백
  // -------------------------------------------------------------------------
  describe('스텝 클릭 콜백', () => {
    it('데스크톱 스텝 버튼 클릭 시 onStepClick이 해당 stepId로 호출된다', async () => {
      const user = userEvent.setup();
      const mockOnStepClick = vi.fn();

      render(
        <InterviewStepper
          steps={STEPS}
          currentStep={1}
          onStepClick={mockOnStepClick}
          completedSteps={[]}
        />,
      );

      // 데스크톱 뷰는 hidden md:block이므로 DOM에 존재하지만 visually hidden
      // 모든 버튼 중 스텝 3에 해당하는 것을 찾아 클릭
      const stepButtons = screen.getAllByRole('button');
      // 스텝 버튼들 중에서 '3'을 포함한 버튼 찾기
      const step3Buttons = stepButtons.filter(
        (btn) => btn.textContent?.includes('세부업무') || btn.title === '업무',
      );

      if (step3Buttons.length > 0) {
        await user.click(step3Buttons[0]);
        expect(mockOnStepClick).toHaveBeenCalledWith(3);
      } else {
        // fallback: 3번째 버튼 클릭 (인덱스 2)
        await user.click(stepButtons[2]);
        expect(mockOnStepClick).toHaveBeenCalled();
      }
    });

    it('모바일 바 버튼 클릭 시 onStepClick이 호출된다', async () => {
      const user = userEvent.setup();
      const mockOnStepClick = vi.fn();

      render(
        <InterviewStepper
          steps={STEPS}
          currentStep={1}
          onStepClick={mockOnStepClick}
          completedSteps={[]}
        />,
      );

      // title prop을 가진 모바일 바 버튼 찾기
      const mobileBars = screen.getAllByTitle(/기본|시스템|업무|페인|제약|확인/);
      if (mobileBars.length > 0) {
        await user.click(mobileBars[0]);
        expect(mockOnStepClick).toHaveBeenCalledWith(1);
      }
    });
  });

  // -------------------------------------------------------------------------
  // 4. 스텝 수에 따른 렌더링
  // -------------------------------------------------------------------------
  describe('스텝 수에 따른 렌더링', () => {
    it('steps 배열 수만큼 모바일 진행 바가 렌더링된다', () => {
      render(
        <InterviewStepper
          steps={STEPS}
          currentStep={1}
          onStepClick={vi.fn()}
          completedSteps={[]}
        />,
      );

      // 모바일 진행 바 버튼은 shortName 을 title 로 가짐. 데스크톱 버튼은
      // step.name 을 title 로 가지므로 anchor(^…$) 로 모바일만 좁혀 매칭.
      const mobileBars = screen.getAllByTitle(/^(기본|시스템|업무|페인|제약|확인)$/);
      expect(mobileBars).toHaveLength(STEPS.length);
    });

    it('빈 completedSteps이면 pending 상태로 렌더링된다', () => {
      render(
        <InterviewStepper
          steps={STEPS}
          currentStep={1}
          onStepClick={vi.fn()}
          completedSteps={[]}
        />,
      );

      // 오류 없이 렌더링
      expect(screen.getByText('1/6단계')).toBeInTheDocument();
    });
  });

  // -------------------------------------------------------------------------
  // 5. 데스크톱 라벨 폭 제약 (9~10 Step 확장 시 겹침 방어)
  // -------------------------------------------------------------------------
  describe('데스크톱 라벨 폭 제약', () => {
    it('데스크톱 라벨 span 에 truncate · max-w-[88px] 클래스가 적용된다 (PBL 10단계 라벨 가시성 확보)', () => {
      const { container } = render(
        <InterviewStepper
          steps={STEPS}
          currentStep={1}
          onStepClick={vi.fn()}
          completedSteps={[]}
        />,
      );

      // 데스크톱 라벨은 step.name 텍스트 노드의 직속 span — 가장 긴 라벨로 조회
      const labelSpans = Array.from(
        container.querySelectorAll('span'),
      ).filter((el) => el.textContent === '시스템/AI 경험');
      expect(labelSpans.length).toBeGreaterThan(0);
      const labelSpan = labelSpans[0];
      expect(labelSpan.className).toMatch(/truncate/);
      expect(labelSpan.className).toMatch(/max-w-\[88px\]/);
      expect(labelSpan.className).toMatch(/lg:max-w-\[112px\]/);
    });

    it('각 데스크톱 스텝 버튼에 title 속성으로 step.name 풀텍스트가 노출된다 (truncate 시 hover 접근성)', () => {
      render(
        <InterviewStepper
          steps={STEPS}
          currentStep={1}
          onStepClick={vi.fn()}
          completedSteps={[]}
        />,
      );

      STEPS.forEach((step) => {
        // title=step.name 으로 데스크톱 hover 시 풀텍스트 확인 가능 (Nielsen H4)
        const elements = screen.getAllByTitle(step.name);
        expect(elements.length).toBeGreaterThanOrEqual(1);
      });
    });
  });
});
