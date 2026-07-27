import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';

import { TabTraining, COURSE_SPECS_AUTOSAVE_DEBOUNCE_MS } from '../TabTraining';
import type { RoadmapVersionUI } from '@/types/roadmap-ui';
import type { RoadmapCourseSpec } from '@/lib/services/roadmap';

// ---------------------------------------------------------------------------
// 픽스처 — 산인공 양식 v2 훈련과정 명세서 (훈련시기·훈련수준·훈련방법)
// ---------------------------------------------------------------------------
function makeSpec(overrides: Partial<RoadmapCourseSpec> = {}): RoadmapCourseSpec {
  return {
    training_period: '2026년 1분기',
    training_level: 'INTERMEDIATE',
    course_name: 'ML 기초 과정',
    training_method: '집체',
    recommended_program: 'S-OJT',
    goal: '기초 지식 확보',
    main_content: '지도학습 / 비지도학습',
    target_audience: '현업 담당자',
    subjects: [
      { name: 'Python 기초', details: '문법·라이브러리', hours: 8 },
      { name: 'ML 입문', details: '선형회귀', hours: 16 },
    ],
    ...overrides,
  };
}

function makeVersion(overrides: Partial<RoadmapVersionUI> = {}): RoadmapVersionUI {
  return {
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
    course_specs: [makeSpec()],
    revision_prompt: null,
    is_shared: false,
    created_at: '2026-07-14T00:00:00Z',
    finalized_at: null,
    ...overrides,
  };
}

