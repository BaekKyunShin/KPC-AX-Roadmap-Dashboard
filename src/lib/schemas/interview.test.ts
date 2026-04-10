import { describe, it, expect } from 'vitest';
import {
  jobTaskSchema,
  painPointSchema,
  constraintSchema,
  improvementGoalSchema,
  interviewSchema,
  interviewAutoSaveSchema,
  interviewParticipantSchema,
  createEmptyJobTask,
  createEmptyPainPoint,
  createEmptyConstraint,
  createEmptyImprovementGoal,
  createEmptyParticipant,
} from './interview';

describe('interviewParticipantSchema', () => {
  const validParticipant = {
    id: 'p-1',
    name: '홍길동',
    position: '팀장',
  };

  it('유효한 참석자를 허용한다', () => {
    const result = interviewParticipantSchema.safeParse(validParticipant);
    expect(result.success).toBe(true);
  });

  it('직책 없는 참석자를 허용한다', () => {
    const result = interviewParticipantSchema.safeParse({
      id: 'p-1',
      name: '홍길동',
    });
    expect(result.success).toBe(true);
  });

  it('빈 이름을 거부한다', () => {
    const result = interviewParticipantSchema.safeParse({ ...validParticipant, name: '' });
    expect(result.success).toBe(false);
  });
});

describe('jobTaskSchema', () => {
  const validTask = {
    id: 'task-1',
    task_name: '데이터 입력',
    task_description: '고객 정보를 시스템에 입력하는 업무',
  };

  it('유효한 직무 과업을 허용한다', () => {
    const result = jobTaskSchema.safeParse(validTask);
    expect(result.success).toBe(true);
  });

  it('빈 과업명을 거부한다', () => {
    const result = jobTaskSchema.safeParse({ ...validTask, task_name: '' });
    expect(result.success).toBe(false);
  });

  it('빈 과업 설명을 거부한다', () => {
    const result = jobTaskSchema.safeParse({ ...validTask, task_description: '' });
    expect(result.success).toBe(false);
  });
});

describe('painPointSchema', () => {
  const validPainPoint = {
    id: 'pp-1',
    description: '데이터 입력 오류가 자주 발생함',
    severity: 'HIGH' as const,
  };

  it('유효한 페인포인트를 허용한다', () => {
    const result = painPointSchema.safeParse(validPainPoint);
    expect(result.success).toBe(true);
  });

  it('선택 필드가 포함된 페인포인트를 허용한다', () => {
    const result = painPointSchema.safeParse({
      ...validPainPoint,
      related_task_ids: ['task-1', 'task-2'],
    });
    expect(result.success).toBe(true);
  });

  it('빈 설명을 거부한다', () => {
    const result = painPointSchema.safeParse({ ...validPainPoint, description: '' });
    expect(result.success).toBe(false);
  });

  it('모든 유효한 심각도를 허용한다', () => {
    const severities = ['HIGH', 'MEDIUM', 'LOW'] as const;
    severities.forEach((severity) => {
      const result = painPointSchema.safeParse({ ...validPainPoint, severity });
      expect(result.success).toBe(true);
    });
  });
});

describe('constraintSchema', () => {
  const validConstraint = {
    id: 'c-1',
    type: 'DATA' as const,
    description: '데이터가 여러 시스템에 분산되어 있음',
    severity: 'MEDIUM' as const,
  };

  it('유효한 제약조건을 허용한다', () => {
    const result = constraintSchema.safeParse(validConstraint);
    expect(result.success).toBe(true);
  });

  it('모든 유효한 유형을 허용한다', () => {
    const types = ['DATA', 'SYSTEM', 'SECURITY', 'PERMISSION', 'OTHER'] as const;
    types.forEach((type) => {
      const result = constraintSchema.safeParse({ ...validConstraint, type });
      expect(result.success).toBe(true);
    });
  });

  it('빈 설명을 거부한다', () => {
    const result = constraintSchema.safeParse({ ...validConstraint, description: '' });
    expect(result.success).toBe(false);
  });
});

