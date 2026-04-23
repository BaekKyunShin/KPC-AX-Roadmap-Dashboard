import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';

// =============================================================================
// 모킹
// =============================================================================

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), back: vi.fn() }),
  usePathname: () => '/consultant/projects/proj-1/pbl',
}));

// Server Actions (../actions)
const mockGeneratePBLAction = vi.fn();
const mockCancelPBLGeneration = vi.fn();
const mockFetchPBLVersions = vi.fn();
const mockFetchPBLReport = vi.fn();
const mockFinalizePBLAction = vi.fn();
const mockDeletePBLAction = vi.fn();
const mockTogglePBLShareAction = vi.fn();
const mockSavePBLDraftAction = vi.fn();
const mockExportPBLAsHwpxAction = vi.fn();

vi.mock('../actions', () => ({
  generatePBLAction: (...args: unknown[]) => mockGeneratePBLAction(...args),
  cancelPBLGeneration: (...args: unknown[]) => mockCancelPBLGeneration(...args),
  fetchPBLVersions: (...args: unknown[]) => mockFetchPBLVersions(...args),
  fetchPBLReport: (...args: unknown[]) => mockFetchPBLReport(...args),
  finalizePBLAction: (...args: unknown[]) => mockFinalizePBLAction(...args),
  deletePBLAction: (...args: unknown[]) => mockDeletePBLAction(...args),
  togglePBLShareAction: (...args: unknown[]) => mockTogglePBLShareAction(...args),
  savePBLDraftAction: (...args: unknown[]) => mockSavePBLDraftAction(...args),
  exportPBLAsHwpxAction: (...args: unknown[]) => mockExportPBLAsHwpxAction(...args),
}));

// 훅 모킹 — isDownloading/isHwpxLoading을 동적으로 제어하기 위해 hoisted 사용
const { mockIsDownloading, mockIsHwpxLoading } = vi.hoisted(() => ({
  mockIsDownloading: { current: null as string | null },
  mockIsHwpxLoading: { current: false },
}));

const mockDownloadPDF = vi.fn();
const mockDownloadXLSX = vi.fn();

vi.mock('@/hooks/usePBLDownload', () => ({
  usePBLDownload: () => ({
    get isDownloading() { return mockIsDownloading.current; },
    downloadPDF: mockDownloadPDF,
    downloadXLSX: mockDownloadXLSX,
  }),
}));

const mockHwpxDownload = vi.fn();

