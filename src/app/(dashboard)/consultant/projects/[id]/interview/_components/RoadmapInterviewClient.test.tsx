import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock Next.js router
const mockPush = vi.fn();
const mockRefresh = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush, refresh: mockRefresh }),
}));

// Partial mock — cn 등 기타 export 유지
vi.mock('@/lib/utils', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/utils')>();
  return {
    ...actual,
    showSuccessToast: vi.fn(),
    showErrorToast: vi.fn(),
    scrollToPageTop: vi.fn(),
  };
});

// Mock server actions
const saveRoadmapInterview = vi.fn();
const uploadHrdReportAttachment = vi.fn();
const removeHrdReportAttachment = vi.fn();
const createHrdReportSignedUrl = vi.fn();
const extractSttInsights = vi.fn();
const uploadInterviewAttachment = vi.fn();
const removeInterviewAttachment = vi.fn();
vi.mock('../actions', () => ({
  saveRoadmapInterview: (...args: unknown[]) => saveRoadmapInterview(...args),
  uploadHrdReportAttachment: (...args: unknown[]) => uploadHrdReportAttachment(...args),
  removeHrdReportAttachment: (...args: unknown[]) => removeHrdReportAttachment(...args),
  createHrdReportSignedUrl: (...args: unknown[]) => createHrdReportSignedUrl(...args),
  extractSttInsights: (...args: unknown[]) => extractSttInsights(...args),
  uploadInterviewAttachment: (...args: unknown[]) => uploadInterviewAttachment(...args),
  removeInterviewAttachment: (...args: unknown[]) => removeInterviewAttachment(...args),
}));

// useInterviewAutoSave mock — 자동 저장 상태 다양하게 테스트
let mockAutoSaveState = { isAutoSaving: false, lastSaved: null as Date | null, autoSaveError: null as string | null };
vi.mock('../_hooks/useInterviewAutoSave', () => ({
  useInterviewAutoSave: () => mockAutoSaveState,
}));

import RoadmapInterviewClient from './RoadmapInterviewClient';

// ==============================================================================
// 유효한 initialData — validateStep(1~5) 통과용 최소 데이터
// ==============================================================================
function makeValidInitialData() {
  return {
    overview: {
      establishment_necessity: '필요성 입력',
      selected_tasks_summary: '과업 요약',
      // roadmap_summary 는 LLM 자동 생성 (ISSUE-04)
      ai_competency_level: 'BEGINNER' as const,
    },
    interview_date: '2026-01-01',
    interview_round: 1,
    interview_start_time: '10:00',
    interview_end_time: '12:00',
    interview_method: 'ONSITE' as const,
    participants: [{ id: 'p1', name: '참석자', position: '팀장' }],
    company_requirements: {
      company_status: '현황',
      main_problems: '문제점',
      push_willingness: '의지',
      expected_outcomes: '기대효과',
    },
    task_workflow_items: [
      {
        id: 'tw1',
        job: '직무',
        task_name: '업무명',
        as_is: '현재',
        problems: '문제',
        data_availability: '가능',
        ai_necessity: 3,
      },
    ],
    analysis_notes: { text: '', attachment_files: [] },
    training_targets: [
      {
        id: 'tt1',
        task_name: '훈련과업',
        selection_reason: '선정사유',
        as_is: '현재상황',
        to_be: '목표상황',
      },
    ],
    // Ⅲ-1 역량 모델링 + NCS 활용 (ISSUE-04 신규)
    competency_models: [
      {
        id: 'cm1',
        competency_name: '데이터 해석',
        competency_definition: '정의',
        knowledge: '지식',
        skill: '기술',
        attitude: '태도',
      },
    ],
    ncs_usage: {
      uses_ncs: false as const,
      competency_derivation_method: '인터뷰 기반 도출',
    },
    notes: '',
  };
}

