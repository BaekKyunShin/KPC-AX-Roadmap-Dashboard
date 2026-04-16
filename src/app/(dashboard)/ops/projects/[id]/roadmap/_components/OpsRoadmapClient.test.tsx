import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import OpsRoadmapClient from './OpsRoadmapClient';
import type { RoadmapVersionUI } from '@/types/roadmap-ui';

// ============================================================================
// 모킹
// ============================================================================

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => '/ops/projects/proj-1/roadmap',
}));

const mockFetchRoadmapVersionForOps = vi.fn();

vi.mock('../actions', () => ({
  fetchRoadmapVersionForOps: (...args: unknown[]) =>
    mockFetchRoadmapVersionForOps(...args),
  fetchRoadmapVersionsForOps: vi.fn(),
}));

// useRoadmapDownload 모킹
const mockDownloadPDF = vi.fn();
const mockDownloadXLSX = vi.fn();

vi.mock('@/hooks/useRoadmapDownload', () => ({
  useRoadmapDownload: () => ({
    isDownloading: null,
    downloadPDF: mockDownloadPDF,
    downloadXLSX: mockDownloadXLSX,
  }),
}));

// 하위 컴포넌트 경량 모킹
vi.mock('@/components/roadmap/CompetencyModelingTable', () => ({
  CompetencyModelingTable: ({ canEdit }: { canEdit?: boolean }) => (
    <div data-testid="competency-modeling-table" data-can-edit={String(canEdit)}>
      CompetencyModelingTable
    </div>
  ),
}));
vi.mock('@/components/roadmap/RoadmapMatrix', () => ({
  RoadmapMatrix: ({ canEdit }: { canEdit?: boolean }) => (
    <div data-testid="roadmap-matrix" data-can-edit={String(canEdit)}>
      RoadmapMatrix
    </div>
  ),
}));
vi.mock('@/components/roadmap/AnnualTrainingPlanTable', () => ({
  AnnualTrainingPlanTable: ({ canEdit }: { canEdit?: boolean }) => (
    <div data-testid="annual-plan-table" data-can-edit={String(canEdit)}>
      AnnualTrainingPlanTable
    </div>
  ),
}));
vi.mock('@/components/roadmap/CoursesList', () => ({
  CoursesList: ({ canEdit }: { canEdit?: boolean }) => (
    <div data-testid="courses-list" data-can-edit={String(canEdit)}>
      CoursesList
    </div>
  ),
}));
vi.mock('@/components/roadmap/RoadmapStatusBadge', () => ({
  RoadmapStatusBadge: ({ status }: { status: string }) => (
    <span data-testid="status-badge">{status}</span>
  ),
}));
vi.mock('@/components/roadmap/RevisionPromptToggle', () => ({
  RevisionPromptToggle: ({ prompt }: { prompt: string }) => (
    <div data-testid="revision-prompt">{prompt}</div>
  ),
}));
vi.mock('@/components/roadmap/VersionHistoryList', () => ({
  VersionHistoryList: ({
    versions,
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
        >
          버전 {v.version_number}
        </button>
      ))}
    </div>
  ),
}));

// toast 모킹
vi.mock('@/lib/utils/toast', () => ({
  showErrorToast: vi.fn(),
  showSuccessToast: vi.fn(),
}));

// ============================================================================
// 테스트 데이터
// ============================================================================

function makeVersion(overrides: Partial<RoadmapVersionUI> = {}): RoadmapVersionUI {
  return {
    id: 'rv-1',
    version_number: 1,
    status: 'DRAFT',
    diagnosis_summary: '테스트 진단 요약입니다.',
    competencies: [],
    training_structure: [],
    annual_plan: { items: [], usage_plan: '' },
    course_specs: [],
    revision_prompt: null,
    is_shared: false,
    created_at: '2026-03-01T10:00:00Z',
    finalized_at: null,
    ...overrides,
  };
}

const mockVersion1 = makeVersion({ id: 'rv-1', version_number: 1, status: 'DRAFT' });
const mockVersion2 = makeVersion({
  id: 'rv-2',
  version_number: 2,
  status: 'FINAL',
});

// ============================================================================
// 테스트
// ============================================================================

