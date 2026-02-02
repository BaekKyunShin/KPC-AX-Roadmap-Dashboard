import { describe, it, expect } from 'vitest';
import {
  jobTaskSchema,
  painPointSchema,
  constraintSchema,
  improvementGoalSchema,
  interviewSchema,
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

  it('should accept valid participant', () => {
    const result = interviewParticipantSchema.safeParse(validParticipant);
    expect(result.success).toBe(true);
  });

  it('should accept participant without position', () => {
    const result = interviewParticipantSchema.safeParse({
      id: 'p-1',
      name: '홍길동',
    });
    expect(result.success).toBe(true);
  });

  it('should reject empty name', () => {
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

  it('should accept valid job task', () => {
    const result = jobTaskSchema.safeParse(validTask);
    expect(result.success).toBe(true);
  });

  it('should reject empty task name', () => {
    const result = jobTaskSchema.safeParse({ ...validTask, task_name: '' });
    expect(result.success).toBe(false);
  });

  it('should reject empty task description', () => {
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

  it('should accept valid pain point', () => {
    const result = painPointSchema.safeParse(validPainPoint);
    expect(result.success).toBe(true);
  });

  it('should accept pain point with optional fields', () => {
    const result = painPointSchema.safeParse({
      ...validPainPoint,
      related_task_ids: ['task-1', 'task-2'],
    });
    expect(result.success).toBe(true);
  });

  it('should reject empty description', () => {
    const result = painPointSchema.safeParse({ ...validPainPoint, description: '' });
    expect(result.success).toBe(false);
  });

  it('should accept all valid severities', () => {
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

  it('should accept valid constraint', () => {
    const result = constraintSchema.safeParse(validConstraint);
    expect(result.success).toBe(true);
  });

  it('should accept all valid types', () => {
    const types = ['DATA', 'SYSTEM', 'SECURITY', 'PERMISSION', 'OTHER'] as const;
    types.forEach((type) => {
      const result = constraintSchema.safeParse({ ...validConstraint, type });
      expect(result.success).toBe(true);
    });
  });

  it('should reject empty description', () => {
    const result = constraintSchema.safeParse({ ...validConstraint, description: '' });
    expect(result.success).toBe(false);
  });
});

describe('improvementGoalSchema', () => {
  const validGoal = {
    id: 'g-1',
    goal_description: '데이터 입력 오류율 50% 감소',
  };

  it('should accept valid improvement goal', () => {
    const result = improvementGoalSchema.safeParse(validGoal);
    expect(result.success).toBe(true);
  });

  it('should accept goal with all optional fields', () => {
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

  it('should reject empty goal description', () => {
    const result = improvementGoalSchema.safeParse({ ...validGoal, goal_description: '' });
    expect(result.success).toBe(false);
  });
});

describe('interviewSchema', () => {
  const validInterview = {
    interview_date: '2024-01-15',
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

  it('should accept valid interview data', () => {
    const result = interviewSchema.safeParse(validInterview);
    expect(result.success).toBe(true);
  });

  it('should reject empty interview date', () => {
    const result = interviewSchema.safeParse({ ...validInterview, interview_date: '' });
    expect(result.success).toBe(false);
  });

  it('should reject empty participants array', () => {
    const result = interviewSchema.safeParse({ ...validInterview, participants: [] });
    expect(result.success).toBe(false);
  });

  it('should reject empty job_tasks array', () => {
    const result = interviewSchema.safeParse({ ...validInterview, job_tasks: [] });
    expect(result.success).toBe(false);
  });

  it('should reject empty pain_points array', () => {
    const result = interviewSchema.safeParse({ ...validInterview, pain_points: [] });
    expect(result.success).toBe(false);
  });

  it('should reject empty improvement_goals array', () => {
    const result = interviewSchema.safeParse({ ...validInterview, improvement_goals: [] });
    expect(result.success).toBe(false);
  });
});

describe('helper functions', () => {
  describe('createEmptyParticipant', () => {
    it('should create a valid empty participant', () => {
      const participant = createEmptyParticipant();
      expect(participant.id).toBeDefined();
      expect(participant.name).toBe('');
      expect(participant.position).toBe('');
    });

    it('should create unique IDs', () => {
      const p1 = createEmptyParticipant();
      const p2 = createEmptyParticipant();
      expect(p1.id).not.toBe(p2.id);
    });
  });

  describe('createEmptyJobTask', () => {
    it('should create a valid empty job task', () => {
      const task = createEmptyJobTask();
      expect(task.id).toBeDefined();
      expect(task.task_name).toBe('');
      expect(task.task_description).toBe('');
    });

    it('should create unique IDs', () => {
      const task1 = createEmptyJobTask();
      const task2 = createEmptyJobTask();
      expect(task1.id).not.toBe(task2.id);
    });
  });

  describe('createEmptyPainPoint', () => {
    it('should create a valid empty pain point', () => {
      const pp = createEmptyPainPoint();
      expect(pp.id).toBeDefined();
      expect(pp.description).toBe('');
      expect(pp.severity).toBe('MEDIUM');
    });
  });

  describe('createEmptyConstraint', () => {
    it('should create a valid empty constraint', () => {
      const constraint = createEmptyConstraint();
      expect(constraint.id).toBeDefined();
      expect(constraint.type).toBe('DATA');
      expect(constraint.description).toBe('');
      expect(constraint.severity).toBe('MEDIUM');
    });
  });

  describe('createEmptyImprovementGoal', () => {
    it('should create a valid empty improvement goal', () => {
      const goal = createEmptyImprovementGoal();
      expect(goal.id).toBeDefined();
      expect(goal.goal_description).toBe('');
      expect(goal.kpi).toBe('');
    });
  });
});
