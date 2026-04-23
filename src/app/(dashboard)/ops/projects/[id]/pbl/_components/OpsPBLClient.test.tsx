import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';

// =============================================================================
// 모킹
// =============================================================================

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), back: vi.fn() }),
  usePathname: () => '/ops/projects/proj-1/pbl',
}));

// Server Actions
const mockFetchPBLForOps = vi.fn();
const mockExportPBLAsHwpxAction = vi.fn();

vi.mock('../actions', () => ({
  fetchPBLForOps: (...args: unknown[]) => mockFetchPBLForOps(...args),
}));

vi.mock('@/app/(dashboard)/consultant/projects/[id]/pbl/actions', () => ({
  exportPBLAsHwpxAction: (...args: unknown[]) => mockExportPBLAsHwpxAction(...args),
}));

// 훅 모킹
const mockDownloadPDF = vi.fn();
const mockDownloadXLSX = vi.fn();
let mockIsDownloading: 'PDF' | 'XLSX' | null = null;

vi.mock('@/hooks/usePBLDownload', () => ({
  usePBLDownload: () => ({
    get isDownloading() { return mockIsDownloading; },
    downloadPDF: mockDownloadPDF,
    downloadXLSX: mockDownloadXLSX,
  }),
}));

const mockHwpxDownload = vi.fn();

vi.mock('@/hooks/useHwpxDownload', () => ({
  useHwpxDownload: ({ action }: { action: () => Promise<unknown> }) => ({
    // download 시 action도 같이 호출하여 라인 35 커버
    download: () => {
      mockHwpxDownload();
      return action();
    },
    isLoading: false,
  }),
}));

// 토스트
const mockShowErrorToast = vi.fn();

vi.mock('@/lib/utils/toast', () => ({
  showSuccessToast: vi.fn(),
  showErrorToast: (...args: unknown[]) => mockShowErrorToast(...args),
}));

// 하위 컴포넌트 경량 모킹
vi.mock('@/components/ui/page-header', () => ({
  PageHeader: ({
    title,
    actions,
  }: {
    title: string;
    actions?: React.ReactNode;
  }) => (
    <div data-testid="page-header">
      <span>{title}</span>
      {actions && <div data-testid="page-header-actions">{actions}</div>}
    </div>
  ),
}));

vi.mock('@/components/pbl/PBLVersionSelector', () => ({
  PBLVersionSelector: ({
    versions,
    selectedId,
    onSelect,
  }: {
    versions: unknown[];
    selectedId?: string;
    onSelect: (id: string) => void;
  }) => (
    <div data-testid="pbl-version-selector">
      <select
        value={selectedId ?? ''}
        onChange={(e) => onSelect(e.target.value)}
        aria-label="PBL 버전 선택"
      >
        {(versions as Array<{ id: string; version_number: number }>).map((v) => (
          <option key={v.id} value={v.id}>
            v{v.version_number}
          </option>
        ))}
      </select>
    </div>
  ),
}));

vi.mock('@/components/pbl/PBLOperationGoal', () => ({
  PBLOperationGoal: ({ canEdit, value }: { canEdit: boolean; value: string }) => (
    <div data-testid="pbl-operation-goal" data-can-edit={String(canEdit)}>
      {value}
    </div>
  ),
}));

vi.mock('@/components/pbl/PBLToolUsagePlan', () => ({
  PBLToolUsagePlan: ({ canEdit }: { canEdit: boolean }) => (
    <div data-testid="pbl-tool-usage-plan" data-can-edit={String(canEdit)} />
  ),
}));

vi.mock('@/components/pbl/PBLTrainingPlan', () => ({
  PBLTrainingPlan: ({ canEdit }: { canEdit: boolean }) => (
    <div data-testid="pbl-training-plan" data-can-edit={String(canEdit)} />
  ),
}));

