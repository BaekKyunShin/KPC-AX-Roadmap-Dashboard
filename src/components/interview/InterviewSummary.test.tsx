import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { InterviewSummary, toInterviewSummaryProps } from './InterviewSummary';
import type { InterviewSummaryProps } from './InterviewSummary';

// =============================================================================
// 모킹
// =============================================================================

vi.mock('@/components/interview/SummaryComponents', () => ({
  SeverityBadge: ({ severity }: { severity: string }) => (
    <span data-testid={`severity-${severity}`}>{severity}</span>
  ),
}));

// =============================================================================
// 테스트 데이터
// =============================================================================

function makeFullProps(): InterviewSummaryProps {
  return {
    companyDetails: {
      systems_and_tools: ['SAP', 'Excel', 'Python'],
      ai_experience: 'ChatGPT를 업무에 활용한 경험이 있습니다.',
    },
    jobTasks: [
      { task_name: '데이터 분석', task_description: '매출 데이터 분석 및 리포트 작성' },
      { task_name: '고객 응대', task_description: '' },
    ],
    painPoints: [
      { description: '반복적인 수작업이 많습니다.', severity: 'HIGH' },
      { description: '데이터 정리에 시간이 많이 소요됩니다.', severity: 'MEDIUM' },
    ],
    improvementGoals: [
      {
        goal_description: '데이터 처리 자동화',
        kpi: '처리 시간',
        target_value: '50% 감소',
      },
      {
        goal_description: '고객 만족도 향상',
      },
    ],
    constraints: [{ description: '예산 3000만원 이내' }],
    notes: '2분기 내 도입 희망',
    customerRequirements: '보안 인증이 필요합니다.',
  };
}

function makeEmptyProps(): InterviewSummaryProps {
  return {
    companyDetails: null,
    jobTasks: [],
    painPoints: [],
    improvementGoals: [],
    constraints: [],
    notes: null,
    customerRequirements: null,
  };
}

// =============================================================================
// 테스트
// =============================================================================

