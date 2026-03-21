import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';

// ─── Mocks ───────────────────────────────────────────────────────────────────

vi.mock('@/components/interview/SummaryComponents', () => ({
  SummarySection: ({
    title,
    onEdit,
    children,
    isEmpty,
    isTestSection,
  }: {
    title: string;
    onEdit: () => void;
    children: React.ReactNode;
    isEmpty?: boolean;
    isTestSection?: boolean;
  }) => (
    <div data-testid={`summary-section-${title}`} data-is-test={isTestSection}>
      <h3>{title}</h3>
      {!isEmpty && children}
      <button onClick={onEdit}>수정</button>
    </div>
  ),
  SeverityBadge: ({ severity }: { severity: string }) => (
    <span data-testid={`severity-${severity}`}>{severity}</span>
  ),
  StatCard: ({
    value,
    label,
  }: {
    value: number;
    label: string;
    colorScheme?: string;
  }) => (
    <div data-testid={`stat-${label}`}>
      {value} {label}
    </div>
  ),
  InfoBox: ({ title, children }: { title: string; children: React.ReactNode }) => (
    <div data-testid="info-box">
      <h4>{title}</h4>
      {children}
    </div>
  ),
  formatKoreanDate: (dateStr: string) => `${dateStr} (한국어)`,
}));

import React from 'react';
import TestStepSummary from './TestStepSummary';
import type {
  InterviewParticipant,
  CompanyDetails,
  JobTask,
  PainPoint,
  Constraint,
  ImprovementGoal,
} from '@/lib/schemas/test-roadmap';
import type { SttInsights } from '@/lib/schemas/interview';

// ─── 테스트 데이터 ────────────────────────────────────────────────────────────

const mockParticipants: InterviewParticipant[] = [
  { id: 'p1', name: '홍길동', position: '팀장' },
];

const mockCompanyDetails: CompanyDetails = {
  systems_and_tools: ['MS Office', 'ERP'],
  ai_experience: 'ChatGPT 사용 경험 있음',
};

const mockJobTasks: JobTask[] = [
  { id: 't1', task_name: '데이터 입력', task_description: '생산 데이터 수동 입력' },
  { id: 't2', task_name: '보고서 작성', task_description: '일일 생산 보고서 작성' },
];

const mockPainPoints: PainPoint[] = [
  { id: 'pp1', description: '수작업 오류 빈번', severity: 'HIGH' },
  { id: 'pp2', description: '처리 속도 느림', severity: 'MEDIUM' },
];

const mockConstraints: Constraint[] = [
  { id: 'c1', type: 'DATA', description: '레거시 시스템 연동 필요', severity: 'MEDIUM' },
];

const mockImprovementGoals: ImprovementGoal[] = [
  { id: 'g1', goal_description: '업무 자동화로 처리 시간 50% 단축' },
];

const defaultProps = {
  companyName: '테스트 제조회사',
  industry: '제조업',
  subIndustries: ['반도체', '디스플레이'],
  companySize: '50-299',
  interviewDate: '2026-03-21',
  participants: mockParticipants,
  companyDetails: mockCompanyDetails,
  jobTasks: mockJobTasks,
  painPoints: mockPainPoints,
  constraints: mockConstraints,
  improvementGoals: mockImprovementGoals,
  notes: '추가 메모 내용',
  sttInsights: null,
  onEditStep: vi.fn(),
};

// ─── 테스트 ────────────────────────────────────────────────────────────────────

