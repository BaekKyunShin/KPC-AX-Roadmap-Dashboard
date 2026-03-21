import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import ConsultantRoadmapClient from './ConsultantRoadmapClient';
import type { RoadmapVersionUI } from '@/types/roadmap-ui';

// =============================================================================
// 모킹 — 최상단에 배치
// =============================================================================

// next/navigation
const mockPush = vi.fn();
const mockBack = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush, back: mockBack }),
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

vi.mock('@/components/roadmap/RoadmapMatrix', () => ({
  RoadmapMatrix: ({ matrix }: { matrix: unknown }) => (
    <div data-testid="roadmap-matrix">Matrix({JSON.stringify(matrix).length})</div>
  ),
}));

vi.mock('@/components/roadmap/PBLCourseView', () => ({
  PBLCourseView: ({ course }: { course: unknown }) => (
    <div data-testid="pbl-course-view">PBL({typeof course})</div>
  ),
}));

vi.mock('@/components/roadmap/CoursesList', () => ({
  CoursesList: ({ courses }: { courses: unknown[] }) => (
    <div data-testid="courses-list">Courses({courses?.length ?? 0})</div>
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

vi.mock('./CourseEditModal', () => ({
  default: ({
    isOpen,
    onClose,
  }: {
    isOpen: boolean;
    course: unknown;
    onClose: () => void;
    onSave: (course: unknown) => void;
  }) => (
    isOpen ? (
      <div data-testid="course-edit-modal">
        <button data-testid="modal-close" onClick={onClose}>
          닫기
        </button>
      </div>
    ) : null
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
    roadmap_matrix: [],
    pbl_course: {
      selected_course_name: 'AI 기초 과정',
      selected_course_level: 'BEGINNER',
      selected_course_task: '데이터 분석',
      selection_rationale: {
        consultant_expertise_fit: '전문성 적합',
        pain_point_alignment: '페인포인트 연관',
        feasibility_assessment: '현실 가능',
        summary: '종합 선정 이유',
      },
      course_name: 'AI 기초 PBL',
      total_hours: 16,
      target_tasks: ['데이터 분석'],
      target_audience: '신입 직원',
      curriculum: [],
      final_deliverables: [],
      expected_outcomes: [],
      business_impact: '비즈니스 임팩트',
      measurement_methods: [],
      prerequisites: [],
    },
    courses: [],
    free_tool_validated: true,
    time_limit_validated: true,
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
        />
      );
      expect(screen.getByText('로드맵이 없습니다')).toBeInTheDocument();
    });

    it('버전이 없으면 생성 버튼에 "로드맵 생성" 텍스트를 표시한다', () => {
      render(
        <ConsultantRoadmapClient
          projectId={TEST_PROJECT_ID}
          initialVersions={[]}
          companyName={TEST_COMPANY_NAME}
        />
      );
      expect(screen.getByRole('button', { name: '로드맵 생성' })).toBeInTheDocument();
    });

    it('버전이 있으면 첫 번째 버전을 선택 상태로 표시한다', () => {
      const versions = [makeVersion()];
      render(
        <ConsultantRoadmapClient
          projectId={TEST_PROJECT_ID}
          initialVersions={versions}
          companyName={TEST_COMPANY_NAME}
        />
      );
      expect(screen.getByTestId('roadmap-status-badge')).toHaveTextContent('DRAFT');
    });

    it('버전이 있으면 "새 버전 로드맵 생성" 텍스트를 표시한다', () => {
      const versions = [makeVersion()];
      render(
        <ConsultantRoadmapClient
          projectId={TEST_PROJECT_ID}
          initialVersions={versions}
          companyName={TEST_COMPANY_NAME}
        />
      );
      expect(screen.getByRole('button', { name: '새 버전 로드맵 생성' })).toBeInTheDocument();
    });

    it('PageHeader 제목 "AI 교육 로드맵"을 표시한다', () => {
      render(
        <ConsultantRoadmapClient
          projectId={TEST_PROJECT_ID}
          initialVersions={[]}
          companyName={TEST_COMPANY_NAME}
        />
      );
      expect(screen.getByTestId('page-header')).toHaveTextContent('AI 교육 로드맵');
    });

    it('버전 히스토리 목록을 표시한다', () => {
      const versions = [makeVersion(), makeVersion({ id: 'version-2', version_number: 2 })];
      render(
        <ConsultantRoadmapClient
          projectId={TEST_PROJECT_ID}
          initialVersions={versions}
          companyName={TEST_COMPANY_NAME}
        />
      );
      expect(screen.getByTestId('version-history-list')).toBeInTheDocument();
      expect(screen.getByTestId('version-btn-version-1')).toBeInTheDocument();
      expect(screen.getByTestId('version-btn-version-2')).toBeInTheDocument();
    });
  });

  // ---------------------------------------------------------------------------
  // 2. 탭 전환
  // ---------------------------------------------------------------------------
  describe('탭 전환', () => {
    it('기본 탭은 "과정 체계도"이며 RoadmapMatrix를 표시한다', () => {
      render(
        <ConsultantRoadmapClient
          projectId={TEST_PROJECT_ID}
          initialVersions={[makeVersion()]}
          companyName={TEST_COMPANY_NAME}
        />
      );
      expect(screen.getByTestId('roadmap-matrix')).toBeInTheDocument();
    });

    it('"과정 상세" 탭 클릭 시 CoursesList를 표시한다', async () => {
      const user = userEvent.setup();
      render(
        <ConsultantRoadmapClient
          projectId={TEST_PROJECT_ID}
          initialVersions={[makeVersion()]}
          companyName={TEST_COMPANY_NAME}
        />
      );

      await user.click(screen.getByRole('button', { name: '과정 상세' }));
      expect(screen.getByTestId('courses-list')).toBeInTheDocument();
    });

    it('"PBL 과정" 탭 클릭 시 PBLCourseView를 표시한다', async () => {
      const user = userEvent.setup();
      render(
        <ConsultantRoadmapClient
          projectId={TEST_PROJECT_ID}
          initialVersions={[makeVersion()]}
          companyName={TEST_COMPANY_NAME}
        />
      );

      await user.click(screen.getByRole('button', { name: 'PBL 과정' }));
      expect(screen.getByTestId('pbl-course-view')).toBeInTheDocument();
    });

    it('탭 전환 후 다시 "과정 체계도" 탭 클릭 시 RoadmapMatrix로 돌아온다', async () => {
      const user = userEvent.setup();
      render(
        <ConsultantRoadmapClient
          projectId={TEST_PROJECT_ID}
          initialVersions={[makeVersion()]}
          companyName={TEST_COMPANY_NAME}
        />
      );

      await user.click(screen.getByRole('button', { name: 'PBL 과정' }));
      expect(screen.getByTestId('pbl-course-view')).toBeInTheDocument();

      await user.click(screen.getByRole('button', { name: '과정 체계도' }));
      expect(screen.getByTestId('roadmap-matrix')).toBeInTheDocument();
    });
  });

  // ---------------------------------------------------------------------------
  // 3. 로드맵 생성
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
        />
      );

      await user.click(screen.getByRole('button', { name: '로드맵 생성' }));
      expect(mockCreateRoadmap).toHaveBeenCalledWith(TEST_PROJECT_ID, undefined);
    });

    it('생성 중에는 버튼이 disabled 상태가 된다', async () => {
      const user = userEvent.setup();
      let resolveCreate: (value: unknown) => void;
      mockCreateRoadmap.mockImplementation(
        () => new Promise((resolve) => { resolveCreate = resolve; })
      );

      render(
        <ConsultantRoadmapClient
          projectId={TEST_PROJECT_ID}
          initialVersions={[]}
          companyName={TEST_COMPANY_NAME}
        />
      );

      await user.click(screen.getByRole('button', { name: '로드맵 생성' }));
      expect(screen.getByRole('button', { name: 'AI 생성 중...' })).toBeDisabled();

      // 정리
      resolveCreate!({ success: true });
    });

    it('생성 중에는 로딩 오버레이를 표시한다', async () => {
      const user = userEvent.setup();
      let resolveCreate: (value: unknown) => void;
      mockCreateRoadmap.mockImplementation(
        () => new Promise((resolve) => { resolveCreate = resolve; })
      );

      render(
        <ConsultantRoadmapClient
          projectId={TEST_PROJECT_ID}
          initialVersions={[]}
          companyName={TEST_COMPANY_NAME}
        />
      );

      await user.click(screen.getByRole('button', { name: '로드맵 생성' }));
      expect(screen.getByTestId('roadmap-loading-overlay')).toBeInTheDocument();

      resolveCreate!({ success: true });
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
        />
      );

      await user.click(screen.getByRole('button', { name: '로드맵 생성' }));
      await waitFor(() => {
        expect(mockShowSuccessToast).toHaveBeenCalledWith('로드맵 생성 완료', '로드맵이 생성되었습니다.');
      });
    });

    it('생성 실패 시 에러 토스트를 표시한다', async () => {
      const user = userEvent.setup();
      mockCreateRoadmap.mockResolvedValue({ success: false, error: '생성 오류 발생' });

      render(
        <ConsultantRoadmapClient
          projectId={TEST_PROJECT_ID}
          initialVersions={[]}
          companyName={TEST_COMPANY_NAME}
        />
      );

      await user.click(screen.getByRole('button', { name: '로드맵 생성' }));
      await waitFor(() => {
        expect(mockShowErrorToast).toHaveBeenCalledWith('로드맵 생성 실패', '생성 오류 발생');
      });
    });

    it('버전이 있을 때 수정 요청사항 textarea를 표시한다', () => {
      render(
        <ConsultantRoadmapClient
          projectId={TEST_PROJECT_ID}
          initialVersions={[makeVersion()]}
          companyName={TEST_COMPANY_NAME}
        />
      );
      expect(screen.getByPlaceholderText('수정 요청사항 (선택)')).toBeInTheDocument();
    });

    it('수정 요청사항을 입력 후 생성하면 revisionPrompt와 함께 createRoadmap을 호출한다', async () => {
      const user = userEvent.setup();
      mockCreateRoadmap.mockResolvedValue({ success: true });
      mockFetchRoadmapVersions.mockResolvedValue([makeVersion()]);

      render(
        <ConsultantRoadmapClient
          projectId={TEST_PROJECT_ID}
          initialVersions={[makeVersion()]}
          companyName={TEST_COMPANY_NAME}
        />
      );

      const textarea = screen.getByPlaceholderText('수정 요청사항 (선택)');
      await user.type(textarea, '더 쉬운 내용으로 수정');

      await user.click(screen.getByRole('button', { name: '새 버전 로드맵 생성' }));
      await waitFor(() => {
        expect(mockCreateRoadmap).toHaveBeenCalledWith(TEST_PROJECT_ID, '더 쉬운 내용으로 수정');
      });
    });

    it('생성 취소 버튼 클릭 시 cancelRoadmapGeneration을 호출한다', async () => {
      const user = userEvent.setup();
      let resolveCreate: (value: unknown) => void;
      mockCreateRoadmap.mockImplementation(
        () => new Promise((resolve) => { resolveCreate = resolve; })
      );
      mockCancelRoadmapGeneration.mockResolvedValue(undefined);

      render(
        <ConsultantRoadmapClient
          projectId={TEST_PROJECT_ID}
          initialVersions={[]}
          companyName={TEST_COMPANY_NAME}
        />
      );

      await user.click(screen.getByRole('button', { name: '로드맵 생성' }));
      await user.click(screen.getByTestId('cancel-generation'));

      expect(mockCancelRoadmapGeneration).toHaveBeenCalled();
      // 오버레이 사라짐
      expect(screen.queryByTestId('roadmap-loading-overlay')).not.toBeInTheDocument();

      resolveCreate!({ success: false });
    });
  });

  // ---------------------------------------------------------------------------
  // 4. 버전 선택
  // ---------------------------------------------------------------------------
  describe('버전 선택', () => {
    it('버전 버튼 클릭 시 fetchRoadmapVersion을 호출한다', async () => {
      const user = userEvent.setup();
      const versions = [
        makeVersion({ id: 'v1', version_number: 1 }),
        makeVersion({ id: 'v2', version_number: 2 }),
      ];
      mockFetchRoadmapVersion.mockResolvedValue(
        makeVersion({ id: 'v2', version_number: 2 })
      );

      render(
        <ConsultantRoadmapClient
          projectId={TEST_PROJECT_ID}
          initialVersions={versions}
          companyName={TEST_COMPANY_NAME}
        />
      );

      await user.click(screen.getByTestId('version-btn-v2'));
      expect(mockFetchRoadmapVersion).toHaveBeenCalledWith('v2');
    });

    it('버전 선택 후 선택된 버전의 상태 배지를 표시한다', async () => {
      const user = userEvent.setup();
      const versions = [
        makeVersion({ id: 'v1', version_number: 1, status: 'DRAFT' }),
        makeVersion({ id: 'v2', version_number: 2, status: 'FINAL' }),
      ];
      mockFetchRoadmapVersion.mockResolvedValue(
        makeVersion({ id: 'v2', version_number: 2, status: 'FINAL' })
      );

      render(
        <ConsultantRoadmapClient
          projectId={TEST_PROJECT_ID}
          initialVersions={versions}
          companyName={TEST_COMPANY_NAME}
        />
      );

      await user.click(screen.getByTestId('version-btn-v2'));
      await waitFor(() => {
        expect(screen.getByTestId('roadmap-status-badge')).toHaveTextContent('FINAL');
      });
    });
  });

  // ---------------------------------------------------------------------------
  // 5. 최종 확정
  // ---------------------------------------------------------------------------
  describe('최종 확정', () => {
    it('DRAFT 상태 버전에서 "최종 확정" 버튼을 표시한다', () => {
      render(
        <ConsultantRoadmapClient
          projectId={TEST_PROJECT_ID}
          initialVersions={[makeVersion({ status: 'DRAFT' })]}
          companyName={TEST_COMPANY_NAME}
        />
      );
      expect(screen.getByRole('button', { name: '최종 확정' })).toBeInTheDocument();
    });

    it('FINAL 상태 버전에서 "최종 확정" 버튼을 표시하지 않는다', () => {
      render(
        <ConsultantRoadmapClient
          projectId={TEST_PROJECT_ID}
          initialVersions={[makeVersion({ status: 'FINAL' })]}
          companyName={TEST_COMPANY_NAME}
        />
      );
      expect(screen.queryByRole('button', { name: '최종 확정' })).not.toBeInTheDocument();
    });

    it('최종 확정 버튼 클릭 시 confirm 창을 표시한다', async () => {
      const user = userEvent.setup();
      const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false);

      render(
        <ConsultantRoadmapClient
          projectId={TEST_PROJECT_ID}
          initialVersions={[makeVersion({ status: 'DRAFT' })]}
          companyName={TEST_COMPANY_NAME}
        />
      );

      await user.click(screen.getByRole('button', { name: '최종 확정' }));
      expect(confirmSpy).toHaveBeenCalled();
    });

    it('confirm 취소 시 confirmFinalRoadmap을 호출하지 않는다', async () => {
      const user = userEvent.setup();
      vi.spyOn(window, 'confirm').mockReturnValue(false);

      render(
        <ConsultantRoadmapClient
          projectId={TEST_PROJECT_ID}
          initialVersions={[makeVersion({ status: 'DRAFT' })]}
          companyName={TEST_COMPANY_NAME}
        />
      );

      await user.click(screen.getByRole('button', { name: '최종 확정' }));
      expect(mockConfirmFinalRoadmap).not.toHaveBeenCalled();
    });

    it('confirm 승인 시 confirmFinalRoadmap을 호출한다', async () => {
      const user = userEvent.setup();
      vi.spyOn(window, 'confirm').mockReturnValue(true);
      mockConfirmFinalRoadmap.mockResolvedValue({ success: true });
      mockFetchRoadmapVersions.mockResolvedValue([makeVersion({ status: 'FINAL' })]);

      render(
        <ConsultantRoadmapClient
          projectId={TEST_PROJECT_ID}
          initialVersions={[makeVersion({ status: 'DRAFT', id: 'version-1' })]}
          companyName={TEST_COMPANY_NAME}
        />
      );

      await user.click(screen.getByRole('button', { name: '최종 확정' }));
      await waitFor(() => {
        expect(mockConfirmFinalRoadmap).toHaveBeenCalledWith('version-1');
      });
    });

    it('최종 확정 성공 시 성공 토스트를 표시한다', async () => {
      const user = userEvent.setup();
      vi.spyOn(window, 'confirm').mockReturnValue(true);
      mockConfirmFinalRoadmap.mockResolvedValue({ success: true });
      mockFetchRoadmapVersions.mockResolvedValue([makeVersion()]);

      render(
        <ConsultantRoadmapClient
          projectId={TEST_PROJECT_ID}
          initialVersions={[makeVersion({ status: 'DRAFT' })]}
          companyName={TEST_COMPANY_NAME}
        />
      );

      await user.click(screen.getByRole('button', { name: '최종 확정' }));
      await waitFor(() => {
        expect(mockShowSuccessToast).toHaveBeenCalledWith('최종 확정 완료', '로드맵이 최종 확정되었습니다.');
      });
    });

    it('최종 확정 실패 시 에러 토스트를 표시한다', async () => {
      const user = userEvent.setup();
      vi.spyOn(window, 'confirm').mockReturnValue(true);
      mockConfirmFinalRoadmap.mockResolvedValue({ success: false, error: '확정 오류' });

      render(
        <ConsultantRoadmapClient
          projectId={TEST_PROJECT_ID}
          initialVersions={[makeVersion({ status: 'DRAFT' })]}
          companyName={TEST_COMPANY_NAME}
        />
      );

      await user.click(screen.getByRole('button', { name: '최종 확정' }));
      await waitFor(() => {
        expect(mockShowErrorToast).toHaveBeenCalledWith('최종 확정 실패', '확정 오류');
      });
    });
  });

  // ---------------------------------------------------------------------------
  // 6. FINAL 버전 공유 토글
  // ---------------------------------------------------------------------------
  describe('FINAL 버전 공유 토글', () => {
    it('FINAL 버전이면 ShareToggle을 표시한다', () => {
      render(
        <ConsultantRoadmapClient
          projectId={TEST_PROJECT_ID}
          initialVersions={[makeVersion({ status: 'FINAL', id: 'v-final' })]}
          companyName={TEST_COMPANY_NAME}
        />
      );
      expect(screen.getByTestId('share-toggle')).toBeInTheDocument();
    });

    it('DRAFT 버전이면 ShareToggle을 표시하지 않는다', () => {
      render(
        <ConsultantRoadmapClient
          projectId={TEST_PROJECT_ID}
          initialVersions={[makeVersion({ status: 'DRAFT' })]}
          companyName={TEST_COMPANY_NAME}
        />
      );
      expect(screen.queryByTestId('share-toggle')).not.toBeInTheDocument();
    });
  });

  // ---------------------------------------------------------------------------
  // 7. 다운로드 버튼
  // ---------------------------------------------------------------------------
  describe('다운로드 버튼', () => {
    it('PDF 다운로드 버튼 클릭 시 downloadPDF를 호출한다', async () => {
      const user = userEvent.setup();
      render(
        <ConsultantRoadmapClient
          projectId={TEST_PROJECT_ID}
          initialVersions={[makeVersion()]}
          companyName={TEST_COMPANY_NAME}
        />
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
        />
      );

      await user.click(screen.getByTestId('download-Excel'));
      expect(mockDownloadXLSX).toHaveBeenCalledWith('version-1');
    });
  });

  // ---------------------------------------------------------------------------
  // 8. 검토 필요 사항
  // ---------------------------------------------------------------------------
  describe('검토 필요 사항', () => {
    it('free_tool_validated와 time_limit_validated가 모두 true이면 검토 섹션을 표시하지 않는다', () => {
      render(
        <ConsultantRoadmapClient
          projectId={TEST_PROJECT_ID}
          initialVersions={[makeVersion({ free_tool_validated: true, time_limit_validated: true })]}
          companyName={TEST_COMPANY_NAME}
        />
      );
      expect(screen.queryByText(/검토 필요 사항/)).not.toBeInTheDocument();
    });

    it('free_tool_validated가 false이면 검토 섹션을 표시한다', () => {
      render(
        <ConsultantRoadmapClient
          projectId={TEST_PROJECT_ID}
          initialVersions={[makeVersion({ free_tool_validated: false, time_limit_validated: true })]}
          companyName={TEST_COMPANY_NAME}
        />
      );
      expect(screen.getByText(/검토 필요 사항/)).toBeInTheDocument();
    });

    it('time_limit_validated가 false이면 검토 섹션을 표시한다', () => {
      render(
        <ConsultantRoadmapClient
          projectId={TEST_PROJECT_ID}
          initialVersions={[makeVersion({ free_tool_validated: true, time_limit_validated: false })]}
          companyName={TEST_COMPANY_NAME}
        />
      );
      expect(screen.getByText(/검토 필요 사항/)).toBeInTheDocument();
    });
  });

  // ---------------------------------------------------------------------------
  // 9. revision_prompt 표시
  // ---------------------------------------------------------------------------
  describe('revision_prompt 표시', () => {
    it('revision_prompt가 있으면 RevisionPromptToggle을 표시한다', () => {
      render(
        <ConsultantRoadmapClient
          projectId={TEST_PROJECT_ID}
          initialVersions={[makeVersion({ revision_prompt: '이전 수정 요청사항' })]}
          companyName={TEST_COMPANY_NAME}
        />
      );
      expect(screen.getByTestId('revision-prompt-toggle')).toBeInTheDocument();
      expect(screen.getByTestId('revision-prompt-toggle')).toHaveTextContent('이전 수정 요청사항');
    });

    it('revision_prompt가 null이면 RevisionPromptToggle을 표시하지 않는다', () => {
      render(
        <ConsultantRoadmapClient
          projectId={TEST_PROJECT_ID}
          initialVersions={[makeVersion({ revision_prompt: null })]}
          companyName={TEST_COMPANY_NAME}
        />
      );
      expect(screen.queryByTestId('revision-prompt-toggle')).not.toBeInTheDocument();
    });
  });
});