describe('InterviewSummary', () => {
  describe('전체 데이터 렌더링', () => {
    it('시스템/AI 활용 경험 섹션을 표시한다', () => {
      render(<InterviewSummary {...makeFullProps()} />);
      expect(screen.getByText('시스템/AI 활용 경험')).toBeInTheDocument();
    });

    it('사용 시스템/도구를 배지로 표시한다', () => {
      render(<InterviewSummary {...makeFullProps()} />);
      expect(screen.getByText('SAP')).toBeInTheDocument();
      expect(screen.getByText('Excel')).toBeInTheDocument();
      expect(screen.getByText('Python')).toBeInTheDocument();
    });

    it('AI 도구 사용 경험을 표시한다', () => {
      render(<InterviewSummary {...makeFullProps()} />);
      expect(screen.getByText('ChatGPT를 업무에 활용한 경험이 있습니다.')).toBeInTheDocument();
    });

    it('세부업무 목록을 표시한다', () => {
      render(<InterviewSummary {...makeFullProps()} />);
      expect(screen.getByText('세부업무')).toBeInTheDocument();
      expect(screen.getByText('데이터 분석')).toBeInTheDocument();
      expect(screen.getByText('매출 데이터 분석 및 리포트 작성')).toBeInTheDocument();
      expect(screen.getByText('고객 응대')).toBeInTheDocument();
    });

    it('세부업무에 번호를 표시한다', () => {
      render(<InterviewSummary {...makeFullProps()} />);
      expect(screen.getByText('1')).toBeInTheDocument();
      expect(screen.getByText('2')).toBeInTheDocument();
    });

    it('페인포인트 목록을 표시한다', () => {
      render(<InterviewSummary {...makeFullProps()} />);
      expect(screen.getByText('페인포인트')).toBeInTheDocument();
      expect(screen.getByText('반복적인 수작업이 많습니다.')).toBeInTheDocument();
      expect(screen.getByText('데이터 정리에 시간이 많이 소요됩니다.')).toBeInTheDocument();
    });

    it('페인포인트에 SeverityBadge를 표시한다', () => {
      render(<InterviewSummary {...makeFullProps()} />);
      expect(screen.getByTestId('severity-HIGH')).toBeInTheDocument();
      expect(screen.getByTestId('severity-MEDIUM')).toBeInTheDocument();
    });

    it('개선 목표를 표시한다', () => {
      render(<InterviewSummary {...makeFullProps()} />);
      expect(screen.getByText('개선 목표')).toBeInTheDocument();
      expect(screen.getByText('데이터 처리 자동화')).toBeInTheDocument();
      expect(screen.getByText('고객 만족도 향상')).toBeInTheDocument();
    });

    it('개선 목표의 KPI 정보를 표시한다', () => {
      render(<InterviewSummary {...makeFullProps()} />);
      expect(screen.getByText(/KPI: 처리 시간/)).toBeInTheDocument();
      expect(screen.getByText(/50% 감소/)).toBeInTheDocument();
    });

    it('제약사항을 표시한다', () => {
      render(<InterviewSummary {...makeFullProps()} />);
      expect(screen.getByText('제약사항')).toBeInTheDocument();
      expect(screen.getByText('예산 3000만원 이내')).toBeInTheDocument();
    });

    it('메모를 표시한다', () => {
      render(<InterviewSummary {...makeFullProps()} />);
      expect(screen.getByText('메모')).toBeInTheDocument();
      expect(screen.getByText('2분기 내 도입 희망')).toBeInTheDocument();
    });

    it('기업 요구사항을 표시한다', () => {
      render(<InterviewSummary {...makeFullProps()} />);
      expect(screen.getByText('기업 요구사항')).toBeInTheDocument();
      expect(screen.getByText('보안 인증이 필요합니다.')).toBeInTheDocument();
    });
  });

  describe('빈 데이터 처리', () => {
    it('companyDetails가 null이면 시스템/AI 활용 경험 섹션을 숨긴다', () => {
      render(<InterviewSummary {...makeEmptyProps()} />);
      expect(screen.queryByText('시스템/AI 활용 경험')).not.toBeInTheDocument();
    });

    it('notes가 null이면 메모 섹션을 숨긴다', () => {
      render(<InterviewSummary {...makeEmptyProps()} />);
      expect(screen.queryByText('메모')).not.toBeInTheDocument();
    });

    it('customerRequirements가 null이면 기업 요구사항 섹션을 숨긴다', () => {
      render(<InterviewSummary {...makeEmptyProps()} />);
      expect(screen.queryByText('기업 요구사항')).not.toBeInTheDocument();
    });

    it('constraints가 비어있으면 제약사항 섹션을 숨긴다', () => {
      render(<InterviewSummary {...makeEmptyProps()} />);
      expect(screen.queryByText('제약사항')).not.toBeInTheDocument();
    });

    it('companyDetails에 systems_and_tools가 빈 배열이면 시스템/AI 활용 경험 섹션을 숨긴다', () => {
      render(
        <InterviewSummary
          {...makeEmptyProps()}
          companyDetails={{ systems_and_tools: [], ai_experience: '' }}
        />,
      );
      expect(screen.queryByText('시스템/AI 활용 경험')).not.toBeInTheDocument();
    });
  });

  describe('toInterviewSummaryProps 유틸 함수', () => {
    it('Supabase 행 데이터를 올바르게 변환한다', () => {
      const input = {
        company_details: { systems_and_tools: ['SAP'], ai_experience: '있음' },
        job_tasks: [{ task_name: '분석', task_description: '설명' }],
        pain_points: [{ description: '문제', severity: 'HIGH' }],
        improvement_goals: [{ goal_description: '목표', kpi: 'KPI', target_value: '100' }],
        constraints: [{ description: '제약' }],
        notes: '메모',
        customer_requirements: '요구사항',
      };

      const result = toInterviewSummaryProps(input);
      expect(result.companyDetails?.systems_and_tools).toEqual(['SAP']);
      expect(result.jobTasks).toHaveLength(1);
      expect(result.painPoints[0].severity).toBe('HIGH');
      expect(result.notes).toBe('메모');
    });

    it('null 값을 안전하게 처리한다', () => {
      const input = {
        company_details: null,
        job_tasks: null,
        pain_points: null,
        improvement_goals: null,
        constraints: null,
        notes: null,
        customer_requirements: null,
      };

      const result = toInterviewSummaryProps(input);
      expect(result.companyDetails).toBeNull();
      expect(result.jobTasks).toEqual([]);
      expect(result.painPoints).toEqual([]);
      expect(result.notes).toBeNull();
    });
  });
});
