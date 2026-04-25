import { describe, it, expect, vi, beforeEach } from 'vitest';
import { act, render, screen, fireEvent, waitFor } from '@testing-library/react';

// next/navigation — ResultTabs 가 useSearchParams / useRouter 사용
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    refresh: vi.fn(),
    prefetch: vi.fn(),
  }),
  useSearchParams: () => new URLSearchParams(),
}));

// ShareToggle — Server Action 의존 모킹 (OPS FINAL 상태에서만 렌더되는 경로 검증용)
vi.mock('@/components/gallery/ShareToggle', () => ({
  ShareToggle: ({ roadmapVersionId }: { roadmapVersionId: string }) => (
    <div data-testid="share-toggle" data-version-id={roadmapVersionId}>
      ShareToggle Mock
    </div>
  ),
}));

import { RoadmapResultClient } from '../RoadmapResultClient';
import type { RoadmapVersionUI } from '@/types/roadmap-ui';
import type { ResultInterviewSnapshot } from '../types';

const baseInterview: Partial<ResultInterviewSnapshot> = {
  establishmentNecessity: '필요성 본문',
  performanceActivities: [],
  aiLevel: 'INTERMEDIATE',
  selectedTask: '선정 과업',
  companyRequirements: {
    status: '',
    problem: '',
    will: '',
    outcomes: '',
  },
  taskAnalysis: [],
  taskAnalysisNote: '',
  targetTask: {
    name: '',
    reason: '',
    expectedAsIs: '',
    expectedToBe: '',
  },
  competencies: [],
  ncsUsed: false,
  ncsDerivationMethod: '',
};

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

describe('RoadmapResultClient — CONSULTANT role', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('PageHeader + VersionSelector + DownloadButtonGroup 을 상단에 렌더', () => {
    render(
      <RoadmapResultClient
        role="CONSULTANT"
        projectId="p1"
        versions={[makeVersion()]}
        selectedVersion={makeVersion()}
        interview={baseInterview}
        onSelectVersion={vi.fn()}
        onEdit={vi.fn()}
        onGenerate={vi.fn()}
        onDownload={vi.fn()}
      />,
    );
    expect(
      screen.getByRole('heading', { name: /AI훈련로드맵 결과/, level: 1 }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText('PDF 다운로드')).toBeInTheDocument();
    expect(screen.getByLabelText('Excel 다운로드')).toBeInTheDocument();
    expect(screen.getByLabelText('HWPX 다운로드')).toBeInTheDocument();
  });

  it('3탭 (Ⅰ 개요 / Ⅱ 요구분석 / Ⅲ 훈련체계) 을 ResultTabs 에 전달', () => {
    render(
      <RoadmapResultClient
        role="CONSULTANT"
        projectId="p1"
        versions={[makeVersion()]}
        selectedVersion={makeVersion()}
        interview={baseInterview}
        onSelectVersion={vi.fn()}
        onEdit={vi.fn()}
        onGenerate={vi.fn()}
        onDownload={vi.fn()}
      />,
    );
    expect(screen.getByRole('tab', { name: 'Ⅰ. 개요' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Ⅱ. 요구분석' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Ⅲ. 훈련체계' })).toBeInTheDocument();
  });

  it('선택 버전 없으면 EmptyState 렌더 (탭 영역 대신)', () => {
    render(
      <RoadmapResultClient
        role="CONSULTANT"
        projectId="p1"
        versions={[]}
        selectedVersion={null}
        interview={baseInterview}
        onSelectVersion={vi.fn()}
        onEdit={vi.fn()}
        onGenerate={vi.fn()}
        onDownload={vi.fn()}
      />,
    );
    expect(
      screen.getByText(/아직 생성된 로드맵이 없습니다/),
    ).toBeInTheDocument();
    expect(screen.queryByRole('tab', { name: 'Ⅰ. 개요' })).toBeNull();
  });

  it('DRAFT 상태에서 RegenerateAccordion 을 통해 onGenerate 호출', () => {
    const onGenerate = vi.fn().mockResolvedValue(undefined);
    render(
      <RoadmapResultClient
        role="CONSULTANT"
        projectId="p1"
        versions={[makeVersion({ status: 'DRAFT' })]}
        selectedVersion={makeVersion({ status: 'DRAFT' })}
        interview={baseInterview}
        onSelectVersion={vi.fn()}
        onEdit={vi.fn()}
        onGenerate={onGenerate}
        onDownload={vi.fn()}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: /새 버전 생성/ }));
    fireEvent.click(screen.getByRole('button', { name: '생성 시작' }));
    expect(onGenerate).toHaveBeenCalled();
  });

  it('isGenerating=true 시 RoadmapLoadingOverlay 표시', () => {
    render(
      <RoadmapResultClient
        role="CONSULTANT"
        projectId="p1"
        versions={[makeVersion()]}
        selectedVersion={makeVersion()}
        interview={baseInterview}
        onSelectVersion={vi.fn()}
        onEdit={vi.fn()}
        onGenerate={vi.fn()}
        onDownload={vi.fn()}
        isGenerating
        companyName="테스트기업"
      />,
    );
    expect(
      screen.getByRole('heading', { name: 'AI 로드맵 생성 중' }),
    ).toBeInTheDocument();
  });

  it('VersionStatusBadge 가 선택 버전 상태 + 번호를 표시 (DRAFT v3)', () => {
    render(
      <RoadmapResultClient
        role="CONSULTANT"
        projectId="p1"
        versions={[makeVersion({ status: 'DRAFT', version_number: 3 })]}
        selectedVersion={makeVersion({
          status: 'DRAFT',
          version_number: 3,
        })}
        interview={baseInterview}
        onSelectVersion={vi.fn()}
        onEdit={vi.fn()}
        onGenerate={vi.fn()}
        onDownload={vi.fn()}
      />,
    );
    const badgeCandidates = screen.getAllByText(/v3/);
    expect(badgeCandidates.length).toBeGreaterThan(0);
  });

  it('제외 라벨 3종 (결과물 표지 / 고정 참고자료 / 고정 양식·결과 화면 제외) 미렌더', () => {
    const { container } = render(
      <RoadmapResultClient
        role="CONSULTANT"
        projectId="p1"
        versions={[makeVersion()]}
        selectedVersion={makeVersion()}
        interview={baseInterview}
        onSelectVersion={vi.fn()}
        onEdit={vi.fn()}
        onGenerate={vi.fn()}
        onDownload={vi.fn()}
      />,
    );
    const text = container.textContent ?? '';
    expect(text).not.toContain('결과물 표지');
    expect(text).not.toContain('고정 참고자료');
    expect(text).not.toContain('고정 양식·결과 화면 제외');
  });

  it('PDF 다운로드 클릭 시 onDownload("PDF") 호출', async () => {
    const onDownload = vi.fn().mockResolvedValue(undefined);
    render(
      <RoadmapResultClient
        role="CONSULTANT"
        projectId="p1"
        versions={[makeVersion()]}
        selectedVersion={makeVersion()}
        interview={baseInterview}
        onSelectVersion={vi.fn()}
        onEdit={vi.fn()}
        onGenerate={vi.fn()}
        onDownload={onDownload}
      />,
    );
    await act(async () => {
      fireEvent.click(screen.getByLabelText('PDF 다운로드'));
    });
    await waitFor(() => expect(onDownload).toHaveBeenCalledWith('PDF'));
  });
});

