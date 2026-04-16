import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import ConsultantRoadmapClient from './ConsultantRoadmapClient';
import type { RoadmapVersionUI } from '@/types/roadmap-ui';

// =============================================================================
// 모킹 — 최상단에 배치
// =============================================================================

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), back: vi.fn() }),
  usePathname: () => '/consultant/projects/test-project-id/roadmap',
}));

// Server Actions
const mockCreateRoadmap = vi.fn();
const mockConfirmFinalRoadmap = vi.fn();
const mockFetchRoadmapVersions = vi.fn();
const mockFetchRoadmapVersion = vi.fn();
const mockEditRoadmapManually = vi.fn();
const mockCancelRoadmapGeneration = vi.fn();

vi.mock('../actions', () => ({
  createRoadmap: (...args: unknown[]) => mockCreateRoadmap(...args),
  confirmFinalRoadmap: (...args: unknown[]) => mockConfirmFinalRoadmap(...args),
  fetchRoadmapVersions: (...args: unknown[]) => mockFetchRoadmapVersions(...args),
  fetchRoadmapVersion: (...args: unknown[]) => mockFetchRoadmapVersion(...args),
  editRoadmapManually: (...args: unknown[]) => mockEditRoadmapManually(...args),
  cancelRoadmapGeneration: (...args: unknown[]) => mockCancelRoadmapGeneration(...args),
}));

// useRoadmapDownload 훅
const mockDownloadPDF = vi.fn();
const mockDownloadXLSX = vi.fn();
vi.mock('@/hooks/useRoadmapDownload', () => ({
  useRoadmapDownload: () => ({
    isDownloading: null,
    downloadPDF: mockDownloadPDF,
    downloadXLSX: mockDownloadXLSX,
  }),
}));

// 토스트
const mockShowSuccessToast = vi.fn();
const mockShowErrorToast = vi.fn();
vi.mock('@/lib/utils/toast', () => ({
  showSuccessToast: (...args: unknown[]) => mockShowSuccessToast(...args),
  showErrorToast: (...args: unknown[]) => mockShowErrorToast(...args),
}));

// LLM
vi.mock('@/lib/services/llm', () => ({
  isCancelledError: () => false,
}));

// 하위 컴포넌트 경량 모킹
vi.mock('@/components/ui/page-header', () => ({
  PageHeader: ({ title }: { title: string }) => (
    <div data-testid="page-header">{title}</div>
  ),
}));

vi.mock('@/components/roadmap/CompetencyModelingTable', () => ({
  CompetencyModelingTable: ({
    competencies,
    canEdit,
    onChange,
  }: {
    competencies: unknown[];
    canEdit?: boolean;
    onChange?: (next: unknown[]) => void;
  }) => (
    <div data-testid="competency-modeling-table" data-can-edit={String(canEdit)}>
      Competencies({competencies?.length ?? 0})
      {onChange && (
        <button
          data-testid="competency-change-btn"
          onClick={() => onChange([{ name: 'changed' }])}
        >
          change
        </button>
      )}
    </div>
  ),
}));

vi.mock('@/components/roadmap/RoadmapMatrix', () => ({
  RoadmapMatrix: ({
    competencies,
    trainingStructure,
    canEdit,
  }: {
    competencies: unknown[];
    trainingStructure: unknown[];
    canEdit?: boolean;
  }) => (
    <div data-testid="roadmap-matrix" data-can-edit={String(canEdit)}>
      Matrix(c={competencies?.length ?? 0}, s={trainingStructure?.length ?? 0})
    </div>
  ),
}));

vi.mock('@/components/roadmap/AnnualTrainingPlanTable', () => ({
  AnnualTrainingPlanTable: ({
    plan,
    canEdit,
    onChange,
  }: {
    plan: { items?: unknown[] };
    canEdit?: boolean;
    onChange?: (next: unknown) => void;
  }) => (
    <div data-testid="annual-plan-table" data-can-edit={String(canEdit)}>
      Plan({plan?.items?.length ?? 0})
      {onChange && (
        <button
          data-testid="annual-plan-change-btn"
          onClick={() => onChange({ items: [{ course_name: 'c' }], usage_plan: '' })}
        >
          change
        </button>
      )}
    </div>
  ),
}));

