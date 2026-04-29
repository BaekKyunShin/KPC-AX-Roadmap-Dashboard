import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

import { TabTraining } from '../TabTraining';
import type { ResultInterviewSnapshot } from '../types';
import type { RoadmapVersionUI } from '@/types/roadmap-ui';

// ---------------------------------------------------------------------------
// 인터뷰 입력값 (Ⅲ-1 역량 모델링) — 인터뷰 스키마 shape (단수 string 필드)
// ---------------------------------------------------------------------------
const interview: Partial<ResultInterviewSnapshot> = {
  competencies: [
    {
      name: 'AI 데이터 분석',
      definition: '업무 데이터를 AI로 분석·의사결정 지원',
      knowledge: 'ML 기초 / Python',
      skill: '데이터 파이프라인 구축',
      attitude: '결과 해석 책임감',
    },
  ],
  ncsUsed: true,
  ncsMethodology: '정보기술운영 NCS 능력단위 2개를 수정 반영',
};

// ---------------------------------------------------------------------------
// version 빈 상태 — Ⅲ-2~Ⅲ-4 LLM 결과 없음 (placeholder 노출 기대)
// ---------------------------------------------------------------------------
const emptyVersion: RoadmapVersionUI = {
  id: 'v1',
  version_number: 1,
  status: 'DRAFT',
  diagnosis_summary: '',
  setup_necessity: '',
  outcome_summary: {
    ai_competency_level: 'INTERMEDIATE',
    selected_tasks: '',
    main_content: '',
  },
  competencies: [],
  ncs_used: true,
  ncs_methodology: '',
  ncs_derivation_method: '',
  training_structure: [],
  training_structure_method: '',
  annual_plan: { items: [], usage_plan: '' },
  course_specs: [],
  revision_prompt: null,
  is_shared: false,
  created_at: '2026-04-24T00:00:00Z',
  finalized_at: null,
};

// ---------------------------------------------------------------------------
// version 완성 상태 — Ⅲ-2 / Ⅲ-3 / Ⅲ-4 LLM 결과 모두 존재
// ---------------------------------------------------------------------------
const filledVersion: RoadmapVersionUI = {
  ...emptyVersion,
  training_structure: [
    {
      competency_name: 'AI 데이터 분석',
      level: 'INTERMEDIATE',
      content: '실무 데이터셋 분석',
      target_audience: '현업 담당자',
      method: '집체 + 실습',
      goal: '자체 분석 역량 확보',
    },
  ],
  training_structure_method: '역량×3수준 매트릭스 기반',
  annual_plan: {
    items: [
      {
        competency_name: 'AI 데이터 분석',
        course_name: 'ML 기초 과정',
        format: '집체',
        hours: 40,
        notes: '1분기',
      },
    ],
    usage_plan: '내부 평가에 연 1회 반영',
  },
  course_specs: [
    {
      course_name: 'ML 기초 과정',
      format: '집체',
      recommended_program: 'S-OJT',
      goal: '기초 지식 확보',
      main_content: '지도학습 / 비지도학습',
      target_audience: '현업 담당자',
      subjects: [
        { name: 'Python 기초', details: '문법·라이브러리', hours: 8 },
        { name: 'ML 입문', details: '선형회귀', hours: 16 },
      ],
    },
  ],
};

