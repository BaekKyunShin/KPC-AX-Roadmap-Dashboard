import { render, screen } from '@testing-library/react';
import { describe, test, expect, vi, beforeEach } from 'vitest';
import TemplatePreview from './TemplatePreview';
import type {
  SelfAssessmentTemplate,
  SelfAssessmentQuestion,
} from '@/types/database';

// =============================================================================
// 모킹
// =============================================================================

vi.mock('@/components/ops/self-assessment', () => ({
  MAX_SCALE: 5,
}));

// =============================================================================
// 팩토리 함수
// =============================================================================

function makeQuestion(
  overrides: Partial<SelfAssessmentQuestion> = {},
): SelfAssessmentQuestion {
  return {
    id: crypto.randomUUID(),
    order: 1,
    dimension: '데이터 활용',
    question_text: '기본 질문',
    weight: 1,
    ...overrides,
  };
}

function makeTemplate(
  overrides: Partial<SelfAssessmentTemplate> = {},
): SelfAssessmentTemplate {
  return {
    id: crypto.randomUUID(),
    version: 1,
    name: '기본 템플릿',
    description: '기본 설명',
    questions: [],
    is_active: true,
    created_by: 'user-1',
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    ...overrides,
  };
}

// =============================================================================
// 테스트
// =============================================================================

describe('TemplatePreview', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('템플릿 이름이 표시된다', () => {
    const template = makeTemplate({ name: 'AI 역량 진단 v2' });
    render(<TemplatePreview template={template} />);

    expect(screen.getByText('AI 역량 진단 v2')).toBeInTheDocument();
  });

  test('템플릿 설명이 표시된다', () => {
    const template = makeTemplate({
      description: '조직의 AI 역량을 평가합니다',
    });
    render(<TemplatePreview template={template} />);

    expect(
      screen.getByText('조직의 AI 역량을 평가합니다'),
    ).toBeInTheDocument();
  });

  test('"총 N문항"이 올바르게 표시된다', () => {
    const questions = [
      makeQuestion({ order: 1 }),
      makeQuestion({ order: 2 }),
      makeQuestion({ order: 3 }),
    ];
    const template = makeTemplate({ questions });
    render(<TemplatePreview template={template} />);

    expect(screen.getByText('총 3문항')).toBeInTheDocument();
  });

  test('"N개 차원"이 올바르게 표시된다', () => {
    const questions = [
      makeQuestion({ dimension: '데이터 활용', order: 1 }),
      makeQuestion({ dimension: '업무 프로세스', order: 1 }),
      makeQuestion({ dimension: '조직 역량', order: 1 }),
    ];
    const template = makeTemplate({ questions });
    render(<TemplatePreview template={template} />);

    expect(screen.getByText('3개 차원')).toBeInTheDocument();
  });

  test('최대 점수가 정확히 계산된다 (5 x sum of weights)', () => {
    const questions = [
      makeQuestion({ weight: 2, order: 1 }),
      makeQuestion({ weight: 3, order: 2 }),
      makeQuestion({ weight: 1, order: 3 }),
    ];
    // MAX_SCALE=5, weights sum=6, maxScore=30.0
    const template = makeTemplate({ questions });
    render(<TemplatePreview template={template} />);

    expect(screen.getByText('최대 점수: 30.0점')).toBeInTheDocument();
  });

  test('질문을 차원별로 그룹화하여 표시한다', () => {
    const questions = [
      makeQuestion({
        dimension: '데이터 활용',
        question_text: '데이터 관련 질문',
        order: 1,
      }),
      makeQuestion({
        dimension: '업무 프로세스',
        question_text: '프로세스 관련 질문',
        order: 1,
      }),
    ];
    const template = makeTemplate({ questions });
    render(<TemplatePreview template={template} />);

    expect(screen.getByText(/데이터 활용/)).toBeInTheDocument();
    expect(screen.getByText(/업무 프로세스/)).toBeInTheDocument();
    expect(screen.getByText('데이터 관련 질문')).toBeInTheDocument();
    expect(screen.getByText('프로세스 관련 질문')).toBeInTheDocument();
  });

  test('각 차원의 문항 수가 올바르게 표시된다 "(N문항)"', () => {
    const questions = [
      makeQuestion({ dimension: '데이터 활용', order: 1 }),
      makeQuestion({ dimension: '데이터 활용', order: 2 }),
      makeQuestion({ dimension: '업무 프로세스', order: 1 }),
    ];
    const template = makeTemplate({ questions });
    render(<TemplatePreview template={template} />);

    expect(screen.getByText(/데이터 활용 \(2문항\)/)).toBeInTheDocument();
    expect(screen.getByText(/업무 프로세스 \(1문항\)/)).toBeInTheDocument();
  });

  test('질문이 order 순서로 정렬된다', () => {
    const questions = [
      makeQuestion({
        dimension: '데이터 활용',
        question_text: '세 번째',
        order: 3,
      }),
      makeQuestion({
        dimension: '데이터 활용',
        question_text: '첫 번째',
        order: 1,
      }),
      makeQuestion({
        dimension: '데이터 활용',
        question_text: '두 번째',
        order: 2,
      }),
    ];
    const template = makeTemplate({ questions });
    render(<TemplatePreview template={template} />);

    const orderMarkers = screen.getAllByText(/#\d/);
    expect(orderMarkers[0]).toHaveTextContent('#1');
    expect(orderMarkers[1]).toHaveTextContent('#2');
    expect(orderMarkers[2]).toHaveTextContent('#3');
  });

  test('각 질문의 가중치가 표시된다', () => {
    const questions = [
      makeQuestion({ weight: 2, order: 1 }),
      makeQuestion({ weight: 5, order: 2 }),
    ];
    const template = makeTemplate({ questions });
    render(<TemplatePreview template={template} />);

    expect(screen.getByText('가중치: 2')).toBeInTheDocument();
    expect(screen.getByText('가중치: 5')).toBeInTheDocument();
  });

  test('질문이 없는 템플릿은 차원 헤더 없이 렌더링된다', () => {
    const template = makeTemplate({ questions: [] });
    render(<TemplatePreview template={template} />);

    expect(screen.getByText('총 0문항')).toBeInTheDocument();
    expect(screen.getByText('0개 차원')).toBeInTheDocument();
    expect(screen.getByText('최대 점수: 0.0점')).toBeInTheDocument();
    // 차원 헤더가 없어야 함
    expect(screen.queryByText(/문항\)/)).not.toBeInTheDocument();
  });

  test('설명이 없는 템플릿은 설명 요소를 렌더링하지 않는다', () => {
    const template = makeTemplate({ description: undefined });
    render(<TemplatePreview template={template} />);

    expect(screen.getByText(template.name)).toBeInTheDocument();
    // description이 없으면 <p> 요소가 렌더링되지 않음
    const header = screen.getByText(template.name).closest('div');
    const descriptionParagraph = header?.querySelector('p');
    expect(descriptionParagraph).toBeNull();
  });
});
