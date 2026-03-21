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

vi.mock('../actions', async () => {
  const actual = await vi.importActual('../actions');
  return {
    ...actual,
    fetchRoadmapVersionForOps: (...args: unknown[]) =>
      mockFetchRoadmapVersionForOps(...args),
  };
});

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

// 로드맵 하위 컴포넌트 경량 모킹
vi.mock('@/components/roadmap/RoadmapMatrix', () => ({
  RoadmapMatrix: () => <div data-testid="roadmap-matrix">RoadmapMatrix</div>,
}));
vi.mock('@/components/roadmap/PBLCourseView', () => ({
  PBLCourseView: () => <div data-testid="pbl-course-view">PBLCourseView</div>,
}));
vi.mock('@/components/roadmap/CoursesList', () => ({
  CoursesList: () => <div data-testid="courses-list">CoursesList</div>,
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
    roadmap_matrix: [],
    pbl_course: {
      selected_course_name: '',
      selected_course_level: 'BEGINNER' as const,
      selected_course_task: '',
      selection_rationale: {
        consultant_expertise_fit: '',
        pain_point_alignment: '',
        feasibility_assessment: '',
        summary: '',
      },
      course_name: '',
      total_hours: 0,
      target_tasks: [],
      target_audience: '',
      curriculum: [],
      final_deliverables: [],
      expected_outcomes: [],
      business_impact: '',
      measurement_methods: [],
      prerequisites: [],
    },
    courses: [],
    free_tool_validated: true,
    time_limit_validated: true,
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
  free_tool_validated: true,
  time_limit_validated: true,
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
      render(
        <OpsRoadmapClient
          projectId="proj-1"
          initialVersions={[mockVersion1]}
        />
      );
      expect(screen.getByText('AI 교육 로드맵')).toBeInTheDocument();
    });

    it('"품질 관리 및 감사 목적으로 열람합니다" 설명을 표시한다', () => {
      render(
        <OpsRoadmapClient
          projectId="proj-1"
          initialVersions={[mockVersion1]}
        />
      );
      expect(screen.getByText('품질 관리 및 감사 목적으로 열람합니다.')).toBeInTheDocument();
    });

    it('버전 히스토리 목록을 표시한다', () => {
      render(
        <OpsRoadmapClient
          projectId="proj-1"
          initialVersions={[mockVersion1, mockVersion2]}
        />
      );
      expect(screen.getByTestId('version-history-list')).toBeInTheDocument();
    });

    it('initialVersions가 있으면 첫 번째 버전이 자동 선택된다', () => {
      render(
        <OpsRoadmapClient
          projectId="proj-1"
          initialVersions={[mockVersion1]}
        />
      );
      // 버전 번호가 헤더에 표시됨 (버튼 + h2 두 곳에 나옴)
      expect(screen.getAllByText('버전 1').length).toBeGreaterThan(0);
    });

    it('initialVersions가 비어있으면 "로드맵이 없습니다" 메시지를 표시한다', () => {
      render(<OpsRoadmapClient projectId="proj-1" initialVersions={[]} />);
      expect(screen.getByText('로드맵이 없습니다')).toBeInTheDocument();
    });

    it('"아직 컨설턴트가 로드맵을 생성하지 않았습니다" 안내 문구를 표시한다', () => {
      render(<OpsRoadmapClient projectId="proj-1" initialVersions={[]} />);
      expect(
        screen.getByText('아직 컨설턴트가 로드맵을 생성하지 않았습니다.')
      ).toBeInTheDocument();
    });
  });

  // --------------------------------------------------------------------------
  // 2. 버전 선택
  // --------------------------------------------------------------------------
  describe('버전 선택', () => {
    it('버전 버튼 클릭 시 fetchRoadmapVersionForOps를 호출한다', async () => {
      render(
        <OpsRoadmapClient
          projectId="proj-1"
          initialVersions={[mockVersion1, mockVersion2]}
        />
      );

      const versionBtn = screen.getByTestId('version-btn-rv-2');
      await act(async () => {
        fireEvent.click(versionBtn);
      });

      await waitFor(() => {
        expect(mockFetchRoadmapVersionForOps).toHaveBeenCalledWith('rv-2');
      });
    });

    it('버전 선택 후 버전 번호가 업데이트된다', async () => {
      mockFetchRoadmapVersionForOps.mockResolvedValue(mockVersion2);
      render(
        <OpsRoadmapClient
          projectId="proj-1"
          initialVersions={[mockVersion1, mockVersion2]}
        />
      );

      const versionBtn = screen.getByTestId('version-btn-rv-2');
      await act(async () => {
        fireEvent.click(versionBtn);
      });

      await waitFor(() => {
        // h2 헤더에 "버전 2"가 표시되는지 확인
        const h2 = document.querySelector('h2.text-lg');
        expect(h2?.textContent).toContain('버전 2');
      });
    });

    it('fetchRoadmapVersionForOps가 null을 반환해도 기존 버전을 유지한다', async () => {
      mockFetchRoadmapVersionForOps.mockResolvedValue(null);
      render(
        <OpsRoadmapClient
          projectId="proj-1"
          initialVersions={[mockVersion1, mockVersion2]}
        />
      );

      // 초기에 버전 1이 선택됨 — h2 헤더에서 확인
      const h2 = document.querySelector('h2.text-lg');
      expect(h2?.textContent).toContain('버전 1');

      const versionBtn = screen.getByTestId('version-btn-rv-2');
      await act(async () => {
        fireEvent.click(versionBtn);
      });

      await waitFor(() => {
        // null 반환 → 기존 버전 1 유지
        const h2After = document.querySelector('h2.text-lg');
        expect(h2After?.textContent).toContain('버전 1');
      });
    });
  });

  // --------------------------------------------------------------------------
  // 3. 탭 전환
  // --------------------------------------------------------------------------
  describe('탭 전환', () => {
    it('기본 탭 "과정 체계도"가 활성화되어 RoadmapMatrix를 표시한다', () => {
      render(
        <OpsRoadmapClient
          projectId="proj-1"
          initialVersions={[mockVersion1]}
        />
      );
      expect(screen.getByTestId('roadmap-matrix')).toBeInTheDocument();
    });

    it('"과정 상세" 탭 클릭 시 CoursesList를 표시한다', async () => {
      render(
        <OpsRoadmapClient
          projectId="proj-1"
          initialVersions={[mockVersion1]}
        />
      );

      const coursesTab = screen.getByText('과정 상세');
      await act(async () => {
        fireEvent.click(coursesTab);
      });

      expect(screen.getByTestId('courses-list')).toBeInTheDocument();
    });

    it('"PBL 과정" 탭 클릭 시 PBLCourseView를 표시한다', async () => {
      render(
        <OpsRoadmapClient
          projectId="proj-1"
          initialVersions={[mockVersion1]}
        />
      );

      const pblTab = screen.getByText('PBL 과정');
      await act(async () => {
        fireEvent.click(pblTab);
      });

      expect(screen.getByTestId('pbl-course-view')).toBeInTheDocument();
    });

    it('탭 전환 후 이전 탭 내용이 사라진다', async () => {
      render(
        <OpsRoadmapClient
          projectId="proj-1"
          initialVersions={[mockVersion1]}
        />
      );

      // 기본: matrix 표시
      expect(screen.getByTestId('roadmap-matrix')).toBeInTheDocument();

      // PBL 탭으로 전환
      const pblTab = screen.getByText('PBL 과정');
      await act(async () => {
        fireEvent.click(pblTab);
      });

      expect(screen.queryByTestId('roadmap-matrix')).not.toBeInTheDocument();
      expect(screen.getByTestId('pbl-course-view')).toBeInTheDocument();
    });
  });

  // --------------------------------------------------------------------------
  // 4. 다운로드 버튼
  // --------------------------------------------------------------------------
  describe('다운로드 버튼', () => {
    it('PDF 다운로드 버튼이 렌더링된다', () => {
      render(
        <OpsRoadmapClient
          projectId="proj-1"
          initialVersions={[mockVersion1]}
        />
      );
      expect(screen.getByText('PDF')).toBeInTheDocument();
    });

    it('Excel 다운로드 버튼이 렌더링된다', () => {
      render(
        <OpsRoadmapClient
          projectId="proj-1"
          initialVersions={[mockVersion1]}
        />
      );
      expect(screen.getByText('Excel')).toBeInTheDocument();
    });

    it('PDF 다운로드 버튼 클릭 시 downloadPDF가 선택된 버전 id로 호출된다', async () => {
      render(
        <OpsRoadmapClient
          projectId="proj-1"
          initialVersions={[mockVersion1]}
        />
      );

      const pdfBtn = screen.getByText('PDF').closest('button')!;
      await act(async () => {
        fireEvent.click(pdfBtn);
      });

      expect(mockDownloadPDF).toHaveBeenCalledWith('rv-1');
    });

    it('Excel 다운로드 버튼 클릭 시 downloadXLSX가 선택된 버전 id로 호출된다', async () => {
      render(
        <OpsRoadmapClient
          projectId="proj-1"
          initialVersions={[mockVersion1]}
        />
      );

      const xlsxBtn = screen.getByText('Excel').closest('button')!;
      await act(async () => {
        fireEvent.click(xlsxBtn);
      });

      expect(mockDownloadXLSX).toHaveBeenCalledWith('rv-1');
    });
  });

  // --------------------------------------------------------------------------
  // 5. 검증 상태 표시
  // --------------------------------------------------------------------------
  describe('검증 상태', () => {
    it('검증 통과 버전은 "✓ 검증 통과" 문구를 표시한다', () => {
      render(
        <OpsRoadmapClient
          projectId="proj-1"
          initialVersions={[mockVersion1]}
        />
      );
      expect(screen.getByText('✓ 검증 통과')).toBeInTheDocument();
    });

    it('검증 실패 버전은 "✗ 검증 실패" 문구를 표시한다', () => {
      const failedVersion = makeVersion({
        id: 'rv-fail',
        free_tool_validated: false,
        time_limit_validated: true,
      });
      render(
        <OpsRoadmapClient
          projectId="proj-1"
          initialVersions={[failedVersion]}
        />
      );
      expect(screen.getByText('✗ 검증 실패')).toBeInTheDocument();
    });

    it('진단 요약이 표시된다', () => {
      render(
        <OpsRoadmapClient
          projectId="proj-1"
          initialVersions={[mockVersion1]}
        />
      );
      expect(screen.getByText('테스트 진단 요약입니다.')).toBeInTheDocument();
    });
  });

  // --------------------------------------------------------------------------
  // 6. 수정 프롬프트
  // --------------------------------------------------------------------------
  describe('수정 프롬프트', () => {
    it('revision_prompt가 있으면 RevisionPromptToggle을 표시한다', () => {
      const versionWithPrompt = makeVersion({
        revision_prompt: '이 부분을 수정해 주세요.',
      });
      render(
        <OpsRoadmapClient
          projectId="proj-1"
          initialVersions={[versionWithPrompt]}
        />
      );
      expect(screen.getByTestId('revision-prompt')).toBeInTheDocument();
      expect(screen.getByText('이 부분을 수정해 주세요.')).toBeInTheDocument();
    });

    it('revision_prompt가 null이면 RevisionPromptToggle을 표시하지 않는다', () => {
      render(
        <OpsRoadmapClient
          projectId="proj-1"
          initialVersions={[mockVersion1]}
        />
      );
      expect(screen.queryByTestId('revision-prompt')).not.toBeInTheDocument();
    });
  });
});