vi.mock('@/components/roadmap/CoursesList', () => ({
  CoursesList: ({
    specs,
    canEdit,
    onChange,
  }: {
    specs: unknown[];
    canEdit?: boolean;
    onChange?: (next: unknown[]) => void;
  }) => (
    <div data-testid="courses-list" data-can-edit={String(canEdit)}>
      Specs({specs?.length ?? 0})
      {onChange && (
        <button
          data-testid="course-specs-change-btn"
          onClick={() => onChange([{ course_name: 'new' }])}
        >
          change
        </button>
      )}
    </div>
  ),
}));

vi.mock('@/components/roadmap/RoadmapStatusBadge', () => ({
  RoadmapStatusBadge: ({ status }: { status: string }) => (
    <span data-testid="roadmap-status-badge">{status}</span>
  ),
}));

vi.mock('@/components/roadmap/RevisionPromptToggle', () => ({
  RevisionPromptToggle: ({ prompt }: { prompt: string }) => (
    <div data-testid="revision-prompt-toggle">{prompt}</div>
  ),
}));

vi.mock('@/components/roadmap/VersionHistoryList', () => ({
  VersionHistoryList: ({
    versions,
    selectedVersionId,
    onVersionSelect,
  }: {
    versions: RoadmapVersionUI[];
    selectedVersionId?: string;
    onVersionSelect: (id: string) => void;
  }) => (
    <div data-testid="version-history-list">
      {versions.map((v) => (
        <button
          key={v.id}
          data-testid={`version-btn-${v.id}`}
          onClick={() => onVersionSelect(v.id)}
          data-selected={selectedVersionId === v.id}
        >
          버전 {v.version_number}
        </button>
      ))}
    </div>
  ),
}));

vi.mock('@/components/roadmap/DownloadButton', () => ({
  DownloadButton: ({
    onClick,
    type,
    loading,
    disabled,
  }: {
    onClick: () => void;
    type: string;
    loading: boolean;
    disabled: boolean;
  }) => (
    <button
      data-testid={`download-${type}`}
      onClick={onClick}
      disabled={disabled || loading}
    >
      {type} 다운로드
    </button>
  ),
}));

vi.mock('@/components/roadmap/RoadmapLoadingOverlay', () => ({
  default: ({
    onCancel,
    isCompleted,
  }: {
    onCancel: () => void;
    isCompleted: boolean;
    companyName: string;
    profileHref: string;
    isTestMode: boolean;
  }) => (
    <div data-testid="roadmap-loading-overlay">
      <span data-testid="is-completed">{String(isCompleted)}</span>
      <button data-testid="cancel-generation" onClick={onCancel}>
        취소
      </button>
    </div>
  ),
  COMPLETION_DELAY_MS: 0,
}));

vi.mock('@/components/gallery/ShareToggle', () => ({
  ShareToggle: ({
    roadmapVersionId,
    initialShared,
  }: {
    roadmapVersionId: string;
    initialShared: boolean;
  }) => (
    <div data-testid="share-toggle">
      <span>{roadmapVersionId}</span>
      <span>{String(initialShared)}</span>
    </div>
  ),
}));

// =============================================================================
// 테스트 데이터
// =============================================================================