vi.mock('@/components/pbl/PBLEvaluationPlan', () => ({
  PBLEvaluationPlan: ({ canEdit }: { canEdit: boolean }) => (
    <div data-testid="pbl-evaluation-plan" data-can-edit={String(canEdit)} />
  ),
}));

vi.mock('@/components/pbl/PBLOverview', () => ({
  PBLOverview: ({ value }: { value: { companyName?: string } }) => (
    <div data-testid="pbl-overview">{value?.companyName ?? ''}</div>
  ),
}));

vi.mock('@/components/pbl/PBLTrainingTargets', () => ({
  PBLTrainingTargets: ({
    trainingNeedsAnalysis,
  }: {
    trainingNeedsAnalysis: string;
  }) => <div data-testid="pbl-training-targets">{trainingNeedsAnalysis}</div>,
}));

// =============================================================================
// 대상 컴포넌트 임포트
// =============================================================================

import OpsPBLClient from './OpsPBLClient';
import type { PBLReportRow } from '@/lib/services/pbl';

// =============================================================================
// 헬퍼
// =============================================================================

function makePBLRow(overrides: Partial<PBLReportRow> = {}): PBLReportRow {
  return {
    id: 'pbl-1',
    project_id: 'proj-1',
    version_number: 1,
    status: 'DRAFT',
    consultant_profile_snapshot: {},
    diagnosis_summary: '진단 요약',
    pbl_content: {
      operation_plan: {
        training_goal: '훈련 목표 내용',
        ai_tool_usage_plan: [],
        training_plan: {} as PBLReportRow['pbl_content']['operation_plan']['training_plan'],
        evaluation_plan: {} as PBLReportRow['pbl_content']['operation_plan']['evaluation_plan'],
      },
    },
    free_tool_validated: false,
    time_limit_validated: false,
    revision_prompt: null,
    is_shared: false,
    like_count: 0,
    created_by: 'user-1',
    finalized_by: null,
    finalized_at: null,
    created_at: '2024-03-15T00:00:00Z',
    updated_at: '2024-03-15T00:00:00Z',
    ...overrides,
  };
}

const TEST_PROJECT_ID = 'proj-1';

const DEFAULT_OPS_PROPS = {
  projectId: TEST_PROJECT_ID,
  interviewOverview: null,
  interviewTargets: null,
} as const;

// =============================================================================
// 테스트
// =============================================================================

