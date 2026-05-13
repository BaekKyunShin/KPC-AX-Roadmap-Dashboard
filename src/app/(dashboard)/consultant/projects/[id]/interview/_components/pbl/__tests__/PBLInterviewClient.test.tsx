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
const extractSttInsights = vi.fn();
vi.mock('../../../actions', () => ({
  savePBLInterviewV2: (...args: unknown[]) => savePBLInterviewV2(...args),
  submitPBLInterviewV2: (...args: unknown[]) => submitPBLInterviewV2(...args),
  uploadInterviewAttachment: (...args: unknown[]) =>
    uploadInterviewAttachment(...args),
  extractSttInsights: (...args: unknown[]) => extractSttInsights(...args),
}));

import {
  PBLInterviewClient,
  PBL_STEPS,
  type PBLStepId,
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

  // R2 PBL-자체-07 (#1 PBL 동등) — 부제 "(양식 2:1 정합)" 사용자 화면 미노출 회귀 차단
  it('PageHeader 제목에 내부 라벨 "(양식 2:1 정합)" 이 표시되지 않는다', () => {
    render(<PBLInterviewClient projectId="p1" initial={{}} />);
    const heading = screen.getByRole('heading', {
      name: /AI PBL 인터뷰/,
      level: 1,
    });
    expect(heading.textContent).not.toContain('양식 2:1 정합');
    expect(heading.textContent?.trim()).toBe('AI PBL 인터뷰');
  });

  it('10개 스텝이 모두 정의되어 있고 양식 번호를 노출한다 (Phase E: 조직 제거 + Step 4b 기대효과 추가)', () => {
    // Phase E: 조직 제거 → 9 step + 기대효과 신규 step → 10 step (조직 제거 전과 동일 개수, 다른 구성)
    render(<PBLInterviewClient projectId="p1" initial={{}} />);
    expect(PBL_STEPS).toHaveLength(10);
    for (const s of PBL_STEPS) {
      // 스테퍼 노출 텍스트는 stepperLabel(있으면) 또는 name
      const visibleLabel = s.stepperLabel ?? s.name;
      expect(screen.getAllByText(visibleLabel).length).toBeGreaterThanOrEqual(1);
    }
  });

  it('10번째 (마지막) Step 이 sttAttach 이고 required=false 이며 라벨이 "인터뷰 녹취 STT 첨부" 다', () => {
    const last = PBL_STEPS[PBL_STEPS.length - 1];
    expect(last.id).toBe(10);
    expect(last.stepId).toBe('sttAttach');
    expect(last.required).toBe(false);
    expect(last.name).toBe('인터뷰 녹취 STT 첨부');
    expect(last.shortName).toBe('선택');
  });

  it('PageHeader description 에 "총 10개 스텝" 문구가 포함된다', () => {
    render(<PBLInterviewClient projectId="p1" initial={{}} />);
    expect(screen.getByText(/총 10개 스텝/)).toBeInTheDocument();
  });

  // Phase E: Step 4b "기대효과·요구분석" 신규 검증
  it('Step 4 (Ⅱ-2-b) 가 expectations stepId 로 정의되어 있고 라벨이 "기대효과·요구분석"', () => {
    const step = PBL_STEPS[3];
    expect(step.stepId).toBe('expectations');
    expect(step.name).toBe('기대효과·요구분석');
    expect(step.shortName).toBe('Ⅱ-2-b');
    expect(step.required).toBe(true);
  });

  it('마지막 Step(sttAttach) 진입 시 StepSttAttach 가 렌더된다', () => {
    render(<PBLInterviewClient projectId="p1" initial={{}} />);
    // Stepper 는 단축 라벨 "인터뷰 STT", 본문 FormSection h2 는 풀텍스트
    fireEvent.click(screen.getAllByText('인터뷰 STT')[0]);
    expect(
      screen.getByRole('heading', { name: '인터뷰 녹취 STT 첨부', level: 2 }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText('STT 파일')).toBeInTheDocument();
  });

  // R3 #12(PBL) / PBL-자체-06 — Ⅲ-3·Ⅲ-4 단축명 양식 정확 표기 (Phase E: Step 8 로 위치 변경)
  it('PBL targetAndLevel 단축명이 "Ⅲ-3·Ⅲ-4" 로 표시된다 (#12 PBL · PBL-자체-06)', () => {
    render(<PBLInterviewClient projectId="p1" initial={{}} />);
    const stepDef = PBL_STEPS.find((s) => s.stepId === 'targetAndLevel');
    expect(stepDef?.shortName).toBe('Ⅲ-3·Ⅲ-4');
    expect(stepDef?.shortName).not.toBe('Ⅲ-3·4');
  });

  // R3 #10(PBL) — Ⅱ-3-가 항목명: Stepper 는 단축 "HRD이음 결과", 페이지 헤더는 풀텍스트
  it('PBL Ⅱ-3-가: Stepper 단축 라벨 "HRD이음 결과" + 페이지 헤더 풀텍스트 노출 (#10 PBL)', () => {
    render(<PBLInterviewClient projectId="p1" initial={{}} />);
    // Stepper 의 단축 라벨로 클릭
    const stepperLabels = screen.getAllByText('HRD이음 결과');
    expect(stepperLabels.length).toBeGreaterThanOrEqual(1);
    fireEvent.click(stepperLabels[0]);
    // 페이지 본문 FormSection h2 는 풀텍스트
    expect(
      screen.getByRole('heading', {
        name: /기업HRD이음컨설팅 결과 \(PDF 첨부\)/,
        level: 2,
      }),
    ).toBeInTheDocument();
  });

  // R3 #5(PBL) — Ⅱ-1-가 양식 √ "기업담당자와의 인터뷰" 노출
  it('PBL Ⅱ-1-가 작성 안내 영역에 양식 √ "기업담당자와의 인터뷰" 안내가 노출된다 (#5 PBL)', () => {
    render(<PBLInterviewClient projectId="p1" initial={{}} />);
    fireEvent.click(screen.getByText('기업 경영 이슈'));
    fireEvent.click(screen.getByRole('button', { name: '작성 안내' }));
    expect(screen.getByText(/기업담당자와의 인터뷰/)).toBeInTheDocument();
  });

  // R3 공통-A(PBL) — Ⅲ-3·Ⅲ-4 양식 ◆ "(작성 예시) 훈련대상 업무는 영상 데이터 수집" 노출
  it('PBL Step 9 작성 예시 영역에 양식 ◆ "(작성 예시) 훈련대상 업무는 영상 데이터 수집" 이 노출된다 (공통-A PBL)', () => {
    render(<PBLInterviewClient projectId="p1" initial={{}} />);
    fireEvent.click(screen.getByText('훈련대상·AI수준'));
    fireEvent.click(screen.getByRole('button', { name: '(예시) 양식 원문' }));
    expect(
      screen.getByText(/훈련대상 업무는 영상 데이터 수집/),
    ).toBeInTheDocument();
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
    // Stepper 는 단축 라벨 "과정 개발 필요성" 으로 클릭 (사용자 보고 — 말줄임 사라지도록)
    fireEvent.click(screen.getAllByText('과정 개발 필요성')[0]);
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

  // Phase E: Ⅱ-1-나 조직 및 주요 업무 step 제거 — 로드맵과 동일하게 인터뷰/결과/HWPX 3 계층 모두 제거.
  it('Ⅱ-1-나 조직 및 주요 업무 step 이 제거되어 PBL_STEPS 에 organization 이 없다', () => {
    expect(PBL_STEPS.some((s) => s.stepId === ('organization' as PBLStepId))).toBe(false);
  });

  it('Ⅱ-2 trainingEnv 편집 시 저장 payload 에 포함된다 (R8 PBL-자체-02 — 정형 객체)', async () => {
    savePBLInterviewV2.mockResolvedValue({ success: true });
    render(<PBLInterviewClient projectId="p1" initial={{}} />);
    // Phase E: stepperLabel="훈련환경" 으로 단축됨. stepper 클릭 → 페이지 헤더는 "훈련환경 분석"
    fireEvent.click(screen.getAllByText('훈련환경')[0]);
    // 적정 훈련시간 입력 — 정형 객체의 한 필드
    fireEvent.change(screen.getByLabelText('적정 훈련시간'), {
      target: { value: '회차당 4시간' },
    });
    fireEvent.click(screen.getByLabelText('수동 저장'));
    await waitFor(() =>
      expect(savePBLInterviewV2).toHaveBeenCalledTimes(1),
    );
    expect(savePBLInterviewV2.mock.calls[0][1].trainingEnv).toEqual(
      expect.objectContaining({ properTrainingHours: '회차당 4시간' }),
    );
  });

  it('Ⅱ-3-가 hrdReport 스텝 진입 시 StepHrdReportPdf 가 렌더된다 (Stepper: HRD이음 결과)', () => {
    render(<PBLInterviewClient projectId="p1" initial={{}} />);
    // Stepper 단축 라벨로 클릭
    fireEvent.click(screen.getAllByText('HRD이음 결과')[0]);
    expect(
      screen.getByRole('heading', {
        name: /기업HRD이음컨설팅 결과 \(PDF 첨부\)/,
        level: 2,
      }),
    ).toBeInTheDocument();
  });

  it('Ⅲ-1 activities 스텝 진입 시 StepActivities 기본 3차수 prefill (R8 — 차수×4 역할 모델)', () => {
    render(<PBLInterviewClient projectId="p1" initial={{}} />);
    fireEvent.click(screen.getByText('수행활동'));
    expect(
      screen.getByRole('heading', { name: '훈련과제 도출 수행활동', level: 2 }),
    ).toBeInTheDocument();
    // 1·2·3차 카드가 prefill, 각 카드마다 4 역할 수행 일자 input
    expect(screen.getByLabelText('1차 PM 수행 일자')).toBeInTheDocument();
    expect(screen.getByLabelText('3차 능력개발전담주치의 수행 일자')).toBeInTheDocument();
  });

  it('Ⅲ-2 problems 스텝 진입 시 StepProblems 두 블록이 렌더된다 (Stepper: 문제·우선순위)', () => {
    render(<PBLInterviewClient projectId="p1" initial={{}} />);
    // Stepper 단축 라벨로 클릭
    fireEvent.click(screen.getAllByText('문제·우선순위')[0]);
    expect(screen.getByText('Ⅲ-2-가 문제 정의서')).toBeInTheDocument();
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
      trainingEnv: {
        properTrainingHours: '',
        internalPlace: '사내 교육장 활용',
        externalPlace: '',
        internalInstructors: [],
        externalInstructors: [],
        aiInfrastructure: '',
        targetCharacteristics: { career: '', level: '' },
        aiInfraDetail: { toolCapacity: 'AVAILABLE' as const, networkStatus: 'GOOD' as const, pcCount: 0 },
        trainingNeedsAnalysis: '',
        expectationAsIs: '',
        expectationToBe: '',
        targetTraineeCount: 0,
        internalInstructorUsage: 'NO' as const,
        internalInstructorPrimary: { name: '', position: '' },
        otherEquipment: '',
      },
      hrdReportPdf: null,
      courseNecessity: 'AI 리터러시 확보 필요',
      activities: [
        // R8 PBL-자체-03 — 평면 4행 배열. 1차에 4 역할 모두 채움 (superRefine 통과).
        { round: 1, role: 'PM' as const, personName: '홍길동', date: '26.04.01', content: '인터뷰', method: '대면' },
        { round: 1, role: 'EXTERNAL_EXPERT' as const, personName: '김전문', date: '26.04.01', content: '외부 전문가 자문', method: '대면' },
        { round: 1, role: 'INTERNAL_EXPERT' as const, personName: '박내부', date: '26.04.01', content: '사내 현황 공유', method: '대면' },
        { round: 1, role: 'JURISDICTION_MANAGER' as const, personName: '이주치', date: '26.04.01', content: 'HRD 점검', method: '서면' },
      ],
      problemDefinitionSheet: {
        background: '수작업 정제 부담으로 월 200시간 손실',
        core: '데이터 품질 — 자동화 부재',
        scope: '품질·생산 부서',
        constraints: '예산·일정 한계',
      },
      priority: {
        items: [{ problem: '데이터 품질', score: 5, rank: 1 }],
        method: '5점 척도 평균',
      },
      target: {
        name: '품질 전처리',
        scope: '품질관리팀 15명',
        necessity: '월 200시간 → 60시간 단축 기대',
        necessity_score: 5,
        details: [
          {
            title: '품질 전처리',
            as_is: '수작업',
            to_be: 'AI 자동 전처리',
            required_knowledge: '데이터 품질 기준',
            required_skill: 'Python pandas',
          },
        ],
      },
      currentAiLevel: { level: 'BASIC' as const, note: '' },
      expectedAiLevel: { level: 'USER' as const, note: '' },
    };
    render(<PBLInterviewClient projectId="p1" initial={validInitial} />);
    for (let i = 0; i < PBL_STEPS.length - 1; i += 1) {
      fireEvent.click(screen.getByLabelText('다음 스텝'));
    }
    const submitBtn = screen.getByRole('button', { name: '최종 제출' });
    fireEvent.click(submitBtn);
    await waitFor(() =>
      expect(submitPBLInterviewV2).toHaveBeenCalledTimes(1),
    );
    await waitFor(() =>
      expect(routerPush).toHaveBeenCalledWith(
        '/consultant/projects/p1/interview/review',
      ),
    );
  });

  it('strict 검증 실패 시 submit Action 은 호출되지 않는다 (빈 초기 데이터)', async () => {
    submitPBLInterviewV2.mockResolvedValue({ success: true });
    render(<PBLInterviewClient projectId="p1" initial={{}} />);
    for (let i = 0; i < PBL_STEPS.length - 1; i += 1) {
      fireEvent.click(screen.getByLabelText('다음 스텝'));
    }
    fireEvent.click(screen.getByRole('button', { name: '최종 제출' }));
    await new Promise((r) => setTimeout(r, 50));
    expect(submitPBLInterviewV2).not.toHaveBeenCalled();
    expect(routerPush).not.toHaveBeenCalled();
  });
});