describe('TabTraining (Ⅲ. 훈련실시 계획 제안 — 양식 v2)', () => {
  it('훈련과정 명세서 1개 섹션만 렌더한다 (v1 4개 섹션 제목 미노출)', () => {
    render(<TabTraining version={makeVersion()} readOnly onEdit={vi.fn()} />);

    expect(screen.getByRole('heading', { name: 'Ⅲ. 훈련실시 계획 제안' })).toBeInTheDocument();
    // v1 은 Ⅲ-1 ~ Ⅲ-4 로 4개 SectionCard 를 열었다. v2 는 Ⅲ 섹션이 하나뿐.
    expect(screen.getAllByRole('heading', { name: /^Ⅲ/ })).toHaveLength(1);
  });

  it('v1 삭제 항목(역량 모델링·NCS·훈련체계도·연간 훈련계획)을 렌더하지 않는다', () => {
    const { container } = render(<TabTraining version={makeVersion()} readOnly onEdit={vi.fn()} />);
    const text = container.textContent ?? '';

    expect(text).not.toContain('역량 모델링');
    expect(text).not.toContain('NCS');
    expect(text).not.toContain('훈련체계도');
    expect(text).not.toContain('연간 훈련계획');
    expect(text).not.toContain('활용방안');
  });

  it('명세서의 v2 신규 필드(훈련시기·훈련수준)와 훈련방법을 표시한다', () => {
    render(<TabTraining version={makeVersion()} readOnly onEdit={vi.fn()} />);

    expect(screen.getByText('훈련시기')).toBeInTheDocument();
    expect(screen.getByText('2026년 1분기')).toBeInTheDocument();
    expect(screen.getByText('훈련수준')).toBeInTheDocument();
    // 훈련수준은 한글 라벨 배지 (영문 enum 미노출)
    expect(screen.getByText('중급')).toBeInTheDocument();
    expect(screen.queryByText('INTERMEDIATE')).not.toBeInTheDocument();
    expect(screen.getByText('훈련방법')).toBeInTheDocument();
    expect(screen.getByText('ML 기초 과정')).toBeInTheDocument();
    expect(screen.getByText('Python 기초')).toBeInTheDocument();
  });

  it('course_specs 가 비어 있고 readOnly 면 재생성 안내 placeholder 를 표시한다', () => {
    render(<TabTraining version={makeVersion({ course_specs: [] })} readOnly onEdit={vi.fn()} />);
    expect(screen.getByText(/훈련과정 명세서 가 아직 생성되지 않았습니다/)).toBeInTheDocument();
  });

  it('version 이 없으면 placeholder 를 표시한다 (편집 UI 미노출)', () => {
    render(<TabTraining version={null} readOnly={false} onEdit={vi.fn()} />);
    expect(screen.getByText(/훈련과정 명세서 가 아직 생성되지 않았습니다/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '명세서 추가' })).not.toBeInTheDocument();
  });

  it('readOnly 면 편집 컨트롤(명세서 추가·삭제)을 노출하지 않는다', () => {
    render(<TabTraining version={makeVersion()} readOnly onEdit={vi.fn()} />);
    expect(screen.queryByRole('button', { name: '명세서 추가' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '명세서 1 삭제' })).not.toBeInTheDocument();
    expect(screen.queryByLabelText('명세서 1 과정명')).not.toBeInTheDocument();
  });

  // ─── 편집 → 저장 (debounce autosave) ──────────────────────────────────
  describe('편집 저장 (course_specs patch)', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });
    afterEach(() => {
      vi.useRealTimers();
    });

    it('입력 중에는 저장하지 않고, 입력이 멈춘 뒤 course_specs 패치 1회로 저장한다', async () => {
      const onEdit = vi.fn().mockResolvedValue(undefined);
      render(<TabTraining version={makeVersion()} readOnly={false} onEdit={onEdit} />);

      const nameInput = screen.getByLabelText('명세서 1 과정명');
      fireEvent.change(nameInput, { target: { value: 'ML 심화 과정' } });

      // 키 입력마다 Server Action 이 호출되면 안 된다 (저장·재조회 폭주 방지)
      expect(onEdit).not.toHaveBeenCalled();
      // 입력값은 즉시 화면에 반영된다 (로컬 draft)
      expect(screen.getByLabelText('명세서 1 과정명')).toHaveValue('ML 심화 과정');

      await act(async () => {
        await vi.advanceTimersByTimeAsync(COURSE_SPECS_AUTOSAVE_DEBOUNCE_MS);
      });

      expect(onEdit).toHaveBeenCalledTimes(1);
      const patch = onEdit.mock.calls[0][0];
      expect(patch.course_specs).toHaveLength(1);
      expect(patch.course_specs[0]).toMatchObject({
        course_name: 'ML 심화 과정',
        training_period: '2026년 1분기',
        training_level: 'INTERMEDIATE',
        training_method: '집체',
      });
    });

    it('연속 입력은 마지막 값 1회만 저장한다 (debounce)', async () => {
      const onEdit = vi.fn().mockResolvedValue(undefined);
      render(<TabTraining version={makeVersion()} readOnly={false} onEdit={onEdit} />);

      const goalInput = screen.getByLabelText('명세서 1 훈련목표');
      fireEvent.change(goalInput, { target: { value: '실무' } });
      fireEvent.change(goalInput, { target: { value: '실무 적용' } });
      fireEvent.change(goalInput, { target: { value: '실무 적용 역량' } });

      await act(async () => {
        await vi.advanceTimersByTimeAsync(COURSE_SPECS_AUTOSAVE_DEBOUNCE_MS);
      });

      expect(onEdit).toHaveBeenCalledTimes(1);
      expect(onEdit.mock.calls[0][0].course_specs[0].goal).toBe('실무 적용 역량');
    });

    it('"명세서 추가" 클릭 시 course_specs 가 1개 늘어난 배열로 저장된다', async () => {
      const onEdit = vi.fn().mockResolvedValue(undefined);
      render(<TabTraining version={makeVersion()} readOnly={false} onEdit={onEdit} />);

      fireEvent.click(screen.getByRole('button', { name: '명세서 추가' }));

      await act(async () => {
        await vi.advanceTimersByTimeAsync(COURSE_SPECS_AUTOSAVE_DEBOUNCE_MS);
      });

      expect(onEdit).toHaveBeenCalledTimes(1);
      expect(onEdit.mock.calls[0][0].course_specs).toHaveLength(2);
    });

    // 회귀 가드 — 탭/버전 전환으로 언마운트될 때 대기 중인 편집이 사라지면 안 된다.
    it('저장 대기 중 언마운트되면 대기 중인 변경분을 즉시 저장한다', async () => {
      const onEdit = vi.fn().mockResolvedValue(undefined);
      const { unmount } = render(
        <TabTraining version={makeVersion()} readOnly={false} onEdit={onEdit} />
      );

      fireEvent.change(screen.getByLabelText('명세서 1 과정명'), {
        target: { value: '언마운트 직전 입력' },
      });
      expect(onEdit).not.toHaveBeenCalled();

      unmount();

      expect(onEdit).toHaveBeenCalledTimes(1);
      expect(onEdit.mock.calls[0][0].course_specs[0].course_name).toBe('언마운트 직전 입력');

      // 이미 flush 했으므로 debounce 타이머가 중복 저장하면 안 된다
      await act(async () => {
        await vi.advanceTimersByTimeAsync(COURSE_SPECS_AUTOSAVE_DEBOUNCE_MS * 2);
      });
      expect(onEdit).toHaveBeenCalledTimes(1);
    });

    it('편집이 없으면 언마운트 시에도 저장하지 않는다', () => {
      const onEdit = vi.fn().mockResolvedValue(undefined);
      const { unmount } = render(
        <TabTraining version={makeVersion()} readOnly={false} onEdit={onEdit} />
      );
      unmount();
      expect(onEdit).not.toHaveBeenCalled();
    });
  });
});
