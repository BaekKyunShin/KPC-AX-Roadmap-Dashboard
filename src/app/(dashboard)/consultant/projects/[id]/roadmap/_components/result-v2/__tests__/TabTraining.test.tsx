import { describe, it, expect, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';

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

  it('Ⅲ-2~Ⅲ-4 LLM 결과가 있으면 실제 값 렌더 (PR5 — EditableTable)', () => {
    render(
      <TabTraining
        version={filledVersion}
        interview={interview}
        readOnly
        onEdit={vi.fn()}
      />,
    );
    // Ⅲ-2 훈련체계도 (EditableTable readOnly — 셀 InlineEditField view 모드 평문)
    expect(screen.getByText('실무 데이터셋 분석')).toBeInTheDocument();
    expect(
      screen.getByText('역량×3수준 매트릭스 기반'),
    ).toBeInTheDocument();
    // R2 #15 — 훈련수준 영문 → 한글 (INTERMEDIATE → 중급) — 라벨 변환 유지
    expect(screen.getByText('중급')).toBeInTheDocument();
    expect(screen.queryByText('INTERMEDIATE')).not.toBeInTheDocument();
    // Ⅲ-3 연간 훈련계획 — 'ML 기초 과정' 은 Ⅲ-2 훈련체계도에도 등장 가능 → getAllByText
    expect(screen.getAllByText('ML 기초 과정').length).toBeGreaterThanOrEqual(1);
    // 훈련시간 셀은 number 로 표시 (이전 "40시간" 포맷 → 평문 "40")
    expect(screen.getAllByText('40').length).toBeGreaterThanOrEqual(1);
    expect(
      screen.getByText('내부 평가에 연 1회 반영'),
    ).toBeInTheDocument();
    // Ⅲ-4 훈련과정 명세서 — 교과목명·세부내용 모두 평문 표시
    expect(screen.getByText(/Python 기초/)).toBeInTheDocument();
    expect(screen.getByText(/선형회귀/)).toBeInTheDocument();
  });

  // PR5 (R6) — Ⅲ-4 교과목 영역은 EditableTable 3열 (교과목명 / 세부 내용 / 훈련시간)
  it('Ⅲ-4 교과목 영역이 EditableTable 3열 (교과목명 · 세부 내용 · 훈련시간) 로 표시된다', () => {
    render(
      <TabTraining
        version={filledVersion}
        interview={interview}
        readOnly
        onEdit={vi.fn()}
      />,
    );
    // EditableTable 3열 헤더
    expect(
      screen.getAllByRole('columnheader', { name: '교과목명' }).length,
    ).toBeGreaterThanOrEqual(1);
    // 세부 내용 헤더 텍스트는 라벨 prefix 까지 일치
    expect(
      screen.getByRole('columnheader', { name: /세부 내용/ }),
    ).toBeInTheDocument();
    // '훈련시간' 헤더 — Ⅲ-3·Ⅲ-4 양쪽 등장
    const hourHeaders = screen.getAllByRole('columnheader', {
      name: '훈련시간',
    });
    expect(hourHeaders.length).toBeGreaterThanOrEqual(1);
  });

  // PR5 (R6) — details 단일 항목 평문 + null 케이스 (EditableTable readOnly 셀 평문)
  it('Ⅲ-4 교과목 details 가 단일 항목이면 평문, 빈 값이면 placeholder 표시', () => {
    const versionWithEdgeDetails: RoadmapVersionUI = {
      ...filledVersion,
      course_specs: [
        {
          ...filledVersion.course_specs[0],
          subjects: [
            { name: '기초', details: '단일 내용', hours: 4 },
            { name: '실습', details: '', hours: 8 },
          ],
        },
      ],
    };
    render(
      <TabTraining
        version={versionWithEdgeDetails}
        interview={interview}
        readOnly
        onEdit={vi.fn()}
      />,
    );
    // 단일 항목 평문 표시
    expect(screen.getByText('단일 내용')).toBeInTheDocument();
    // 빈 details 는 InlineEditField 의 placeholder ("클릭하여 편집") 표시
    expect(screen.getAllByText('클릭하여 편집').length).toBeGreaterThan(0);
  });

  // R3 분기 보강 — Ⅲ-1 NCS 활용 시 onEdit 호출 분기 (TabTraining.tsx:167-168)
  it('Ⅲ-1 NCS 활용 InlineEditField 편집 후 저장 시 ncs_used: true patch 가 호출된다 (분기 커버)', async () => {
    const onEdit = vi.fn().mockResolvedValue(undefined);
    render(
      <TabTraining
        version={emptyVersion}
        interview={{
          ...interview,
          ncsUsed: true,
          ncsMethodology: '기존 방법',
        }}
        readOnly={false}
        onEdit={onEdit}
      />,
    );
    // view mode div 클릭 (role='button') 으로 편집 진입 → 텍스트 변경 → 저장 클릭
    fireEvent.click(screen.getByText('기존 방법'));
    const textarea = screen.getByDisplayValue('기존 방법');
    fireEvent.change(textarea, { target: { value: '변경된 방법' } });
    fireEvent.click(screen.getByLabelText('저장'));
    await waitFor(() => expect(onEdit).toHaveBeenCalled());
    expect(onEdit).toHaveBeenCalledWith(
      expect.objectContaining({ ncs_used: true, ncs_methodology: '변경된 방법' }),
    );
  });

  // R3 분기 보강 — version.competencies fallback (인터뷰 비었을 때 LLM 데이터 사용, TabTraining.tsx:36-44)
  it('인터뷰 competencies 가 비어 있으면 version.competencies LLM fallback 으로 표시 (분기 커버)', () => {
    const versionWithCompetencies: RoadmapVersionUI = {
      ...filledVersion,
      competencies: [
        {
          name: 'LLM 역량',
          definition: 'LLM 정의',
          knowledge: ['지식1'],
          skills: ['스킬1'],
          attitudes: ['태도1'],
        },
      ],
    };
    render(
      <TabTraining
        version={versionWithCompetencies}
        interview={{ competencies: [], ncsUsed: false, ncsDerivationMethod: '도출' }}
        readOnly
        onEdit={vi.fn()}
      />,
    );
    expect(screen.getByText('LLM 역량')).toBeInTheDocument();
    expect(screen.getByText('LLM 정의')).toBeInTheDocument();
  });

  // R3 분기 보강 — Ⅲ-2 훈련체계도 수립 방법 InlineEditField onSave 분기 (TabTraining.tsx:247-248)
  it('Ⅲ-2 훈련체계도 수립 방법 편집 후 저장 시 training_structure_method patch 가 호출된다 (분기 커버)', async () => {
    const onEdit = vi.fn().mockResolvedValue(undefined);
    render(
      <TabTraining
        version={filledVersion}
        interview={interview}
        readOnly={false}
        onEdit={onEdit}
      />,
    );
    fireEvent.click(screen.getByText('역량×3수준 매트릭스 기반'));
    const textarea = screen.getByDisplayValue('역량×3수준 매트릭스 기반');
    fireEvent.change(textarea, { target: { value: '신규 매트릭스' } });
    fireEvent.click(screen.getByLabelText('저장'));
    await waitFor(() => expect(onEdit).toHaveBeenCalled());
    expect(onEdit).toHaveBeenCalledWith(
      expect.objectContaining({ training_structure_method: '신규 매트릭스' }),
    );
  });

  // R3 분기 보강 — Ⅲ-1 NCS 미활용 시 onEdit 호출 분기 (TabTraining.tsx:181-182)
  it('Ⅲ-1 NCS 미활용 InlineEditField 편집 후 저장 시 ncs_used: false patch 가 호출된다 (분기 커버)', async () => {
    const onEdit = vi.fn().mockResolvedValue(undefined);
    render(
      <TabTraining
        version={emptyVersion}
        interview={{
          ...interview,
          ncsUsed: false,
          ncsMethodology: undefined,
          ncsDerivationMethod: '기존 도출',
        }}
        readOnly={false}
        onEdit={onEdit}
      />,
    );
    fireEvent.click(screen.getByText('기존 도출'));
    const textarea = screen.getByDisplayValue('기존 도출');
    fireEvent.change(textarea, { target: { value: '신규 도출 방법' } });
    fireEvent.click(screen.getByLabelText('저장'));
    await waitFor(() => expect(onEdit).toHaveBeenCalled());
    expect(onEdit).toHaveBeenCalledWith(
      expect.objectContaining({
        ncs_used: false,
        ncs_derivation_method: '신규 도출 방법',
      }),
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