describe('TestStepSummary', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('기본 렌더링', () => {
    it('"입력 내용 확인" 제목이 표시된다', () => {
      render(<TestStepSummary {...defaultProps} />);
      expect(screen.getByText('입력 내용 확인')).toBeInTheDocument();
    });

    it('로드맵 생성 준비 완료 InfoBox가 표시된다', () => {
      render(<TestStepSummary {...defaultProps} />);
      expect(screen.getByTestId('info-box')).toBeInTheDocument();
      expect(screen.getByText('로드맵 생성 준비 완료')).toBeInTheDocument();
    });
  });

  describe('통계 요약 (StatCard)', () => {
    it('참석자 수가 표시된다', () => {
      render(<TestStepSummary {...defaultProps} />);
      expect(screen.getByTestId('stat-참석자')).toHaveTextContent('1');
    });

    it('세부업무 수가 표시된다', () => {
      render(<TestStepSummary {...defaultProps} />);
      expect(screen.getByTestId('stat-세부업무')).toHaveTextContent('2');
    });

    it('페인포인트 수가 표시된다', () => {
      render(<TestStepSummary {...defaultProps} />);
      expect(screen.getByTestId('stat-페인포인트')).toHaveTextContent('2');
    });

    it('개선목표 수가 표시된다', () => {
      render(<TestStepSummary {...defaultProps} />);
      expect(screen.getByTestId('stat-개선목표')).toHaveTextContent('1');
    });
  });

  describe('기업 기본정보 섹션', () => {
    it('회사명이 표시된다', () => {
      render(<TestStepSummary {...defaultProps} />);
      expect(screen.getByText('테스트 제조회사')).toBeInTheDocument();
    });

    it('업종이 표시된다', () => {
      render(<TestStepSummary {...defaultProps} />);
      expect(screen.getByText('제조업')).toBeInTheDocument();
    });

    it('세부 업종이 표시된다', () => {
      render(<TestStepSummary {...defaultProps} />);
      expect(screen.getByText('반도체')).toBeInTheDocument();
      expect(screen.getByText('디스플레이')).toBeInTheDocument();
    });

    it('isTestSection이 true로 전달된다', () => {
      render(<TestStepSummary {...defaultProps} />);
      const section = screen.getByTestId('summary-section-기업 기본정보');
      expect(section).toHaveAttribute('data-is-test', 'true');
    });
  });

  describe('인터뷰 기본정보 섹션', () => {
    it('인터뷰 날짜가 한국어 형식으로 표시된다', () => {
      render(<TestStepSummary {...defaultProps} />);
      expect(screen.getByText('2026-03-21 (한국어)')).toBeInTheDocument();
    });

    it('참석자 이름이 표시된다', () => {
      render(<TestStepSummary {...defaultProps} />);
      expect(screen.getByText('홍길동')).toBeInTheDocument();
    });

    it('참석자 직급이 표시된다', () => {
      render(<TestStepSummary {...defaultProps} />);
      expect(screen.getByText('(팀장)')).toBeInTheDocument();
    });
  });

  describe('세부업무 섹션', () => {
    it('세부업무 목록이 표시된다', () => {
      render(<TestStepSummary {...defaultProps} />);
      expect(screen.getByText('데이터 입력')).toBeInTheDocument();
      expect(screen.getByText('보고서 작성')).toBeInTheDocument();
    });
  });

  describe('페인포인트 섹션', () => {
    it('페인포인트 설명이 표시된다', () => {
      render(<TestStepSummary {...defaultProps} />);
      expect(screen.getByText('수작업 오류 빈번')).toBeInTheDocument();
    });

    it('SeverityBadge가 렌더링된다', () => {
      render(<TestStepSummary {...defaultProps} />);
      expect(screen.getByTestId('severity-HIGH')).toBeInTheDocument();
    });
  });

  describe('목표 및 제약사항 섹션', () => {
    it('개선 목표가 표시된다', () => {
      render(<TestStepSummary {...defaultProps} />);
      expect(screen.getByText('업무 자동화로 처리 시간 50% 단축')).toBeInTheDocument();
    });

    it('제약사항이 표시된다', () => {
      render(<TestStepSummary {...defaultProps} />);
      expect(screen.getByText('레거시 시스템 연동 필요')).toBeInTheDocument();
    });

    it('메모가 표시된다', () => {
      render(<TestStepSummary {...defaultProps} />);
      expect(screen.getByText('추가 메모 내용')).toBeInTheDocument();
    });
  });

  describe('STT 인사이트', () => {
    it('sttInsights가 null이면 STT 인사이트 섹션이 표시되지 않는다', () => {
      render(<TestStepSummary {...defaultProps} sttInsights={null} />);
      expect(screen.queryByText(/STT 인사이트/)).not.toBeInTheDocument();
    });

    it('sttInsights가 있으면 AI 분석 완료 텍스트가 표시된다', () => {
      const sttInsights: SttInsights = {
        추가_업무: ['신규 업무 1'],
        숨은_니즈: ['숨은 니즈 1', '숨은 니즈 2'],
      };
      render(<TestStepSummary {...defaultProps} sttInsights={sttInsights} />);
      expect(screen.getByText(/AI 분석 완료/)).toBeInTheDocument();
    });
  });

  describe('수정 버튼', () => {
    it('섹션 수정 버튼 클릭 시 onEditStep이 호출된다', async () => {
      const user = userEvent.setup();
      const onEditStep = vi.fn();
      render(<TestStepSummary {...defaultProps} onEditStep={onEditStep} />);
      const editButtons = screen.getAllByRole('button', { name: '수정' });
      await user.click(editButtons[0]);
      expect(onEditStep).toHaveBeenCalled();
    });
  });
});