vi.mock('@/hooks/useHwpxDownload', () => ({
  useHwpxDownload: ({ action }: { action: () => Promise<unknown> }) => ({
    // download 시 action도 같이 호출하여 exportPBLAsHwpxAction 래퍼 커버
    download: () => {
      mockHwpxDownload();
      return action();
    },
    get isLoading() { return mockIsHwpxLoading.current; },
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

vi.mock('@/components/roadmap/RegenerateAccordion', () => ({
  RegenerateAccordion: ({
    value,
    onChange,
    onSubmit,
    isLoading,
  }: {
    value: string;
    onChange: (v: string) => void;
    onSubmit: () => void;
    isLoading: boolean;
  }) => (
    <div data-testid="regenerate-accordion">
      <textarea
        data-testid="revision-textarea"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
      <button
        data-testid="regenerate-submit"
        onClick={onSubmit}
        disabled={isLoading}
      >
        생성
      </button>
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
  PBLOperationGoal: ({
    canEdit,
    value,
    onChange,
  }: {
    canEdit: boolean;
    value: string;
    onChange: (v: string) => void;
  }) => (
    <div data-testid="pbl-operation-goal" data-can-edit={String(canEdit)}>
      {value}
      <button data-testid="goal-change-btn" onClick={() => onChange('새 훈련 목표')}>
        목표 변경
      </button>
    </div>
  ),
}));

vi.mock('@/components/pbl/PBLOverview', () => ({
  PBLOverview: ({ value }: { value: unknown }) => (
    <div data-testid="pbl-overview">{JSON.stringify(value)}</div>
  ),
}));

vi.mock('@/components/pbl/PBLTrainingTargets', () => ({
  PBLTrainingTargets: () => <div data-testid="pbl-training-targets" />,
}));

vi.mock('@/components/pbl/PBLToolUsagePlan', () => ({
  PBLToolUsagePlan: ({
    canEdit,
    onChange,
  }: {
    canEdit: boolean;
    value: unknown[];
    onChange: (next: unknown[]) => void;
  }) => (
    <div data-testid="pbl-tool-usage-plan" data-can-edit={String(canEdit)}>
      <button
        data-testid="tool-plan-change-btn"
        onClick={() => onChange([{ tool_name: '새 도구', usage_plan: '계획' }])}
      >
        도구 계획 변경
      </button>
    </div>
  ),
}));

vi.mock('@/components/pbl/PBLTrainingPlan', () => ({
  PBLTrainingPlan: ({
    canEdit,
    onChange,
  }: {
    canEdit: boolean;
    value: unknown;
    onChange: (next: unknown) => void;
  }) => (
    <div data-testid="pbl-training-plan" data-can-edit={String(canEdit)}>
      <button
        data-testid="training-plan-change-btn"
        onClick={() => onChange({ overview: {}, learning_group: {}, subject_profile: {}, facilities: [], training_instructors: [] })}
      >
        훈련 계획 변경
      </button>
    </div>
  ),
}));

vi.mock('@/components/pbl/PBLEvaluationPlan', () => ({
  PBLEvaluationPlan: ({
    canEdit,
    onChange,
  }: {
    canEdit: boolean;
    value: unknown;
    onChange: (next: unknown) => void;
  }) => (
    <div data-testid="pbl-evaluation-plan" data-can-edit={String(canEdit)}>
      <button
        data-testid="evaluation-plan-change-btn"
        onClick={() => onChange({ course_evaluation: {}, result_evaluation: {} })}
      >
        평가 계획 변경
      </button>
    </div>
  ),
}));

vi.mock('@/components/pbl/PBLPerformanceMetrics', () => ({
  PBLPerformanceMetrics: ({
    canEdit,
    onChange,
  }: {
    canEdit: boolean;
    value: unknown;
    onChange: (next: unknown) => void;
  }) => (
    <div data-testid="pbl-performance-metrics" data-can-edit={String(canEdit)}>
      <button
        data-testid="performance-change-btn"
        onClick={() => onChange({
          training_goal_categories: [],
          quantitative_metrics: ['새 지표'],
          qualitative_metrics: [],
          internalization_plan: [],
          dissemination_plan: [],
        })}
      >
        성과 분석 변경
      </button>
    </div>
  ),
}));

// =============================================================================
// 대상 컴포넌트 임포트
// =============================================================================

import ConsultantPBLClient from './ConsultantPBLClient';
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
      performance_analysis: {
        training_goal_categories: [],
        quantitative_metrics: [],
        qualitative_metrics: [],
        internalization_plan: [],
        dissemination_plan: [],
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

const DEFAULT_PROPS = {
  projectId: 'proj-1',
  companyName: '테스트 기업',
  initialVersions: [] as PBLReportRow[],
  initialSelected: null as PBLReportRow | null,
  interviewOverview: null,
  interviewTargets: null,
};

// =============================================================================
// 테스트
// =============================================================================

describe('ConsultantPBLClient', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    // 동적 훅 상태 초기화
    mockIsDownloading.current = null;
    mockIsHwpxLoading.current = false;
  });

  // ---------------------------------------------------------------------------
  // 초기 렌더링
  // ---------------------------------------------------------------------------
  describe('초기 렌더링', () => {
    it('페이지 헤더에 회사명이 포함된다', () => {
      render(<ConsultantPBLClient {...DEFAULT_PROPS} companyName="KPC Corp" />);
      expect(screen.getByText(/KPC Corp/)).toBeInTheDocument();
    });

    it('버전이 없으면 빈 상태 메시지가 표시된다', () => {
      render(<ConsultantPBLClient {...DEFAULT_PROPS} />);
      // 신규 빈 상태 박스: "아직 생성된 PBL 보고서가 없습니다"
      expect(
        screen.getByText('아직 생성된 PBL 보고서가 없습니다'),
      ).toBeInTheDocument();
    });

    it('버전이 없을 때 "PBL 보고서 생성" 버튼이 표시된다', () => {
      render(<ConsultantPBLClient {...DEFAULT_PROPS} />);
      expect(screen.getByRole('button', { name: 'PBL 보고서 생성' })).toBeInTheDocument();
    });

    // ISSUE-18 (Step D-2): 빈 상태에서는 RegenerateAccordion 대신 큰 단독 버튼 노출
    it('버전이 없을 때 RegenerateAccordion을 숨기고 빈 상태 큰 "AI PBL 보고서 생성" 버튼을 노출한다', () => {
      render(<ConsultantPBLClient {...DEFAULT_PROPS} />);
      expect(screen.queryByTestId('regenerate-accordion')).not.toBeInTheDocument();
      expect(screen.queryByTestId('pbl-version-selector')).not.toBeInTheDocument();
      expect(
        screen.getByRole('button', { name: /AI PBL 보고서 생성/ }),
      ).toBeInTheDocument();
    });

    it('버전이 있을 때 RegenerateAccordion이 정상 노출된다 (회귀 가드)', () => {
      render(
        <ConsultantPBLClient
          {...DEFAULT_PROPS}
          initialVersions={[makePBLRow()]}
          initialSelected={makePBLRow()}
        />,
      );
      expect(screen.getByTestId('regenerate-accordion')).toBeInTheDocument();
    });

    it('빈 상태 큰 버튼 클릭 시 generatePBLAction이 호출된다', async () => {
      const user = userEvent.setup();
      mockGeneratePBLAction.mockResolvedValue({ success: false, error: '오류' });

      render(<ConsultantPBLClient {...DEFAULT_PROPS} />);

      await user.click(screen.getByTestId('empty-pbl-generate-btn'));

      await waitFor(() => {
        expect(mockGeneratePBLAction).toHaveBeenCalledWith('proj-1', undefined);
      });
    });

    it('생성 중에는 빈 상태 버튼이 disabled되고 "생성 중…" 라벨이 표시된다', async () => {
      const user = userEvent.setup();
      let resolveGenerate: (value: unknown) => void;
      mockGeneratePBLAction.mockImplementation(
        () =>
          new Promise((resolve) => {
            resolveGenerate = resolve;
          }),
      );

      render(<ConsultantPBLClient {...DEFAULT_PROPS} />);

      await user.click(screen.getByTestId('empty-pbl-generate-btn'));

      // 생성 중 라벨 + disabled 확인
      const generatingBtn = await screen.findByTestId('empty-pbl-generate-btn');
      expect(generatingBtn).toBeDisabled();
      expect(generatingBtn).toHaveTextContent(/생성 중…/);

      resolveGenerate!({ success: false });
    });

    it('버전이 있으면 PBLVersionSelector가 표시된다', () => {
      render(
        <ConsultantPBLClient
          {...DEFAULT_PROPS}
          initialVersions={[makePBLRow()]}
          initialSelected={makePBLRow()}
        />,
      );
      expect(screen.getByTestId('pbl-version-selector')).toBeInTheDocument();
    });

    it('DRAFT 버전이 selected이면 "최종 확정" 버튼이 표시된다', () => {
      render(
        <ConsultantPBLClient
          {...DEFAULT_PROPS}
          initialVersions={[makePBLRow()]}
          initialSelected={makePBLRow({ status: 'DRAFT' })}
        />,
      );
      expect(screen.getByRole('button', { name: '최종 확정' })).toBeInTheDocument();
    });

    it('DRAFT 버전이 selected이면 "DRAFT 삭제" 버튼이 표시된다', () => {
      render(
        <ConsultantPBLClient
          {...DEFAULT_PROPS}
          initialVersions={[makePBLRow()]}
          initialSelected={makePBLRow({ status: 'DRAFT' })}
        />,
      );
      expect(screen.getByRole('button', { name: 'DRAFT 삭제' })).toBeInTheDocument();
    });

    it('FINAL 버전이면 "최종 확정"과 "DRAFT 삭제" 버튼이 없다', () => {
      render(
        <ConsultantPBLClient
          {...DEFAULT_PROPS}
          initialVersions={[makePBLRow({ status: 'FINAL' })]}
          initialSelected={makePBLRow({ status: 'FINAL' })}
        />,
      );
      expect(screen.queryByRole('button', { name: '최종 확정' })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'DRAFT 삭제' })).not.toBeInTheDocument();
    });

    it('FINAL 버전이면 갤러리 공유 버튼이 표시된다', () => {
      render(
        <ConsultantPBLClient
          {...DEFAULT_PROPS}
          initialVersions={[makePBLRow({ status: 'FINAL' })]}
          initialSelected={makePBLRow({ status: 'FINAL', is_shared: false })}
        />,
      );
      expect(screen.getByRole('button', { name: '갤러리 공유' })).toBeInTheDocument();
    });

    it('FINAL + is_shared=true이면 "갤러리 공유 해제" 버튼이 표시된다', () => {
      render(
        <ConsultantPBLClient
          {...DEFAULT_PROPS}
          initialVersions={[makePBLRow({ status: 'FINAL', is_shared: true })]}
          initialSelected={makePBLRow({ status: 'FINAL', is_shared: true })}
        />,
      );
      expect(screen.getByRole('button', { name: '갤러리 공유 해제' })).toBeInTheDocument();
    });
  });

  // ---------------------------------------------------------------------------
  // PBL 콘텐츠 표시 (canEdit)
  // ---------------------------------------------------------------------------
  describe('PBL 콘텐츠 canEdit', () => {
    it('DRAFT 상태에서 PBLOperationGoal에 canEdit=true가 전달된다', () => {
      render(
        <ConsultantPBLClient
          {...DEFAULT_PROPS}
          initialVersions={[makePBLRow()]}
          initialSelected={makePBLRow({ status: 'DRAFT' })}
        />,
      );
      expect(screen.getByTestId('pbl-operation-goal')).toHaveAttribute('data-can-edit', 'true');
    });

    it('FINAL 상태에서 PBLOperationGoal에 canEdit=false가 전달된다', () => {
      render(
        <ConsultantPBLClient
          {...DEFAULT_PROPS}
          initialVersions={[makePBLRow({ status: 'FINAL' })]}
          initialSelected={makePBLRow({ status: 'FINAL' })}
        />,
      );
      expect(screen.getByTestId('pbl-operation-goal')).toHaveAttribute('data-can-edit', 'false');
    });

    it('interviewOverview가 있으면 PBLOverview가 렌더링된다', () => {
      render(
        <ConsultantPBLClient
          {...DEFAULT_PROPS}
          initialVersions={[makePBLRow()]}
          initialSelected={makePBLRow()}
          interviewOverview={{
            companyName: '테스트 기업',
            courseName: '과정1',
            trainingHours: 40,
            traineeCount: 10,
            trainingJob: '직무',
            aiLevel: 'AI기초형',
            trainingGoals: [],
          }}
        />,
      );
      expect(screen.getByTestId('pbl-overview')).toBeInTheDocument();
    });

    it('interviewTargets가 있으면 PBLTrainingTargets가 렌더링된다', () => {
      // 라인 395: interviewTargets && 조건 커버
      render(
        <ConsultantPBLClient
          {...DEFAULT_PROPS}
          initialVersions={[makePBLRow()]}
          initialSelected={makePBLRow()}
          interviewTargets={{
            trainingNeedsAnalysis: '훈련 필요 분석',
            selectionReason: '선정 이유',
            details: [
              {
                id: 'detail-1',
                task_name: '태스크 1',
                as_is: '현재 상태',
                to_be: '목표 상태',
                required_knowledge: '필요 지식',
                required_skill: '필요 기술',
              },
            ],
          }}
        />,
      );
      expect(screen.getByTestId('pbl-training-targets')).toBeInTheDocument();
    });
  });

  // ---------------------------------------------------------------------------
  // PBL 생성
  // ---------------------------------------------------------------------------
  describe('PBL 생성', () => {
    it('생성 버튼 클릭 시 generatePBLAction이 호출된다', async () => {
      const user = userEvent.setup();
      mockGeneratePBLAction.mockResolvedValue({ success: false, error: '오류' });

      render(<ConsultantPBLClient {...DEFAULT_PROPS} />);

      await user.click(screen.getByRole('button', { name: 'PBL 보고서 생성' }));

      await waitFor(() => {
        expect(mockGeneratePBLAction).toHaveBeenCalledWith('proj-1', undefined);
      });
    });

    it('생성 성공 시 성공 토스트가 호출된다', async () => {
      const user = userEvent.setup();
      mockGeneratePBLAction.mockResolvedValue({ success: true, data: { pblId: 'pbl-new' } });
      mockFetchPBLVersions.mockResolvedValue([makePBLRow({ id: 'pbl-new' })]);
      mockFetchPBLReport.mockResolvedValue(makePBLRow({ id: 'pbl-new' }));

      render(<ConsultantPBLClient {...DEFAULT_PROPS} />);

      await user.click(screen.getByRole('button', { name: 'PBL 보고서 생성' }));

      await waitFor(() => {
        expect(mockShowSuccessToast).toHaveBeenCalledWith('PBL 보고서 생성', '초안이 생성되었습니다.');
      });
    });

    it('생성 실패 시 에러 토스트가 호출된다', async () => {
      const user = userEvent.setup();
      mockGeneratePBLAction.mockResolvedValue({ success: false, error: '생성 오류' });

      render(<ConsultantPBLClient {...DEFAULT_PROPS} />);

      await user.click(screen.getByRole('button', { name: 'PBL 보고서 생성' }));

      await waitFor(() => {
        expect(mockShowErrorToast).toHaveBeenCalledWith('PBL 보고서 생성 실패', '생성 오류');
      });
    });

    it('RegenerateAccordion의 생성 버튼 클릭 시 generatePBLAction이 호출된다 (버전 ≥ 1)', async () => {
      // ISSUE-18 (Step D-2): RegenerateAccordion은 버전 ≥ 1 일 때만 노출되도록 변경
      const user = userEvent.setup();
      mockGeneratePBLAction.mockResolvedValue({ success: false, error: '오류' });

      render(
        <ConsultantPBLClient
          {...DEFAULT_PROPS}
          initialVersions={[makePBLRow()]}
          initialSelected={makePBLRow()}
        />,
      );

      await user.click(screen.getByTestId('regenerate-submit'));

      await waitFor(() => {
        expect(mockGeneratePBLAction).toHaveBeenCalled();
      });
    });
  });

  // ---------------------------------------------------------------------------
  // 최종 확정
  // ---------------------------------------------------------------------------
  describe('최종 확정', () => {
    it('최종 확정 버튼 클릭 시 confirm 대화상자가 표시된다', async () => {
      const user = userEvent.setup();
      const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false);

      render(
        <ConsultantPBLClient
          {...DEFAULT_PROPS}
          initialVersions={[makePBLRow()]}
          initialSelected={makePBLRow()}
        />,
      );

      await user.click(screen.getByRole('button', { name: '최종 확정' }));

      expect(confirmSpy).toHaveBeenCalled();
    });

    it('confirm 취소 시 finalizePBLAction이 호출되지 않는다', async () => {
      const user = userEvent.setup();
      vi.spyOn(window, 'confirm').mockReturnValue(false);

      render(
        <ConsultantPBLClient
          {...DEFAULT_PROPS}
          initialVersions={[makePBLRow()]}
          initialSelected={makePBLRow()}
        />,
      );

      await user.click(screen.getByRole('button', { name: '최종 확정' }));

      expect(mockFinalizePBLAction).not.toHaveBeenCalled();
    });

    it('confirm 후 finalizePBLAction(selectedId)가 호출된다', async () => {
      const user = userEvent.setup();
      vi.spyOn(window, 'confirm').mockReturnValue(true);
      mockFinalizePBLAction.mockResolvedValue({ success: true });
      mockFetchPBLVersions.mockResolvedValue([makePBLRow({ status: 'FINAL' })]);

      render(
        <ConsultantPBLClient
          {...DEFAULT_PROPS}
          initialVersions={[makePBLRow()]}
          initialSelected={makePBLRow()}
        />,
      );

      await user.click(screen.getByRole('button', { name: '최종 확정' }));

      await waitFor(() => {
        expect(mockFinalizePBLAction).toHaveBeenCalledWith('pbl-1');
      });
    });

    it('최종 확정 성공 시 성공 토스트가 호출된다', async () => {
      const user = userEvent.setup();
      vi.spyOn(window, 'confirm').mockReturnValue(true);
      mockFinalizePBLAction.mockResolvedValue({ success: true });
      mockFetchPBLVersions.mockResolvedValue([makePBLRow({ status: 'FINAL' })]);

      render(
        <ConsultantPBLClient
          {...DEFAULT_PROPS}
          initialVersions={[makePBLRow()]}
          initialSelected={makePBLRow()}
        />,
      );

      await user.click(screen.getByRole('button', { name: '최종 확정' }));

      await waitFor(() => {
        expect(mockShowSuccessToast).toHaveBeenCalledWith('최종 확정 완료', expect.any(String));
      });
    });

    it('최종 확정 실패 시 에러 토스트가 호출된다', async () => {
      const user = userEvent.setup();
      vi.spyOn(window, 'confirm').mockReturnValue(true);
      mockFinalizePBLAction.mockResolvedValue({ success: false, error: '확정 오류' });

      render(
        <ConsultantPBLClient
          {...DEFAULT_PROPS}
          initialVersions={[makePBLRow()]}
          initialSelected={makePBLRow()}
        />,
      );

      await user.click(screen.getByRole('button', { name: '최종 확정' }));

      await waitFor(() => {
        expect(mockShowErrorToast).toHaveBeenCalledWith('최종 확정 실패', '확정 오류');
      });
    });
  });

  // ---------------------------------------------------------------------------
  // DRAFT 삭제
  // ---------------------------------------------------------------------------
  describe('DRAFT 삭제', () => {
    it('삭제 버튼 클릭 후 confirm 취소 시 deletePBLAction이 호출되지 않는다', async () => {
      const user = userEvent.setup();
      vi.spyOn(window, 'confirm').mockReturnValue(false);

      render(
        <ConsultantPBLClient
          {...DEFAULT_PROPS}
          initialVersions={[makePBLRow()]}
          initialSelected={makePBLRow()}
        />,
      );

      await user.click(screen.getByRole('button', { name: 'DRAFT 삭제' }));

      expect(mockDeletePBLAction).not.toHaveBeenCalled();
    });

    it('confirm 후 deletePBLAction(selectedId)가 호출된다', async () => {
      const user = userEvent.setup();
      vi.spyOn(window, 'confirm').mockReturnValue(true);
      mockDeletePBLAction.mockResolvedValue({ success: true });
      mockFetchPBLVersions.mockResolvedValue([]);

      render(
        <ConsultantPBLClient
          {...DEFAULT_PROPS}
          initialVersions={[makePBLRow()]}
          initialSelected={makePBLRow()}
        />,
      );

      await user.click(screen.getByRole('button', { name: 'DRAFT 삭제' }));

      await waitFor(() => {
        expect(mockDeletePBLAction).toHaveBeenCalledWith('pbl-1');
      });
    });

    it('삭제 성공 시 성공 토스트가 호출된다', async () => {
      const user = userEvent.setup();
      vi.spyOn(window, 'confirm').mockReturnValue(true);
      mockDeletePBLAction.mockResolvedValue({ success: true });
      mockFetchPBLVersions.mockResolvedValue([]);

      render(
        <ConsultantPBLClient
          {...DEFAULT_PROPS}
          initialVersions={[makePBLRow()]}
          initialSelected={makePBLRow()}
        />,
      );

      await user.click(screen.getByRole('button', { name: 'DRAFT 삭제' }));

      await waitFor(() => {
        expect(mockShowSuccessToast).toHaveBeenCalledWith('DRAFT 삭제 완료', expect.any(String));
      });
    });

    it('삭제 실패 시 에러 토스트가 호출된다', async () => {
      const user = userEvent.setup();
      vi.spyOn(window, 'confirm').mockReturnValue(true);
      mockDeletePBLAction.mockResolvedValue({ success: false, error: '삭제 오류' });

      render(
        <ConsultantPBLClient
          {...DEFAULT_PROPS}
          initialVersions={[makePBLRow()]}
          initialSelected={makePBLRow()}
        />,
      );

      await user.click(screen.getByRole('button', { name: 'DRAFT 삭제' }));

      await waitFor(() => {
        expect(mockShowErrorToast).toHaveBeenCalledWith('DRAFT 삭제 실패', '삭제 오류');
      });
    });
  });

  // ---------------------------------------------------------------------------
  // 갤러리 공유 토글
  // ---------------------------------------------------------------------------
  describe('갤러리 공유', () => {
    it('"갤러리 공유" 버튼 클릭 시 togglePBLShareAction(id, true)가 호출된다', async () => {
      const user = userEvent.setup();
      mockTogglePBLShareAction.mockResolvedValue({ success: true });
      mockFetchPBLVersions.mockResolvedValue([makePBLRow({ status: 'FINAL' })]);

      render(
        <ConsultantPBLClient
          {...DEFAULT_PROPS}
          initialVersions={[makePBLRow({ status: 'FINAL', is_shared: false })]}
          initialSelected={makePBLRow({ status: 'FINAL', is_shared: false })}
        />,
      );

      await user.click(screen.getByRole('button', { name: '갤러리 공유' }));

      await waitFor(() => {
        expect(mockTogglePBLShareAction).toHaveBeenCalledWith('pbl-1', true);
      });
    });

    it('공유 토글 실패 시 에러 토스트가 호출된다', async () => {
      const user = userEvent.setup();
      mockTogglePBLShareAction.mockResolvedValue({ success: false, error: '공유 오류' });

      render(
        <ConsultantPBLClient
          {...DEFAULT_PROPS}
          initialVersions={[makePBLRow({ status: 'FINAL', is_shared: false })]}
          initialSelected={makePBLRow({ status: 'FINAL', is_shared: false })}
        />,
      );

      await user.click(screen.getByRole('button', { name: '갤러리 공유' }));

      await waitFor(() => {
        expect(mockShowErrorToast).toHaveBeenCalledWith('공유 설정 실패', '공유 오류');
      });
    });

    it('공유 성공 시 fetchPBLVersions가 호출되어 버전 목록이 갱신된다', async () => {
      // 라인 168, 171: togglePBLShareAction 후 fetchPBLVersions 호출 커버
      const user = userEvent.setup();
      const updatedRow = makePBLRow({ status: 'FINAL', is_shared: true });
      mockTogglePBLShareAction.mockResolvedValue({ success: true });
      mockFetchPBLVersions.mockResolvedValue([updatedRow]);

      render(
        <ConsultantPBLClient
          {...DEFAULT_PROPS}
          initialVersions={[makePBLRow({ status: 'FINAL', is_shared: false })]}
          initialSelected={makePBLRow({ status: 'FINAL', is_shared: false })}
        />,
      );

      await user.click(screen.getByRole('button', { name: '갤러리 공유' }));

      await waitFor(() => {
        expect(mockFetchPBLVersions).toHaveBeenCalledWith('proj-1');
        expect(mockShowSuccessToast).toHaveBeenCalledWith('갤러리에 공유되었습니다');
      });
    });

    it('"갤러리 공유 해제" 버튼 클릭 시 togglePBLShareAction(id, false)가 호출된다', async () => {
      const user = userEvent.setup();
      const updatedRow = makePBLRow({ status: 'FINAL', is_shared: false });
      mockTogglePBLShareAction.mockResolvedValue({ success: true });
      mockFetchPBLVersions.mockResolvedValue([updatedRow]);

      render(
        <ConsultantPBLClient
          {...DEFAULT_PROPS}
          initialVersions={[makePBLRow({ status: 'FINAL', is_shared: true })]}
          initialSelected={makePBLRow({ status: 'FINAL', is_shared: true })}
        />,
      );

      await user.click(screen.getByRole('button', { name: '갤러리 공유 해제' }));

      await waitFor(() => {
        expect(mockTogglePBLShareAction).toHaveBeenCalledWith('pbl-1', false);
        expect(mockShowSuccessToast).toHaveBeenCalledWith('갤러리 공유가 해제되었습니다');
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
        <ConsultantPBLClient
          {...DEFAULT_PROPS}
          initialVersions={[makePBLRow()]}
          initialSelected={makePBLRow()}
        />,
      );

      await user.click(screen.getByRole('button', { name: /^PDF$/ }));
      expect(mockDownloadPDF).toHaveBeenCalledWith('pbl-1');
    });

    it('Excel 버튼 클릭 시 downloadXLSX(selectedId)가 호출된다', async () => {
      const user = userEvent.setup();
      render(
        <ConsultantPBLClient
          {...DEFAULT_PROPS}
          initialVersions={[makePBLRow()]}
          initialSelected={makePBLRow()}
        />,
      );

      await user.click(screen.getByRole('button', { name: /^Excel$/ }));
      expect(mockDownloadXLSX).toHaveBeenCalledWith('pbl-1');
    });

    it('HWPX 버튼 클릭 시 downloadHwpx()가 호출된다', async () => {
      const user = userEvent.setup();
      render(
        <ConsultantPBLClient
          {...DEFAULT_PROPS}
          initialVersions={[makePBLRow()]}
          initialSelected={makePBLRow()}
        />,
      );

      await user.click(screen.getByRole('button', { name: /^HWPX$/ }));
      expect(mockHwpxDownload).toHaveBeenCalled();
    });

    it('isDownloading="XLSX"일 때 Excel 버튼이 disabled된다', () => {
      // 라인 281: isDownloading === 'XLSX' 삼항 true 분기 커버
      mockIsDownloading.current = 'XLSX';
      render(
        <ConsultantPBLClient
          {...DEFAULT_PROPS}
          initialVersions={[makePBLRow()]}
          initialSelected={makePBLRow()}
        />,
      );

      expect(screen.getByRole('button', { name: /^Excel$/ })).toBeDisabled();
    });

    it('isHwpxDownloading=true일 때 HWPX 버튼이 disabled된다', () => {
      // 라인 294: isHwpxDownloading 삼항 true 분기 커버
      mockIsHwpxLoading.current = true;
      render(
        <ConsultantPBLClient
          {...DEFAULT_PROPS}
          initialVersions={[makePBLRow()]}
          initialSelected={makePBLRow()}
        />,
      );

      expect(screen.getByRole('button', { name: /^HWPX$/ })).toBeDisabled();
    });

    it('isDownloading="PDF"일 때 PDF 버튼이 disabled된다', () => {
      mockIsDownloading.current = 'PDF';
      render(
        <ConsultantPBLClient
          {...DEFAULT_PROPS}
          initialVersions={[makePBLRow()]}
          initialSelected={makePBLRow()}
        />,
      );

      expect(screen.getByRole('button', { name: /^PDF$/ })).toBeDisabled();
    });
  });

  // ---------------------------------------------------------------------------
  // 섹션 인라인 편집 (savePBLDraftAction)
  // ---------------------------------------------------------------------------
  describe('섹션 인라인 편집', () => {
    it('훈련 목표 변경 시 savePBLDraftAction이 호출된다', async () => {
      const user = userEvent.setup();
      mockSavePBLDraftAction.mockResolvedValue({ success: true });

      render(
        <ConsultantPBLClient
          {...DEFAULT_PROPS}
          initialVersions={[makePBLRow()]}
          initialSelected={makePBLRow({ status: 'DRAFT' })}
        />,
      );

      await user.click(screen.getByTestId('goal-change-btn'));

      await waitFor(() => {
        expect(mockSavePBLDraftAction).toHaveBeenCalledWith(
          'pbl-1',
          expect.objectContaining({
            pbl_content: expect.objectContaining({
              operation_plan: expect.objectContaining({
                training_goal: '새 훈련 목표',
              }),
            }),
          }),
        );
      });
    });

    it('저장 실패 시 에러 토스트가 호출된다', async () => {
      const user = userEvent.setup();
      mockSavePBLDraftAction.mockResolvedValue({ success: false, error: '저장 오류' });

      render(
        <ConsultantPBLClient
          {...DEFAULT_PROPS}
          initialVersions={[makePBLRow()]}
          initialSelected={makePBLRow({ status: 'DRAFT' })}
        />,
      );

      await user.click(screen.getByTestId('goal-change-btn'));

      await waitFor(() => {
        expect(mockShowErrorToast).toHaveBeenCalledWith('저장 실패', '저장 오류');
      });
    });

    it('AI 도구 계획 변경 시 savePBLDraftAction이 호출된다', async () => {
      const user = userEvent.setup();
      mockSavePBLDraftAction.mockResolvedValue({ success: true });

      render(
        <ConsultantPBLClient
          {...DEFAULT_PROPS}
          initialVersions={[makePBLRow()]}
          initialSelected={makePBLRow({ status: 'DRAFT' })}
        />,
      );

      await user.click(screen.getByTestId('tool-plan-change-btn'));

      await waitFor(() => {
        expect(mockSavePBLDraftAction).toHaveBeenCalledWith(
          'pbl-1',
          expect.objectContaining({
            pbl_content: expect.objectContaining({
              operation_plan: expect.objectContaining({
                ai_tool_usage_plan: expect.any(Array),
              }),
            }),
          }),
        );
      });
    });

    it('훈련 계획 변경 시 savePBLDraftAction이 호출된다', async () => {
      const user = userEvent.setup();
      mockSavePBLDraftAction.mockResolvedValue({ success: true });

      render(
        <ConsultantPBLClient
          {...DEFAULT_PROPS}
          initialVersions={[makePBLRow()]}
          initialSelected={makePBLRow({ status: 'DRAFT' })}
        />,
      );

      await user.click(screen.getByTestId('training-plan-change-btn'));

      await waitFor(() => {
        expect(mockSavePBLDraftAction).toHaveBeenCalledWith(
          'pbl-1',
          expect.objectContaining({
            pbl_content: expect.objectContaining({
              operation_plan: expect.objectContaining({
                training_plan: expect.any(Object),
              }),
            }),
          }),
        );
      });
    });

    it('평가 계획 변경 시 savePBLDraftAction이 호출된다', async () => {
      const user = userEvent.setup();
      mockSavePBLDraftAction.mockResolvedValue({ success: true });

      render(
        <ConsultantPBLClient
          {...DEFAULT_PROPS}
          initialVersions={[makePBLRow()]}
          initialSelected={makePBLRow({ status: 'DRAFT' })}
        />,
      );

      await user.click(screen.getByTestId('evaluation-plan-change-btn'));

      await waitFor(() => {
        expect(mockSavePBLDraftAction).toHaveBeenCalledWith(
          'pbl-1',
          expect.objectContaining({
            pbl_content: expect.objectContaining({
              operation_plan: expect.objectContaining({
                evaluation_plan: expect.any(Object),
              }),
            }),
          }),
        );
      });
    });

    it('성과 분석 변경 시 savePBLDraftAction이 호출된다', async () => {
      const user = userEvent.setup();
      mockSavePBLDraftAction.mockResolvedValue({ success: true });

      render(
        <ConsultantPBLClient
          {...DEFAULT_PROPS}
          initialVersions={[makePBLRow()]}
          initialSelected={makePBLRow({ status: 'DRAFT' })}
        />,
      );

      await user.click(screen.getByTestId('performance-change-btn'));

      await waitFor(() => {
        expect(mockSavePBLDraftAction).toHaveBeenCalledWith(
          'pbl-1',
          expect.objectContaining({
            pbl_content: expect.objectContaining({
              performance_analysis: expect.any(Object),
            }),
          }),
        );
      });
    });

    it('content가 없을 때 변경 핸들러가 조기 반환한다 (selected=null)', () => {
      // selected가 null이면 handleGoalChange 등이 early return해야 함
      render(<ConsultantPBLClient {...DEFAULT_PROPS} />);
      // 빈 상태에서는 RegenerateAccordion 대신 큰 단독 버튼이 노출됨 (ISSUE-18)
      expect(screen.getByTestId('empty-pbl-generate-btn')).toBeInTheDocument();
    });
  });

  // ---------------------------------------------------------------------------
  // 버전 선택 (handleSelect)
  // ---------------------------------------------------------------------------
  describe('버전 선택', () => {
    it('버전 선택 시 fetchPBLReport가 호출된다', async () => {
      const user = userEvent.setup();
      const rows = [
        makePBLRow({ id: 'pbl-1', version_number: 1 }),
        makePBLRow({ id: 'pbl-2', version_number: 2 }),
      ];
      mockFetchPBLReport.mockResolvedValue(rows[1]);

      render(
        <ConsultantPBLClient
          {...DEFAULT_PROPS}
          initialVersions={rows}
          initialSelected={rows[0]}
        />,
      );

      await user.selectOptions(screen.getByLabelText('PBL 버전 선택'), 'pbl-2');

      await waitFor(() => {
        expect(mockFetchPBLReport).toHaveBeenCalledWith('pbl-2');
      });
    });

    it('fetchPBLReport가 row를 반환하면 selected가 업데이트된다', async () => {
      const user = userEvent.setup();
      const rows = [
        makePBLRow({ id: 'pbl-1', version_number: 1 }),
        makePBLRow({ id: 'pbl-2', version_number: 2 }),
      ];
      mockFetchPBLReport.mockResolvedValue(rows[1]);

      render(
        <ConsultantPBLClient
          {...DEFAULT_PROPS}
          initialVersions={rows}
          initialSelected={rows[0]}
        />,
      );

      await user.selectOptions(screen.getByLabelText('PBL 버전 선택'), 'pbl-2');

      await waitFor(() => {
        expect(mockFetchPBLReport).toHaveBeenCalledWith('pbl-2');
      });
    });

    it('fetchPBLReport가 null을 반환하면 selected가 변경되지 않는다', async () => {
      const user = userEvent.setup();
      const rows = [
        makePBLRow({ id: 'pbl-1', version_number: 1 }),
        makePBLRow({ id: 'pbl-2', version_number: 2 }),
      ];
      mockFetchPBLReport.mockResolvedValue(null);

      render(
        <ConsultantPBLClient
          {...DEFAULT_PROPS}
          initialVersions={rows}
          initialSelected={rows[0]}
        />,
      );

      await user.selectOptions(screen.getByLabelText('PBL 버전 선택'), 'pbl-2');

      await waitFor(() => {
        expect(mockFetchPBLReport).toHaveBeenCalledWith('pbl-2');
      });
      // selected가 null이면 업데이트 안됨 — pbl-operation-goal이 여전히 있어야 함
      expect(screen.getByTestId('pbl-operation-goal')).toBeInTheDocument();
    });
  });

  // ---------------------------------------------------------------------------
  // 생성 중 취소
  // ---------------------------------------------------------------------------
  describe('생성 취소', () => {
    it('생성 중 취소 클릭 시 cancelPBLGeneration이 호출된다', async () => {
      const user = userEvent.setup();
      // 생성 action이 완료되지 않도록 pending 상태 유지
      let resolveGenerate: (value: unknown) => void;
      mockGeneratePBLAction.mockImplementation(
        () => new Promise((resolve) => { resolveGenerate = resolve; }),
      );
      mockCancelPBLGeneration.mockResolvedValue(undefined);

      render(<ConsultantPBLClient {...DEFAULT_PROPS} />);

      // 생성 시작 (빈 상태 큰 버튼)
      await user.click(screen.getByTestId('empty-pbl-generate-btn'));

      // 생성 중 UI에서 취소 버튼 클릭
      await waitFor(() => {
        expect(screen.getByRole('button', { name: '취소' })).toBeInTheDocument();
      });
      await user.click(screen.getByRole('button', { name: '취소' }));

      expect(mockCancelPBLGeneration).toHaveBeenCalled();

      // 생성 완료로 정리
      resolveGenerate!({ success: false });
    });
  });
});