describe('RoadmapResultClient — OPS role', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('role="OPS" 일 때 RegenerateAccordion 이 렌더되지 않는다', () => {
    render(
      <RoadmapResultClient
        role="OPS"
        projectId="p1"
        versions={[makeVersion({ status: 'DRAFT' })]}
        selectedVersion={makeVersion({ status: 'DRAFT' })}
        interview={baseInterview}
        onSelectVersion={vi.fn()}
        onEdit={vi.fn()}
        onGenerate={vi.fn()}
        onDownload={vi.fn()}
      />,
    );
    // "새 버전 생성" 아코디언 트리거 버튼이 존재하지 않아야 함
    expect(screen.queryByRole('button', { name: /새 버전 생성/ })).toBeNull();
  });

  it('role="OPS" 일 때 DRAFT 상태에서도 InlineEditField 가 편집 가능 상태가 아니다 (readOnly)', () => {
    const { container } = render(
      <RoadmapResultClient
        role="OPS"
        projectId="p1"
        versions={[makeVersion({ status: 'DRAFT' })]}
        selectedVersion={makeVersion({ status: 'DRAFT' })}
        interview={baseInterview}
        onSelectVersion={vi.fn()}
        onEdit={vi.fn()}
        onGenerate={vi.fn()}
        onDownload={vi.fn()}
      />,
    );
    // InlineEditField 의 편집 아이콘(연필 버튼) 이 Ops 에는 전혀 없어야 함
    const editButtons = container.querySelectorAll('button[aria-label*="편집"]');
    expect(editButtons.length).toBe(0);
  });

  it('role="OPS" + FINAL 상태에서만 ShareToggle 노출, DRAFT 에는 미노출', () => {
    const { rerender } = render(
      <RoadmapResultClient
        role="OPS"
        projectId="p1"
        versions={[makeVersion({ status: 'DRAFT' })]}
        selectedVersion={makeVersion({ status: 'DRAFT' })}
        interview={baseInterview}
        onSelectVersion={vi.fn()}
        onEdit={vi.fn()}
        onGenerate={vi.fn()}
        onDownload={vi.fn()}
      />,
    );
    expect(screen.queryByTestId('share-toggle')).toBeNull();

    rerender(
      <RoadmapResultClient
        role="OPS"
        projectId="p1"
        versions={[makeVersion({ status: 'FINAL' })]}
        selectedVersion={makeVersion({ status: 'FINAL' })}
        interview={baseInterview}
        onSelectVersion={vi.fn()}
        onEdit={vi.fn()}
        onGenerate={vi.fn()}
        onDownload={vi.fn()}
      />,
    );
    expect(screen.getByTestId('share-toggle')).toBeInTheDocument();
  });

  it('role="CONSULTANT" 에는 ShareToggle 이 노출되지 않는다 (Ops 전용)', () => {
    render(
      <RoadmapResultClient
        role="CONSULTANT"
        projectId="p1"
        versions={[makeVersion({ status: 'FINAL' })]}
        selectedVersion={makeVersion({ status: 'FINAL' })}
        interview={baseInterview}
        onSelectVersion={vi.fn()}
        onEdit={vi.fn()}
        onGenerate={vi.fn()}
        onDownload={vi.fn()}
      />,
    );
    expect(screen.queryByTestId('share-toggle')).toBeNull();
  });

  it('role="OPS" 에는 "최종 확정" 버튼이 렌더되지 않는다', () => {
    render(
      <RoadmapResultClient
        role="OPS"
        projectId="p1"
        versions={[makeVersion({ status: 'DRAFT' })]}
        selectedVersion={makeVersion({ status: 'DRAFT' })}
        interview={baseInterview}
        onSelectVersion={vi.fn()}
        onEdit={vi.fn()}
        onGenerate={vi.fn()}
        onDownload={vi.fn()}
      />,
    );
    expect(screen.queryByTestId('finalize-roadmap-button')).toBeNull();
  });
});