describe('RoadmapInterviewClient', () => {
  beforeEach(() => {
    saveRoadmapInterview.mockReset();
    mockPush.mockReset();
    mockRefresh.mockReset();
    mockAutoSaveState = { isAutoSaving: false, lastSaved: null, autoSaveError: null };
  });

  // ---------------------------------------------------------------------------
  // 1. 기본 렌더링 및 네비게이션
  // ---------------------------------------------------------------------------
  it('초기 렌더 시 Step 1 (개요) 표시', () => {
    render(<RoadmapInterviewClient projectId="p1" initialData={{}} />);
    expect(screen.getByRole('heading', { name: /Ⅰ\. 개요/ })).toBeInTheDocument();
  });

  it('"다음" 버튼 클릭 시 Step 2 (주요 활동)로 전환', async () => {
    render(<RoadmapInterviewClient projectId="p1" initialData={{}} />);
    await userEvent.click(screen.getByRole('button', { name: /^다음$/ }));
    expect(screen.getByRole('heading', { name: /주요 활동/ })).toBeInTheDocument();
  });

  it('마지막 스텝(확인)까지 이동하면 제출 버튼 노출', async () => {
    render(<RoadmapInterviewClient projectId="p1" initialData={{}} />);
    // 7스텝 (Ⅲ-1 역량 모델링 추가, ISSUE-04) — "다음" 버튼 6회 클릭해 마지막(확인) 스텝 도달
    for (let i = 0; i < 6; i++) {
      await userEvent.click(screen.getByRole('button', { name: /^다음$/ }));
    }
    expect(screen.getByRole('heading', { name: /확인.*제출/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^저장$/ })).toBeInTheDocument();
  });

  it('"이전" 버튼은 Step 1에서 비활성화된다', () => {
    render(<RoadmapInterviewClient projectId="p1" initialData={{}} />);
    expect(screen.getByRole('button', { name: /이전/ })).toBeDisabled();
  });

  it('Step 2에서 "이전" 버튼 클릭 시 Step 1로 돌아간다', async () => {
    render(<RoadmapInterviewClient projectId="p1" initialData={{}} />);
    await userEvent.click(screen.getByRole('button', { name: /^다음$/ }));
    await userEvent.click(screen.getByRole('button', { name: /이전/ }));
    expect(screen.getByRole('heading', { name: /Ⅰ\. 개요/ })).toBeInTheDocument();
  });

  // ---------------------------------------------------------------------------
  // 2. 필수 미완료 시 제출 — showErrorToast + goToStep
  // ---------------------------------------------------------------------------
  it('필수 미완료 상태에서 제출 시 에러 토스트 + saveRoadmapInterview 미호출', async () => {
    const { showErrorToast } = await import('@/lib/utils');
    render(<RoadmapInterviewClient projectId="p1" initialData={{}} />);
    // 7스텝 (Ⅲ-1 역량 모델링 추가, ISSUE-04) — "다음" 버튼 6회 클릭해 마지막(확인) 스텝 도달
    for (let i = 0; i < 6; i++) {
      await userEvent.click(screen.getByRole('button', { name: /^다음$/ }));
    }
    await userEvent.click(screen.getByRole('button', { name: /^저장$/ }));
    expect(showErrorToast).toHaveBeenCalled();
    expect(saveRoadmapInterview).not.toHaveBeenCalled();
  });

  // ---------------------------------------------------------------------------
  // 3. 유효 데이터로 성공 제출 — 성공 토스트 확인
  // ---------------------------------------------------------------------------
  it('유효 데이터로 저장 성공 시 성공 토스트가 호출된다', async () => {
    const { showSuccessToast } = await import('@/lib/utils');
    saveRoadmapInterview.mockResolvedValue({ success: true });

    render(<RoadmapInterviewClient projectId="p1" initialData={makeValidInitialData()} />);
    // 마지막 스텝으로 이동
    // 7스텝 (Ⅲ-1 역량 모델링 추가, ISSUE-04) — "다음" 버튼 6회 클릭해 마지막(확인) 스텝 도달
    for (let i = 0; i < 6; i++) {
      await userEvent.click(screen.getByRole('button', { name: /^다음$/ }));
    }
    await userEvent.click(screen.getByRole('button', { name: /^저장$/ }));

    await waitFor(() => {
      expect(showSuccessToast).toHaveBeenCalled();
    });
  }, 10000);

  // ---------------------------------------------------------------------------
  // 4. 저장 실패 시 에러 토스트
  // ---------------------------------------------------------------------------
  it('서버 오류 응답 시 에러 토스트가 호출된다', async () => {
    const { showErrorToast } = await import('@/lib/utils');
    saveRoadmapInterview.mockResolvedValue({ success: false, error: '서버 오류' });

    render(<RoadmapInterviewClient projectId="p1" initialData={makeValidInitialData()} />);
    // 7스텝 (Ⅲ-1 역량 모델링 추가, ISSUE-04) — "다음" 버튼 6회 클릭해 마지막(확인) 스텝 도달
    for (let i = 0; i < 6; i++) {
      await userEvent.click(screen.getByRole('button', { name: /^다음$/ }));
    }
    await userEvent.click(screen.getByRole('button', { name: /^저장$/ }));

    await waitFor(() => {
      expect(showErrorToast).toHaveBeenCalledWith('저장 실패', '서버 오류');
    });
  }, 10000);

  it('네트워크 예외 시 에러 토스트가 호출된다', async () => {
    const { showErrorToast } = await import('@/lib/utils');
    saveRoadmapInterview.mockRejectedValue(new Error('네트워크 오류'));

    render(<RoadmapInterviewClient projectId="p1" initialData={makeValidInitialData()} />);
    // 7스텝 (Ⅲ-1 역량 모델링 추가, ISSUE-04) — "다음" 버튼 6회 클릭해 마지막(확인) 스텝 도달
    for (let i = 0; i < 6; i++) {
      await userEvent.click(screen.getByRole('button', { name: /^다음$/ }));
    }
    await userEvent.click(screen.getByRole('button', { name: /^저장$/ }));

    await waitFor(() => {
      expect(showErrorToast).toHaveBeenCalledWith('저장 실패', expect.any(String));
    });
  }, 10000);

  // ---------------------------------------------------------------------------
  // 5. 자동 저장 상태 표시
  // ---------------------------------------------------------------------------
  it('isAutoSaving=true이면 "저장 중…" 텍스트를 표시한다', () => {
    mockAutoSaveState = { isAutoSaving: true, lastSaved: null, autoSaveError: null };
    render(<RoadmapInterviewClient projectId="p1" initialData={{}} />);
    expect(screen.getByText(/저장 중/)).toBeInTheDocument();
  });

  it('lastSaved가 있으면 "자동 저장됨" 텍스트를 표시한다', () => {
    mockAutoSaveState = {
      isAutoSaving: false,
      lastSaved: new Date('2026-01-01T10:00:00'),
      autoSaveError: null,
    };
    render(<RoadmapInterviewClient projectId="p1" initialData={{}} />);
    expect(screen.getByText(/자동 저장됨/)).toBeInTheDocument();
  });

  it('autoSaveError가 있으면 "저장 실패" 텍스트를 표시한다', () => {
    mockAutoSaveState = {
      isAutoSaving: false,
      lastSaved: null,
      autoSaveError: '네트워크 오류',
    };
    render(<RoadmapInterviewClient projectId="p1" initialData={{}} />);
    expect(screen.getByText('저장 실패')).toBeInTheDocument();
  });

  // ---------------------------------------------------------------------------
  // 6. validateStep — 다양한 step별 분기 커버
  // ---------------------------------------------------------------------------
  it('validateStep: 완전한 step1 데이터로 "다음" 후 Step 2로 이동', async () => {
    // overview가 모두 채워진 상태로 다음으로 이동하면 completedSteps[0] = 1
    render(<RoadmapInterviewClient projectId="p1" initialData={makeValidInitialData()} />);
    await userEvent.click(screen.getByRole('button', { name: /^다음$/ }));
    // Step 2가 표시되면 step 1이 completed로 처리됨
    expect(screen.getByRole('heading', { name: /주요 활동/ })).toBeInTheDocument();
  }, 10000);

  it('불완전한 데이터에서 "다음"을 눌러도 Step 전환은 가능하다 (soft validation)', async () => {
    // goToNextStep()은 validateStep 결과와 무관하게 step을 이동시킴
    render(<RoadmapInterviewClient projectId="p1" initialData={{}} />);
    await userEvent.click(screen.getByRole('button', { name: /^다음$/ }));
    // Step 2로 이동
    expect(screen.queryByRole('heading', { name: /Ⅰ\. 개요/ })).not.toBeInTheDocument();
  }, 10000);

  // ---------------------------------------------------------------------------
  // 7. 스텝 전환 시 페이지 상단 자동 스크롤 (ISSUE-15)
  // ---------------------------------------------------------------------------
  it('"다음" 클릭 시 scrollToPageTop이 호출된다', async () => {
    const { scrollToPageTop } = await import('@/lib/utils');
    render(<RoadmapInterviewClient projectId="p1" initialData={{}} />);
    await userEvent.click(screen.getByRole('button', { name: /^다음$/ }));
    expect(scrollToPageTop).toHaveBeenCalled();
  });
});
