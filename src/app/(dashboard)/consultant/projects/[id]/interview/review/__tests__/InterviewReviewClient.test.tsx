import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { InterviewReviewClient } from '../InterviewReviewClient';
import type { RoadmapInterviewStrict } from '@/lib/schemas/interview-roadmap';
import type { PBLInterviewStrict } from '@/lib/schemas/interview-pbl';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

vi.mock('../actions', () => ({
  editInterviewFieldRoadmap: vi.fn().mockResolvedValue({ success: true }),
  editInterviewFieldPbl: vi.fn().mockResolvedValue({ success: true }),
  triggerResultRegenerationFromReview: vi.fn(),
}));

vi.mock('@/lib/utils', async () => {
  const actual = await vi.importActual<typeof import('@/lib/utils')>('@/lib/utils');
  return {
    ...actual,
    showSuccessToast: vi.fn(),
    showErrorToast: vi.fn(),
  };
});

const baseLatestResult = { createdAt: null, status: null, versionId: null } as const;

describe('InterviewReviewClient', () => {
  // ─── 로드맵 트랙 ──────────────────────────────────────────────────
  describe('로드맵 트랙', () => {
    const roadmapData: Partial<RoadmapInterviewStrict> = {
      establishmentNecessity: '훈련 수립 필요성 텍스트',
      performanceActivities: [
        {
          round: 1,
          date: '2026-04-25',
          timeRange: '10:00-12:00',
          content: '인터뷰',
          method: '대면',
          pmName: 'PM',
          expertName: 'EX',
        },
      ],
      aiLevel: 'INTERMEDIATE',
      selectedTask: '데이터 분석',
      companyRequirements: {
        status: '현황 텍스트',
        problem: '문제',
        will: '의지',
        outcomes: '성과',
      },
      taskAnalysis: [
        {
          domain: '재무',
          task: '결산',
          asIs: '수기',
          improvement: '월말 데이터로 결산 자동화, 수기 오류 해소',
        },
      ],
      targetTask: {
        name: '결산 자동화',
        reason: '효율',
        expectedAsIs: '수기',
        expectedToBe: '자동',
      },
    };

    it('헤더 + 7 Step 양식 카드 + CTA 영역 렌더 (STT 섹션은 데이터 있을 때만)', () => {
      render(
        <InterviewReviewClient
          projectId="p-1"
          track="ROADMAP"
          interviewData={roadmapData}
          interviewUpdatedAt="2026-04-30T14:00:00Z"
          latestResult={baseLatestResult}
        />
      );
      expect(
        screen.getByRole('heading', { name: 'AI훈련로드맵 인터뷰 검토', level: 1 })
      ).toBeInTheDocument();
      // Step heading 일부
      expect(screen.getByText(/Ⅰ-1. 수립 필요성/)).toBeInTheDocument();
      expect(screen.getByText(/Ⅰ-2. 주요 활동/)).toBeInTheDocument();
      expect(screen.getByText(/Ⅱ-2. 기업 요구분석/)).toBeInTheDocument();
      // 양식 v2: Ⅲ-1 역량 모델링 스텝은 삭제됨
      expect(screen.queryByText(/Ⅲ-1. 역량 모델링/)).not.toBeInTheDocument();
      // CTA
      expect(screen.getByTestId('review-cta-back-to-interview')).toBeInTheDocument();
      expect(screen.getByTestId('review-cta-go-to-result')).toBeInTheDocument();
    });

    it('Stale 배너는 result.createdAt 이 null 이면 미노출', () => {
      render(
        <InterviewReviewClient
          projectId="p-1"
          track="ROADMAP"
          interviewData={roadmapData}
          interviewUpdatedAt="2026-04-30T14:00:00Z"
          latestResult={baseLatestResult}
        />
      );
      expect(screen.queryByTestId('stale-result-banner')).not.toBeInTheDocument();
    });

    it('Stale 배너 — 인터뷰 updated_at > result.created_at 이면 노출', () => {
      render(
        <InterviewReviewClient
          projectId="p-1"
          track="ROADMAP"
          interviewData={roadmapData}
          interviewUpdatedAt="2026-04-30T14:00:00Z"
          latestResult={{
            createdAt: '2026-04-29T09:00:00Z',
            status: 'DRAFT',
            versionId: 'rv-1',
          }}
        />
      );
      expect(screen.getByTestId('stale-result-banner')).toBeInTheDocument();
    });

    it('Ⅰ-2 주요 활동 — 차수 0개일 때 카드 펼치면 안내 문구', async () => {
      const user = userEvent.setup();
      const empty: Partial<RoadmapInterviewStrict> = {
        ...roadmapData,
        performanceActivities: [],
      };
      render(
        <InterviewReviewClient
          projectId="p-1"
          track="ROADMAP"
          interviewData={empty}
          interviewUpdatedAt={null}
          latestResult={baseLatestResult}
        />
      );
      // 카드 헤더 (차수 0개 라벨) 클릭으로 펼침
      await user.click(screen.getByText(/Ⅰ-2\. 주요 활동/));
      expect(screen.getByText(/주요 활동이 입력되지 않았습니다/)).toBeInTheDocument();
    });

    it('Ⅱ-2 카드를 펼치면 InlineEditField 4행 노출 + 편집 시 editInterviewFieldRoadmap 호출', async () => {
      const user = userEvent.setup();
      const { editInterviewFieldRoadmap } = await import('../actions');
      render(
        <InterviewReviewClient
          projectId="p-1"
          track="ROADMAP"
          interviewData={roadmapData}
          interviewUpdatedAt={null}
          latestResult={baseLatestResult}
        />
      );
      // #3 이후: 카드 default 닫힘 → 카드 헤더 먼저 클릭하여 펼친 후 첫 행 값 편집
      await user.click(screen.getByText(/Ⅱ-2\. 기업 요구분석/));
      const statusValue = screen.getByText('현황 텍스트');
      await user.click(statusValue);
      const inputs = screen.getAllByRole('textbox');
      await user.clear(inputs[0]);
      await user.type(inputs[0], '갱신');
      await user.click(screen.getAllByRole('button', { name: '저장' })[0]);

      // 인터뷰 patch 호출 검증
      expect(editInterviewFieldRoadmap).toHaveBeenCalled();
    });

    it('sttInsights 가 채워졌으면 "STT 인사이트 (선택)" 섹션과 6 카테고리 카드가 노출된다', async () => {
      const user = userEvent.setup();
      const dataWithStt: Partial<RoadmapInterviewStrict> = {
        ...roadmapData,
        sttInsights: {
          추가_업무: ['주간 보고 자동화'],
          조직_맥락: 'TF 신설 직후',
          AI_태도: '호의적이나 보안 우려',
          주요_인용: ['"실무자 시간이 부족하다"'],
        },
      };
      render(
        <InterviewReviewClient
          projectId="p-1"
          track="ROADMAP"
          interviewData={dataWithStt}
          interviewUpdatedAt={null}
          latestResult={baseLatestResult}
        />
      );
      // 섹션 헤더 — "선택" 표기로 양식 절·장과 구분
      const sttHeader = screen.getByText(/STT 인사이트 \(선택\)/);
      expect(sttHeader).toBeInTheDocument();
      // 섹션 펼친 후 카테고리 카드 확인
      await user.click(sttHeader);
      expect(screen.getByText('추가 업무')).toBeInTheDocument();
      expect(screen.getByText('주간 보고 자동화')).toBeInTheDocument();
      expect(screen.getByText('조직 맥락')).toBeInTheDocument();
      expect(screen.getByText('TF 신설 직후')).toBeInTheDocument();
    });

    it('sttInsights 가 없거나 6 필드 모두 비면 "STT 인사이트 (선택)" 섹션이 렌더되지 않는다', () => {
      render(
        <InterviewReviewClient
          projectId="p-1"
          track="ROADMAP"
          interviewData={roadmapData}
          interviewUpdatedAt={null}
          latestResult={baseLatestResult}
        />
      );
      expect(screen.queryByText(/STT 인사이트 \(선택\)/)).toBeNull();
    });
  });

  // ─── PBL 트랙 ─────────────────────────────────────────────────────
  describe('PBL 트랙', () => {
    const pblData: Partial<PBLInterviewStrict> = {
      courseName: 'PBL 과정',
      companyName: '회사 A',
      trainingTarget: '신입',
      businessIssues: '이슈',
      companyIssues: '기업 이슈',
      trainingEnv: {
        properTrainingHours: '',
        internalPlace: '',
        externalPlace: '',
        internalInstructors: [],
        externalInstructors: [],
        aiInfrastructure: '환경',
        targetCharacteristics: { career: '', level: '' },
        aiInfraDetail: {
          toolCapacity: 'AVAILABLE' as const,
          networkStatus: 'GOOD' as const,
          pcCount: 0,
        },
        trainingNeedsAnalysis: '',
        expectationAsIs: '',
        expectationToBe: '',
        targetTraineeCount: 0,
        internalInstructorUsage: 'NO' as const,
        internalInstructorPrimary: { name: '', position: '' },
        otherEquipment: '',
      },
      courseNecessity: '필요성',
      problemDefinitionSheet: { background: '', core: '', scope: '', constraints: '' },
    };

    it('헤더 + 9 Step 카드 + CTA 영역 렌더', () => {
      render(
        <InterviewReviewClient
          projectId="p-2"
          track="PBL"
          interviewData={pblData}
          interviewUpdatedAt={null}
          latestResult={baseLatestResult}
        />
      );
      expect(
        screen.getByRole('heading', { name: 'AI PBL 인터뷰 검토', level: 1 })
      ).toBeInTheDocument();
      expect(screen.getByText(/Ⅰ-1. 훈련과정 개요/)).toBeInTheDocument();
      expect(screen.getByText(/Ⅱ-1. 기업 이슈/)).toBeInTheDocument();
      expect(screen.getByText(/Ⅲ-3·Ⅲ-4/)).toBeInTheDocument();
    });

    it('Ⅰ-1 훈련과정명 인라인 편집 시 editInterviewFieldPbl 호출', async () => {
      const user = userEvent.setup();
      const { editInterviewFieldPbl } = await import('../actions');
      render(
        <InterviewReviewClient
          projectId="p-2"
          track="PBL"
          interviewData={pblData}
          interviewUpdatedAt={null}
          latestResult={baseLatestResult}
        />
      );
      // #3 이후: PBL Ⅰ-1 카드도 default 닫힘 → 헤더 클릭으로 펼친 후 첫 행 값 편집
      await user.click(screen.getByText(/Ⅰ-1\. 훈련과정 개요/));
      await user.click(screen.getByText('PBL 과정'));
      const inputs = screen.getAllByRole('textbox');
      await user.clear(inputs[0]);
      await user.type(inputs[0], '신규 PBL');
      await user.click(screen.getAllByRole('button', { name: '저장' })[0]);
      expect(editInterviewFieldPbl).toHaveBeenCalled();
    });

    it('Ⅱ-1·Ⅱ-2·Ⅱ-3 카드 클릭으로 펼치기 가능', async () => {
      const user = userEvent.setup();
      render(
        <InterviewReviewClient
          projectId="p-2"
          track="PBL"
          interviewData={pblData}
          interviewUpdatedAt={null}
          latestResult={baseLatestResult}
        />
      );
      await user.click(screen.getByText(/Ⅱ-2\. 훈련 환경/));
      // 환경 텍스트가 노출됨
      expect(screen.getByText('환경')).toBeInTheDocument();
    });

    it('Ⅲ-2 문제 정의서 — 비어 있을 때 안내 문구 표시', async () => {
      const user = userEvent.setup();
      render(
        <InterviewReviewClient
          projectId="p-2"
          track="PBL"
          interviewData={pblData}
          interviewUpdatedAt={null}
          latestResult={baseLatestResult}
        />
      );
      // problemDefinitionSheet 가 전부 빈 문자열이면 안내 문구 표시
      await user.click(screen.getByText(/Ⅲ-2-가\. 문제 정의서/));
      expect(screen.getByText(/문제 정의서가 입력되지 않았습니다/)).toBeInTheDocument();
    });

    it('Ⅲ-2 문제 정의서 — 데이터 있을 때 항목 렌더', async () => {
      const user = userEvent.setup();
      const filledPbl: Partial<PBLInterviewStrict> = {
        ...pblData,
        problemDefinitionSheet: {
          background: 'PBL 문제 배경',
          core: 'PBL 핵심 문제',
          scope: 'PBL 문제 범위',
          constraints: 'PBL 제약 조건',
        },
      };
      render(
        <InterviewReviewClient
          projectId="p-2"
          track="PBL"
          interviewData={filledPbl}
          interviewUpdatedAt={null}
          latestResult={baseLatestResult}
        />
      );
      await user.click(screen.getByText(/Ⅲ-2-가\. 문제 정의서/));
      expect(screen.getByText('PBL 핵심 문제')).toBeInTheDocument();
    });

    it('PBL: sttInsights 가 채워졌으면 "STT 인사이트 (선택)" 섹션과 6 카테고리 카드가 노출된다', async () => {
      const user = userEvent.setup();
      const pblWithStt: Partial<PBLInterviewStrict> = {
        ...pblData,
        sttInsights: {
          추가_페인포인트: ['Excel 수기 복붙'],
          숨은_니즈: ['PDF 자동 분류'],
        },
      };
      render(
        <InterviewReviewClient
          projectId="p-2"
          track="PBL"
          interviewData={pblWithStt}
          interviewUpdatedAt={null}
          latestResult={baseLatestResult}
        />
      );
      const sttHeader = screen.getByText(/STT 인사이트 \(선택\)/);
      expect(sttHeader).toBeInTheDocument();
      await user.click(sttHeader);
      expect(screen.getByText('추가 페인포인트')).toBeInTheDocument();
      expect(screen.getByText('Excel 수기 복붙')).toBeInTheDocument();
      expect(screen.getByText('숨은 니즈')).toBeInTheDocument();
    });

    it('PBL: sttInsights 가 없으면 "STT 인사이트 (선택)" 섹션이 렌더되지 않는다', () => {
      render(
        <InterviewReviewClient
          projectId="p-2"
          track="PBL"
          interviewData={pblData}
          interviewUpdatedAt={null}
          latestResult={baseLatestResult}
        />
      );
      expect(screen.queryByText(/STT 인사이트 \(선택\)/)).toBeNull();
    });
  });

  // ─── #3 모두 접힘 default + 전체 펼치기/접기 토글 ──────────────────
  describe('전체 펼치기/접기 토글 (#3)', () => {
    const minimalRoadmap: Partial<RoadmapInterviewStrict> = {
      establishmentNecessity: '필요성',
      performanceActivities: [],
      aiLevel: 'INTERMEDIATE',
      selectedTask: '과업',
      companyRequirements: { status: '현황', problem: '문제', will: '의지', outcomes: '성과' },
      taskAnalysis: [],
      targetTask: { name: '명', reason: '사유', expectedAsIs: 'A', expectedToBe: 'B' },
    };

    const minimalPbl: Partial<PBLInterviewStrict> = {
      courseName: '과정',
      companyName: '회사',
      trainingTarget: '대상',
      businessIssues: '이슈',
      companyIssues: '기업 이슈',
      trainingEnv: {
        properTrainingHours: '',
        internalPlace: '',
        externalPlace: '',
        internalInstructors: [],
        externalInstructors: [],
        aiInfrastructure: '',
        targetCharacteristics: { career: '', level: '' },
        aiInfraDetail: {
          toolCapacity: 'AVAILABLE' as const,
          networkStatus: 'GOOD' as const,
          pcCount: 0,
        },
        trainingNeedsAnalysis: '',
        expectationAsIs: '',
        expectationToBe: '',
        targetTraineeCount: 0,
        internalInstructorUsage: 'NO' as const,
        internalInstructorPrimary: { name: '', position: '' },
        otherEquipment: '',
      },
      courseNecessity: '필요',
      problemDefinitionSheet: { background: '', core: '', scope: '', constraints: '' },
    };

    it('로드맵 트랙: 모든 CollapsibleSection 이 default 닫힘 (aria-expanded=false)', () => {
      render(
        <InterviewReviewClient
          projectId="p-1"
          track="ROADMAP"
          interviewData={minimalRoadmap}
          interviewUpdatedAt={null}
          latestResult={baseLatestResult}
        />
      );
      const expanded = screen
        .queryAllByRole('button')
        .filter((b) => b.getAttribute('aria-expanded') === 'true');
      expect(expanded).toHaveLength(0);
    });

    it('PBL 트랙: 모든 CollapsibleSection 이 default 닫힘 (aria-expanded=false)', () => {
      render(
        <InterviewReviewClient
          projectId="p-2"
          track="PBL"
          interviewData={minimalPbl}
          interviewUpdatedAt={null}
          latestResult={baseLatestResult}
        />
      );
      const expanded = screen
        .queryAllByRole('button')
        .filter((b) => b.getAttribute('aria-expanded') === 'true');
      expect(expanded).toHaveLength(0);
    });

    it('[전체 펼치기] 클릭 시 모든 섹션이 펼쳐진다 (양식 v2 로드맵 7개)', async () => {
      const user = userEvent.setup();
      render(
        <InterviewReviewClient
          projectId="p-1"
          track="ROADMAP"
          interviewData={minimalRoadmap}
          interviewUpdatedAt={null}
          latestResult={baseLatestResult}
        />
      );
      await user.click(screen.getByRole('button', { name: '전체 펼치기' }));
      const expanded = screen.getAllByRole('button', { expanded: true });
      // 토글 버튼 자체는 expanded 속성이 없고, v2 에서 Ⅲ-1 삭제로 7개 CollapsibleSection 헤더만 expanded=true
      expect(expanded.length).toBeGreaterThanOrEqual(7);
    });

    it('[전체 접기] 클릭 시 펼쳐진 섹션이 모두 접힌다', async () => {
      const user = userEvent.setup();
      render(
        <InterviewReviewClient
          projectId="p-1"
          track="ROADMAP"
          interviewData={minimalRoadmap}
          interviewUpdatedAt={null}
          latestResult={baseLatestResult}
        />
      );
      await user.click(screen.getByRole('button', { name: '전체 펼치기' }));
      await user.click(screen.getByRole('button', { name: '전체 접기' }));
      const expanded = screen
        .queryAllByRole('button')
        .filter((b) => b.getAttribute('aria-expanded') === 'true');
      expect(expanded).toHaveLength(0);
    });
  });

  // ─── #7 편집 성공 토스트 두 줄 ───────────────────────────────────────
  describe('편집 성공 토스트 (#7)', () => {
    const SUCCESS_TITLE = '수정되었습니다';
    const SUCCESS_DESC = "결과 탭에서 '다시 생성' 버튼을 눌러야 반영됩니다";

    const roadmapData: Partial<RoadmapInterviewStrict> = {
      establishmentNecessity: '훈련 수립 필요성 텍스트',
      performanceActivities: [],
      aiLevel: 'INTERMEDIATE',
      selectedTask: '데이터 분석',
      companyRequirements: {
        status: '현황 텍스트',
        problem: '문제',
        will: '의지',
        outcomes: '성과',
      },
      taskAnalysis: [],
      targetTask: {
        name: '결산 자동화',
        reason: '효율',
        expectedAsIs: '수기',
        expectedToBe: '자동',
      },
    };

    beforeEach(async () => {
      vi.clearAllMocks();
      const { editInterviewFieldRoadmap } = await import('../actions');
      vi.mocked(editInterviewFieldRoadmap).mockResolvedValue({ success: true });
    });

    it('RoadmapInlineText (단순 필드: 선정 과업) 저장 성공 시 두 줄 success 토스트', async () => {
      const user = userEvent.setup();
      const { showSuccessToast } = await import('@/lib/utils');
      render(
        <InterviewReviewClient
          projectId="p-1"
          track="ROADMAP"
          interviewData={roadmapData}
          interviewUpdatedAt={null}
          latestResult={baseLatestResult}
        />
      );
      // Ⅰ-3 카드 펼치기 (selectedTask = '데이터 분석' 노출)
      await user.click(screen.getByText(/Ⅰ-3\. 수립 주요 결과/));
      await user.click(screen.getByText('데이터 분석'));
      const inputs = screen.getAllByRole('textbox');
      await user.clear(inputs[0]);
      await user.type(inputs[0], '신규 과업');
      await user.click(screen.getAllByRole('button', { name: '저장' })[0]);

      expect(showSuccessToast).toHaveBeenCalledWith(SUCCESS_TITLE, SUCCESS_DESC);
      expect(showSuccessToast).toHaveBeenCalledTimes(1);
    });

    it('CompanyReqRow (companyRequirements 분기) 저장 성공 시 두 줄 success 토스트', async () => {
      const user = userEvent.setup();
      const { showSuccessToast } = await import('@/lib/utils');
      render(
        <InterviewReviewClient
          projectId="p-1"
          track="ROADMAP"
          interviewData={roadmapData}
          interviewUpdatedAt={null}
          latestResult={baseLatestResult}
        />
      );
      // #3 이후: Ⅱ-2 카드 default 닫힘 → 헤더 클릭으로 펼친 후 첫 행 값 편집
      await user.click(screen.getByText(/Ⅱ-2\. 기업 요구분석/));
      await user.click(screen.getByText('현황 텍스트'));
      const inputs = screen.getAllByRole('textbox');
      await user.clear(inputs[0]);
      await user.type(inputs[0], '갱신');
      await user.click(screen.getAllByRole('button', { name: '저장' })[0]);

      expect(showSuccessToast).toHaveBeenCalledWith(SUCCESS_TITLE, SUCCESS_DESC);
      expect(showSuccessToast).toHaveBeenCalledTimes(1);
    });

    it('TargetTaskRow (targetTask 분기) 저장 성공 시 두 줄 success 토스트', async () => {
      const user = userEvent.setup();
      const { showSuccessToast } = await import('@/lib/utils');
      render(
        <InterviewReviewClient
          projectId="p-1"
          track="ROADMAP"
          interviewData={roadmapData}
          interviewUpdatedAt={null}
          latestResult={baseLatestResult}
        />
      );
      // Ⅱ-4 카드 펼치기 → '결산 자동화' (targetTask.name)
      await user.click(screen.getByText(/Ⅱ-4\. AI 적용 대상 과업/));
      await user.click(screen.getByText('결산 자동화'));
      const inputs = screen.getAllByRole('textbox');
      await user.clear(inputs[0]);
      await user.type(inputs[0], '신규 과업명');
      await user.click(screen.getAllByRole('button', { name: '저장' })[0]);

      expect(showSuccessToast).toHaveBeenCalledWith(SUCCESS_TITLE, SUCCESS_DESC);
      expect(showSuccessToast).toHaveBeenCalledTimes(1);
    });

    it('실패 분기에서는 success 토스트 미호출 + error 토스트 호출 (회귀)', async () => {
      const user = userEvent.setup();
      const { editInterviewFieldRoadmap } = await import('../actions');
      const { showSuccessToast, showErrorToast } = await import('@/lib/utils');
      vi.mocked(editInterviewFieldRoadmap).mockResolvedValue({
        success: false,
        error: '권한 없음',
      });

      render(
        <InterviewReviewClient
          projectId="p-1"
          track="ROADMAP"
          interviewData={roadmapData}
          interviewUpdatedAt={null}
          latestResult={baseLatestResult}
        />
      );
      // #3 이후: 카드 default 닫힘 → 헤더 클릭으로 펼친 후 첫 행 값 편집
      await user.click(screen.getByText(/Ⅱ-2\. 기업 요구분석/));
      await user.click(screen.getByText('현황 텍스트'));
      const inputs = screen.getAllByRole('textbox');
      await user.clear(inputs[0]);
      await user.type(inputs[0], '실패 케이스');
      await user.click(screen.getAllByRole('button', { name: '저장' })[0]);

      expect(showSuccessToast).not.toHaveBeenCalled();
      expect(showErrorToast).toHaveBeenCalledWith('인터뷰 수정 실패', '권한 없음');
    });
  });
});