describe('OpsPBLClient', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsDownloading = null;
  });

  // ---------------------------------------------------------------------------
  // 초기 렌더링
  // ---------------------------------------------------------------------------
  describe('초기 렌더링', () => {
    it('페이지 헤더가 렌더링된다', () => {
      render(
        <OpsPBLClient
          {...DEFAULT_OPS_PROPS}
          initialVersions={[]}
          initialSelected={null}
        />,
      );
      expect(screen.getByTestId('page-header')).toBeInTheDocument();
    });

    it('버전이 없으면 빈 상태 메시지가 표시된다', () => {
      render(
        <OpsPBLClient
          {...DEFAULT_OPS_PROPS}
          initialVersions={[]}
          initialSelected={null}
        />,
      );
      expect(
        screen.getByText('이 프로젝트에는 아직 PBL 보고서가 없습니다.'),
      ).toBeInTheDocument();
    });

    it('버전이 있으면 PBLVersionSelector가 표시된다', () => {
      render(
        <OpsPBLClient
          {...DEFAULT_OPS_PROPS}
          initialVersions={[makePBLRow()]}
          initialSelected={makePBLRow()}
        />,
      );
      expect(screen.getByTestId('pbl-version-selector')).toBeInTheDocument();
    });

    it('selected가 있을 때 다운로드 버튼들이 표시된다', () => {
      render(
        <OpsPBLClient
          {...DEFAULT_OPS_PROPS}
          initialVersions={[makePBLRow()]}
          initialSelected={makePBLRow()}
        />,
      );
      expect(screen.getByRole('button', { name: /PDF/ })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Excel/ })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /HWPX/ })).toBeInTheDocument();
    });

    it('selected가 없으면 다운로드 버튼이 표시되지 않는다', () => {
      render(
        <OpsPBLClient
          {...DEFAULT_OPS_PROPS}
          initialVersions={[makePBLRow()]}
          initialSelected={null}
        />,
      );
      expect(screen.queryByRole('button', { name: /PDF/ })).not.toBeInTheDocument();
    });
  });

  // ---------------------------------------------------------------------------
  // PBL 콘텐츠 표시
  // ---------------------------------------------------------------------------
  describe('PBL 콘텐츠 표시', () => {
    it('selected와 content가 있으면 PBLOperationGoal이 canEdit=false로 렌더링된다', () => {
      render(
        <OpsPBLClient
          {...DEFAULT_OPS_PROPS}
          initialVersions={[makePBLRow()]}
          initialSelected={makePBLRow()}
        />,
      );
      const goal = screen.getByTestId('pbl-operation-goal');
      expect(goal).toBeInTheDocument();
      expect(goal).toHaveAttribute('data-can-edit', 'false');
    });

    it('모든 PBL 섹션 컴포넌트가 canEdit=false로 렌더링된다', () => {
      render(
        <OpsPBLClient
          {...DEFAULT_OPS_PROPS}
          initialVersions={[makePBLRow()]}
          initialSelected={makePBLRow()}
        />,
      );
      expect(screen.getByTestId('pbl-tool-usage-plan')).toHaveAttribute('data-can-edit', 'false');
      expect(screen.getByTestId('pbl-training-plan')).toHaveAttribute('data-can-edit', 'false');
      expect(screen.getByTestId('pbl-evaluation-plan')).toHaveAttribute('data-can-edit', 'false');
    });

    it('interviewOverview가 주어지면 PBLOverview를 렌더링한다', () => {
      render(
        <OpsPBLClient
          projectId={TEST_PROJECT_ID}
          initialVersions={[makePBLRow()]}
          initialSelected={makePBLRow()}
          interviewOverview={{
            companyName: 'Acme',
            courseName: '과정',
            trainingHours: 10,
            traineeCount: 5,
            trainingJob: '직무',
            aiLevel: 'AI기초형',
            trainingGoals: [],
          }}
          interviewTargets={null}
        />,
      );
      expect(screen.getByTestId('pbl-overview')).toHaveTextContent('Acme');
      expect(screen.queryByTestId('pbl-training-targets')).not.toBeInTheDocument();
    });

    it('interviewTargets가 주어지면 PBLTrainingTargets를 렌더링한다', () => {
      render(
        <OpsPBLClient
          projectId={TEST_PROJECT_ID}
          initialVersions={[makePBLRow()]}
          initialSelected={makePBLRow()}
          interviewOverview={null}
          interviewTargets={{
            trainingNeedsAnalysis: '분석 내용',
            selectionReason: '사유',
            details: [],
          }}
        />,
      );
      expect(screen.getByTestId('pbl-training-targets')).toHaveTextContent('분석 내용');
      expect(screen.queryByTestId('pbl-overview')).not.toBeInTheDocument();
    });

    it('interviewOverview·interviewTargets가 null이면 두 컴포넌트가 모두 렌더링되지 않는다', () => {
      render(
        <OpsPBLClient
          {...DEFAULT_OPS_PROPS}
          initialVersions={[makePBLRow()]}
          initialSelected={makePBLRow()}
        />,
      );
      expect(screen.queryByTestId('pbl-overview')).not.toBeInTheDocument();
      expect(screen.queryByTestId('pbl-training-targets')).not.toBeInTheDocument();
    });
  });

  // ---------------------------------------------------------------------------
  // 버전 선택
  // ---------------------------------------------------------------------------
  describe('버전 선택', () => {
    it('버전 선택 시 fetchPBLForOps가 호출된다', async () => {
      const user = userEvent.setup();
      const rows = [makePBLRow(), makePBLRow({ id: 'pbl-2', version_number: 2 })];
      mockFetchPBLForOps.mockResolvedValue(rows[1]);

      render(
        <OpsPBLClient
          {...DEFAULT_OPS_PROPS}
          initialVersions={rows}
          initialSelected={rows[0]}
        />,
      );

      await user.selectOptions(screen.getByLabelText('PBL 버전 선택'), 'pbl-2');

      await waitFor(() => {
        expect(mockFetchPBLForOps).toHaveBeenCalledWith('pbl-2');
      });
    });

    it('버전 조회 실패 시 에러 토스트가 표시된다', async () => {
      const user = userEvent.setup();
      const rows = [makePBLRow(), makePBLRow({ id: 'pbl-2', version_number: 2 })];
      mockFetchPBLForOps.mockRejectedValue(new Error('네트워크 오류'));

      render(
        <OpsPBLClient
          {...DEFAULT_OPS_PROPS}
          initialVersions={rows}
          initialSelected={rows[0]}
        />,
      );

      await user.selectOptions(screen.getByLabelText('PBL 버전 선택'), 'pbl-2');

      await waitFor(() => {
        expect(mockShowErrorToast).toHaveBeenCalledWith('PBL 버전 조회 실패', expect.any(String));
      });
    });
  });

  // ---------------------------------------------------------------------------
  // 다운로드
  // ---------------------------------------------------------------------------
  describe('다운로드', () => {
    it('PDF 버튼 클릭 시 downloadPDF(selectedId)가 호출된다', async () => {
      const user = userEvent.setup();
      render(
        <OpsPBLClient
          {...DEFAULT_OPS_PROPS}
          initialVersions={[makePBLRow()]}
          initialSelected={makePBLRow()}
        />,
      );

      await user.click(screen.getByRole('button', { name: /PDF/ }));
      expect(mockDownloadPDF).toHaveBeenCalledWith('pbl-1');
    });

    it('Excel 버튼 클릭 시 downloadXLSX(selectedId)가 호출된다', async () => {
      const user = userEvent.setup();
      render(
        <OpsPBLClient
          {...DEFAULT_OPS_PROPS}
          initialVersions={[makePBLRow()]}
          initialSelected={makePBLRow()}
        />,
      );

      await user.click(screen.getByRole('button', { name: /Excel/ }));
      expect(mockDownloadXLSX).toHaveBeenCalledWith('pbl-1');
    });

    it('HWPX 버튼 클릭 시 downloadHwpx()가 호출된다', async () => {
      const user = userEvent.setup();
      mockExportPBLAsHwpxAction.mockResolvedValue({ success: true });
      render(
        <OpsPBLClient
          {...DEFAULT_OPS_PROPS}
          initialVersions={[makePBLRow()]}
          initialSelected={makePBLRow()}
        />,
      );

      await user.click(screen.getByRole('button', { name: /HWPX/ }));
      expect(mockHwpxDownload).toHaveBeenCalled();
    });

    it('PDF 다운로드 중일 때 PDF 버튼이 비활성화된다', () => {
      mockIsDownloading = 'PDF';
      render(
        <OpsPBLClient
          {...DEFAULT_OPS_PROPS}
          initialVersions={[makePBLRow()]}
          initialSelected={makePBLRow()}
        />,
      );
      expect(screen.getByRole('button', { name: /PDF/ })).toBeDisabled();
    });

    it('XLSX 다운로드 중일 때 Excel 버튼이 비활성화된다', () => {
      mockIsDownloading = 'XLSX';
      render(
        <OpsPBLClient
          {...DEFAULT_OPS_PROPS}
          initialVersions={[makePBLRow()]}
          initialSelected={makePBLRow()}
        />,
      );
      expect(screen.getByRole('button', { name: /Excel/ })).toBeDisabled();
    });
  });
});