function makeVersion(overrides: Partial<RoadmapVersionUI> = {}): RoadmapVersionUI {
  return {
    id: 'version-1',
    version_number: 1,
    status: 'DRAFT',
    diagnosis_summary: '진단 요약 내용입니다.',
    competencies: [
      {
        name: '역량A',
        definition: '정의',
        knowledge: [],
        skills: [],
        attitudes: [],
        ncs_used: false,
      },
    ],
    training_structure: [
      {
        competency_name: '역량A',
        level: 'BEGINNER',
        content: '내용',
        target_audience: '대상',
        method: '방법',
        goal: '목표',
      },
    ],
    annual_plan: {
      items: [
        {
          competency_name: '역량A',
          course_name: '과정1',
          format: '집체',
          hours: 8,
          notes: '',
        },
      ],
      usage_plan: '',
    },
    course_specs: [
      {
        course_name: '과정1',
        format: '집체',
        recommended_program: '',
        goal: '',
        main_content: '',
        target_audience: '',
        subjects: [],
      },
    ],
    revision_prompt: null,
    is_shared: false,
    created_at: '2024-03-15T00:00:00Z',
    finalized_at: null,
    ...overrides,
  };
}

const TEST_PROJECT_ID = 'test-project-id';
const TEST_COMPANY_NAME = '테스트 기업';

// =============================================================================
// 테스트
// =============================================================================

