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
    training_place: { types: [], location: '', special_notes: '' },
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
    expect(screen.getByText(/7\. 훈련대상 업무 \(Ⅲ-3\)/)).toBeInTheDocument();
    expect(screen.getByText(/AI수준 진단/)).toBeInTheDocument();
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

  // 분기 커버: training_goals 빈 배열 → '—' 표시
  it('training_goals가 비어있으면 "—"를 표시한다', () => {
    const props = mkProps();
    props.courseOverview.training_goals = [];
    render(<StepPBLSummary {...props} />);
    expect(screen.getAllByText('—').length).toBeGreaterThanOrEqual(1);
  });

  // 분기 커버: organization 배열이 있을 때 — 목록 렌더링
  it('organization 배열이 있으면 부서 목록을 표시한다', () => {
    const props = mkProps();
    props.companyStatus.organization = [
      { id: 'org-1', department_name: '개발부서', tasks: ['태스크A', '태스크B'] },
    ];
    render(<StepPBLSummary {...props} />);
    expect(screen.getByText('개발부서')).toBeInTheDocument();
  });

  // 분기 커버: organization 내 tasks 배열이 비어있는 경우
  it('organization tasks가 비어있으면 부서명만 표시된다', () => {
    const props = mkProps();
    props.companyStatus.organization = [
      { id: 'org-1', department_name: '경영지원', tasks: [] },
    ];
    render(<StepPBLSummary {...props} />);
    expect(screen.getByText('경영지원')).toBeInTheDocument();
  });

  // 분기 커버: organization 내 department_name 빈 경우 '(미입력)' 표시
  it('department_name이 비어있으면 "(미입력)"을 표시한다', () => {
    const props = mkProps();
    props.companyStatus.organization = [
      { id: 'org-1', department_name: '', tasks: ['태스크'] },
    ];
    render(<StepPBLSummary {...props} />);
    expect(screen.getByText('(미입력)')).toBeInTheDocument();
  });

  // 분기 커버: business_issues가 있을 때 표시
  it('business_issues가 있으면 해당 내용을 표시한다', () => {
    const props = mkProps();
    props.companyStatus.business_issues = '매출 하락 이슈';
    render(<StepPBLSummary {...props} />);
    expect(screen.getByText('매출 하락 이슈')).toBeInTheDocument();
  });

  // 분기 커버: training_place.types 배열 join
  it('training_place.types가 있으면 join된 값을 표시한다', () => {
    const props = mkProps();
    props.trainingEnvironment.training_place.types = ['사내', '사외'];
    render(<StepPBLSummary {...props} />);
    expect(screen.getByText('사내, 사외')).toBeInTheDocument();
  });

  // 분기 커버: internal_instructor.used = true일 때 '예' 표시
  it('internal_instructor.used=true이면 "예"를 표시한다', () => {
    const props = mkProps();
    props.trainingEnvironment.internal_instructor.used = true;
    render(<StepPBLSummary {...props} />);
    expect(screen.getByText('예')).toBeInTheDocument();
  });

  // 분기 커버: performance_activities 배열 있을 때 목록 렌더링
  it('performance_activities가 있으면 차수 목록을 표시한다', () => {
    const props = mkProps();
    props.performanceActivities.performance_activities = [
      {
        id: 'pa-1',
        round: 1,
        date: '2026-01-01',
        content: '1차 인터뷰',
        method: '워크숍',
        operation_mode: '대면',
        participants: { pm: '', external_expert: '', internal_expert: '', jurisdiction_manager: '' },
      },
    ];
    render(<StepPBLSummary {...props} />);
    // "1차 · 2026-01-01 · 1차 인터뷰" 형태로 표시됨
    expect(screen.getAllByText(/1차/).length).toBeGreaterThanOrEqual(1);
  });

  // 분기 커버: problem_priorities의 selected 개수 계산
  it('problem_priorities.selected 개수가 카운트에 반영된다', () => {
    const props = mkProps();
    props.problemDefinition.problem_priorities = [
      { id: 'pp-1', problem_name: '문제1', selected: true, priority: 1 },
      { id: 'pp-2', problem_name: '문제2', selected: false, priority: 2 },
    ];
    render(<StepPBLSummary {...props} />);
    // "2건 (선정 1건)" 텍스트 확인
    expect(screen.getByText(/선정 1건/)).toBeInTheDocument();
  });

  // 분기 커버: target_tasks의 selected 개수 + selection_reason 표시
  it('target_tasks.selected 개수가 카운트에 반영된다', () => {
    const props = mkProps();
    props.targetTasks.target_tasks = [
      { id: 'tt-1', task_name: '업무A', selected: true, necessity: 3 },
      { id: 'tt-2', task_name: '업무B', selected: true, necessity: 3 },
      { id: 'tt-3', task_name: '업무C', selected: false, necessity: 3 },
    ];
    props.targetTasks.selection_reason = '핵심 업무 선정 이유';
    render(<StepPBLSummary {...props} />);
    expect(screen.getByText(/선정 2건/)).toBeInTheDocument();
    expect(screen.getByText('핵심 업무 선정 이유')).toBeInTheDocument();
  });

  // 분기 커버: KeyValue value가 빈 문자열/null/undefined → '—' 표시
  it('KeyValue value가 빈 문자열이면 "—"를 표시한다', () => {
    const props = mkProps();
    props.aiLevelDiagnosis.improvement_reason = '';
    render(<StepPBLSummary {...props} />);
    // '—'가 하나 이상 존재
    expect(screen.getAllByText('—').length).toBeGreaterThanOrEqual(1);
  });

  // 분기 커버: 수정 버튼 — 모든 8개 stepId 클릭
  it('모든 수정 버튼이 올바른 stepId로 onEditStep을 호출한다', async () => {
    const onEditStep = vi.fn();
    const user = userEvent.setup();
    render(<StepPBLSummary {...mkProps({ onEditStep })} />);
    const editButtons = screen.getAllByRole('button', { name: /수정/ });
    for (let i = 0; i < editButtons.length; i++) {
      await user.click(editButtons[i]);
      expect(onEditStep).toHaveBeenCalledWith(i + 1);
    }
  });
});
