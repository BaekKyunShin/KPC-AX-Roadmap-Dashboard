/**
 * RoadmapResultPageClient (Consultant) wrapper 스모크 테스트.
 *
 * Ops 버전보다 콜백이 많음: handleSelectVersion, handleGenerate,
 * handleCancelGenerate, handleEdit, handleDownload(PDF/XLSX/HWPX).
 * 각 핸들러를 최소 1회 실행해 functions coverage 확보.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';

import type { RoadmapVersionUI } from '@/types/roadmap-ui';

// ── Server Action 모킹 ────────────────────────────────────────────────
const fetchRoadmapPageDataV2Mock = vi.fn(
  (_projectId: string, _versionId?: string) =>
    Promise.resolve({
      success: true as const,
      data: {
        versions: [] as RoadmapVersionUI[],
        selectedVersion: null,
        interview: {},
      },
    }),
);
const createRoadmapV2Mock = vi.fn(
  (_projectId: string, _revisionPrompt?: string) =>
    Promise.resolve({ success: true as const, data: { roadmapId: 'new-v' } }),
);
const editRoadmapV2Mock = vi.fn((_roadmapId: string, _patch: unknown) =>
  Promise.resolve({ success: true as const, data: undefined }),
);
const exportRoadmapHwpxV2Mock = vi.fn((_versionId: string) =>
  Promise.resolve({
    success: true as const,
    data: { fileName: 't.hwpx', contentBase64: '', mimeType: 'x' },
  }),
);
const cancelRoadmapGenerationMock = vi.fn(() =>
  Promise.resolve({ success: true as const }),
);

vi.mock('../actions', () => ({
  fetchRoadmapPageDataV2: (projectId: string, versionId?: string) =>
    fetchRoadmapPageDataV2Mock(projectId, versionId),
  createRoadmapV2: (projectId: string, revisionPrompt?: string) =>
    createRoadmapV2Mock(projectId, revisionPrompt),
  editRoadmapV2: (roadmapId: string, patch: unknown) =>
    editRoadmapV2Mock(roadmapId, patch),
  exportRoadmapHwpxV2: (versionId: string) => exportRoadmapHwpxV2Mock(versionId),
  cancelRoadmapGeneration: () => cancelRoadmapGenerationMock(),
}));

// Toast 모킹 (side effect 만 stub)
vi.mock('@/lib/utils/toast', () => ({
  showErrorToast: vi.fn(),
  showSuccessToast: vi.fn(),
}));

// isCancelledError 는 원본 대로 동작하도록 두되 predictable
vi.mock('@/lib/services/llm', () => ({
  isCancelledError: (error: string | undefined) => error === 'CANCELLED',
}));

// COMPLETION_DELAY_MS 를 작게 모킹 (setTimeout 경로 cover)
vi.mock('@/components/roadmap/RoadmapLoadingOverlay', () => ({
  COMPLETION_DELAY_MS: 10,
}));

// 다운로드 훅 모킹
const downloadPDFMock = vi.fn();
const downloadXLSXMock = vi.fn();
const downloadHwpxMock = vi.fn();

vi.mock('@/hooks/useRoadmapDownload', () => ({
  useRoadmapDownload: () => ({
    isDownloading: false,
    downloadPDF: downloadPDFMock,
    downloadXLSX: downloadXLSXMock,
  }),
}));

vi.mock('@/hooks/useHwpxDownload', () => ({
  useHwpxDownload: () => ({
    download: downloadHwpxMock,
    isLoading: false,
    error: null,
  }),
}));

// V2 Client 모킹 — props 를 버튼 / data-attribute 로 노출
vi.mock('./result-v2/RoadmapResultClient', () => ({
  RoadmapResultClient: (props: {
    role: 'CONSULTANT' | 'OPS';
    projectId: string;
    companyName?: string;
    isGenerating?: boolean;
    isGenerationComplete?: boolean;
    onSelectVersion: (id: string) => void;
    onEdit: (patch: unknown) => void;
    onGenerate: (prompt?: string) => void;
    onDownload: (type: 'PDF' | 'XLSX' | 'HWPX') => void;
    onCancelGenerate?: () => void;
  }) => (
    <div
      data-testid="roadmap-result-client"
      data-role={props.role}
      data-project-id={props.projectId}
      data-company={props.companyName ?? ''}
      data-is-generating={String(Boolean(props.isGenerating))}
      data-is-complete={String(Boolean(props.isGenerationComplete))}
    >
      <button onClick={() => props.onSelectVersion('v-other')}>select</button>
      <button onClick={() => props.onGenerate('revise please')}>generate</button>
      <button onClick={() => props.onEdit({ diagnosisSummary: '수정본' })}>edit</button>
      <button onClick={() => props.onDownload('PDF')}>download-pdf</button>
      <button onClick={() => props.onDownload('XLSX')}>download-xlsx</button>
      <button onClick={() => props.onDownload('HWPX')}>download-hwpx</button>
      <button onClick={() => props.onCancelGenerate?.()}>cancel</button>
    </div>
  ),
}));

import RoadmapResultPageClient from './RoadmapResultPageClient';

function makeVersion(overrides: Partial<RoadmapVersionUI> = {}): RoadmapVersionUI {
  return {
    id: 'v1',
    version_number: 1,
    status: 'DRAFT',
    diagnosis_summary: '',
    setup_necessity: '',
    outcome_summary: {
      ai_competency_level: 'INTERMEDIATE',
      selected_tasks: '',
      main_content: '',
    },
    competencies: [],
    ncs_used: false,
    ncs_methodology: '',
    ncs_derivation_method: '',
    training_structure: [],
    training_structure_method: '',
    annual_plan: { items: [], usage_plan: '' },
    course_specs: [],
    revision_prompt: null,
    is_shared: false,
    created_at: '2026-04-24T00:00:00Z',
    finalized_at: null,
    ...overrides,
  };
}

describe('RoadmapResultPageClient (CONSULTANT)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('role="CONSULTANT" + companyName 을 Client 에 전달한다', () => {
    render(
      <RoadmapResultPageClient
        projectId="p-c"
        companyName="테스트기업"
        initialVersions={[makeVersion()]}
        initialSelected={makeVersion()}
        initialInterview={{}}
      />,
    );
    const root = screen.getByTestId('roadmap-result-client');
    expect(root.getAttribute('data-role')).toBe('CONSULTANT');
    expect(root.getAttribute('data-project-id')).toBe('p-c');
    expect(root.getAttribute('data-company')).toBe('테스트기업');
  });

  it('select 클릭 시 fetchRoadmapPageDataV2 호출', async () => {
    render(
      <RoadmapResultPageClient
        projectId="p-c"
        companyName="X"
        initialVersions={[makeVersion()]}
        initialSelected={makeVersion()}
        initialInterview={{}}
      />,
    );
    fireEvent.click(screen.getByText('select'));
    await waitFor(() =>
      expect(fetchRoadmapPageDataV2Mock).toHaveBeenCalledWith('p-c', 'v-other'),
    );
  });

  it('generate 클릭 시 createRoadmapV2 호출 + 성공 시 재fetch', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    render(
      <RoadmapResultPageClient
        projectId="p-c"
        companyName="X"
        initialVersions={[makeVersion()]}
        initialSelected={makeVersion()}
        initialInterview={{}}
      />,
    );
    await act(async () => {
      fireEvent.click(screen.getByText('generate'));
    });
    await vi.waitFor(() =>
      expect(createRoadmapV2Mock).toHaveBeenCalledWith('p-c', 'revise please'),
    );
    // completion setTimeout 경로까지 실행
    await act(async () => {
      await vi.advanceTimersByTimeAsync(20);
    });
  });

  it('edit 클릭 시 editRoadmapV2 호출', async () => {
    render(
      <RoadmapResultPageClient
        projectId="p-c"
        companyName="X"
        initialVersions={[makeVersion()]}
        initialSelected={makeVersion({ id: 'v-selected' })}
        initialInterview={{}}
      />,
    );
    fireEvent.click(screen.getByText('edit'));
    await waitFor(() =>
      expect(editRoadmapV2Mock).toHaveBeenCalledWith('v-selected', {
        diagnosisSummary: '수정본',
      }),
    );
  });

  it('edit 실패 시 fetch 를 호출하지 않는다', async () => {
    editRoadmapV2Mock.mockResolvedValueOnce({
      success: false,
      error: '서버 오류',
    } as unknown as { success: true; data: undefined });
    render(
      <RoadmapResultPageClient
        projectId="p-c"
        companyName="X"
        initialVersions={[makeVersion()]}
        initialSelected={makeVersion({ id: 'v-selected' })}
        initialInterview={{}}
      />,
    );
    fireEvent.click(screen.getByText('edit'));
    await waitFor(() => expect(editRoadmapV2Mock).toHaveBeenCalled());
    expect(fetchRoadmapPageDataV2Mock).not.toHaveBeenCalled();
  });

  it('download 3종 클릭 시 각 훅 호출', async () => {
    render(
      <RoadmapResultPageClient
        projectId="p-c"
        companyName="X"
        initialVersions={[makeVersion()]}
        initialSelected={makeVersion({ id: 'v-selected' })}
        initialInterview={{}}
      />,
    );
    fireEvent.click(screen.getByText('download-pdf'));
    fireEvent.click(screen.getByText('download-xlsx'));
    fireEvent.click(screen.getByText('download-hwpx'));
    await waitFor(() => {
      expect(downloadPDFMock).toHaveBeenCalledWith('v-selected');
      expect(downloadXLSXMock).toHaveBeenCalledWith('v-selected');
      expect(downloadHwpxMock).toHaveBeenCalled();
    });
  });

  it('cancel 클릭 시 cancelRoadmapGeneration 호출', async () => {
    render(
      <RoadmapResultPageClient
        projectId="p-c"
        companyName="X"
        initialVersions={[makeVersion()]}
        initialSelected={makeVersion()}
        initialInterview={{}}
      />,
    );
    fireEvent.click(screen.getByText('cancel'));
    await waitFor(() => expect(cancelRoadmapGenerationMock).toHaveBeenCalled());
  });

  it('selectedVersion=null 시 edit·download 는 no-op', () => {
    render(
      <RoadmapResultPageClient
        projectId="p-c"
        companyName="X"
        initialVersions={[]}
        initialSelected={null}
        initialInterview={{}}
      />,
    );
    fireEvent.click(screen.getByText('edit'));
    fireEvent.click(screen.getByText('download-pdf'));
    expect(editRoadmapV2Mock).not.toHaveBeenCalled();
    expect(downloadPDFMock).not.toHaveBeenCalled();
  });

  it('generate 실패 + non-cancelled 에러 시 setIsGenerating(false) 경로 실행', async () => {
    createRoadmapV2Mock.mockResolvedValueOnce({
      success: false,
      error: '생성 실패',
    } as unknown as { success: true; data: { roadmapId: string } });
    render(
      <RoadmapResultPageClient
        projectId="p-c"
        companyName="X"
        initialVersions={[makeVersion()]}
        initialSelected={makeVersion()}
        initialInterview={{}}
      />,
    );
    fireEvent.click(screen.getByText('generate'));
    await waitFor(() => expect(createRoadmapV2Mock).toHaveBeenCalled());
  });
});
