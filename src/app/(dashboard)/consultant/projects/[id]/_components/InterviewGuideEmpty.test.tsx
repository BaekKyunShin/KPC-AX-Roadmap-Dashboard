import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { InterviewGuideEmpty } from './InterviewGuideEmpty';

describe('InterviewGuideEmpty', () => {
  describe('자가진단 미완료 상태 (hasSelfAssessment=false)', () => {
    it('잠금 안내 메시지를 표시한다', () => {
      render(<InterviewGuideEmpty hasSelfAssessment={false} onGenerate={vi.fn()} />);
      expect(screen.getByText('자가진단 완료 후 이용할 수 있습니다.')).toBeInTheDocument();
    });

    it('자가진단 설명 문구를 표시한다', () => {
      render(<InterviewGuideEmpty hasSelfAssessment={false} onGenerate={vi.fn()} />);
      expect(
        screen.getByText('기업의 자가진단 결과를 바탕으로 AI가 인터뷰 준비 가이드를 생성합니다.'),
      ).toBeInTheDocument();
    });

    it('분석 시작 버튼이 표시되지 않는다', () => {
      render(<InterviewGuideEmpty hasSelfAssessment={false} onGenerate={vi.fn()} />);
      expect(screen.queryByRole('button', { name: /분석 시작/ })).not.toBeInTheDocument();
    });
  });

  describe('자가진단 완료 상태 (hasSelfAssessment=true)', () => {
    it('가이드 생성 안내 메시지를 표시한다', () => {
      render(<InterviewGuideEmpty hasSelfAssessment={true} onGenerate={vi.fn()} />);
      expect(screen.getByText('AI 사전 분석 가이드를 생성할 수 있습니다')).toBeInTheDocument();
    });

    it('분석 시작 버튼이 표시된다', () => {
      render(<InterviewGuideEmpty hasSelfAssessment={true} onGenerate={vi.fn()} />);
      expect(screen.getByRole('button', { name: /분석 시작/ })).toBeInTheDocument();
    });

    it('분석 시작 버튼 클릭 시 onGenerate가 호출된다', async () => {
      const onGenerate = vi.fn();
      const user = userEvent.setup();
      render(<InterviewGuideEmpty hasSelfAssessment={true} onGenerate={onGenerate} />);

      await user.click(screen.getByRole('button', { name: /분석 시작/ }));

      expect(onGenerate).toHaveBeenCalledTimes(1);
    });

    it('추천 질문 생성 설명 문구를 표시한다', () => {
      render(<InterviewGuideEmpty hasSelfAssessment={true} onGenerate={vi.fn()} />);
      expect(
        screen.getByText('자가진단 결과를 분석하여 핵심 파악 포인트와 인터뷰 질문을 추천합니다.'),
      ).toBeInTheDocument();
    });
  });
});
