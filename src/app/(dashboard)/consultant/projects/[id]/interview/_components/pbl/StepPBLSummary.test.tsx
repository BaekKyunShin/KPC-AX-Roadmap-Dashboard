import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import StepPBLSummary from './StepPBLSummary';
import type { ComponentProps } from 'react';
import type {
  PBLCourseOverview,
  PBLCompanyStatus,
  PBLTrainingEnvironment,
  PBLHrdNecessity,
  PBLPerformanceActivities,
  PBLProblemDefinition,
  PBLTargetTasks,
  PBLAILevelDiagnosis,
} from '@/lib/schemas/interview-pbl';

type Props = ComponentProps<typeof StepPBLSummary>;

function mkProps(overrides: Partial<Props> = {}): Props {
  const courseOverview: PBLCourseOverview = {
    company_name: '',
    business_registration_no: '',
    industry_code: '',
    industry_main: '',
    address: '',
    training_address: '',
    jurisdiction_office: '',
    contact: { position: '', name: '', phone: '', email: '' },
    course_name: '품질관리 AI 과정',
    ncs_code: '',
    training_hours: 40,
    trainee_count: 10,
    training_job: '품질',
    ai_level: 'AI탐구형',
    training_goals: ['불량률 감소', '공정 최적화'],
  };
  const companyStatus: PBLCompanyStatus = { business_issues: '', organization: [] };
  const trainingEnvironment: PBLTrainingEnvironment = {
    proper_training_hours: 0,
    training_place: { type: '사내', special_notes: '' },
    internal_instructor: { used: false, name: '', position: '' },
    target_count: 0,
    target_characteristics: { career: '', level: '' },
    ai_infrastructure: { ai_tools: '가능', network: '양호', pc_count: 0, etc_equipment: '' },
    training_needs_analysis: '',
    expectation: { as_is: '', to_be: '' },
  };
  const hrdNecessity: PBLHrdNecessity = {
    training_history: [],
    support_history: [],
    recommendations: [],
    course_development_necessity: '',
  };
  const performanceActivities: PBLPerformanceActivities = { performance_activities: [] };
  const problemDefinition: PBLProblemDefinition = {
    problem_definition: { background: '', core_problem: '', scope: '', constraints: '' },
    problem_priorities: [],
  };
  const targetTasks: PBLTargetTasks = {
    target_tasks: [],
    selection_reason: '',
    target_task_details: [],
  };
  const aiLevelDiagnosis: PBLAILevelDiagnosis = {
    current_ai_level: 'AI기초형',
    expected_ai_level: 'AI활용형',
    improvement_reason: '',
  };
  return {
    courseOverview,
    companyStatus,
    trainingEnvironment,
    hrdNecessity,
    performanceActivities,
    problemDefinition,
    targetTasks,
    aiLevelDiagnosis,
    onEditStep: vi.fn(),
    ...overrides,
  };
}

describe('StepPBLSummary', () => {
  it('확인·제출 제목과 8개 섹션이 렌더링된다', () => {
    render(<StepPBLSummary {...mkProps()} />);
    expect(screen.getByText('확인 · 제출')).toBeInTheDocument();
    expect(screen.getByText(/훈련과정 개요/)).toBeInTheDocument();
    expect(screen.getByText(/기업 현황 분석/)).toBeInTheDocument();
    expect(screen.getByText(/기업 훈련환경 분석/)).toBeInTheDocument();
    expect(screen.getByText(/AI 과정개발의 필요성/)).toBeInTheDocument();
    expect(screen.getByText(/훈련과제 도출 수행활동/)).toBeInTheDocument();
    expect(screen.getByText(/문제 도출·우선순위/)).toBeInTheDocument();
    expect(screen.getByText(/훈련대상 업무/)).toBeInTheDocument();
    expect(screen.getByText(/AI 수준 진단/)).toBeInTheDocument();
  });

  it('CourseOverview 필드 값이 표시된다', () => {
    render(<StepPBLSummary {...mkProps()} />);
    expect(screen.getByText('품질관리 AI 과정')).toBeInTheDocument();
    expect(screen.getByText('AI탐구형')).toBeInTheDocument();
    expect(screen.getByText(/불량률 감소/)).toBeInTheDocument();
  });

  it('수정 버튼 클릭 시 onEditStep 호출', async () => {
    const onEditStep = vi.fn();
    const user = userEvent.setup();
    render(<StepPBLSummary {...mkProps({ onEditStep })} />);
    const editButtons = screen.getAllByRole('button', { name: /수정/ });
    expect(editButtons.length).toBe(8);
    await user.click(editButtons[0]);
    expect(onEditStep).toHaveBeenCalledWith(1);
  });
});
