import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect } from 'vitest';
import { ProjectDetailTabs } from './ProjectDetailTabs';

const defaultProps = {
  companyInfoContent: <div>기업 정보 내용</div>,
  preAnalysisContent: <div>사전 분석 내용</div>,
  interviewContent: <div>인터뷰 기록 내용</div>,
  activityContent: <div>활동 일지 내용</div>,
};

describe('ProjectDetailTabs', () => {
  describe('탭 목록 렌더링', () => {
    it('4개 탭이 모두 렌더링된다', () => {
      render(<ProjectDetailTabs {...defaultProps} />);

      expect(screen.getByRole('tab', { name: '기업 정보' })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: '사전 분석' })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: '인터뷰 기록' })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: '활동 일지' })).toBeInTheDocument();
    });
  });

  describe('기본 탭', () => {
    it('defaultTab 미지정 시 "기업 정보" 탭의 내용이 표시된다', () => {
      render(<ProjectDetailTabs {...defaultProps} />);
      expect(screen.getByText('기업 정보 내용')).toBeInTheDocument();
    });

    it('defaultTab="pre-analysis" 지정 시 사전 분석 내용이 표시된다', () => {
      render(<ProjectDetailTabs {...defaultProps} defaultTab="pre-analysis" />);
      expect(screen.getByText('사전 분석 내용')).toBeInTheDocument();
    });

    it('defaultTab="interview" 지정 시 인터뷰 기록 내용이 표시된다', () => {
      render(<ProjectDetailTabs {...defaultProps} defaultTab="interview" />);
      expect(screen.getByText('인터뷰 기록 내용')).toBeInTheDocument();
    });

    it('defaultTab="activity" 지정 시 활동 일지 내용이 표시된다', () => {
      render(<ProjectDetailTabs {...defaultProps} defaultTab="activity" />);
      expect(screen.getByText('활동 일지 내용')).toBeInTheDocument();
    });
  });

  describe('탭 전환', () => {
    it('"사전 분석" 탭 클릭 시 해당 내용이 표시된다', async () => {
      const user = userEvent.setup();
      render(<ProjectDetailTabs {...defaultProps} />);

      await user.click(screen.getByRole('tab', { name: '사전 분석' }));

      expect(screen.getByText('사전 분석 내용')).toBeInTheDocument();
    });

    it('"인터뷰 기록" 탭 클릭 시 해당 내용이 표시된다', async () => {
      const user = userEvent.setup();
      render(<ProjectDetailTabs {...defaultProps} />);

      await user.click(screen.getByRole('tab', { name: '인터뷰 기록' }));

      expect(screen.getByText('인터뷰 기록 내용')).toBeInTheDocument();
    });

    it('"활동 일지" 탭 클릭 시 해당 내용이 표시된다', async () => {
      const user = userEvent.setup();
      render(<ProjectDetailTabs {...defaultProps} />);

      await user.click(screen.getByRole('tab', { name: '활동 일지' }));

      expect(screen.getByText('활동 일지 내용')).toBeInTheDocument();
    });

    it('"기업 정보" 탭으로 다시 전환 시 해당 내용이 표시된다', async () => {
      const user = userEvent.setup();
      render(<ProjectDetailTabs {...defaultProps} />);

      await user.click(screen.getByRole('tab', { name: '사전 분석' }));
      await user.click(screen.getByRole('tab', { name: '기업 정보' }));

      expect(screen.getByText('기업 정보 내용')).toBeInTheDocument();
    });
  });
});