describe('OpsRoadmapClient', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetchRoadmapVersionForOps.mockResolvedValue(mockVersion2);
  });

  // --------------------------------------------------------------------------
  // 1. 초기 렌더링
  // --------------------------------------------------------------------------
  describe('초기 렌더링', () => {
    it('페이지 헤더 "AI 교육 로드맵"을 표시한다', () => {
      render(<OpsRoadmapClient projectId="proj-1" initialVersions={[mockVersion1]} />);
      expect(screen.getByText('AI 교육 로드맵')).toBeInTheDocument();
    });

    it('"품질 관리 및 감사 목적으로 열람합니다" 설명을 표시한다', () => {
      render(<OpsRoadmapClient projectId="proj-1" initialVersions={[mockVersion1]} />);
      expect(
        screen.getByText('품질 관리 및 감사 목적으로 열람합니다.'),
      ).toBeInTheDocument();
    });

    it('initialVersions가 비어있으면 "로드맵이 없습니다" 메시지를 표시한다', () => {
      render(<OpsRoadmapClient projectId="proj-1" initialVersions={[]} />);
      expect(screen.getByText('로드맵이 없습니다')).toBeInTheDocument();
    });

    it('initialVersions가 있으면 첫 버전이 자동 선택된다', () => {
      render(<OpsRoadmapClient projectId="proj-1" initialVersions={[mockVersion1]} />);
      const h2 = document.querySelector('h2.text-lg');
      expect(h2?.textContent).toContain('버전 1');
    });
  });

  // --------------------------------------------------------------------------
  // 2. 4개 탭 전환 (읽기 전용)
  // --------------------------------------------------------------------------
  describe('4개 탭 전환', () => {
    it('4개 탭 버튼을 모두 표시한다', () => {
      render(<OpsRoadmapClient projectId="proj-1" initialVersions={[mockVersion1]} />);
      expect(screen.getByRole('button', { name: '역량 모델링' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: '훈련체계도' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: '연간 훈련계획' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: '훈련과정 명세서' })).toBeInTheDocument();
    });

    it('기본 탭은 "역량 모델링"이며 CompetencyModelingTable을 표시한다', () => {
      render(<OpsRoadmapClient projectId="proj-1" initialVersions={[mockVersion1]} />);
      expect(screen.getByTestId('competency-modeling-table')).toBeInTheDocument();
    });

    it('모든 탭 컴포넌트가 canEdit=false로 렌더된다', async () => {
      render(<OpsRoadmapClient projectId="proj-1" initialVersions={[mockVersion1]} />);
      expect(screen.getByTestId('competency-modeling-table')).toHaveAttribute(
        'data-can-edit',
        'false',
      );

      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: '훈련체계도' }));
      });
      expect(screen.getByTestId('roadmap-matrix')).toHaveAttribute(
        'data-can-edit',
        'false',
      );

      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: '연간 훈련계획' }));
      });
      expect(screen.getByTestId('annual-plan-table')).toHaveAttribute(
        'data-can-edit',
        'false',
      );

      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: '훈련과정 명세서' }));
      });
      expect(screen.getByTestId('courses-list')).toHaveAttribute(
        'data-can-edit',
        'false',
      );
    });
  });

  // --------------------------------------------------------------------------
  // 3. 버전 선택
  // --------------------------------------------------------------------------
  describe('버전 선택', () => {
    it('버전 버튼 클릭 시 fetchRoadmapVersionForOps를 호출한다', async () => {
      render(
        <OpsRoadmapClient
          projectId="proj-1"
          initialVersions={[mockVersion1, mockVersion2]}
        />,
      );

      const versionBtn = screen.getByTestId('version-btn-rv-2');
      await act(async () => {
        fireEvent.click(versionBtn);
      });

      await waitFor(() => {
        expect(mockFetchRoadmapVersionForOps).toHaveBeenCalledWith('rv-2');
      });
    });
  });

  // --------------------------------------------------------------------------
  // 4. 다운로드 버튼
  // --------------------------------------------------------------------------
  describe('다운로드 버튼', () => {
    it('PDF 다운로드 버튼 클릭 시 downloadPDF가 선택된 버전 id로 호출된다', async () => {
      render(<OpsRoadmapClient projectId="proj-1" initialVersions={[mockVersion1]} />);

      const pdfBtn = screen.getByText('PDF').closest('button')!;
      await act(async () => {
        fireEvent.click(pdfBtn);
      });

      expect(mockDownloadPDF).toHaveBeenCalledWith('rv-1');
    });

    it('Excel 다운로드 버튼 클릭 시 downloadXLSX가 선택된 버전 id로 호출된다', async () => {
      render(<OpsRoadmapClient projectId="proj-1" initialVersions={[mockVersion1]} />);

      const xlsxBtn = screen.getByText('Excel').closest('button')!;
      await act(async () => {
        fireEvent.click(xlsxBtn);
      });

      expect(mockDownloadXLSX).toHaveBeenCalledWith('rv-1');
    });
  });

  // --------------------------------------------------------------------------
  // 5. 진단 요약 & 수정 프롬프트
  // --------------------------------------------------------------------------
  describe('진단 요약 & 수정 프롬프트', () => {
    it('진단 요약이 표시된다', () => {
      render(<OpsRoadmapClient projectId="proj-1" initialVersions={[mockVersion1]} />);
      expect(screen.getByText('테스트 진단 요약입니다.')).toBeInTheDocument();
    });

    it('revision_prompt가 있으면 RevisionPromptToggle을 표시한다', () => {
      const versionWithPrompt = makeVersion({
        revision_prompt: '이 부분을 수정해 주세요.',
      });
      render(
        <OpsRoadmapClient projectId="proj-1" initialVersions={[versionWithPrompt]} />,
      );
      expect(screen.getByTestId('revision-prompt')).toBeInTheDocument();
      expect(screen.getByText('이 부분을 수정해 주세요.')).toBeInTheDocument();
    });

    it('revision_prompt가 null이면 RevisionPromptToggle을 표시하지 않는다', () => {
      render(<OpsRoadmapClient projectId="proj-1" initialVersions={[mockVersion1]} />);
      expect(screen.queryByTestId('revision-prompt')).not.toBeInTheDocument();
    });
  });
});
