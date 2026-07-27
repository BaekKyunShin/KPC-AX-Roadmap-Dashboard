import { describe, it, expect, vi, beforeEach } from 'vitest';
import { act, render, screen, fireEvent, waitFor } from '@testing-library/react';

// utils mock — toast 함수만 stub
vi.mock('@/lib/utils', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/utils')>();
  return {
    ...actual,
    showErrorToast: vi.fn(),
    showSuccessToast: vi.fn(),
  };
});

// next/navigation 의 useRouter 는 App Router 를 마운트하지 않는 테스트 환경에서
// invariant 예외를 발생시키므로 mock 해야 한다.
const routerPush = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: routerPush,
    replace: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    refresh: vi.fn(),
    prefetch: vi.fn(),
  }),
}));

// Server Action mocks
const saveRoadmapInterviewV2 = vi.fn();
const submitRoadmapInterviewV2 = vi.fn();
const uploadInterviewAttachment = vi.fn();
const extractSttInsights = vi.fn();
vi.mock('../../../actions', () => ({
  saveRoadmapInterviewV2: (...args: unknown[]) => saveRoadmapInterviewV2(...args),
  submitRoadmapInterviewV2: (...args: unknown[]) => submitRoadmapInterviewV2(...args),
  uploadInterviewAttachment: (...args: unknown[]) => uploadInterviewAttachment(...args),
  extractSttInsights: (...args: unknown[]) => extractSttInsights(...args),
}));

import { RoadmapInterviewClient, ROADMAP_STEPS } from '../RoadmapInterviewClient';