describe('ConsultantRoadmapClient', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // window.confirm 기본 모킹
    vi.spyOn(window, 'confirm').mockReturnValue(true);
  });

  // ---------------------------------------------------------------------------
  // 1. 초기 렌더링
  // ---------------------------------------------------------------------------
  describe('초기 렌더링', () => {
    it('버전이 없으면 빈 상태 메시지를 표시한다', () => {
      render(
        <ConsultantRoadmapClient
          projectId={TEST_PROJECT_ID}
          initialVersions={[]}
          companyName={TEST_COMPANY_NAME}
        />,
      );
      expect(screen.getByText('로드맵이 없습니다')).toBeInTheDocument();
    });

    it('버전이 없으면 생성 버튼에 "로드맵 생성" 텍스트를 표시한다', () => {
      render(
        <ConsultantRoadmapClient
          projectId={TEST_PROJECT_ID}
          initialVersions={[]}
          companyName={TEST_COMPANY_NAME}
        />,
      );
      expect(screen.getByRole('button', { name: '로드맵 생성' })).toBeInTheDocument();
    });

    it('버전이 있으면 상태 배지를 표시한다', () => {
      const versions = [makeVersion()];
      render(
        <ConsultantRoadmapClient
          projectId={TEST_PROJECT_ID}
          initialVersions={versions}
          companyName={TEST_COMPANY_NAME}
        />,
      );
      expect(screen.getByTestId('roadmap-status-badge')).toHaveTextContent('DRAFT');
    });

    it('버전이 있으면 "새 버전 로드맵 생성" 텍스트를 표시한다', () => {
      render(
        <ConsultantRoadmapClient
          projectId={TEST_PROJECT_ID}
          initialVersions={[makeVersion()]}
          companyName={TEST_COMPANY_NAME}
        />,
      );
      expect(
        screen.getByRole('button', { name: '새 버전 로드맵 생성' }),
      ).toBeInTheDocument();
    });
  });

  // ---------------------------------------------------------------------------
  // 2. 4개 탭 & 전환
  // ---------------------------------------------------------------------------
  describe('4개 탭 & 전환', () => {
    it('4개 탭 버튼을 모두 표시한다', () => {
      render(
        <ConsultantRoadmapClient
          projectId={TEST_PROJECT_ID}
          initialVersions={[makeVersion()]}
          companyName={TEST_COMPANY_NAME}
        />,
      );
      expect(screen.getByRole('button', { name: '역량 모델링' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: '훈련체계도' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: '연간 훈련계획' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: '훈련과정 명세서' })).toBeInTheDocument();
    });

    it('기본 탭은 "역량 모델링"이며 CompetencyModelingTable을 표시한다', () => {
      render(
        <ConsultantRoadmapClient
          projectId={TEST_PROJECT_ID}
          initialVersions={[makeVersion()]}
          companyName={TEST_COMPANY_NAME}
        />,
      );
      expect(screen.getByTestId('competency-modeling-table')).toBeInTheDocument();
    });

    it('"훈련체계도" 탭 클릭 시 RoadmapMatrix를 표시한다', async () => {
      const user = userEvent.setup();
      render(
        <ConsultantRoadmapClient
          projectId={TEST_PROJECT_ID}
          initialVersions={[makeVersion()]}
          companyName={TEST_COMPANY_NAME}
        />,
      );
      await user.click(screen.getByRole('button', { name: '훈련체계도' }));
      expect(screen.getByTestId('roadmap-matrix')).toBeInTheDocument();
    });

    it('"연간 훈련계획" 탭 클릭 시 AnnualTrainingPlanTable을 표시한다', async () => {
      const user = userEvent.setup();
      render(
        <ConsultantRoadmapClient
          projectId={TEST_PROJECT_ID}
          initialVersions={[makeVersion()]}
          companyName={TEST_COMPANY_NAME}
        />,
      );
      await user.click(screen.getByRole('button', { name: '연간 훈련계획' }));
      expect(screen.getByTestId('annual-plan-table')).toBeInTheDocument();
    });

    it('"훈련과정 명세서" 탭 클릭 시 CoursesList를 표시한다', async () => {
      const user = userEvent.setup();
      render(
        <ConsultantRoadmapClient
          projectId={TEST_PROJECT_ID}
          initialVersions={[makeVersion()]}
          companyName={TEST_COMPANY_NAME}
        />,
      );
      await user.click(screen.getByRole('button', { name: '훈련과정 명세서' }));
      expect(screen.getByTestId('courses-list')).toBeInTheDocument();
    });
  });

  // ---------------------------------------------------------------------------
  // 3. 편집 가능 여부 (canEdit)
  // ---------------------------------------------------------------------------
  describe('편집 가능 여부', () => {
    it('DRAFT 상태에서는 canEdit=true가 하위 컴포넌트로 전달된다', () => {
      render(
        <ConsultantRoadmapClient
          projectId={TEST_PROJECT_ID}
          initialVersions={[makeVersion({ status: 'DRAFT' })]}
          companyName={TEST_COMPANY_NAME}
        />,
      );
      expect(screen.getByTestId('competency-modeling-table')).toHaveAttribute(
        'data-can-edit',
        'true',
      );
    });

    it('FINAL 상태에서는 canEdit=false가 하위 컴포넌트로 전달된다', () => {
      render(
        <ConsultantRoadmapClient
          projectId={TEST_PROJECT_ID}
          initialVersions={[makeVersion({ status: 'FINAL' })]}
          companyName={TEST_COMPANY_NAME}
        />,
      );
      expect(screen.getByTestId('competency-modeling-table')).toHaveAttribute(
        'data-can-edit',
        'false',
      );
    });

    it('DRAFT 상태에서는 "최종 확정" 버튼을 표시한다', () => {
      render(
        <ConsultantRoadmapClient
          projectId={TEST_PROJECT_ID}
          initialVersions={[makeVersion({ status: 'DRAFT' })]}
          companyName={TEST_COMPANY_NAME}
        />,
      );
      expect(screen.getByRole('button', { name: '최종 확정' })).toBeInTheDocument();
    });

    it('FINAL 상태에서는 "최종 확정" 버튼을 표시하지 않는다', () => {
      render(
        <ConsultantRoadmapClient
          projectId={TEST_PROJECT_ID}
          initialVersions={[makeVersion({ status: 'FINAL' })]}
          companyName={TEST_COMPANY_NAME}
        />,
      );
      expect(
        screen.queryByRole('button', { name: '최종 확정' }),
      ).not.toBeInTheDocument();
    });

    it('FINAL 버전이면 ShareToggle을 표시한다', () => {
      render(
        <ConsultantRoadmapClient
          projectId={TEST_PROJECT_ID}
          initialVersions={[makeVersion({ status: 'FINAL' })]}
          companyName={TEST_COMPANY_NAME}
        />,
      );
      expect(screen.getByTestId('share-toggle')).toBeInTheDocument();
    });
  });

  // ---------------------------------------------------------------------------
  // 4. 섹션 인라인 편집 (controlled 패턴)
  // ---------------------------------------------------------------------------
  describe('섹션 인라인 편집', () => {
    it('CompetencyModelingTable onChange 시 editRoadmapManually가 competencies와 함께 호출된다', async () => {
      const user = userEvent.setup();
      mockEditRoadmapManually.mockResolvedValue({ success: true });
      mockFetchRoadmapVersion.mockResolvedValue(makeVersion());

      render(
        <ConsultantRoadmapClient
          projectId={TEST_PROJECT_ID}
          initialVersions={[makeVersion({ status: 'DRAFT' })]}
          companyName={TEST_COMPANY_NAME}
        />,
      );

      await user.click(screen.getByTestId('competency-change-btn'));
      await waitFor(() => {
        expect(mockEditRoadmapManually).toHaveBeenCalledWith('version-1', {
          competencies: [{ name: 'changed' }],
        });
      });
    });

    it('AnnualTrainingPlanTable onChange 시 editRoadmapManually가 annual_plan과 함께 호출된다', async () => {
      const user = userEvent.setup();
      mockEditRoadmapManually.mockResolvedValue({ success: true });
      mockFetchRoadmapVersion.mockResolvedValue(makeVersion());

      render(
        <ConsultantRoadmapClient
          projectId={TEST_PROJECT_ID}
          initialVersions={[makeVersion({ status: 'DRAFT' })]}
          companyName={TEST_COMPANY_NAME}
        />,
      );

      await user.click(screen.getByRole('button', { name: '연간 훈련계획' }));
      await user.click(screen.getByTestId('annual-plan-change-btn'));
      await waitFor(() => {
        expect(mockEditRoadmapManually).toHaveBeenCalledWith('version-1', {
          annual_plan: { items: [{ course_name: 'c' }], usage_plan: '' },
        });
      });
    });

    it('CoursesList onChange 시 editRoadmapManually가 course_specs와 함께 호출된다', async () => {
      const user = userEvent.setup();
      mockEditRoadmapManually.mockResolvedValue({ success: true });
      mockFetchRoadmapVersion.mockResolvedValue(makeVersion());

      render(
        <ConsultantRoadmapClient
          projectId={TEST_PROJECT_ID}
          initialVersions={[makeVersion({ status: 'DRAFT' })]}
          companyName={TEST_COMPANY_NAME}
        />,
      );

      await user.click(screen.getByRole('button', { name: '훈련과정 명세서' }));
      await user.click(screen.getByTestId('course-specs-change-btn'));
      await waitFor(() => {
        expect(mockEditRoadmapManually).toHaveBeenCalledWith('version-1', {
          course_specs: [{ course_name: 'new' }],
        });
      });
    });

    it('편집 실패 시 에러 토스트를 표시한다', async () => {
      const user = userEvent.setup();
      mockEditRoadmapManually.mockResolvedValue({ success: false, error: '저장 오류' });

      render(
        <ConsultantRoadmapClient
          projectId={TEST_PROJECT_ID}
          initialVersions={[makeVersion({ status: 'DRAFT' })]}
          companyName={TEST_COMPANY_NAME}
        />,
      );

      await user.click(screen.getByTestId('competency-change-btn'));
      await waitFor(() => {
        expect(mockShowErrorToast).toHaveBeenCalledWith('저장 실패', '저장 오류');
      });
    });
  });

  // ---------------------------------------------------------------------------
  // 5. 로드맵 생성 & 취소
  // ---------------------------------------------------------------------------
  describe('로드맵 생성', () => {
    it('생성 버튼 클릭 시 createRoadmap을 호출한다', async () => {
      const user = userEvent.setup();
      mockCreateRoadmap.mockResolvedValue({ success: true });
      mockFetchRoadmapVersions.mockResolvedValue([]);

      render(
        <ConsultantRoadmapClient
          projectId={TEST_PROJECT_ID}
          initialVersions={[]}
          companyName={TEST_COMPANY_NAME}
        />,
      );

      await user.click(screen.getByRole('button', { name: '로드맵 생성' }));
      expect(mockCreateRoadmap).toHaveBeenCalledWith(TEST_PROJECT_ID, undefined);
    });

    it('생성 성공 시 성공 토스트를 표시한다', async () => {
      const user = userEvent.setup();
      mockCreateRoadmap.mockResolvedValue({ success: true });
      mockFetchRoadmapVersions.mockResolvedValue([]);

      render(
        <ConsultantRoadmapClient
          projectId={TEST_PROJECT_ID}
          initialVersions={[]}
          companyName={TEST_COMPANY_NAME}
        />,
      );

      await user.click(screen.getByRole('button', { name: '로드맵 생성' }));
      await waitFor(() => {
        expect(mockShowSuccessToast).toHaveBeenCalledWith(
          '로드맵 생성 완료',
          '로드맵이 생성되었습니다.',
        );
      });
    });

    it('생성 실패 시 에러 토스트를 표시한다', async () => {
      const user = userEvent.setup();
      mockCreateRoadmap.mockResolvedValue({ success: false, error: '생성 오류' });

      render(
        <ConsultantRoadmapClient
          projectId={TEST_PROJECT_ID}
          initialVersions={[]}
          companyName={TEST_COMPANY_NAME}
        />,
      );

      await user.click(screen.getByRole('button', { name: '로드맵 생성' }));
      await waitFor(() => {
        expect(mockShowErrorToast).toHaveBeenCalledWith('로드맵 생성 실패', '생성 오류');
      });
    });

    it('생성 취소 버튼 클릭 시 cancelRoadmapGeneration을 호출한다', async () => {
      const user = userEvent.setup();
      let resolveCreate: (value: unknown) => void;
      mockCreateRoadmap.mockImplementation(
        () =>
          new Promise((resolve) => {
            resolveCreate = resolve;
          }),
      );
      mockCancelRoadmapGeneration.mockResolvedValue(undefined);

      render(
        <ConsultantRoadmapClient
          projectId={TEST_PROJECT_ID}
          initialVersions={[]}
          companyName={TEST_COMPANY_NAME}
        />,
      );

      await user.click(screen.getByRole('button', { name: '로드맵 생성' }));
      await user.click(screen.getByTestId('cancel-generation'));
      expect(mockCancelRoadmapGeneration).toHaveBeenCalled();

      resolveCreate!({ success: false });
    });
  });

  // ---------------------------------------------------------------------------
  // 6. 다운로드
  // ---------------------------------------------------------------------------
  describe('다운로드', () => {
    it('PDF 다운로드 버튼 클릭 시 downloadPDF를 호출한다', async () => {
      const user = userEvent.setup();
      render(
        <ConsultantRoadmapClient
          projectId={TEST_PROJECT_ID}
          initialVersions={[makeVersion()]}
          companyName={TEST_COMPANY_NAME}
        />,
      );
      await user.click(screen.getByTestId('download-PDF'));
      expect(mockDownloadPDF).toHaveBeenCalledWith('version-1');
    });

    it('Excel 다운로드 버튼 클릭 시 downloadXLSX를 호출한다', async () => {
      const user = userEvent.setup();
      render(
        <ConsultantRoadmapClient
          projectId={TEST_PROJECT_ID}
          initialVersions={[makeVersion()]}
          companyName={TEST_COMPANY_NAME}
        />,
      );
      await user.click(screen.getByTestId('download-Excel'));
      expect(mockDownloadXLSX).toHaveBeenCalledWith('version-1');
    });
  });
});