describe('improvementGoalSchema', () => {
  const validGoal = {
    id: 'g-1',
    goal_description: '데이터 입력 오류율 50% 감소',
  };

  it('유효한 개선 목표를 허용한다', () => {
    const result = improvementGoalSchema.safeParse(validGoal);
    expect(result.success).toBe(true);
  });

  it('모든 선택 필드가 포함된 목표를 허용한다', () => {
    const result = improvementGoalSchema.safeParse({
      ...validGoal,
      kpi: '입력 오류율',
      measurement_method: '월별 오류 건수 집계',
      target_value: '5% 이하',
      before_value: '10%',
      related_task_ids: ['task-1'],
    });
    expect(result.success).toBe(true);
  });

  it('빈 목표 설명을 거부한다', () => {
    const result = improvementGoalSchema.safeParse({ ...validGoal, goal_description: '' });
    expect(result.success).toBe(false);
  });
});

describe('interviewSchema', () => {
  const validInterview = {
    interview_date: '2024-01-15',
    interview_round: 1,
    interview_time: '09:00',
    participants: [
      {
        id: 'p-1',
        name: '홍길동',
        position: '팀장',
      },
    ],
    company_details: {
      systems_and_tools: ['ERP', 'CRM', 'MS Office'],
      ai_experience: '경험 없음',
    },
    job_tasks: [
      {
        id: 'task-1',
        task_name: '데이터 입력',
        task_description: '고객 정보 입력',
      },
    ],
    pain_points: [
      {
        id: 'pp-1',
        description: '수작업으로 인한 오류',
        severity: 'HIGH' as const,
      },
    ],
    improvement_goals: [
      {
        id: 'g-1',
        goal_description: '자동화를 통한 오류 감소',
      },
    ],
  };

  it('유효한 인터뷰 데이터를 허용한다', () => {
    const result = interviewSchema.safeParse(validInterview);
    expect(result.success).toBe(true);
  });

  it('빈 인터뷰 날짜를 거부한다', () => {
    const result = interviewSchema.safeParse({ ...validInterview, interview_date: '' });
    expect(result.success).toBe(false);
  });

  it('빈 참석자 배열을 거부한다', () => {
    const result = interviewSchema.safeParse({ ...validInterview, participants: [] });
    expect(result.success).toBe(false);
  });

  it('빈 직무 과업 배열을 거부한다', () => {
    const result = interviewSchema.safeParse({ ...validInterview, job_tasks: [] });
    expect(result.success).toBe(false);
  });

  it('빈 페인포인트 배열을 거부한다', () => {
    const result = interviewSchema.safeParse({ ...validInterview, pain_points: [] });
    expect(result.success).toBe(false);
  });

  it('빈 개선 목표 배열을 거부한다', () => {
    const result = interviewSchema.safeParse({ ...validInterview, improvement_goals: [] });
    expect(result.success).toBe(false);
  });
});