describe('RoadmapResultClient — EmptyState + Finalize (E2E 셀렉터 대응)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('role="CONSULTANT" + versions=[] 일 때 EmptyState 에 "AI 로드맵 생성" 버튼 노출', async () => {
    const onGenerate = vi.fn().mockResolvedValue(undefined);
    render(
      <RoadmapResultClient
        role="CONSULTANT"
        projectId="p1"
        versions={[]}
        selectedVersion={null}
        interview={baseInterview}
        onSelectVersion={vi.fn()}
        onEdit={vi.fn()}
        onGenerate={onGenerate}
        onDownload={vi.fn()}
      />,
    );
    const btn = screen.getByTestId('empty-state-generate-roadmap');
    expect(btn).toBeInTheDocument();

    await act(async () => {
      fireEvent.click(btn);
    });
    await waitFor(() => expect(onGenerate).toHaveBeenCalledTimes(1));
  });

  it('role="CONSULTANT" + DRAFT 선택 버전 일 때 "최종 확정" 버튼 클릭 → onFinalize 호출', async () => {
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);
    const onFinalize = vi.fn().mockResolvedValue(undefined);
    render(
      <RoadmapResultClient
        role="CONSULTANT"
        projectId="p1"
        versions={[makeVersion({ status: 'DRAFT' })]}
        selectedVersion={makeVersion({ status: 'DRAFT' })}
        interview={baseInterview}
        onSelectVersion={vi.fn()}
        onEdit={vi.fn()}
        onGenerate={vi.fn()}
        onDownload={vi.fn()}
        onFinalize={onFinalize}
      />,
    );
    const btn = screen.getByTestId('finalize-roadmap-button');
    expect(btn).toBeInTheDocument();

    await act(async () => {
      fireEvent.click(btn);
    });
    await waitFor(() => expect(onFinalize).toHaveBeenCalledTimes(1));
    confirmSpy.mockRestore();
  });

  it('confirm 취소 시 onFinalize 호출되지 않음', async () => {
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false);
    const onFinalize = vi.fn();
    render(
      <RoadmapResultClient
        role="CONSULTANT"
        projectId="p1"
        versions={[makeVersion({ status: 'DRAFT' })]}
        selectedVersion={makeVersion({ status: 'DRAFT' })}
        interview={baseInterview}
        onSelectVersion={vi.fn()}
        onEdit={vi.fn()}
        onGenerate={vi.fn()}
        onDownload={vi.fn()}
        onFinalize={onFinalize}
      />,
    );
    await act(async () => {
      fireEvent.click(screen.getByTestId('finalize-roadmap-button'));
    });
    expect(onFinalize).not.toHaveBeenCalled();
    confirmSpy.mockRestore();
  });

  it('selected-version-heading 이 선택 버전 번호를 h2 로 노출', () => {
    render(
      <RoadmapResultClient
        role="CONSULTANT"
        projectId="p1"
        versions={[makeVersion({ version_number: 3 })]}
        selectedVersion={makeVersion({ version_number: 3 })}
        interview={baseInterview}
        onSelectVersion={vi.fn()}
        onEdit={vi.fn()}
        onGenerate={vi.fn()}
        onDownload={vi.fn()}
      />,
    );
    const heading = screen.getByTestId('selected-version-heading');
    expect(heading).toBeInTheDocument();
    expect(heading).toHaveTextContent(/버전\s*3/);
  });

  it('FINAL 상태에서는 "최종 확정" 버튼이 렌더되지 않는다', () => {
    render(
      <RoadmapResultClient
        role="CONSULTANT"
        projectId="p1"
        versions={[makeVersion({ status: 'FINAL' })]}
        selectedVersion={makeVersion({ status: 'FINAL' })}
        interview={baseInterview}
        onSelectVersion={vi.fn()}
        onEdit={vi.fn()}
        onGenerate={vi.fn()}
        onDownload={vi.fn()}
        onFinalize={vi.fn()}
      />,
    );
    expect(screen.queryByTestId('finalize-roadmap-button')).toBeNull();
  });
});

