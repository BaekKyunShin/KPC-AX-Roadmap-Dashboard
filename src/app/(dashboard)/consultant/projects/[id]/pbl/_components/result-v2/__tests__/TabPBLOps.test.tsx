import { describe, it, expect, vi } from 'vitest';
import { render, screen, within, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { TabPBLOps } from '../TabPBLOps';
import type { PBLReportRow } from '@/lib/services/pbl/pbl-crud';
import type { PBLOperationPlan } from '@/lib/services/pbl/pbl-types';
import { createEmptyOutcomeAnalysis } from '@/lib/services/pbl/__fixtures__/empty-outcome-analysis';
import sampleResponse from '@/lib/services/pbl/__fixtures__/sample-llm-response.json';

function makeFilledVersion(overrides?: (op: PBLOperationPlan) => PBLOperationPlan): PBLReportRow {
  const base = makeEmptyVersion();
  const opFromFixture = (sampleResponse as { operation_plan: PBLOperationPlan }).operation_plan;
  const op = overrides ? overrides(opFromFixture) : opFromFixture;
  base.pbl_content.operation_plan = op;
  return base;
}

function makeEmptyVersion(): PBLReportRow {
  return {
    id: 'v1',
    project_id: 'p1',
    version_number: 1,
    status: 'DRAFT',
    consultant_profile_snapshot: {},
    diagnosis_summary: '',
    pbl_content: {
      operation_plan: {
        training_goal: '',
        outcome_metrics: createEmptyOutcomeAnalysis(),
        ai_tool_usage_plan: [],
        training_plan: {
          overview: { course_name: '', training_period: { start: '', end: '' } },
          learning_group: { instructors: [], trainees: [] },
          subject_profile: {
            course_name: '',
            total_hours: 0,
            training_goals: [],
            ai_tools: [],
            utilized_data: '',
            analysis_method: '',
            training_contents: [],
            total_sum_hours: 0,
          },
          facilities: [],
          training_instructors: [],
        },
        evaluation_plan: {
          course_evaluation: {
            course_name: '',
            evaluation_methods: [],
            evaluation_target: '',
            evaluation_date: '',
            evaluation_criteria: '',
            evaluation_result: '예정',
            performance_checklist: [],
            overall_comment: '',
            evaluation_scale: '',
          },
          result_evaluation: {
            satisfaction_survey: [],
            achievement_survey: [],
            external_expert_survey: [],
            practical_application_survey: [],
          },
        },
      },
    },
    free_tool_validated: true,
    time_limit_validated: true,
    revision_prompt: null,
    is_shared: false,
    like_count: 0,
    created_by: 'u1',
    finalized_by: null,
    finalized_at: null,
    created_at: '2026-04-24T00:00:00Z',
    updated_at: '2026-04-24T00:00:00Z',
  };
}

describe('TabPBLOps (Ⅳ. AI 기반 운영계획)', () => {
  it('9개 하위 섹션 렌더 (Ⅳ-1 / Ⅳ-2 성과분석 / Ⅳ-3 AI도구 / Ⅳ-4-가 ~ Ⅳ-4-마 / Ⅳ-5-가)', () => {
    render(<TabPBLOps version={makeEmptyVersion()} interview={{}} readOnly onEdit={vi.fn()} />);
    expect(screen.getByText(/Ⅳ-1\. 훈련 목표/)).toBeInTheDocument();
    expect(screen.getByText(/Ⅳ-2\. 성과분석 측정지표/)).toBeInTheDocument();
    expect(screen.getByText(/Ⅳ-3\. AI 도구 활용 계획/)).toBeInTheDocument();
    expect(screen.getByText(/Ⅳ-4-가\. 훈련과정 개요/)).toBeInTheDocument();
    expect(screen.getByText(/Ⅳ-4-나\. 학습그룹 구성/)).toBeInTheDocument();
    expect(screen.getByText(/Ⅳ-4-다\. 훈련 교과목 프로파일/)).toBeInTheDocument();
    expect(screen.getByText(/Ⅳ-4-라\. 시설·장비/)).toBeInTheDocument();
    expect(screen.getByText(/Ⅳ-4-마\. 훈련강사/)).toBeInTheDocument();
    expect(screen.getByText(/Ⅳ-5-가\. 과정평가 계획/)).toBeInTheDocument();
  });

  it('Ⅴ 성과분석 탭이 아니라 Ⅳ-2 성과분석 측정지표로 통합되었다 (구 Ⅴ장 → Ⅳ-2 이동)', () => {
    const v = makeFilledVersion();
    render(<TabPBLOps version={v} interview={{}} readOnly onEdit={vi.fn()} />);
    // sample fixture: selected_goals ["불량률 감소", "공정 최적화"] + 정량/정성 지표
    expect(screen.getByText(/Ⅳ-2\. 성과분석 측정지표/)).toBeInTheDocument();
    expect(screen.getByText('불량률 감소')).toBeInTheDocument();
    expect(screen.getByText('공정 최적화')).toBeInTheDocument();
    expect(screen.getByText('정량 지표')).toBeInTheDocument();
    expect(screen.getByText('정성 지표')).toBeInTheDocument();
    expect(screen.getByText(/훈련 이후 불량발생률 15% 감소/)).toBeInTheDocument();
  });

  it('Ⅳ-2 성과분석 — outcome_metrics 가 비어 있으면 placeholder 표출', () => {
    render(<TabPBLOps version={makeEmptyVersion()} interview={{}} readOnly onEdit={vi.fn()} />);
    const card = screen.getByText('Ⅳ-2. 성과분석 측정지표').closest('div');
    expect(card).not.toBeNull();
    // 빈 지표 → RegeneratePlaceholder 노출
    expect(
      screen.getByText(/Ⅳ-2 성과분석 측정지표 가 아직 생성되지 않았습니다/)
    ).toBeInTheDocument();
  });

  it('Ⅳ-5-나 결과평가 계획 [고정 양식·결과 화면 제외] — UI 에 렌더되지 않는다', () => {
    const { container } = render(
      <TabPBLOps version={makeEmptyVersion()} interview={{}} readOnly onEdit={vi.fn()} />
    );
    const text = container.textContent ?? '';
    expect(text).not.toContain('결과평가');
    expect(text).not.toContain('Ⅳ-5-나');
  });

  it('고정 설문 라벨 (만족도/성취도/외부전문가/현업적용도) 이 렌더되지 않는다', () => {
    const { container } = render(
      <TabPBLOps version={makeEmptyVersion()} interview={{}} readOnly onEdit={vi.fn()} />
    );
    const text = container.textContent ?? '';
    expect(text).not.toContain('만족도 조사');
    expect(text).not.toContain('성취도 조사');
    expect(text).not.toContain('외부전문가 만족도');
    expect(text).not.toContain('현업적용도');
  });

  it('LLM 결과가 비어 있을 때 각 섹션에 placeholder 표출', () => {
    render(<TabPBLOps version={makeEmptyVersion()} interview={{}} readOnly onEdit={vi.fn()} />);
    const placeholders = screen.getAllByText(/아직 생성되지 않았습니다/);
    // Ⅳ-1 ~ Ⅳ-5-가 총 9 개 섹션 placeholder (성과분석 Ⅳ-2 포함)
    expect(placeholders.length).toBeGreaterThanOrEqual(9);
  });

  it('Ⅳ-1 훈련 목표 값이 있으면 placeholder 대신 텍스트 표시', () => {
    const v = makeEmptyVersion();
    v.pbl_content.operation_plan.training_goal = '품질 검사 AI 보조 역량 확보';
    render(<TabPBLOps version={v} interview={{}} readOnly onEdit={vi.fn()} />);
    expect(screen.getByText('품질 검사 AI 보조 역량 확보')).toBeInTheDocument();
  });

  // ─── R9: Ⅳ-3 5 SectionCard 표 형태 변환 회귀 ────────────────────────────

  it('Ⅳ-4-가 — 과정명·훈련기간 셀이 mini-table 로 렌더', () => {
    const v = makeFilledVersion();
    render(<TabPBLOps version={v} interview={{}} readOnly onEdit={vi.fn()} />);
    // 과정명 행 — header + 값 셀
    const courseNameHeader = screen.getAllByText('과정명')[0];
    const courseNameRow = courseNameHeader.closest('tr');
    expect(courseNameRow).not.toBeNull();
    expect(
      within(courseNameRow as HTMLTableRowElement).getByRole('cell', {
        name: 'AI 비전검사 실무 역량 강화 과정',
      })
    ).toBeInTheDocument();
    // 훈련기간 행 — header + 기간 값 셀
    const periodHeader = screen.getByText('훈련기간');
    const periodRow = periodHeader.closest('tr');
    expect(periodRow).not.toBeNull();
    expect(
      within(periodRow as HTMLTableRowElement).getByRole('cell', {
        name: '2026-05-12 ~ 2026-06-13',
      })
    ).toBeInTheDocument();
  });

  it('Ⅳ-4-가 — start/end 한쪽이 비면 "-" 으로 fallback', () => {
    const v = makeFilledVersion((op) => ({
      ...op,
      training_plan: {
        ...op.training_plan,
        overview: {
          course_name: '테스트 과정',
          training_period: { start: '', end: '' },
        },
      },
    }));
    render(<TabPBLOps version={v} interview={{}} readOnly onEdit={vi.fn()} />);
    expect(screen.getByText('테스트 과정')).toBeInTheDocument();
    // 훈련기간 행의 값 셀에 '-' fallback
    const periodHeaderCell = screen.getByText('훈련기간');
    const periodRow = periodHeaderCell.closest('tr');
    expect(periodRow).not.toBeNull();
    expect(within(periodRow as HTMLTableRowElement).getByText('-')).toBeInTheDocument();
  });

  it('Ⅳ-4-라 — 시설·장비 5컬럼 표 렌더 (No / 구분 / 명칭 / 규격 / 위치)', () => {
    const v = makeFilledVersion();
    render(<TabPBLOps version={v} interview={{}} readOnly onEdit={vi.fn()} />);
    // 헤더 라벨 5개
    expect(screen.getByText('No')).toBeInTheDocument();
    expect(screen.getByText('명칭')).toBeInTheDocument();
    expect(screen.getByText('규격')).toBeInTheDocument();
    expect(screen.getByText('위치')).toBeInTheDocument();
    // 첫 facility 데이터 (sample fixture: '교육장' / '30인 수용 가능' / '본사 3층')
    expect(screen.getByRole('cell', { name: '교육장' })).toBeInTheDocument();
    expect(screen.getByRole('cell', { name: '30인 수용 가능' })).toBeInTheDocument();
    expect(screen.getByRole('cell', { name: '본사 3층' })).toBeInTheDocument();
  });

  it('Ⅳ-4-마 — 훈련강사 5컬럼 표 + detailed_training_content bullet 줄바꿈', () => {
    const v = makeFilledVersion();
    render(<TabPBLOps version={v} interview={{}} readOnly onEdit={vi.fn()} />);
    // 헤더 라벨 5개 (Ⅳ-3-마 고유 라벨 — '성명'은 Ⅳ-3-나 와 공유)
    expect(screen.getAllByText('성명').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('경력(년)')).toBeInTheDocument();
    expect(screen.getByText('담당 업무')).toBeInTheDocument();
    expect(screen.getByText('세부 훈련 내용')).toBeInTheDocument();
    // 첫 강사 데이터 (sample fixture)
    expect(screen.getAllByRole('cell', { name: '김AI컨설턴트' })[0]).toBeInTheDocument();
    expect(screen.getByRole('cell', { name: '10년' })).toBeInTheDocument();
    expect(screen.getByRole('cell', { name: 'AI 비전검사 시스템 설계' })).toBeInTheDocument();
    // 세부 훈련 내용 — bullet `• ` 머리기호 + 줄바꿈
    const detailCell = screen.getByText(/노코드 AI 도구.*Teachable/);
    expect(detailCell.textContent).toContain('• ');
    expect(detailCell.textContent).toMatch(/\n/);
    expect(detailCell).toHaveClass('whitespace-pre-wrap');
  });

  it('Ⅳ-4-나 — instructors + trainees 병합 표 (1+3=4행), 구분 라벨 합성', () => {
    const v = makeFilledVersion();
    render(<TabPBLOps version={v} interview={{}} readOnly onEdit={vi.fn()} />);
    // 헤더 라벨 6개 (Ⅳ-3-나 고유 라벨)
    expect(screen.getByText('유형')).toBeInTheDocument();
    expect(screen.getByText('역할')).toBeInTheDocument();
    expect(screen.getByText('소속')).toBeInTheDocument();
    expect(screen.getByText('직위')).toBeInTheDocument();
    // 구분 컬럼 라벨 — Python 측 _placeholders_pbl.py:471/482 와 동일 ("훈련 강사" / "훈련생")
    expect(screen.getAllByRole('cell', { name: '훈련 강사' }).length).toBeGreaterThanOrEqual(1);
    const traineeCells = screen.getAllByRole('cell', { name: '훈련생' });
    expect(traineeCells.length).toBe(3); // sample fixture: trainees 3명
    // 강사 정보 (sample fixture: '한국AI컨설팅' / '수석연구원')
    expect(screen.getByRole('cell', { name: '한국AI컨설팅' })).toBeInTheDocument();
    expect(screen.getByRole('cell', { name: '수석연구원' })).toBeInTheDocument();
  });

  it('Ⅳ-4-나 — instructors 만 있고 trainees 빈 배열인 부분 결손도 정상 렌더', () => {
    const v = makeFilledVersion((op) => ({
      ...op,
      training_plan: {
        ...op.training_plan,
        learning_group: {
          instructors: op.training_plan.learning_group.instructors,
          trainees: [],
        },
      },
    }));
    render(<TabPBLOps version={v} interview={{}} readOnly onEdit={vi.fn()} />);
    // 강사 1행만, 훈련생 0행
    expect(screen.getAllByRole('cell', { name: '훈련 강사' }).length).toBeGreaterThanOrEqual(1);
    expect(screen.queryAllByRole('cell', { name: '훈련생' })).toHaveLength(0);
    // placeholder 미노출 (Ⅳ-3-나 영역)
    const card = screen.getByText('Ⅳ-4-나. 학습그룹 구성').closest('div');
    expect(card).not.toBeNull();
  });

  it('Ⅳ-4-나 — trainees type 컬럼은 Python 측 default "내부" 와 동일하게 렌더', () => {
    const v = makeFilledVersion();
    render(<TabPBLOps version={v} interview={{}} readOnly onEdit={vi.fn()} />);
    // trainees 의 유형 컬럼은 항상 '내부' (sample fixture trainees 3명)
    const internals = screen.getAllByRole('cell', { name: '내부' });
    // instructors 1명 (외부) + trainees 3명 (내부) → '내부' 셀이 적어도 trainees 3개 이상 (internal_external 컬럼 포함)
    expect(internals.length).toBeGreaterThanOrEqual(3);
  });

  it('Ⅳ-4-다 — 메타 mini-table + training_contents 표 두 영역 분리 렌더', () => {
    const v = makeFilledVersion();
    render(<TabPBLOps version={v} interview={{}} readOnly onEdit={vi.fn()} />);
    // 메타 mini-table 헤더 라벨
    expect(screen.getByText('전체 훈련시간')).toBeInTheDocument();
    expect(screen.getByText('훈련 목표')).toBeInTheDocument();
    expect(screen.getByText('활용 AI 도구')).toBeInTheDocument();
    expect(screen.getByText('활용 데이터')).toBeInTheDocument();
    expect(screen.getByText('분석 방법')).toBeInTheDocument();
    expect(screen.getByText('합계 (자동 산출)')).toBeInTheDocument();
    // training_contents 표 헤더
    expect(screen.getByText('업무(단원)명')).toBeInTheDocument();
    expect(screen.getByText('세부 내용')).toBeInTheDocument();
    expect(screen.getByText('훈련시간(H)')).toBeInTheDocument();
    expect(screen.getByText('외부 강사 (H)')).toBeInTheDocument();
    expect(screen.getByText('내부 강사 (H)')).toBeInTheDocument();
    // 첫 training_content 데이터 (sample fixture)
    expect(screen.getByRole('cell', { name: 'AI 데이터 이해 및 수집' })).toBeInTheDocument();
  });

  it('Ⅳ-4-다 — training_goals 가 bullet "• " 머리기호로 렌더', () => {
    const v = makeFilledVersion();
    render(<TabPBLOps version={v} interview={{}} readOnly onEdit={vi.fn()} />);
    const goalsHeader = screen.getByText('훈련 목표');
    const goalsRow = goalsHeader.closest('tr');
    expect(goalsRow).not.toBeNull();
    const goalsCellText =
      within(goalsRow as HTMLTableRowElement).getAllByRole('cell')[0]?.textContent ?? '';
    expect(goalsCellText).toContain('• ');
  });

  it('Ⅳ-4-다 — training_contents 가 빈 배열이면 "교과목 행이 아직 입력되지 않았습니다" fallback', () => {
    const v = makeFilledVersion((op) => ({
      ...op,
      training_plan: {
        ...op.training_plan,
        subject_profile: {
          ...op.training_plan.subject_profile,
          training_contents: [],
        },
      },
    }));
    render(<TabPBLOps version={v} interview={{}} readOnly onEdit={vi.fn()} />);
    expect(screen.getByText('교과목 행이 아직 입력되지 않았습니다.')).toBeInTheDocument();
    // 메타 표는 정상 렌더
    expect(screen.getByText('전체 훈련시간')).toBeInTheDocument();
  });

  it('Ⅳ-4 5 영역 모두 <caption> 노드 (sr-only) 를 가진다 — a11y', () => {
    const v = makeFilledVersion();
    const { container } = render(
      <TabPBLOps version={v} interview={{}} readOnly onEdit={vi.fn()} />
    );
    const captions = Array.from(container.querySelectorAll('table > caption'));
    const captionTexts = captions.map((c) => c.textContent);
    // 5 SectionCard FormTable + 메타 mini-table = 최소 6 개 caption
    // (Ⅳ-3-가 1 + Ⅳ-3-나 1 + Ⅳ-3-다 메타 1 + Ⅳ-3-다 contents 1 + Ⅳ-3-라 1 + Ⅳ-3-마 1 = 6)
    expect(captions.length).toBeGreaterThanOrEqual(6);
    expect(captionTexts).toContain('훈련과정 개요');
    expect(captionTexts).toContain('학습그룹 구성');
    expect(captionTexts).toContain('훈련 교과목 프로파일 — 메타');
    expect(captionTexts).toContain('훈련 교과목 (단원별)');
    expect(captionTexts).toContain('시설·장비 목록');
    expect(captionTexts).toContain('훈련강사 명단');
  });

  it('Ⅳ-4-라 / Ⅳ-3-마 / Ⅳ-3-나 셀 fallback — 빈 문자열·null 시 "-" 노출', () => {
    const v = makeFilledVersion((op) => ({
      ...op,
      training_plan: {
        ...op.training_plan,
        learning_group: {
          instructors: [
            {
              type: '' as never,
              role: '' as never,
              affiliation: '',
              position: '',
              name: '',
            },
          ],
          trainees: [
            {
              role: '' as never,
              affiliation: '',
              position: '',
              name: '',
            },
          ],
        },
        facilities: [
          {
            seq: undefined as unknown as number,
            category: '' as never,
            name: '',
            spec: '',
            location: '',
          },
        ],
        training_instructors: [
          {
            name: '',
            internal_external: '' as never,
            career_years: undefined as unknown as number,
            work_name: '',
            detailed_training_content: [],
          },
        ],
      },
    }));
    render(<TabPBLOps version={v} interview={{}} readOnly onEdit={vi.fn()} />);
    // 빈 문자열·undefined 셀이 '-' 으로 fallback 되어 다수 발생
    const dashCells = screen.getAllByRole('cell', { name: '-' });
    expect(dashCells.length).toBeGreaterThanOrEqual(10);
  });

  it('Ⅳ-4-다 메타 표 — null/undefined 시 셀 fallback "-" 적용', () => {
    const v = makeFilledVersion((op) => ({
      ...op,
      training_plan: {
        ...op.training_plan,
        subject_profile: {
          course_name: '비어있음 테스트 과정',
          total_hours: undefined as unknown as number,
          training_goals: [],
          ai_tools: [],
          utilized_data: '',
          analysis_method: '',
          training_contents: [],
          total_sum_hours: undefined as unknown as number,
        },
      },
    }));
    render(<TabPBLOps version={v} interview={{}} readOnly onEdit={vi.fn()} />);
    // 메타 표의 utilized_data, analysis_method 등 빈 셀 → '-' 다수
    const dashCells = screen.getAllByRole('cell', { name: '-' });
    expect(dashCells.length).toBeGreaterThanOrEqual(2);
  });

  it('Ⅳ-4-다 training_contents — instructor_hours 부재 시 "-" fallback', () => {
    const v = makeFilledVersion((op) => ({
      ...op,
      training_plan: {
        ...op.training_plan,
        subject_profile: {
          ...op.training_plan.subject_profile,
          training_contents: [
            {
              unit_name: '단원 X',
              detail: '',
              training_hours: undefined as unknown as number,
              instructor_hours: undefined as unknown as {
                external: number;
                internal: number;
              },
            },
          ],
        },
      },
    }));
    render(<TabPBLOps version={v} interview={{}} readOnly onEdit={vi.fn()} />);
    expect(screen.getByRole('cell', { name: '단원 X' })).toBeInTheDocument();
    // instructor_hours undefined → 외부/내부/훈련시간 셀 모두 '-'
    expect(screen.getAllByRole('cell', { name: '-' }).length).toBeGreaterThanOrEqual(3);
  });

  it('Ⅳ-4 — "총 N 건" / "총 N 명" 카운트 줄글이 더 이상 노출되지 않음 (회귀)', () => {
    const v = makeFilledVersion();
    const { container } = render(
      <TabPBLOps version={v} interview={{}} readOnly onEdit={vi.fn()} />
    );
    const text = container.textContent ?? '';
    // 변경 전: "총 N 건" (시설·장비) / "총 N 명" (훈련강사) / "강사 N 명 · 훈련생 N 명" (학습그룹)
    expect(text).not.toMatch(/총 \d+ 건/);
    expect(text).not.toMatch(/총 \d+ 명/);
    expect(text).not.toMatch(/강사 \d+ 명 · 훈련생 \d+ 명/);
  });

  it('제외 라벨 ("결과보고서" / "수행일지" / "결과물 표지") 을 렌더하지 않음', () => {
    const { container } = render(
      <TabPBLOps version={makeEmptyVersion()} interview={{}} readOnly onEdit={vi.fn()} />
    );
    const text = container.textContent ?? '';
    expect(text).not.toContain('결과보고서');
    expect(text).not.toContain('수행일지');
    expect(text).not.toContain('결과물 표지');
  });

  // ─── operations 슬라이스 인라인 편집 (Ⅳ-3-다 detail / Ⅳ-3-마 detailed_training_content) ──

  it('Ⅳ-4-다 — readOnly=false 일 때 detail 셀 클릭 → InlineEditField 진입', async () => {
    const user = userEvent.setup();
    const v = makeFilledVersion();
    render(<TabPBLOps version={v} interview={{}} readOnly={false} onEdit={vi.fn()} />);

    // 첫 detail 셀 (sample fixture: "AI 학습 데이터 개념...")
    const cell = screen.getByText(/AI 학습 데이터 개념/);
    await user.click(cell);

    // textarea 등장 + 초기값에 detail 텍스트 포함
    const textarea = await screen.findByRole('textbox');
    expect(textarea.tagName).toBe('TEXTAREA');
    expect((textarea as HTMLTextAreaElement).value).toContain('AI 학습 데이터 개념');
  });

  it('Ⅳ-4-다 — detail 수정 후 저장 → onEdit payload 가 전체 training_contents 배열', async () => {
    const user = userEvent.setup();
    const onEdit = vi.fn().mockResolvedValue(undefined);
    const v = makeFilledVersion();
    render(<TabPBLOps version={v} interview={{}} readOnly={false} onEdit={onEdit} />);

    const cell = screen.getByText(/AI 학습 데이터 개념/);
    await user.click(cell);
    const textarea = (await screen.findByRole('textbox')) as HTMLTextAreaElement;

    fireEvent.change(textarea, { target: { value: '컨설턴트가 보강한 세부 내용' } });
    // 저장 버튼 클릭 (aria-label="저장")
    await user.click(screen.getByRole('button', { name: '저장' }));

    await waitFor(() => expect(onEdit).toHaveBeenCalled());
    const payload = onEdit.mock.calls[0][0];
    const contents = payload.operations.training_plan.subject_profile.training_contents;
    expect(Array.isArray(contents)).toBe(true);
    // 전체 배열 (sample fixture: 3행) 그대로 송신
    expect(contents).toHaveLength(3);
    // 첫 행 detail 만 변경
    expect(contents[0].detail).toBe('컨설턴트가 보강한 세부 내용');
    expect(contents[0].unit_name).toBe('AI 데이터 이해 및 수집');
    // 다른 행은 보존
    expect(contents[1].detail).toContain('Teachable Machine');
  });

  it('Ⅳ-4-마 — detailed_training_content 셀 편집모드 textarea 초기값 = bulletize 결과', async () => {
    const user = userEvent.setup();
    const v = makeFilledVersion();
    render(<TabPBLOps version={v} interview={{}} readOnly={false} onEdit={vi.fn()} />);

    const cell = screen.getByText(/노코드 AI 도구.*Teachable/);
    await user.click(cell);
    const textarea = (await screen.findByRole('textbox')) as HTMLTextAreaElement;
    // bullet `• ` prefix + 줄바꿈 분리
    expect(textarea.value).toMatch(/^•\s/);
    expect(textarea.value).toContain('\n');
  });

  it('Ⅳ-4-마 — bullet 줄 삭제 후 저장 → detailed_training_content 가 string[] 로 송신', async () => {
    const user = userEvent.setup();
    const onEdit = vi.fn().mockResolvedValue(undefined);
    const v = makeFilledVersion();
    render(<TabPBLOps version={v} interview={{}} readOnly={false} onEdit={onEdit} />);

    const cell = screen.getByText(/노코드 AI 도구.*Teachable/);
    await user.click(cell);
    const textarea = (await screen.findByRole('textbox')) as HTMLTextAreaElement;

    // 새 평문으로 교체 (3개 → 2개)
    fireEvent.change(textarea, { target: { value: '• 새 항목 1\n• 새 항목 2' } });
    await user.click(screen.getByRole('button', { name: '저장' }));

    await waitFor(() => expect(onEdit).toHaveBeenCalled());
    const payload = onEdit.mock.calls[0][0];
    const instructors = payload.operations.training_plan.training_instructors;
    expect(Array.isArray(instructors)).toBe(true);
    expect(instructors[0].detailed_training_content).toEqual(['새 항목 1', '새 항목 2']);
  });

  it('Ⅳ-4-마 — textarea 비우고 저장 시도 → onEdit 호출되지 않음 (빈 배열 차단)', async () => {
    const user = userEvent.setup();
    const onEdit = vi.fn().mockResolvedValue(undefined);
    const v = makeFilledVersion();
    render(<TabPBLOps version={v} interview={{}} readOnly={false} onEdit={onEdit} />);

    const cell = screen.getByText(/노코드 AI 도구.*Teachable/);
    await user.click(cell);
    const textarea = (await screen.findByRole('textbox')) as HTMLTextAreaElement;

    fireEvent.change(textarea, { target: { value: '   \n   ' } });
    await user.click(screen.getByRole('button', { name: '저장' }));

    // 잠시 대기 후 호출이 없음을 확인
    await new Promise((r) => setTimeout(r, 50));
    expect(onEdit).not.toHaveBeenCalled();
  });

  it('Ⅳ-4-다 / Ⅳ-3-마 — readOnly=true 면 클릭해도 textarea 진입 불가', async () => {
    const user = userEvent.setup();
    const v = makeFilledVersion();
    render(<TabPBLOps version={v} interview={{}} readOnly onEdit={vi.fn()} />);

    const detailCell = screen.getByText(/AI 학습 데이터 개념/);
    await user.click(detailCell);
    expect(screen.queryByRole('textbox')).toBeNull();
  });
});