describe('RoadmapInterviewClient', () => {
  beforeEach(() => {
    saveRoadmapInterviewV2.mockReset();
    submitRoadmapInterviewV2.mockReset();
    uploadInterviewAttachment.mockReset();
    routerPush.mockReset();
  });

  it('PageHeader 와 첫 스텝(Ⅰ-1) 본문을 렌더한다', () => {
    render(<RoadmapInterviewClient projectId="p1" initial={{}} />);
    expect(
      screen.getByRole('heading', {
        name: /AI훈련로드맵 인터뷰/,
        level: 1,
      })
    ).toBeInTheDocument();
    // Ⅰ-1 StepNecessity 가 기본 활성화
    expect(screen.getByRole('heading', { name: '수립 필요성', level: 2 })).toBeInTheDocument();
  });

  // R2 #1 — 부제 "(양식 1:1 정합)" 사용자 화면 미노출 회귀 차단
  it('PageHeader 제목에 내부 라벨 "(양식 1:1 정합)" 이 표시되지 않는다', () => {
    render(<RoadmapInterviewClient projectId="p1" initial={{}} />);
    const heading = screen.getByRole('heading', {
      name: /AI훈련로드맵 인터뷰/,
      level: 1,
    });
    expect(heading.textContent).not.toContain('양식 1:1 정합');
    expect(heading.textContent?.trim()).toBe('AI훈련로드맵 인터뷰');
  });

  it('8개 스텝이 모두 정의되어 있고 stepperLabel(있으면) 또는 name 으로 노출된다', () => {
    render(<RoadmapInterviewClient projectId="p1" initial={{}} />);
    // v2: Ⅲ-1 역량 모델링 스텝이 삭제되어 9 → 8 스텝
    // 스테퍼는 데스크톱·모바일 모두 렌더되므로 같은 텍스트가 여러 번 등장할 수 있음
    expect(ROADMAP_STEPS).toHaveLength(8);
    for (const s of ROADMAP_STEPS) {
      // 스테퍼 노출 텍스트는 stepperLabel 이 있으면 그것, 없으면 name
      const visibleLabel = s.stepperLabel ?? s.name;
      expect(screen.getAllByText(visibleLabel).length).toBeGreaterThanOrEqual(1);
    }
  });

  it('마지막(8번째) Step 이 sttAttach 이고 required=false 이며 라벨이 "인터뷰 녹취 STT 첨부" 다', () => {
    const last = ROADMAP_STEPS[ROADMAP_STEPS.length - 1];
    expect(last.id).toBe(8);
    expect(last.stepId).toBe('sttAttach');
    expect(last.required).toBe(false);
    expect(last.name).toBe('인터뷰 녹취 STT 첨부');
    expect(last.shortName).toBe('선택');
  });

  it('역량 모델링(competencyModeling) 스텝은 v2 에서 삭제되어 정의되지 않는다', () => {
    // stepId 유니온에서 competencyModeling 이 제거됐으므로 런타임에서도 부재를 확인한다
    // (타입상 비교 불가 → String 캐스팅으로 회귀 가드만 남긴다)
    expect(ROADMAP_STEPS.some((s) => String(s.stepId) === 'competencyModeling')).toBe(false);
    expect(ROADMAP_STEPS.some((s) => s.name === '역량 모델링')).toBe(false);
  });

  it('PageHeader description 에 "총 8개 스텝" 문구가 포함된다', () => {
    render(<RoadmapInterviewClient projectId="p1" initial={{}} />);
    expect(screen.getByText(/총 8개 스텝/)).toBeInTheDocument();
  });

  it('마지막(8번째) Step(sttAttach) 진입 시 StepSttAttach 가 렌더되고 FormSection h2 는 풀텍스트, Stepper 는 단축 라벨을 노출한다', () => {
    render(<RoadmapInterviewClient projectId="p1" initial={{}} />);
    // 스테퍼는 단축 라벨 "인터뷰 STT" 로 클릭
    fireEvent.click(screen.getAllByText('인터뷰 STT')[0]);
    // FormSection h2 는 풀텍스트 "인터뷰 녹취 STT 첨부" 를 표시 (페이지 헤더는 풀)
    expect(
      screen.getByRole('heading', { name: '인터뷰 녹취 STT 첨부', level: 2 })
    ).toBeInTheDocument();
    // STT 파일 input 노출
    expect(screen.getByLabelText('STT 파일')).toBeInTheDocument();
  });

  it('"다음" 클릭 시 두 번째 스텝(Ⅰ-2) 으로 이동하고 실제 StepPerformanceActivities 가 렌더된다', () => {
    render(<RoadmapInterviewClient projectId="p1" initial={{}} />);
    fireEvent.click(screen.getByLabelText('다음 스텝'));
    // Ⅰ-2 performance — FormSection 헤더에 "주요 활동" h2
    expect(screen.getByRole('heading', { name: '주요 활동', level: 2 })).toBeInTheDocument();
    // 기본 3차수 프리필 확인
    expect(screen.getByText('1차')).toBeInTheDocument();
    expect(screen.getByText('2차')).toBeInTheDocument();
    expect(screen.getByText('3차')).toBeInTheDocument();
    // placeholder 문구는 사라져야 함
    expect(screen.queryByText(/Task 2.3-c 에서 구현됩니다/)).toBeNull();
  });

  it('Ⅰ-2 performanceActivities 편집 시 저장 Action 호출에 performanceActivities patch 가 포함된다', async () => {
    saveRoadmapInterviewV2.mockResolvedValue({ success: true });
    render(<RoadmapInterviewClient projectId="p1" initial={{}} />);
    fireEvent.click(screen.getByText('주요 활동'));
    fireEvent.change(screen.getByLabelText('1차 PM 성명'), {
      target: { value: '홍길동' },
    });
    fireEvent.click(screen.getByLabelText('수동 저장'));
    await waitFor(() => expect(saveRoadmapInterviewV2).toHaveBeenCalledTimes(1));
    const call = saveRoadmapInterviewV2.mock.calls[0][1];
    expect(call.performanceActivities).toBeDefined();
    expect(call.performanceActivities[0].pmName).toBe('홍길동');
  });

  it('Ⅱ-2 companyReq 스텝 진입 시 실제 StepCompanyRequirements 가 렌더된다', () => {
    render(<RoadmapInterviewClient projectId="p1" initial={{}} />);
    fireEvent.click(screen.getByText('기업 요구분석'));
    // StepCompanyRequirements 는 FormSection 헤더에 "Ⅱ-2" 표시
    expect(screen.getByRole('heading', { name: '기업 요구분석', level: 2 })).toBeInTheDocument();
    // placeholder 문구는 사라져야 함
    expect(screen.queryByText(/Task 2.3-c 에서 구현됩니다/)).toBeNull();
    // 4개 행머리글(구분 열)
    expect(screen.getByRole('rowheader', { name: '기업 현황' })).toBeInTheDocument();
  });

  // R3 #5 — 작성 안내 영역(ExampleAccordion guide)에 양식 √ 첫 문장 노출
  // description (서술형: "도출합니다.") 외 별도로 √ 안내 톤(명사절: "도출") 도 ExampleAccordion guide 에 노출되어야 한다
  it('Ⅱ-2 작성 안내 영역에 양식 √ 안내 "기업의 내부전문가와 면담을 통해 ... 구조적으로 도출" 이 노출된다 (#5)', () => {
    render(<RoadmapInterviewClient projectId="p1" initial={{}} />);
    fireEvent.click(screen.getByText('기업 요구분석'));
    // ExampleAccordion 의 "작성 안내" 섹션을 펼친 후 검증 (Radix Accordion closed 상태는 text query 에서 누락됨)
    fireEvent.click(screen.getByRole('button', { name: '작성 안내' }));
    const matches = screen.getAllByText(
      /기업의 내부전문가와 면담을 통해 현재 기업의 현황과 AI 도입·활용에 대한 요구를 구조적으로 도출/
    );
    // description 1건 + ExampleAccordion guide 1건 = 최소 2건
    expect(matches.length).toBeGreaterThanOrEqual(2);
  });

  // R3 #10 — Ⅱ-3 첨부 항목명 정정 (분석 노트 추가 첨부 → 추가 내부 자료)
  it('Ⅱ-3 첨부 항목명이 "추가 내부 자료" 로 표시된다 (#10)', () => {
    render(<RoadmapInterviewClient projectId="p1" initial={{}} />);
    // Stepper 는 단축 라벨 "과업·워크플로우" 로 클릭 (페이지 헤더 풀텍스트는 별도 검증)
    fireEvent.click(screen.getAllByText('과업·워크플로우')[0]);
    expect(screen.getByText('추가 내부 자료')).toBeInTheDocument();
    expect(screen.queryByText('분석 노트 추가 첨부')).not.toBeInTheDocument();
  });

  // v2 — Ⅱ-4 항목명 "훈련대상" → "AI 적용 대상" 개정
  it('Ⅱ-4 항목명이 "AI 적용 대상 과업(Task)·워크플로우 선정" 으로 표시된다', () => {
    render(<RoadmapInterviewClient projectId="p1" initial={{}} />);
    fireEvent.click(screen.getByText('AI 적용 대상 과업'));
    expect(
      screen.getByRole('heading', {
        name: 'AI 적용 대상 과업(Task)·워크플로우 선정',
        level: 2,
      })
    ).toBeInTheDocument();
  });

  // R3 공통-A — Ⅰ-2 양식 √ "별도 작성 불요" 안내 노출
  it('Ⅰ-2 작성 안내 영역에 양식 √ "별도 작성 불요" 안내가 노출된다 (공통-A)', () => {
    render(<RoadmapInterviewClient projectId="p1" initial={{}} />);
    fireEvent.click(screen.getByText('주요 활동'));
    fireEvent.click(screen.getByRole('button', { name: '작성 안내' }));
    expect(screen.getByText(/별도 작성 불요/)).toBeInTheDocument();
  });

  // R3 공통-A — Ⅰ-3 양식 √ "1장 이내로 요약하여 작성" 안내 노출
  it('Ⅰ-3 작성 안내 영역에 양식 √ "1장 이내로 요약하여 작성" 안내가 노출된다 (공통-A)', () => {
    render(<RoadmapInterviewClient projectId="p1" initial={{}} />);
    fireEvent.click(screen.getByText('수립 주요 결과'));
    fireEvent.click(screen.getByRole('button', { name: '작성 안내' }));
    expect(screen.getByText(/1장 이내로 요약하여 작성/)).toBeInTheDocument();
  });

  // R3 공통-A — Ⅱ-1 양식 √ "별도 작성 불요" + 등급 매핑 (초급 AI기초형 / 중급 AI탐구형) 노출
  it('Ⅱ-1 작성 안내 영역에 양식 √ "별도 작성 불요" + 등급 매핑 안내가 노출된다 (공통-A)', () => {
    render(<RoadmapInterviewClient projectId="p1" initial={{}} />);
    fireEvent.click(screen.getByText('HRD이음 PDF'));
    fireEvent.click(screen.getByRole('button', { name: '작성 안내' }));
    expect(screen.getByText(/별도 작성 불요/)).toBeInTheDocument();
    expect(screen.getByText(/초급.*AI기초형/)).toBeInTheDocument();
    expect(screen.getByText(/중급.*AI탐구형/)).toBeInTheDocument();
  });

  // R3 공통-A — Ⅱ-3 양식 √ "기업 내부전문가와의 인터뷰" + 양식 ◆ "공정 분석" 예시 노출
  it('Ⅱ-3 작성 안내 영역에 양식 √ "현행 방식 및 문제점 등을 파악하여 우선순위" 안내가 노출된다 (공통-A)', () => {
    render(<RoadmapInterviewClient projectId="p1" initial={{}} />);
    // Stepper 는 단축 라벨 "과업·워크플로우" 로 클릭 (페이지 헤더 풀텍스트는 별도 검증)
    fireEvent.click(screen.getAllByText('과업·워크플로우')[0]);
    fireEvent.click(screen.getByRole('button', { name: '작성 안내' }));
    expect(
      screen.getByText(
        /AI 도입·활용이 필요하다고 판단되는 과업의 현행 방식 및 문제점 등을 파악하여 우선순위/
      )
    ).toBeInTheDocument();
  });

  it('Ⅱ-3 taskAnalysis 스텝 진입 시 실제 StepTaskAnalysis 가 렌더된다', () => {
    render(<RoadmapInterviewClient projectId="p1" initial={{}} />);
    // Stepper 는 단축 라벨 "과업·워크플로우" 로 클릭 (페이지 헤더 풀텍스트는 별도 검증)
    fireEvent.click(screen.getAllByText('과업·워크플로우')[0]);
    expect(
      screen.getByRole('heading', { name: '과업(Task)·워크플로우 분석표', level: 2 })
    ).toBeInTheDocument();
    // 기본 5행 렌더 확인 (빈 taskAnalysis 배열 → defaultRows)
    expect(screen.getByLabelText('직무 5')).toBeInTheDocument();
    // v2: 각 행에 "개선점 및 AI 적용 가능성" 셀 존재 (문제점/데이터/AI필요도 통합)
    expect(screen.getByLabelText('개선점 5')).toBeInTheDocument();
    // v2: "분석내용"(taskAnalysisNote) 입력란은 삭제됨
    expect(screen.queryByLabelText('분석내용')).not.toBeInTheDocument();
  });

  it('Ⅱ-4 targetTask 스텝 진입 시 실제 StepTargetTask 가 렌더된다', () => {
    render(<RoadmapInterviewClient projectId="p1" initial={{}} />);
    fireEvent.click(screen.getByText('AI 적용 대상 과업'));
    expect(
      screen.getByRole('heading', {
        name: 'AI 적용 대상 과업(Task)·워크플로우 선정',
        level: 2,
      })
    ).toBeInTheDocument();
    // 기대 효과 rowSpan=2
    const 기대효과 = screen.getByText('기대효과');
    expect(기대효과.getAttribute('rowspan')).toBe('2');
  });

  it('Ⅱ-2 에서 textarea 편집 시 저장 Action 호출 시 companyRequirements patch 가 포함된다', async () => {
    saveRoadmapInterviewV2.mockResolvedValue({ success: true });
    render(<RoadmapInterviewClient projectId="p1" initial={{}} />);
    fireEvent.click(screen.getByText('기업 요구분석'));
    fireEvent.change(screen.getByLabelText('기업 현황'), {
      target: { value: '반도체 제조' },
    });
    fireEvent.click(screen.getByLabelText('수동 저장'));
    await waitFor(() => expect(saveRoadmapInterviewV2).toHaveBeenCalledTimes(1));
    expect(saveRoadmapInterviewV2).toHaveBeenCalledWith(
      'p1',
      expect.objectContaining({
        companyRequirements: expect.objectContaining({ status: '반도체 제조' }),
      }),
      { autoSave: true }
    );
  });

  it('스테퍼의 스텝(Ⅰ-3 mainResult) 직접 클릭 시 해당 본문이 렌더된다', () => {
    render(<RoadmapInterviewClient projectId="p1" initial={{}} />);
    // 데스크톱 스테퍼의 3번 버튼은 한글 절 제목 옆에 숫자 3 으로 렌더된다.
    // 가장 안전하게는 스테퍼의 절 제목 텍스트 (수립 주요 결과) 가 보이는 버튼을 클릭한다.
    // 다만 같은 텍스트가 본문에는 (현재 step Ⅰ-1 인 한) 없으므로 getByText 로 1건이다.
    fireEvent.click(screen.getByText('수립 주요 결과'));
    // mainResult 본문 — FormSection 의 [라벨] 으로 식별
    expect(screen.getByText('[인터뷰 입력 → 결과 페이지]')).toBeInTheDocument();
  });

  it('initial 데이터의 establishmentNecessity 가 Ⅰ-1 textarea 에 반영된다', () => {
    render(
      <RoadmapInterviewClient projectId="p1" initial={{ establishmentNecessity: '초기 필요성' }} />
    );
    expect(screen.getByLabelText('수립 필요성')).toHaveValue('초기 필요성');
  });

  it('Ⅰ-1 textarea 에 입력하면 내부 상태가 갱신되고, 저장 클릭 시 Server Action 에 전달된다', async () => {
    saveRoadmapInterviewV2.mockResolvedValue({ success: true });
    render(<RoadmapInterviewClient projectId="proj-9" initial={{}} />);

    fireEvent.change(screen.getByLabelText('수립 필요성'), {
      target: { value: '신규 필요성' },
    });
    fireEvent.click(screen.getByLabelText('수동 저장'));

    await waitFor(() => expect(saveRoadmapInterviewV2).toHaveBeenCalledTimes(1));
    expect(saveRoadmapInterviewV2).toHaveBeenCalledWith(
      'proj-9',
      expect.objectContaining({ establishmentNecessity: '신규 필요성' }),
      { autoSave: true }
    );
    await waitFor(() => expect(screen.getByText('자동 저장됨')).toBeInTheDocument());
  });

  it('저장 실패 시 saveIndicator 에 "저장 실패" 가 표시된다', async () => {
    saveRoadmapInterviewV2.mockResolvedValue({
      success: false,
      error: '권한이 없습니다',
    });
    render(<RoadmapInterviewClient projectId="p1" initial={{}} />);
    fireEvent.click(screen.getByLabelText('수동 저장'));
    await waitFor(() => expect(screen.getByText('저장 실패')).toBeInTheDocument());
  });

  it('마지막 스텝에서 "최종 제출" 버튼이 노출되고 strict 검증 통과 시 submit + 리다이렉트한다', async () => {
    submitRoadmapInterviewV2.mockResolvedValue({ success: true });
    // Strict 검증을 통과할 최소 데이터셋 (v2) — 모든 필수 필드 채움
    const validInitial = {
      establishmentNecessity: '필요성',
      performanceActivities: [
        {
          round: 1,
          date: '26.04.01',
          timeRange: '10:00~12:00',
          content: '인터뷰',
          method: 'ONSITE',
          pmName: 'PM',
          expertName: 'Expert',
        },
      ],
      aiLevel: 'BEGINNER' as const,
      selectedTask: '선정 과업',
      hrdReportPdf: null,
      companyRequirements: {
        status: '현황',
        problem: '문제',
        will: '의지',
        outcomes: '성과',
      },
      taskAnalysis: [
        {
          domain: '직무',
          task: '과업',
          asIs: 'AS-IS',
          improvement: '개선점 및 AI 적용 가능성',
        },
      ],
      taskAnalysisAttachment: null,
      targetTask: {
        name: 'AI 적용 과업',
        reason: '선정 사유',
        expectedAsIs: 'AS-IS',
        expectedToBe: 'TO-BE',
      },
    };
    render(<RoadmapInterviewClient projectId="p1" initial={validInitial} />);
    // 다음 클릭으로 마지막 스텝(sttAttach)까지 이동 — v2 8개 Step
    for (let i = 0; i < ROADMAP_STEPS.length - 1; i += 1) {
      fireEvent.click(screen.getByLabelText('다음 스텝'));
    }
    const submitBtn = screen.getByRole('button', { name: '최종 제출' });
    expect(submitBtn).toBeInTheDocument();
    fireEvent.click(submitBtn);
    await waitFor(() => expect(submitRoadmapInterviewV2).toHaveBeenCalledTimes(1));
    expect(submitRoadmapInterviewV2).toHaveBeenCalledWith('p1', expect.any(Object));
    await waitFor(() =>
      expect(routerPush).toHaveBeenCalledWith('/consultant/projects/p1/interview/review')
    );
  });

  it('strict 검증 실패 시 submit Action 은 호출되지 않는다 (빈 초기 데이터)', async () => {
    submitRoadmapInterviewV2.mockResolvedValue({ success: true });
    render(<RoadmapInterviewClient projectId="p1" initial={{}} />);
    for (let i = 0; i < ROADMAP_STEPS.length - 1; i += 1) {
      fireEvent.click(screen.getByLabelText('다음 스텝'));
    }
    fireEvent.click(screen.getByRole('button', { name: '최종 제출' }));
    // 비동기 제출 경로로 진입하지 않으므로 호출이 발생하지 않아야 한다.
    await new Promise((r) => setTimeout(r, 50));
    expect(submitRoadmapInterviewV2).not.toHaveBeenCalled();
    expect(routerPush).not.toHaveBeenCalled();
  });

  it('첫 스텝에서 "이전" 버튼은 비활성화된다', () => {
    render(<RoadmapInterviewClient projectId="p1" initial={{}} />);
    expect(screen.getByLabelText('이전 스텝')).toBeDisabled();
  });

  it('data 가 변경되면 500ms 후 자동저장 Action 이 호출된다 (debounce)', async () => {
    vi.useFakeTimers();
    try {
      saveRoadmapInterviewV2.mockResolvedValue({ success: true });
      render(<RoadmapInterviewClient projectId="p1" initial={{}} />);
      await act(async () => {
        fireEvent.change(screen.getByLabelText('수립 필요성'), {
          target: { value: '자동저장 검증' },
        });
      });
      // 500ms 전에는 아직 호출되지 않는다
      expect(saveRoadmapInterviewV2).not.toHaveBeenCalled();
      await act(async () => {
        vi.advanceTimersByTime(500);
        await vi.runAllTimersAsync();
      });
      expect(saveRoadmapInterviewV2).toHaveBeenCalledTimes(1);
      expect(saveRoadmapInterviewV2).toHaveBeenCalledWith(
        'p1',
        expect.objectContaining({ establishmentNecessity: '자동저장 검증' }),
        { autoSave: true }
      );
    } finally {
      vi.useRealTimers();
    }
  });
});
