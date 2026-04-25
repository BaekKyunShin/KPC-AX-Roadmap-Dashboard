/**
 * PBLResultPageClient (Consultant) wrapper 스모크 테스트.
 *
 * 핸들러: handleSelectVersion, handleGenerate, handleCancelGenerate,
 * handleEdit, handleDownload(PDF/XLSX/HWPX). 각 콜백을 최소 1회 실행해
 * functions coverage 확보.
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
const createPBLV2Mock = vi.fn(
  (_projectId: string, _revisionPrompt?: string) =>
    Promise.resolve({ success: true as const, data: { pblId: 'new-pbl' } }),
);
const editPBLV2Mock = vi.fn((_pblId: string, _patch: unknown) =>
  Promise.resolve({ success: true as const, data: undefined }),
);
const exportPBLHwpxV2Mock = vi.fn((_pblId: string) =>
  Promise.resolve({
    success: true as const,
    data: { fileName: 't.hwpx', contentBase64: '', mimeType: 'x' },
  }),
);
const cancelPBLGenerationMock = vi.fn(() =>
  Promise.resolve({ success: true as const }),
);

vi.mock('../actions', () => ({
  fetchPBLPageDataV2: (projectId: string, versionId?: string) =>
    fetchPBLPageDataV2Mock(projectId, versionId),
  createPBLV2: (projectId: string, revisionPrompt?: string) =>
    createPBLV2Mock(projectId, revisionPrompt),
  editPBLV2: (pblId: string, patch: unknown) => editPBLV2Mock(pblId, patch),
  exportPBLHwpxV2: (pblId: string) => exportPBLHwpxV2Mock(pblId),
  cancelPBLGeneration: () => cancelPBLGenerationMock(),
}));

// Toast 모킹 (side effect 만 stub)
vi.mock('@/lib/utils/toast', () => ({
  showErrorToast: vi.fn(),
  showSuccessToast: vi.fn(),
}));

vi.mock('@/lib/services/llm', () => ({
  isCancelledError: (error: string | undefined) => error === 'CANCELLED',
}));

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

// V2 Client 모킹 — props 를 버튼 / data-attribute 로 노출
vi.mock('./result-v2/PBLResultClient', () => ({
  PBLResultClient: (props: {
    role: 'CONSULTANT' | 'OPS';
    projectId: string;
    companyName?: string;
    isGenerating?: boolean;
    onSelectVersion: (id: string) => void;
    onEdit: (patch: unknown) => void;
    onGenerate: (prompt?: string) => void;
    onDownload: (type: 'PDF' | 'XLSX' | 'HWPX') => void;
    onCancelGenerate?: () => void;
  }) => (
    <div
      data-testid="pbl-result-client"
      data-role={props.role}
      data-project-id={props.projectId}
      data-company={props.companyName ?? ''}
      data-is-generating={String(Boolean(props.isGenerating))}
    >
      <button onClick={() => props.onSelectVersion('v-other')}>select</button>
      <button onClick={() => props.onGenerate('revise please')}>generate</button>
      <button onClick={() => props.onEdit({ diagnosis_summary: '수정본' })}>edit</button>
      <button onClick={() => props.onDownload('PDF')}>download-pdf</button>
      <button onClick={() => props.onDownload('XLSX')}>download-xlsx</button>
      <button onClick={() => props.onDownload('HWPX')}>download-hwpx</button>
      <button onClick={() => props.onCancelGenerate?.()}>cancel</button>
    </div>
  ),
}));

import PBLResultPageClient from './PBLResultPageClient';

function makeVersion(overrides: Partial<PBLReportRow> = {}): PBLReportRow {
  return {
    id: 'v1',
    project_id: 'p1',
    version_number: 1,
    status: 'DRAFT',
    consultant_profile_snapshot: {},
    diagnosis_summary: '',
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

describe('PBLResultPageClient (CONSULTANT)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('role="CONSULTANT" + companyName 을 Client 에 전달한다', () => {
    render(
      <PBLResultPageClient
        projectId="p-c"
        companyName="테스트기업"
        initialVersions={[makeVersion()]}
        initialSelected={makeVersion()}
        initialInterview={{}}
      />,
    );
    const root = screen.getByTestId('pbl-result-client');
    expect(root.getAttribute('data-role')).toBe('CONSULTANT');
    expect(root.getAttribute('data-project-id')).toBe('p-c');
    expect(root.getAttribute('data-company')).toBe('테스트기업');
  });

  it('select 클릭 시 fetchPBLPageDataV2 호출', async () => {
    render(
      <PBLResultPageClient
        projectId="p-c"
        companyName="X"
        initialVersions={[makeVersion()]}
        initialSelected={makeVersion()}
        initialInterview={{}}
      />,
    );
    fireEvent.click(screen.getByText('select'));
    await waitFor(() =>
      expect(fetchPBLPageDataV2Mock).toHaveBeenCalledWith('p-c', 'v-other'),
    );
  });

  it('generate 클릭 시 createPBLV2 호출 + 성공 시 refresh', async () => {
    render(
      <PBLResultPageClient
        projectId="p-c"
        companyName="X"
        initialVersions={[makeVersion()]}
        initialSelected={makeVersion()}
        initialInterview={{}}
      />,
    );
    fireEvent.click(screen.getByText('generate'));
    await waitFor(() =>
      expect(createPBLV2Mock).toHaveBeenCalledWith('p-c', 'revise please'),
    );
    await waitFor(() =>
      expect(fetchPBLPageDataV2Mock).toHaveBeenCalledWith('p-c', 'new-pbl'),
    );
  });

  it('generate 실패 (non-cancelled) 시 refresh 호출 X', async () => {
    createPBLV2Mock.mockResolvedValueOnce({
      success: false,
      error: '생성 실패',
    } as unknown as { success: true; data: { pblId: string } });
    render(
      <PBLResultPageClient
        projectId="p-c"
        companyName="X"
        initialVersions={[makeVersion()]}
        initialSelected={makeVersion()}
        initialInterview={{}}
      />,
    );
    fireEvent.click(screen.getByText('generate'));
    await waitFor(() => expect(createPBLV2Mock).toHaveBeenCalled());
    expect(fetchPBLPageDataV2Mock).not.toHaveBeenCalled();
  });

  it('edit 클릭 시 editPBLV2 호출', async () => {
    render(
      <PBLResultPageClient
        projectId="p-c"
        companyName="X"
        initialVersions={[makeVersion()]}
        initialSelected={makeVersion({ id: 'v-selected' })}
        initialInterview={{}}
      />,
    );
    fireEvent.click(screen.getByText('edit'));
    await waitFor(() =>
      expect(editPBLV2Mock).toHaveBeenCalledWith('v-selected', {
        diagnosis_summary: '수정본',
      }),
    );
  });

  it('edit 실패 시 refresh 호출 X', async () => {
    editPBLV2Mock.mockResolvedValueOnce({
      success: false,
      error: '저장 실패',
    } as unknown as { success: true; data: undefined });
    render(
      <PBLResultPageClient
        projectId="p-c"
        companyName="X"
        initialVersions={[makeVersion()]}
        initialSelected={makeVersion({ id: 'v-selected' })}
        initialInterview={{}}
      />,
    );
    fireEvent.click(screen.getByText('edit'));
    await waitFor(() => expect(editPBLV2Mock).toHaveBeenCalled());
    expect(fetchPBLPageDataV2Mock).not.toHaveBeenCalled();
  });

  it('download 3종 클릭 시 각 훅 호출', async () => {
    render(
      <PBLResultPageClient
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

  it('cancel 클릭 시 cancelPBLGeneration 호출', async () => {
    render(
      <PBLResultPageClient
        projectId="p-c"
        companyName="X"
        initialVersions={[makeVersion()]}
        initialSelected={makeVersion()}
        initialInterview={{}}
      />,
    );
    fireEvent.click(screen.getByText('cancel'));
    await waitFor(() => expect(cancelPBLGenerationMock).toHaveBeenCalled());
  });

  it('selectedVersion=null 시 edit·download 는 no-op', () => {
    render(
      <PBLResultPageClient
        projectId="p-c"
        companyName="X"
        initialVersions={[]}
        initialSelected={null}
        initialInterview={{}}
      />,
    );
    fireEvent.click(screen.getByText('edit'));
    fireEvent.click(screen.getByText('download-pdf'));
    expect(editPBLV2Mock).not.toHaveBeenCalled();
    expect(downloadPDFMock).not.toHaveBeenCalled();
  });
});
