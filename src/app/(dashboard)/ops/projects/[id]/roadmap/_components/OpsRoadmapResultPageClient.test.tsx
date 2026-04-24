/**
 * OpsRoadmapResultPageClient wrapper 스모크 테스트.
 *
 * 목적: Task 2.11-b 에서 신설된 Client wrapper 의 핸들러
 * (handleSelectVersion, handleDownload → PDF/XLSX/HWPX 분기) 를 실행하여
 * functions/statements coverage 확보.
 *
 * 전략: 내부 `RoadmapResultClient` 와 훅(`useRoadmapDownload`, `useHwpxDownload`)
 * 을 모킹해 UI 를 우회하고 props 를 data-testid 버튼으로 노출.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';

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
const exportRoadmapHwpxV2Mock = vi.fn((_versionId: string) =>
  Promise.resolve({
    success: true as const,
    data: { fileName: 'test.hwpx', contentBase64: '', mimeType: 'application/octet-stream' },
  }),
);

vi.mock('@/app/(dashboard)/consultant/projects/[id]/roadmap/actions', () => ({
  fetchRoadmapPageDataV2: (projectId: string, versionId?: string) =>
    fetchRoadmapPageDataV2Mock(projectId, versionId),
  exportRoadmapHwpxV2: (versionId: string) => exportRoadmapHwpxV2Mock(versionId),
}));

// ── 다운로드 훅 모킹 ────────────────────────────────────────────────
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

// ── V2 Result Client 모킹 — props 만 버튼으로 노출 ──────────────────
vi.mock(
  '@/app/(dashboard)/consultant/projects/[id]/roadmap/_components/result-v2/RoadmapResultClient',
  () => ({
    RoadmapResultClient: (props: {
      role: 'CONSULTANT' | 'OPS';
      projectId: string;
      onSelectVersion: (id: string) => void;
      onDownload: (type: 'PDF' | 'XLSX' | 'HWPX') => void;
    }) => (
      <div data-testid="roadmap-result-client" data-role={props.role} data-project-id={props.projectId}>
        <button onClick={() => props.onSelectVersion('v-other')}>select</button>
        <button onClick={() => props.onDownload('PDF')}>download-pdf</button>
        <button onClick={() => props.onDownload('XLSX')}>download-xlsx</button>
        <button onClick={() => props.onDownload('HWPX')}>download-hwpx</button>
      </div>
    ),
  }),
);

import OpsRoadmapResultPageClient from './OpsRoadmapResultPageClient';

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

describe('OpsRoadmapResultPageClient', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('role="OPS" + projectId 를 RoadmapResultClient 에 전달한다', () => {
    render(
      <OpsRoadmapResultPageClient
        projectId="p-ops"
        initialVersions={[makeVersion()]}
        initialSelected={makeVersion()}
        initialInterview={{}}
      />,
    );
    const root = screen.getByTestId('roadmap-result-client');
    expect(root.getAttribute('data-role')).toBe('OPS');
    expect(root.getAttribute('data-project-id')).toBe('p-ops');
  });

  it('select 버튼 클릭 시 fetchRoadmapPageDataV2 를 호출한다', async () => {
    render(
      <OpsRoadmapResultPageClient
        projectId="p-ops"
        initialVersions={[makeVersion()]}
        initialSelected={makeVersion()}
        initialInterview={{}}
      />,
    );
    fireEvent.click(screen.getByText('select'));
    await waitFor(() =>
      expect(fetchRoadmapPageDataV2Mock).toHaveBeenCalledWith('p-ops', 'v-other'),
    );
  });

  it('download-pdf 클릭 시 useRoadmapDownload.downloadPDF 호출', async () => {
    render(
      <OpsRoadmapResultPageClient
        projectId="p-ops"
        initialVersions={[makeVersion()]}
        initialSelected={makeVersion({ id: 'v-selected' })}
        initialInterview={{}}
      />,
    );
    fireEvent.click(screen.getByText('download-pdf'));
    await waitFor(() => expect(downloadPDFMock).toHaveBeenCalledWith('v-selected'));
  });

  it('download-xlsx 클릭 시 downloadXLSX 호출', async () => {
    render(
      <OpsRoadmapResultPageClient
        projectId="p-ops"
        initialVersions={[makeVersion()]}
        initialSelected={makeVersion({ id: 'v-selected' })}
        initialInterview={{}}
      />,
    );
    fireEvent.click(screen.getByText('download-xlsx'));
    await waitFor(() => expect(downloadXLSXMock).toHaveBeenCalledWith('v-selected'));
  });

  it('download-hwpx 클릭 시 useHwpxDownload.download 호출', async () => {
    render(
      <OpsRoadmapResultPageClient
        projectId="p-ops"
        initialVersions={[makeVersion()]}
        initialSelected={makeVersion({ id: 'v-selected' })}
        initialInterview={{}}
      />,
    );
    fireEvent.click(screen.getByText('download-hwpx'));
    await waitFor(() => expect(downloadHwpxMock).toHaveBeenCalled());
  });

  it('selectedVersion=null 상태에서 download 클릭은 no-op', () => {
    render(
      <OpsRoadmapResultPageClient
        projectId="p-ops"
        initialVersions={[]}
        initialSelected={null}
        initialInterview={{}}
      />,
    );
    fireEvent.click(screen.getByText('download-pdf'));
    fireEvent.click(screen.getByText('download-xlsx'));
    fireEvent.click(screen.getByText('download-hwpx'));
    expect(downloadPDFMock).not.toHaveBeenCalled();
    expect(downloadXLSXMock).not.toHaveBeenCalled();
    expect(downloadHwpxMock).not.toHaveBeenCalled();
  });
});