describe('interviewAutoSaveSchema', () => {
  // 자동저장 스키마는 구조/타입을 검증하되 min(1) 제약을 완화해야 함

  it('완전한 유효 데이터를 허용한다', () => {
    const result = interviewAutoSaveSchema.safeParse({
      interview_date: '2024-01-15',
      participants: [{ id: 'p-1', name: '홍길동', position: '팀장' }],
      company_details: { systems_and_tools: ['ERP'], ai_experience: '경험 없음' },
      job_tasks: [{ id: 'task-1', task_name: '업무', task_description: '설명' }],
      pain_points: [{ id: 'pp-1', description: '문제', severity: 'HIGH' }],
      improvement_goals: [{ id: 'g-1', goal_description: '개선' }],
    });
    expect(result.success).toBe(true);
  });

  it('빈 문자열을 허용한다 (작성 중인 데이터)', () => {
    const result = interviewAutoSaveSchema.safeParse({
      interview_date: '',
      participants: [{ id: 'p-1', name: '', position: '' }],
      company_details: { systems_and_tools: [], ai_experience: '' },
      job_tasks: [{ id: 'task-1', task_name: '', task_description: '' }],
      pain_points: [{ id: 'pp-1', description: '', severity: 'MEDIUM' }],
      improvement_goals: [{ id: 'g-1', goal_description: '' }],
    });
    expect(result.success).toBe(true);
  });

  it('빈 배열을 허용한다 (아직 항목 미추가)', () => {
    const result = interviewAutoSaveSchema.safeParse({
      interview_date: '',
      participants: [],
      company_details: { ai_experience: '' },
      job_tasks: [],
      pain_points: [],
      improvement_goals: [],
    });
    expect(result.success).toBe(true);
  });

  it('잘못된 enum 값을 거부한다', () => {
    const result = interviewAutoSaveSchema.safeParse({
      interview_date: '',
      participants: [],
      company_details: { ai_experience: '' },
      job_tasks: [],
      pain_points: [{ id: 'pp-1', description: '', severity: 'INVALID' }],
      improvement_goals: [],
    });
    expect(result.success).toBe(false);
  });

  it('잘못된 타입을 거부한다 (문자열 대신 숫자)', () => {
    const result = interviewAutoSaveSchema.safeParse({
      interview_date: 12345,
      participants: [],
      company_details: { ai_experience: '' },
      job_tasks: [],
      pain_points: [],
      improvement_goals: [],
    });
    expect(result.success).toBe(false);
  });

  it('잘못된 제약조건 유형 enum을 거부한다', () => {
    const result = interviewAutoSaveSchema.safeParse({
      interview_date: '',
      participants: [],
      company_details: { ai_experience: '' },
      job_tasks: [],
      pain_points: [],
      constraints: [{ id: 'c-1', type: 'WRONG', description: '', severity: 'LOW' }],
      improvement_goals: [],
    });
    expect(result.success).toBe(false);
  });
});

describe('helper functions', () => {
  describe('createEmptyParticipant', () => {
    it('유효한 빈 참석자를 생성한다', () => {
      const participant = createEmptyParticipant();
      expect(participant.id).toBeDefined();
      expect(participant.name).toBe('');
      expect(participant.position).toBe('');
    });

    it('고유한 ID를 생성한다', () => {
      const p1 = createEmptyParticipant();
      const p2 = createEmptyParticipant();
      expect(p1.id).not.toBe(p2.id);
    });
  });

  describe('createEmptyJobTask', () => {
    it('유효한 빈 직무 과업을 생성한다', () => {
      const task = createEmptyJobTask();
      expect(task.id).toBeDefined();
      expect(task.task_name).toBe('');
      expect(task.task_description).toBe('');
    });

    it('고유한 ID를 생성한다', () => {
      const task1 = createEmptyJobTask();
      const task2 = createEmptyJobTask();
      expect(task1.id).not.toBe(task2.id);
    });
  });

  describe('createEmptyPainPoint', () => {
    it('유효한 빈 페인포인트를 생성한다', () => {
      const pp = createEmptyPainPoint();
      expect(pp.id).toBeDefined();
      expect(pp.description).toBe('');
      expect(pp.severity).toBe('MEDIUM');
    });
  });

  describe('createEmptyConstraint', () => {
    it('유효한 빈 제약조건을 생성한다', () => {
      const constraint = createEmptyConstraint();
      expect(constraint.id).toBeDefined();
      expect(constraint.type).toBe('DATA');
      expect(constraint.description).toBe('');
      expect(constraint.severity).toBe('MEDIUM');
    });
  });

  describe('createEmptyImprovementGoal', () => {
    it('유효한 빈 개선 목표를 생성한다', () => {
      const goal = createEmptyImprovementGoal();
      expect(goal.id).toBeDefined();
      expect(goal.goal_description).toBe('');
      expect(goal.kpi).toBe('');
    });
  });
});
