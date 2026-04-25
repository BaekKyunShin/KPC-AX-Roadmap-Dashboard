/**
 * OpsPBLResultPageClient wrapper 스모크 테스트.
 *
 * 목적: Task 2.11-b 에서 신설된 Client wrapper 의 핸들러
 * (handleSelectVersion, handleDownload → PDF/XLSX/HWPX 분기) 를 실행하여
 * functions/statements coverage 확보.
 *
 * 전략: 내부 `PBLResultClient` 와 훅(`usePBLDownload`, `useHwpxDownload`)
 * 을 모킹해 UI 를 우회하고 props 를 data-testid 버튼으로 노출.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';

import type { PBLReportRow } from '@/lib/services/pbl';

// ── Server Action 모킹 ────────────────────────────────────────────────
const fetchPBLPageDataV2Mock = vi.fn(
  (_projectId: string, _versionId?: string) =>
    Promise.resolve({
      success: true as const,
      data: {
        versions: [] as PBLReportRow[],
        selectedVersion: null,
        interview: {},
      },
    }),
);
const exportPBLHwpxV2Mock = vi.fn((_pblId: string) =>
  Promise.resolve({
    success: true as const,
    data: { fileName: 'test.hwpx', contentBase64: '', mimeType: 'application/octet-stream' },
  }),
);

vi.mock('@/app/(dashboard)/consultant/projects/[id]/pbl/actions', () => ({
  fetchPBLPageDataV2: (projectId: string, versionId?: string) =>
    fetchPBLPageDataV2Mock(projectId, versionId),
  exportPBLHwpxV2: (pblId: string) => exportPBLHwpxV2Mock(pblId),
}));

// ── 다운로드 훅 모킹 ────────────────────────────────────────────────
const downloadPDFMock = vi.fn();
const downloadXLSXMock = vi.fn();
const downloadHwpxMock = vi.fn();

vi.mock('@/hooks/usePBLDownload', () => ({
  usePBLDownload: () => ({
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
  '@/app/(dashboard)/consultant/projects/[id]/pbl/_components/result-v2/PBLResultClient',
  () => ({
    PBLResultClient: (props: {
      role: 'CONSULTANT' | 'OPS';
      projectId: string;
      onSelectVersion: (id: string) => void;
      onDownload: (type: 'PDF' | 'XLSX' | 'HWPX') => void;
    }) => (
      <div data-testid="pbl-result-client" data-role={props.role} data-project-id={props.projectId}>
        <button onClick={() => props.onSelectVersion('v-other')}>select</button>
        <button onClick={() => props.onDownload('PDF')}>download-pdf</button>
        <button onClick={() => props.onDownload('XLSX')}>download-xlsx</button>
        <button onClick={() => props.onDownload('HWPX')}>download-hwpx</button>
      </div>
    ),
  }),
);

import OpsPBLResultPageClient from './OpsPBLResultPageClient';

function makeVersion(overrides: Partial<PBLReportRow> = {}): PBLReportRow {
  return {
    id: 'v1',
    project_id: 'p1',
    version_number: 1,
    status: 'DRAFT',
    consultant_profile_snapshot: {},
    diagnosis_summary: '',
    // Client 가 모킹되어 실제 PBL 콘텐츠는 사용되지 않으므로 최소 채움 + 캐스팅
    pbl_content: {} as PBLReportRow['pbl_content'],
    free_tool_validated: true,
    time_limit_validated: true,
    revision_prompt: null,
    is_shared: false,
    like_count: 0,
    created_by: 'u1',
    finalized_by: null,
    finalized_at: null,
    created_at: '2026-04-24T00:00:00Z',
    updated_at: '2026-04-24T00:00:00Z',
    ...overrides,
  };
}

describe('OpsPBLResultPageClient', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('role="OPS" + projectId 를 PBLResultClient 에 전달한다', () => {
    render(
      <OpsPBLResultPageClient
        projectId="p-ops"
        initialVersions={[makeVersion()]}
        initialSelected={makeVersion()}
        initialInterview={{}}
      />,
    );
    const root = screen.getByTestId('pbl-result-client');
    expect(root.getAttribute('data-role')).toBe('OPS');
    expect(root.getAttribute('data-project-id')).toBe('p-ops');
  });

  it('select 버튼 클릭 시 fetchPBLPageDataV2 를 호출한다', async () => {
    render(
      <OpsPBLResultPageClient
        projectId="p-ops"
        initialVersions={[makeVersion()]}
        initialSelected={makeVersion()}
        initialInterview={{}}
      />,
    );
    fireEvent.click(screen.getByText('select'));
    await waitFor(() =>
      expect(fetchPBLPageDataV2Mock).toHaveBeenCalledWith('p-ops', 'v-other'),
    );
  });

  it('download-pdf 클릭 시 usePBLDownload.downloadPDF 호출', async () => {
    render(
      <OpsPBLResultPageClient
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
      <OpsPBLResultPageClient
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
      <OpsPBLResultPageClient
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
      <OpsPBLResultPageClient
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
