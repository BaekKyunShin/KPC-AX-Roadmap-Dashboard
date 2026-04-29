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
vi.mock('../../../actions', () => ({
  saveRoadmapInterviewV2: (...args: unknown[]) => saveRoadmapInterviewV2(...args),
  submitRoadmapInterviewV2: (...args: unknown[]) => submitRoadmapInterviewV2(...args),
  uploadInterviewAttachment: (...args: unknown[]) => uploadInterviewAttachment(...args),
}));

import {
  RoadmapInterviewClient,
  ROADMAP_STEPS,
} from '../RoadmapInterviewClient';

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
      }),
    ).toBeInTheDocument();
    // Ⅰ-1 StepNecessity 가 기본 활성화
    expect(
      screen.getByRole('heading', { name: '수립 필요성', level: 2 }),
    ).toBeInTheDocument();
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

  it('8개 스텝이 모두 정의되어 있고 양식 번호를 노출한다', () => {
    render(<RoadmapInterviewClient projectId="p1" initial={{}} />);
    // 스테퍼는 데스크톱·모바일 모두 렌더되므로 같은 텍스트가 여러 번 등장할 수 있음
    expect(ROADMAP_STEPS).toHaveLength(8);
    for (const s of ROADMAP_STEPS) {
      expect(screen.getAllByText(s.name).length).toBeGreaterThanOrEqual(1);
    }
  });

  it('"다음" 클릭 시 두 번째 스텝(Ⅰ-2) 으로 이동하고 실제 StepPerformanceActivities 가 렌더된다', () => {
    render(<RoadmapInterviewClient projectId="p1" initial={{}} />);
    fireEvent.click(screen.getByLabelText('다음 스텝'));
    // Ⅰ-2 performance — FormSection 헤더에 "주요 활동" h2
    expect(
      screen.getByRole('heading', { name: '주요 활동', level: 2 }),
    ).toBeInTheDocument();
    // 기본 3차수 프리필 확인
    expect(screen.getByText('1차')).toBeInTheDocument();
    expect(screen.getByText('2차')).toBeInTheDocument();
    expect(screen.getByText('3차')).toBeInTheDocument();
    // placeholder 문구는 사라져야 함
    expect(screen.queryByText(/Task 2.3-c 에서 구현됩니다/)).toBeNull();
  });

  it('Ⅲ-1 competencyModeling 스텝 진입 시 실제 StepCompetencyModeling 이 렌더된다', () => {
    render(<RoadmapInterviewClient projectId="p1" initial={{}} />);
    fireEvent.click(screen.getByText('역량 모델링'));
    expect(
      screen.getByRole('heading', { name: '역량 모델링', level: 2 }),
    ).toBeInTheDocument();
    // 기본 4행 확인
    expect(screen.getByLabelText('역량명 4')).toBeInTheDocument();
    // 기본 ncsUsed=false → 역량별 도출 방법 박스
    expect(screen.getByLabelText('역량별 도출 방법')).toBeInTheDocument();
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
    await waitFor(() =>
      expect(saveRoadmapInterviewV2).toHaveBeenCalledTimes(1),
    );
    const call = saveRoadmapInterviewV2.mock.calls[0][1];
    expect(call.performanceActivities).toBeDefined();
    expect(call.performanceActivities[0].pmName).toBe('홍길동');
  });

  it('Ⅲ-1 역량 편집 시 저장 Action 호출에 competencies patch 가 포함된다', async () => {
    saveRoadmapInterviewV2.mockResolvedValue({ success: true });
    render(<RoadmapInterviewClient projectId="p1" initial={{}} />);
    fireEvent.click(screen.getByText('역량 모델링'));
    fireEvent.change(screen.getByLabelText('역량명 1'), {
      target: { value: 'AI 리터러시' },
    });
    fireEvent.click(screen.getByLabelText('수동 저장'));
    await waitFor(() =>
      expect(saveRoadmapInterviewV2).toHaveBeenCalledTimes(1),
    );
    const call = saveRoadmapInterviewV2.mock.calls[0][1];
    expect(call.competencies).toBeDefined();
    expect(call.competencies[0].name).toBe('AI 리터러시');
  });

  it('Ⅱ-2 companyReq 스텝 진입 시 실제 StepCompanyRequirements 가 렌더된다', () => {
    render(<RoadmapInterviewClient projectId="p1" initial={{}} />);
    fireEvent.click(screen.getByText('기업 요구분석'));
    // StepCompanyRequirements 는 FormSection 헤더에 "Ⅱ-2" 표시
    expect(
      screen.getByRole('heading', { name: '기업 요구분석', level: 2 }),
    ).toBeInTheDocument();
    // placeholder 문구는 사라져야 함
    expect(screen.queryByText(/Task 2.3-c 에서 구현됩니다/)).toBeNull();
    // 4개 행머리글(구분 열)
    expect(screen.getByRole('rowheader', { name: '기업 현황' })).toBeInTheDocument();
  });

  it('Ⅱ-3 taskAnalysis 스텝 진입 시 실제 StepTaskAnalysis 가 렌더된다', () => {
    render(<RoadmapInterviewClient projectId="p1" initial={{}} />);
    fireEvent.click(screen.getByText('과업·워크플로우 분석'));
    expect(
      screen.getByRole('heading', { name: '과업·워크플로우 분석', level: 2 }),
    ).toBeInTheDocument();
    // 기본 5행 렌더 확인 (빈 taskAnalysis 배열 → defaultRows)
    expect(screen.getByLabelText('직무 5')).toBeInTheDocument();
    // 분석내용 textarea 존재
    expect(screen.getByLabelText('분석내용')).toBeInTheDocument();
  });

  it('Ⅱ-4 targetTask 스텝 진입 시 실제 StepTargetTask 가 렌더된다', () => {
    render(<RoadmapInterviewClient projectId="p1" initial={{}} />);
    fireEvent.click(screen.getByText('훈련대상 과업'));
    expect(
      screen.getByRole('heading', { name: '훈련대상 과업 선정', level: 2 }),
    ).toBeInTheDocument();
    // 기대 효과 rowSpan=2
    const 기대효과 = screen.getByText('기대 효과');
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
    await waitFor(() =>
      expect(saveRoadmapInterviewV2).toHaveBeenCalledTimes(1),
    );
    expect(saveRoadmapInterviewV2).toHaveBeenCalledWith(
      'p1',
      expect.objectContaining({
        companyRequirements: expect.objectContaining({ status: '반도체 제조' }),
      }),
      { autoSave: true },
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
      <RoadmapInterviewClient
        projectId="p1"
        initial={{ establishmentNecessity: '초기 필요성' }}
      />,
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

    await waitFor(() =>
      expect(saveRoadmapInterviewV2).toHaveBeenCalledTimes(1),
    );
    expect(saveRoadmapInterviewV2).toHaveBeenCalledWith(
      'proj-9',
      expect.objectContaining({ establishmentNecessity: '신규 필요성' }),
      { autoSave: true },
    );
    await waitFor(() =>
      expect(screen.getByText('자동 저장됨')).toBeInTheDocument(),
    );
  });

  it('저장 실패 시 saveIndicator 에 "저장 실패" 가 표시된다', async () => {
    saveRoadmapInterviewV2.mockResolvedValue({
      success: false,
      error: '권한이 없습니다',
    });
    render(<RoadmapInterviewClient projectId="p1" initial={{}} />);
    fireEvent.click(screen.getByLabelText('수동 저장'));
    await waitFor(() =>
      expect(screen.getByText('저장 실패')).toBeInTheDocument(),
    );
  });

  it('마지막 스텝에서 "최종 제출" 버튼이 노출되고 strict 검증 통과 시 submit + 리다이렉트한다', async () => {
    submitRoadmapInterviewV2.mockResolvedValue({ success: true });
    // Strict 검증을 통과할 최소 데이터셋 — 모든 필수 필드 채움, NCS 미활용
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
          problem: '문제점',
          dataTiming: '데이터',
          aiScore: 3,
        },
      ],
      taskAnalysisNote: '분석 노트',
      taskAnalysisAttachment: null,
      targetTask: {
        name: '훈련 과업',
        reason: '선정 사유',
        expectedAsIs: 'AS-IS',
        expectedToBe: 'TO-BE',
      },
      competencies: [
        {
          name: '역량',
          definition: '정의',
          knowledge: '지식',
          skill: '기술',
          attitude: '태도',
        },
      ],
      ncsUsed: false,
      ncsDerivationMethod: '도출 방법',
    };
    render(<RoadmapInterviewClient projectId="p1" initial={validInitial} />);
    // 8회 다음 클릭으로 마지막 스텝까지 이동
    for (let i = 0; i < 7; i += 1) {
      fireEvent.click(screen.getByLabelText('다음 스텝'));
    }
    const submitBtn = screen.getByRole('button', { name: '최종 제출' });
    expect(submitBtn).toBeInTheDocument();
    fireEvent.click(submitBtn);
    await waitFor(() =>
      expect(submitRoadmapInterviewV2).toHaveBeenCalledTimes(1),
    );
    expect(submitRoadmapInterviewV2).toHaveBeenCalledWith('p1', expect.any(Object));
    await waitFor(() =>
      expect(routerPush).toHaveBeenCalledWith('/consultant/projects/p1/roadmap'),
    );
  });

  it('strict 검증 실패 시 submit Action 은 호출되지 않는다 (빈 초기 데이터)', async () => {
    submitRoadmapInterviewV2.mockResolvedValue({ success: true });
    render(<RoadmapInterviewClient projectId="p1" initial={{}} />);
    for (let i = 0; i < 7; i += 1) {
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
        { autoSave: true },
      );
    } finally {
      vi.useRealTimers();
    }
  });
});
