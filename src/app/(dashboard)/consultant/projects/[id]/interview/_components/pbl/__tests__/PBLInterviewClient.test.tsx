import { describe, it, expect, vi, beforeEach } from 'vitest';
import { act, render, screen, fireEvent, waitFor } from '@testing-library/react';

vi.mock('@/lib/utils', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/utils')>();
  return {
    ...actual,
    showErrorToast: vi.fn(),
    showSuccessToast: vi.fn(),
  };
});

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

const savePBLInterviewV2 = vi.fn();
const submitPBLInterviewV2 = vi.fn();
const uploadInterviewAttachment = vi.fn();
vi.mock('../../../actions', () => ({
  savePBLInterviewV2: (...args: unknown[]) => savePBLInterviewV2(...args),
  submitPBLInterviewV2: (...args: unknown[]) => submitPBLInterviewV2(...args),
  uploadInterviewAttachment: (...args: unknown[]) =>
    uploadInterviewAttachment(...args),
}));

import {
  PBLInterviewClient,
  PBL_V2_STEPS,
} from '../PBLInterviewClient';

describe('PBLInterviewClient', () => {
  beforeEach(() => {
    savePBLInterviewV2.mockReset();
    submitPBLInterviewV2.mockReset();
    uploadInterviewAttachment.mockReset();
    routerPush.mockReset();
  });

  it('PageHeader 와 첫 스텝(Ⅰ 훈련과정 개요) 본문을 렌더한다', () => {
    render(<PBLInterviewClient projectId="p1" initial={{}} />);
    expect(
      screen.getByRole('heading', {
        name: /AI PBL 인터뷰/,
        level: 1,
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: '훈련과정 개요', level: 2 }),
    ).toBeInTheDocument();
  });

  it('9개 스텝이 모두 정의되어 있고 양식 번호를 노출한다', () => {
    render(<PBLInterviewClient projectId="p1" initial={{}} />);
    expect(PBL_V2_STEPS).toHaveLength(9);
    for (const s of PBL_V2_STEPS) {
      expect(screen.getAllByText(s.name).length).toBeGreaterThanOrEqual(1);
    }
  });

  it('Ⅱ-1-가 companyIssues 스텝 진입 시 해당 textarea 가 렌더된다', () => {
    render(<PBLInterviewClient projectId="p1" initial={{}} />);
    fireEvent.click(screen.getByText('기업 경영 이슈'));
    expect(
      screen.getByRole('heading', { name: '기업 경영 이슈', level: 2 }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText('기업 경영 이슈')).toBeInTheDocument();
  });

  it('Ⅰ Overview 에서 기업명 입력 후 수동 저장 시 Server Action 에 companyName 이 포함된다', async () => {
    savePBLInterviewV2.mockResolvedValue({ success: true });
    render(<PBLInterviewClient projectId="p1" initial={{}} />);
    fireEvent.change(screen.getByLabelText('기업명'), {
      target: { value: '한국생산성본부' },
    });
    fireEvent.click(screen.getByLabelText('수동 저장'));
    await waitFor(() =>
      expect(savePBLInterviewV2).toHaveBeenCalledTimes(1),
    );
    const payload = savePBLInterviewV2.mock.calls[0][1];
    expect(payload.companyName).toBe('한국생산성본부');
  });

  it('Ⅱ-1-가 companyIssues 편집 시 저장 payload 에 포함된다', async () => {
    savePBLInterviewV2.mockResolvedValue({ success: true });
    render(<PBLInterviewClient projectId="p1" initial={{}} />);
    fireEvent.click(screen.getByText('기업 경영 이슈'));
    fireEvent.change(screen.getByLabelText('기업 경영 이슈'), {
      target: { value: '원가 압박' },
    });
    fireEvent.click(screen.getByLabelText('수동 저장'));
    await waitFor(() =>
      expect(savePBLInterviewV2).toHaveBeenCalledTimes(1),
    );
    const payload = savePBLInterviewV2.mock.calls[0][1];
    expect(payload.companyIssues).toBe('원가 압박');
  });

  it('Ⅱ-3-나 courseNecessity 편집 시 저장 payload 에 포함된다', async () => {
    savePBLInterviewV2.mockResolvedValue({ success: true });
    render(<PBLInterviewClient projectId="p1" initial={{}} />);
    fireEvent.click(screen.getByText('AI훈련과정 개발 필요성'));
    fireEvent.change(screen.getByLabelText('AI훈련과정 개발 필요성'), {
      target: { value: '현장 AI 리터러시 확보 필요' },
    });
    fireEvent.click(screen.getByLabelText('수동 저장'));
    await waitFor(() =>
      expect(savePBLInterviewV2).toHaveBeenCalledTimes(1),
    );
    const payload = savePBLInterviewV2.mock.calls[0][1];
    expect(payload.courseNecessity).toBe('현장 AI 리터러시 확보 필요');
  });

  it('첫 스텝에서 "이전" 버튼은 비활성화된다', () => {
    render(<PBLInterviewClient projectId="p1" initial={{}} />);
    expect(screen.getByLabelText('이전 스텝')).toBeDisabled();
  });

  it('initial.companyName 이 Overview input 에 반영된다', () => {
    render(
      <PBLInterviewClient
        projectId="p1"
        initial={{ companyName: '기존값' }}
      />,
    );
    expect(screen.getByLabelText('기업명')).toHaveValue('기존값');
  });

  it('data 가 변경되면 500ms 후 자동저장 Action 이 호출된다 (debounce)', async () => {
    vi.useFakeTimers();
    try {
      savePBLInterviewV2.mockResolvedValue({ success: true });
      render(<PBLInterviewClient projectId="p1" initial={{}} />);
      await act(async () => {
        fireEvent.change(screen.getByLabelText('기업명'), {
          target: { value: '자동저장' },
        });
      });
      expect(savePBLInterviewV2).not.toHaveBeenCalled();
      await act(async () => {
        vi.advanceTimersByTime(500);
        await vi.runAllTimersAsync();
      });
      expect(savePBLInterviewV2).toHaveBeenCalledTimes(1);
      expect(savePBLInterviewV2).toHaveBeenCalledWith(
        'p1',
        expect.objectContaining({ companyName: '자동저장' }),
        { autoSave: true },
      );
    } finally {
      vi.useRealTimers();
    }
  });

  it('저장 실패 시 saveIndicator 에 "저장 실패" 가 표시된다', async () => {
    savePBLInterviewV2.mockResolvedValue({
      success: false,
      error: '권한이 없습니다',
    });
    render(<PBLInterviewClient projectId="p1" initial={{}} />);
    fireEvent.click(screen.getByLabelText('수동 저장'));
    await waitFor(() =>
      expect(screen.getByText('저장 실패')).toBeInTheDocument(),
    );
  });

  it('Ⅱ-1-나 organization 스텝 진입 시 StepOrganization 이 렌더된다', () => {
    render(<PBLInterviewClient projectId="p1" initial={{}} />);
    fireEvent.click(screen.getByText('조직 및 주요 업무'));
    expect(
      screen.getByRole('heading', { name: '조직 및 주요 업무', level: 2 }),
    ).toBeInTheDocument();
    // OrganizationTree 의 루트 노드 추가 버튼
    expect(
      screen.getByRole('button', { name: '루트 노드 추가' }),
    ).toBeInTheDocument();
  });

  it('Ⅱ-2 trainingEnv 편집 시 저장 payload 에 포함된다', async () => {
    savePBLInterviewV2.mockResolvedValue({ success: true });
    render(<PBLInterviewClient projectId="p1" initial={{}} />);
    fireEvent.click(screen.getByText('훈련환경 분석'));
    fireEvent.change(screen.getByLabelText('훈련환경 분석'), {
      target: { value: '사내 교육장 활용' },
    });
    fireEvent.click(screen.getByLabelText('수동 저장'));
    await waitFor(() =>
      expect(savePBLInterviewV2).toHaveBeenCalledTimes(1),
    );
    expect(savePBLInterviewV2.mock.calls[0][1].trainingEnv).toBe(
      '사내 교육장 활용',
    );
  });

  it('Ⅱ-3-가 hrdReport 스텝 진입 시 StepHrdReportPdf 가 렌더된다', () => {
    render(<PBLInterviewClient projectId="p1" initial={{}} />);
    fireEvent.click(screen.getByText('HRD이음 PDF'));
    expect(
      screen.getByRole('heading', { name: /HRD이음컨설팅 결과 PDF 첨부/, level: 2 }),
    ).toBeInTheDocument();
  });

  it('Ⅲ-1 activities 스텝 진입 시 StepActivities 기본 3차수 프리필', () => {
    render(<PBLInterviewClient projectId="p1" initial={{}} />);
    fireEvent.click(screen.getByText('수행활동'));
    expect(
      screen.getByRole('heading', { name: '훈련과제 도출 수행활동', level: 2 }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText('3행 수행 일자')).toBeInTheDocument();
  });

  it('Ⅲ-2 problems 스텝 진입 시 StepProblems 두 블록이 렌더된다', () => {
    render(<PBLInterviewClient projectId="p1" initial={{}} />);
    fireEvent.click(screen.getByText('문제 도출·우선순위'));
    expect(screen.getByText('Ⅲ-2-가 문제 도출')).toBeInTheDocument();
    expect(screen.getByText('Ⅲ-2-나 문제 우선순위 결정')).toBeInTheDocument();
  });

  it('Ⅲ-3·4 targetAndLevel 스텝 진입 시 세 블록이 렌더된다', () => {
    render(<PBLInterviewClient projectId="p1" initial={{}} />);
    fireEvent.click(screen.getByText('훈련대상·AI수준'));
    expect(
      screen.getByText('Ⅲ-3 훈련대상 업무 (가·나·다)'),
    ).toBeInTheDocument();
    expect(screen.getByText('Ⅲ-4-가 현재 AI역량 수준')).toBeInTheDocument();
    expect(screen.getByText('Ⅲ-4-나 예상 AI역량 수준')).toBeInTheDocument();
  });

  it('마지막 스텝에서 strict 통과 시 submit Action 호출 + /pbl 리다이렉트', async () => {
    submitPBLInterviewV2.mockResolvedValue({ success: true });
    const validInitial = {
      companyName: '테스트기업',
      courseName: '테스트과정',
      trainingHours: 40,
      trainingTarget: '실무자 15명',
      trainingForm: '집체',
      trainingPeriod: '2026.06.01 ~ 2026.07.01',
      businessIssues: '원가 압박',
      companyIssues: '원가 압박 상세',
      organization: {
        orgTree: [{ id: 'n1', name: '경영지원', children: [] }],
        mainWork: [
          {
            dept: '경영지원',
            role: '인사',
            description: '인사 업무 담당',
          },
        ],
      },
      trainingEnv: '사내 교육장 활용',
      hrdReportPdf: null,
      courseNecessity: 'AI 리터러시 확보 필요',
      activities: [
        {
          round: 1,
          date: '26.04.01',
          content: '인터뷰',
          method: '대면',
          participants: 'PM 홍길동',
        },
      ],
      problems: [
        {
          title: '데이터 품질',
          description: '수작업 정제 부담',
          impact: '월 200시간',
        },
      ],
      priority: {
        items: [{ problem: '데이터 품질', score: 5, rank: 1 }],
        method: '5점 척도 평균',
      },
      target: {
        name: '품질 전처리',
        scope: '품질관리팀 15명',
        necessity: '월 200시간 → 60시간 단축 기대',
        details: [{ title: 'AS-IS', description: '수작업' }],
      },
      currentAiLevel: { level: 'BASIC' as const, note: '' },
      expectedAiLevel: { level: 'USER' as const, note: '' },
    };
    render(<PBLInterviewClient projectId="p1" initial={validInitial} />);
    for (let i = 0; i < PBL_V2_STEPS.length - 1; i += 1) {
      fireEvent.click(screen.getByLabelText('다음 스텝'));
    }
    const submitBtn = screen.getByRole('button', { name: '최종 제출' });
    fireEvent.click(submitBtn);
    await waitFor(() =>
      expect(submitPBLInterviewV2).toHaveBeenCalledTimes(1),
    );
    await waitFor(() =>
      expect(routerPush).toHaveBeenCalledWith('/consultant/projects/p1/pbl'),
    );
  });

  it('strict 검증 실패 시 submit Action 은 호출되지 않는다 (빈 초기 데이터)', async () => {
    submitPBLInterviewV2.mockResolvedValue({ success: true });
    render(<PBLInterviewClient projectId="p1" initial={{}} />);
    for (let i = 0; i < PBL_V2_STEPS.length - 1; i += 1) {
      fireEvent.click(screen.getByLabelText('다음 스텝'));
    }
    fireEvent.click(screen.getByRole('button', { name: '최종 제출' }));
    await new Promise((r) => setTimeout(r, 50));
    expect(submitPBLInterviewV2).not.toHaveBeenCalled();
    expect(routerPush).not.toHaveBeenCalled();
  });
});