describe('TabTraining (Ⅲ. 훈련체계)', () => {
  it('섹션 4개 — Ⅲ-1 · Ⅲ-2 · Ⅲ-3 · Ⅲ-4 — 모두 렌더', () => {
    render(
      <TabTraining
        version={emptyVersion}
        interview={interview}
        readOnly={false}
        onEdit={vi.fn()}
      />,
    );
    expect(screen.getByText(/Ⅲ-1\. 역량 모델링/)).toBeInTheDocument();
    expect(screen.getByText(/Ⅲ-2\. 훈련체계도/)).toBeInTheDocument();
    expect(screen.getByText(/Ⅲ-3\. 연간 훈련계획/)).toBeInTheDocument();
    expect(screen.getByText(/Ⅲ-4\. 훈련과정 명세서/)).toBeInTheDocument();
  });

  it('Ⅲ-1 역량 모델링 — 인터뷰 입력값을 그대로 표시', () => {
    render(
      <TabTraining
        version={emptyVersion}
        interview={interview}
        readOnly={false}
        onEdit={vi.fn()}
      />,
    );
    expect(screen.getByText('AI 데이터 분석')).toBeInTheDocument();
    expect(
      screen.getByText(/업무 데이터를 AI로 분석·의사결정 지원/),
    ).toBeInTheDocument();
    expect(screen.getByText('ML 기초 / Python')).toBeInTheDocument();
    expect(screen.getByText('데이터 파이프라인 구축')).toBeInTheDocument();
    expect(screen.getByText('결과 해석 책임감')).toBeInTheDocument();
  });

  it('Ⅲ-1 NCS 사용 시 ncsMethodology 값 렌더 (XOR)', () => {
    render(
      <TabTraining
        version={emptyVersion}
        interview={interview}
        readOnly
        onEdit={vi.fn()}
      />,
    );
    expect(
      screen.getByText(/정보기술운영 NCS 능력단위 2개를 수정 반영/),
    ).toBeInTheDocument();
  });

  it('Ⅲ-1 NCS 미사용 시 derivation 필드 렌더 (XOR)', () => {
    render(
      <TabTraining
        version={emptyVersion}
        interview={{
          ...interview,
          ncsUsed: false,
          ncsMethodology: undefined,
          ncsDerivationMethod: '사내 표준 역량모델 기반 도출',
        }}
        readOnly
        onEdit={vi.fn()}
      />,
    );
    expect(
      screen.getByText(/사내 표준 역량모델 기반 도출/),
    ).toBeInTheDocument();
  });

  it('Ⅲ-2~Ⅲ-4 LLM 결과가 없으면 "재생성 필요" placeholder 표시', () => {
    render(
      <TabTraining
        version={emptyVersion}
        interview={interview}
        readOnly
        onEdit={vi.fn()}
      />,
    );
    // 3섹션 placeholder 가 노출되어야 한다 (Ⅲ-2, Ⅲ-3, Ⅲ-4)
    expect(
      screen.getByText(/Ⅲ-2 훈련체계도 가 아직 생성되지 않았습니다/),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Ⅲ-3 연간 훈련계획 가 아직 생성되지 않았습니다/),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Ⅲ-4 훈련과정 상세 가 아직 생성되지 않았습니다/),
    ).toBeInTheDocument();
  });

  it('Ⅲ-2~Ⅲ-4 LLM 결과가 있으면 실제 값 렌더', () => {
    render(
      <TabTraining
        version={filledVersion}
        interview={interview}
        readOnly={false}
        onEdit={vi.fn()}
      />,
    );
    // Ⅲ-2 훈련체계도
    expect(screen.getByText('실무 데이터셋 분석')).toBeInTheDocument();
    expect(
      screen.getByText('역량×3수준 매트릭스 기반'),
    ).toBeInTheDocument();
    // R2 #15 — 훈련수준 영문 → 한글 (INTERMEDIATE → 중급)
    expect(screen.getByText('중급')).toBeInTheDocument();
    expect(screen.queryByText('INTERMEDIATE')).not.toBeInTheDocument();
    // Ⅲ-3 연간 훈련계획
    expect(screen.getByText('ML 기초 과정')).toBeInTheDocument();
    expect(screen.getByText('40시간')).toBeInTheDocument();
    expect(
      screen.getByText('내부 평가에 연 1회 반영'),
    ).toBeInTheDocument();
    // Ⅲ-4 훈련과정 명세서 (과목 세부)
    expect(screen.getByText(/Python 기초/)).toBeInTheDocument();
    expect(screen.getByText(/선형회귀/)).toBeInTheDocument();
  });

  // R3 #18 — Ⅲ-4 교과목이 표 형태(FormTable 3열 — 교과목명 / 세부 내용 / 훈련시간)
  it('Ⅲ-4 교과목 영역이 FormTable 3열 (교과목명 · 세부 내용 · 훈련시간) 로 표시된다 (#18)', () => {
    render(
      <TabTraining
        version={filledVersion}
        interview={interview}
        readOnly
        onEdit={vi.fn()}
      />,
    );
    // Ⅲ-4 교과목 표 — 교과목명 / 세부 내용 헤더 (Ⅲ-3 표에는 이 헤더 없음)
    expect(
      screen.getByRole('columnheader', { name: '교과목명' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('columnheader', { name: '세부 내용' }),
    ).toBeInTheDocument();
    // '훈련시간' 헤더는 Ⅲ-3·Ⅲ-4 양쪽에 등장 — 최소 1건 이상
    const hourHeaders = screen.getAllByRole('columnheader', {
      name: '훈련시간',
    });
    expect(hourHeaders.length).toBeGreaterThanOrEqual(1);
  });

  // R3 #17 — Ⅲ-4 교과목 details 가 줄바꿈/단원 경계로 머리기호 분리되어 표시
  it('Ⅲ-4 교과목 details 가 머리기호로 분리되어 표시된다 (#17)', () => {
    const versionWithMultiLineDetails: RoadmapVersionUI = {
      ...filledVersion,
      course_specs: [
        {
          ...filledVersion.course_specs[0],
          subjects: [
            {
              name: '데이터 전처리',
              details: '결측치 처리\n정규화\n샘플링',
              hours: 8,
            },
          ],
        },
      ],
    };
    render(
      <TabTraining
        version={versionWithMultiLineDetails}
        interview={interview}
        readOnly
        onEdit={vi.fn()}
      />,
    );
    // \n 분리 후 ul > li 3개 머리기호
    const items = screen.getAllByRole('listitem');
    const itemsText = items.map((li) => li.textContent ?? '');
    expect(itemsText).toEqual(
      expect.arrayContaining([
        expect.stringContaining('결측치 처리'),
        expect.stringContaining('정규화'),
        expect.stringContaining('샘플링'),
      ]),
    );
  });

  // PR #42 회귀 테스트 보강 — Ⅲ-2 수준 컬럼 한글 라벨 + 영문 미노출
  it('Ⅲ-2 수준 컬럼이 한글 라벨(초급/중급/고급)로 표시되고 영문 enum 은 미노출 (#15, PR #42 회귀)', () => {
    render(
      <TabTraining
        version={filledVersion}
        interview={interview}
        readOnly
        onEdit={vi.fn()}
      />,
    );
    expect(screen.getByText('중급')).toBeInTheDocument();
    expect(screen.queryByText('INTERMEDIATE')).not.toBeInTheDocument();
    expect(screen.queryByText('BEGINNER')).not.toBeInTheDocument();
    expect(screen.queryByText('ADVANCED')).not.toBeInTheDocument();
  });

  it('제외 라벨 3종 (표지 / 고정 참고자료 / 양식·결과 화면 제외) 와 NCS·수행일지 참고자료를 렌더하지 않음', () => {
    const { container } = render(
      <TabTraining
        version={filledVersion}
        interview={interview}
        readOnly
        onEdit={vi.fn()}
      />,
    );
    const text = container.textContent ?? '';
    expect(text).not.toContain('결과물 표지');
    expect(text).not.toContain('고정 참고자료');
    expect(text).not.toContain('고정 양식·결과 화면 제외');
    // 별첨 수행일지 / 진단모형 참고자료는 렌더 금지
    expect(text).not.toContain('수행일지');
    expect(text).not.toContain('진단모형');
    // [고정 참고자료] "NCS 능력단위요소별 지식·기술·태도 예시" 는 렌더 금지
    expect(text).not.toContain('NCS 능력단위요소별 지식·기술·태도 예시');
  });
});
