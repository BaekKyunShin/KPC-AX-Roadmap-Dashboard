import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act, render, screen, fireEvent, waitFor } from '@testing-library/react';

// next/navigation — ResultTabs / RoadmapResultClient 가 useSearchParams / useRouter / usePathname 사용
const { searchParamsMock, routerReplaceMock } = vi.hoisted(() => ({
  searchParamsMock: vi.fn(() => new URLSearchParams()),
  routerReplaceMock: vi.fn(),
}));
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: routerReplaceMock,
    back: vi.fn(),
    forward: vi.fn(),
    refresh: vi.fn(),
    prefetch: vi.fn(),
  }),
  useSearchParams: () => searchParamsMock(),
  usePathname: () => '/consultant/projects/p1/roadmap',
}));

// ShareToggle — Server Action 의존 모킹 (CONSULTANT FINAL 상태에서만 렌더되는 경로 검증용)
vi.mock('@/components/gallery/ShareToggle', () => ({
  ShareToggle: ({ roadmapVersionId }: { roadmapVersionId: string }) => (
    <div data-testid="share-toggle" data-version-id={roadmapVersionId}>
      ShareToggle Mock
    </div>
  ),
}));

// AlertDialog 를 상태 기반 mock 으로 대체 (DeleteAccountSection.test.tsx 패턴 동일).
// open / onOpenChange 를 받아 자식에 isOpen·setOpen prop 을 주입한다.
vi.mock('@/components/ui/alert-dialog', async () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const React = require('react');

  function AlertDialog({
    children,
    open,
    onOpenChange,
  }: {
    children: React.ReactNode;
    open?: boolean;
    onOpenChange?: (open: boolean) => void;
  }) {
    const [internalOpen, setInternalOpen] = React.useState(open ?? false);
    React.useEffect(() => {
      if (open !== undefined) setInternalOpen(open);
    }, [open]);

    return (
      <div data-testid="alert-dialog">
        {React.Children.map(children, (child: React.ReactElement) =>
          React.isValidElement(child)
            ? React.cloneElement(
                child as React.ReactElement<{
                  isOpen: boolean;
                  setOpen: (v: boolean) => void;
                  onOpenChange?: (v: boolean) => void;
                }>,
                {
                  isOpen: internalOpen,
                  setOpen: (v: boolean) => {
                    setInternalOpen(v);
                    onOpenChange?.(v);
                  },
                  onOpenChange,
                }
              )
            : child
        )}
      </div>
    );
  }

  function AlertDialogTrigger({
    children,
    asChild,
    isOpen: _isOpen,
    setOpen,
    ...props
  }: {
    children: React.ReactNode;
    asChild?: boolean;
    isOpen?: boolean;
    setOpen?: (v: boolean) => void;
    [key: string]: unknown;
  }) {
    if (asChild && React.isValidElement(children)) {
      return React.cloneElement(children as React.ReactElement<{ onClick: () => void }>, {
        onClick: () => setOpen?.(true),
      });
    }
    return (
      <button onClick={() => setOpen?.(true)} {...props}>
        {children}
      </button>
    );
  }

  function AlertDialogContent({
    children,
    isOpen,
    setOpen,
    onOpenChange,
    ...props
  }: {
    children: React.ReactNode;
    isOpen?: boolean;
    setOpen?: (v: boolean) => void;
    onOpenChange?: (v: boolean) => void;
    [key: string]: unknown;
  }) {
    if (!isOpen) return null;
    return (
      <div role="alertdialog" {...props}>
        {React.Children.map(children, (child: React.ReactElement) =>
          React.isValidElement(child)
            ? React.cloneElement(
                child as React.ReactElement<{
                  setOpen: (v: boolean) => void;
                  onOpenChange?: (v: boolean) => void;
                }>,
                { setOpen, onOpenChange }
              )
            : child
        )}
      </div>
    );
  }

  function AlertDialogHeader({ children }: { children: React.ReactNode }) {
    return <div>{children}</div>;
  }
  function AlertDialogTitle({ children }: { children: React.ReactNode }) {
    return <h2>{children}</h2>;
  }
  function AlertDialogDescription({
    children,
    asChild: _asChild,
  }: {
    children: React.ReactNode;
    asChild?: boolean;
  }) {
    return <div>{children}</div>;
  }
  function AlertDialogFooter({
    children,
    setOpen,
    onOpenChange,
    ...props
  }: {
    children: React.ReactNode;
    setOpen?: (v: boolean) => void;
    onOpenChange?: (v: boolean) => void;
    [key: string]: unknown;
  }) {
    return (
      <div {...props}>
        {React.Children.map(children, (child: React.ReactElement) =>
          React.isValidElement(child)
            ? React.cloneElement(
                child as React.ReactElement<{
                  setOpen: (v: boolean) => void;
                  onOpenChange?: (v: boolean) => void;
                }>,
                { setOpen, onOpenChange }
              )
            : child
        )}
      </div>
    );
  }
  function AlertDialogCancel({
    children,
    setOpen,
    onOpenChange,
    disabled,
    ...props
  }: {
    children: React.ReactNode;
    setOpen?: (v: boolean) => void;
    onOpenChange?: (v: boolean) => void;
    disabled?: boolean;
    [key: string]: unknown;
  }) {
    return (
      <button
        onClick={() => {
          setOpen?.(false);
          onOpenChange?.(false);
        }}
        disabled={disabled}
        {...props}
      >
        {children}
      </button>
    );
  }
  function AlertDialogAction({
    children,
    onClick,
    disabled,
    setOpen: _setOpen,
    onOpenChange: _onOpenChange,
    variant: _variant,
    ...props
  }: {
    children: React.ReactNode;
    onClick?: (e: React.MouseEvent) => void;
    disabled?: boolean;
    setOpen?: (v: boolean) => void;
    onOpenChange?: (v: boolean) => void;
    variant?: string;
    [key: string]: unknown;
  }) {
    return (
      <button onClick={onClick} disabled={disabled} {...props}>
        {children}
      </button>
    );
  }

  return {
    AlertDialog,
    AlertDialogTrigger,
    AlertDialogContent,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogCancel,
    AlertDialogAction,
  };
});

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
  targetTask: {
    name: '',
    reason: '',
    expectedAsIs: '',
    expectedToBe: '',
  },
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
      />
    );
    expect(
      screen.getByRole('heading', { name: /AI훈련로드맵 결과/, level: 1 })
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
      />
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
      />
    );
    expect(screen.getByText(/아직 생성된 로드맵이 없습니다/)).toBeInTheDocument();
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
        selfAssessmentExists={true}
        projectStatus="INTERVIEWED"
        onSelectVersion={vi.fn()}
        onEdit={vi.fn()}
        onGenerate={onGenerate}
        onDownload={vi.fn()}
      />
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
      />
    );
    expect(screen.getByRole('heading', { name: 'AI 로드맵 생성 중' })).toBeInTheDocument();
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
      />
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
      />
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
      />
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
      />
    );
    // "새 버전 생성" 아코디언 트리거 버튼이 존재하지 않아야 함
    expect(screen.queryByRole('button', { name: /새 버전 생성/ })).toBeNull();
  });

  it('role="OPS" 일 때 DRAFT 상태에서도 InlineEditField 가 편집 가능 상태가 아니다 (readOnly)', async () => {
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
      />
    );
    // 본문이 실제로 렌더된 뒤에 단언해야 "편집 불가"가 공허하게 참이 되지 않는다.
    // (이 앵커가 없으면 탭 본문이 아예 없어도 아래 단언이 통과한다.)
    expect(await screen.findByText('Ⅰ-1. 수립 필요성')).toBeInTheDocument();

    // InlineEditField 는 readOnly 일 때 role="button"·tabIndex 를 부여하지 않는다
    // (InlineEditField.tsx:209-222). Ops 에는 편집 가능한 필드가 하나도 없어야 한다.
    const editableFields = container.querySelectorAll('[data-saving-state][role="button"]');
    expect(editableFields.length).toBe(0);
  });

  it('role="CONSULTANT" + DRAFT 에서는 InlineEditField 가 편집 가능하다 (위 readOnly 단언의 대조군)', async () => {
    const { container } = render(
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
      />
    );
    expect(await screen.findByText('Ⅰ-1. 수립 필요성')).toBeInTheDocument();

    const editableFields = container.querySelectorAll('[data-saving-state][role="button"]');
    expect(editableFields.length).toBeGreaterThan(0);
  });

  it('role="OPS" + FINAL 상태에서 읽기 전용 공유 배지를 노출하고, 토글은 렌더하지 않는다', () => {
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
      />
    );
    expect(screen.queryByTestId('share-toggle')).toBeNull();
    expect(screen.queryByText(/^갤러리 (공유됨|미공유)$/)).toBeNull();

    rerender(
      <RoadmapResultClient
        role="OPS"
        projectId="p1"
        versions={[makeVersion({ status: 'FINAL', is_shared: true })]}
        selectedVersion={makeVersion({ status: 'FINAL', is_shared: true })}
        interview={baseInterview}
        onSelectVersion={vi.fn()}
        onEdit={vi.fn()}
        onGenerate={vi.fn()}
        onDownload={vi.fn()}
      />
    );
    expect(screen.getByText('갤러리 공유됨')).toBeInTheDocument();
    // Ops 는 공유 설정을 변경할 권한이 없으므로 토글이 렌더되어서는 안 된다.
    expect(screen.queryByTestId('share-toggle')).toBeNull();
  });

  it('role="OPS" + FINAL + is_shared=false 이면 "갤러리 미공유" 배지를 노출한다', () => {
    render(
      <RoadmapResultClient
        role="OPS"
        projectId="p1"
        versions={[makeVersion({ status: 'FINAL', is_shared: false })]}
        selectedVersion={makeVersion({ status: 'FINAL', is_shared: false })}
        interview={baseInterview}
        onSelectVersion={vi.fn()}
        onEdit={vi.fn()}
        onGenerate={vi.fn()}
        onDownload={vi.fn()}
      />
    );
    expect(screen.getByText('갤러리 미공유')).toBeInTheDocument();
  });

  it('role="CONSULTANT" + FINAL 에는 ShareToggle 이 노출된다 (작성 컨설턴트가 공유 주체)', () => {
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
      />
    );
    expect(screen.getByTestId('share-toggle')).toBeInTheDocument();
    // 컨설턴트는 직접 변경 가능하므로 읽기 전용 배지는 노출하지 않는다.
    expect(screen.queryByText(/^갤러리 (공유됨|미공유)$/)).toBeNull();
  });

  it('role="CONSULTANT" + DRAFT 에는 토글·배지 모두 노출되지 않는다', () => {
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
      />
    );
    expect(screen.queryByTestId('share-toggle')).toBeNull();
    expect(screen.queryByText(/^갤러리 (공유됨|미공유)$/)).toBeNull();
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
      />
    );
    expect(screen.queryByTestId('finalize-roadmap-button')).toBeNull();
  });
});

describe('RoadmapResultClient — 행정 종결(projectClosed)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('종결 시 배너·종결 배지 표시 + DRAFT여도 최종 확정 버튼 숨김', () => {
    render(
      <RoadmapResultClient
        role="CONSULTANT"
        projectId="p1"
        versions={[makeVersion({ status: 'DRAFT' })]}
        selectedVersion={makeVersion({ status: 'DRAFT' })}
        interview={baseInterview}
        projectClosed
        onSelectVersion={vi.fn()}
        onEdit={vi.fn()}
        onGenerate={vi.fn()}
        onDownload={vi.fn()}
        onFinalize={vi.fn()}
      />
    );
    expect(screen.getByTestId('project-closed-banner')).toBeInTheDocument();
    expect(screen.getByText('종결')).toBeInTheDocument();
    expect(screen.queryByTestId('finalize-roadmap-button')).toBeNull();
  });

  it('종결 시에도 다운로드 버튼(열람·내보내기)은 유지', () => {
    render(
      <RoadmapResultClient
        role="CONSULTANT"
        projectId="p1"
        versions={[makeVersion({ status: 'DRAFT' })]}
        selectedVersion={makeVersion({ status: 'DRAFT' })}
        interview={baseInterview}
        projectClosed
        onSelectVersion={vi.fn()}
        onEdit={vi.fn()}
        onGenerate={vi.fn()}
        onDownload={vi.fn()}
      />
    );
    expect(screen.getByLabelText('PDF 다운로드')).toBeInTheDocument();
    expect(screen.getByLabelText('HWPX 다운로드')).toBeInTheDocument();
  });

  it('종결 + 버전 0개 → EmptyState에 종결 안내 표시 (생성 버튼 없음)', () => {
    render(
      <RoadmapResultClient
        role="CONSULTANT"
        projectId="p1"
        versions={[]}
        selectedVersion={null}
        interview={baseInterview}
        selfAssessmentExists
        projectStatus="FINALIZED"
        projectClosed
        onSelectVersion={vi.fn()}
        onEdit={vi.fn()}
        onGenerate={vi.fn()}
        onDownload={vi.fn()}
      />
    );
    expect(screen.getByText(/새 로드맵을 생성할 수 없습니다/)).toBeInTheDocument();
    expect(screen.queryByTestId('empty-state-generate-roadmap')).toBeNull();
  });

  it('미종결(기본값)이면 종결 배너를 표시하지 않는다', () => {
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
      />
    );
    expect(screen.queryByTestId('project-closed-banner')).toBeNull();
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
        selfAssessmentExists={true}
        projectStatus="INTERVIEWED"
        onSelectVersion={vi.fn()}
        onEdit={vi.fn()}
        onGenerate={onGenerate}
        onDownload={vi.fn()}
      />
    );
    const btn = screen.getByTestId('empty-state-generate-roadmap');
    expect(btn).toBeInTheDocument();

    await act(async () => {
      fireEvent.click(btn);
    });
    await waitFor(() => expect(onGenerate).toHaveBeenCalledTimes(1));
  });

  it('selected-version-heading 이 선택 버전 번호를 h2 로 노출 (CONSULTANT)', () => {
    // confirm 기반 테스트는 신규 AlertDialog 동작과 충돌하므로 #2 신규 describe 블록으로 이관.
    // 본 테스트는 다른 회귀 가드 흐름 유지를 위한 placeholder 유지.
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
        onFinalize={vi.fn()}
      />
    );
    expect(screen.getByTestId('finalize-roadmap-button')).toBeInTheDocument();
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
      />
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
      />
    );
    expect(screen.queryByTestId('finalize-roadmap-button')).toBeNull();
  });

  // PR5 (R6) — FINAL in-place 수정 안내 배너
  it('CONSULTANT + FINAL 상태에서 in-place 수정 안내 배너 노출', () => {
    render(
      <RoadmapResultClient
        role="CONSULTANT"
        projectId="p1"
        versions={[makeVersion({ status: 'FINAL', version_number: 3 })]}
        selectedVersion={makeVersion({ status: 'FINAL', version_number: 3 })}
        interview={baseInterview}
        onSelectVersion={vi.fn()}
        onEdit={vi.fn()}
        onGenerate={vi.fn()}
        onDownload={vi.fn()}
      />
    );
    expect(screen.getByTestId('final-edit-warning-banner')).toBeInTheDocument();
  });

  it('CONSULTANT + DRAFT 상태에서는 FINAL 안내 배너가 노출되지 않는다', () => {
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
      />
    );
    expect(screen.queryByTestId('final-edit-warning-banner')).not.toBeInTheDocument();
  });

  it('OPS + FINAL 상태에서는 FINAL 안내 배너가 노출되지 않는다 (canEdit=false)', () => {
    render(
      <RoadmapResultClient
        role="OPS"
        projectId="p1"
        versions={[makeVersion({ status: 'FINAL' })]}
        selectedVersion={makeVersion({ status: 'FINAL' })}
        interview={baseInterview}
        onSelectVersion={vi.fn()}
        onDownload={vi.fn()}
      />
    );
    expect(screen.queryByTestId('final-edit-warning-banner')).not.toBeInTheDocument();
  });
});

// #002 회귀 방지 — 인터뷰 미완료 상태에서 "AI 로드맵 생성" 버튼이 silent fail 하던 결함.
// EmptyState 가 인터뷰 부재 여부를 가드하지 않아 클릭 시 Server Action 만 throw 하고
// 사용자는 어떤 피드백도 받지 못하는 결함을 EmptyState 단계에서 사전 차단.
describe('RoadmapResultClient — 인터뷰 미완료 가드 (#002)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('interview 가 빈 객체이고 versions=[] 일 때 안내 문구 + 인터뷰 페이지 CTA 노출', () => {
    render(
      <RoadmapResultClient
        role="CONSULTANT"
        projectId="proj-empty-interview"
        versions={[]}
        selectedVersion={null}
        interview={{}}
        onSelectVersion={vi.fn()}
        onEdit={vi.fn()}
        onGenerate={vi.fn()}
        onDownload={vi.fn()}
      />
    );
    expect(screen.getByText(/현장 인터뷰를 먼저 완료해주세요/)).toBeInTheDocument();
    const cta = screen.getByRole('link', { name: /인터뷰 입력하러 가기/ });
    expect(cta).toBeInTheDocument();
    expect(cta).toHaveAttribute('href', '/consultant/projects/proj-empty-interview/interview');
  });

  it('interview 가 빈 객체일 때 "AI 로드맵 생성" 버튼이 disabled', () => {
    render(
      <RoadmapResultClient
        role="CONSULTANT"
        projectId="p1"
        versions={[]}
        selectedVersion={null}
        interview={{}}
        onSelectVersion={vi.fn()}
        onEdit={vi.fn()}
        onGenerate={vi.fn()}
        onDownload={vi.fn()}
      />
    );
    expect(screen.getByTestId('empty-state-generate-roadmap')).toBeDisabled();
  });

  it('interview 가 채워져 있을 때 안내 문구·CTA 미노출 + 버튼 활성', () => {
    render(
      <RoadmapResultClient
        role="CONSULTANT"
        projectId="p1"
        versions={[]}
        selectedVersion={null}
        interview={baseInterview}
        selfAssessmentExists={true}
        projectStatus="INTERVIEWED"
        onSelectVersion={vi.fn()}
        onEdit={vi.fn()}
        onGenerate={vi.fn()}
        onDownload={vi.fn()}
      />
    );
    expect(screen.queryByText(/현장 인터뷰를 먼저 완료해주세요/)).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /인터뷰 입력하러 가기/ })).not.toBeInTheDocument();
    expect(screen.getByTestId('empty-state-generate-roadmap')).toBeEnabled();
  });
});

// #013 회귀 방지 — 인터뷰는 있으나 자가진단/status 가 안 맞을 때 silent fail 하던 결함.
// EmptyState 가드를 status·자가진단까지 확장해 클릭 자체를 사전 차단 + 안내 문구 명시.
describe('RoadmapResultClient — 자가진단/status 가드 (#013)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('인터뷰는 있으나 자가진단 부재 시 "자가진단 결과가 없습니다" 안내 + 버튼 disabled', () => {
    render(
      <RoadmapResultClient
        role="CONSULTANT"
        projectId="p1"
        versions={[]}
        selectedVersion={null}
        interview={baseInterview}
        selfAssessmentExists={false}
        projectStatus="INTERVIEWED"
        onSelectVersion={vi.fn()}
        onEdit={vi.fn()}
        onGenerate={vi.fn()}
        onDownload={vi.fn()}
      />
    );
    expect(screen.getByText(/자가진단 결과가 없습니다/)).toBeInTheDocument();
    expect(screen.getByTestId('empty-state-generate-roadmap')).toBeDisabled();
  });

  it('status 가 ROADMAP_ELIGIBLE_STATUSES (INTERVIEWED 이상) 미만일 때 안내 + 버튼 disabled', () => {
    render(
      <RoadmapResultClient
        role="CONSULTANT"
        projectId="p1"
        versions={[]}
        selectedVersion={null}
        interview={baseInterview}
        selfAssessmentExists={true}
        projectStatus="ASSIGNED"
        onSelectVersion={vi.fn()}
        onEdit={vi.fn()}
        onGenerate={vi.fn()}
        onDownload={vi.fn()}
      />
    );
    expect(screen.getByText(/인터뷰는 작성됐지만 아직 최종 제출 전입니다/)).toBeInTheDocument();
    expect(screen.getByTestId('empty-state-generate-roadmap')).toBeDisabled();
  });
});

// #2 — 로드맵 최종 확정 AlertDialog (window.confirm → shadcn AlertDialog 마이그레이션).
// 안내문은 2줄(상태 전환 + 이전 확정본 처리, 확정 후 수정 가능) + 취소/최종 확정 버튼.
// 회귀 가드: window.confirm 호출 금지.
describe('RoadmapResultClient — 최종 확정 AlertDialog (#2)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('"최종 확정" 클릭 시 즉시 onFinalize 호출되지 않고 AlertDialog 가 열린다', async () => {
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
      />
    );

    await act(async () => {
      fireEvent.click(screen.getByTestId('finalize-roadmap-button'));
    });

    expect(screen.getByText('로드맵을 최종 확정하시겠습니까?')).toBeInTheDocument();
    expect(onFinalize).not.toHaveBeenCalled();
  });

  it('AlertDialog 본문에 정확한 안내문이 노출된다', async () => {
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
        onFinalize={vi.fn()}
      />
    );

    await act(async () => {
      fireEvent.click(screen.getByTestId('finalize-roadmap-button'));
    });

    // AlertDialogDescription 은 한 노드에 <br> 로 줄바꿈되어 있어 textContent 부분
    // 매칭 + textNode-aware matcher 를 사용한다.
    const dialog = screen.getByRole('alertdialog');
    const text = dialog.textContent ?? '';
    expect(text).toMatch(
      /확정하면 프로젝트 상태가 ['‘]최종 확정['’]으로 바뀌고, 이전 확정본은 자동 아카이브됩니다\./
    );
    expect(text).toContain('확정 후에도 항목을 직접 수정할 수 있습니다(같은 버전에 반영).');
  });

  it('"취소" 클릭 시 AlertDialog 가 닫히고 onFinalize 미호출', async () => {
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
      />
    );

    await act(async () => {
      fireEvent.click(screen.getByTestId('finalize-roadmap-button'));
    });
    // 다이얼로그 노출 확인
    expect(screen.getByText('로드맵을 최종 확정하시겠습니까?')).toBeInTheDocument();

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: '취소' }));
    });

    await waitFor(() =>
      expect(screen.queryByText('로드맵을 최종 확정하시겠습니까?')).not.toBeInTheDocument()
    );
    expect(onFinalize).not.toHaveBeenCalled();
  });

  it('"최종 확정"(destructive) 클릭 시 onFinalize(selectedVersion.id) 1회 호출', async () => {
    const onFinalize = vi.fn().mockResolvedValue(undefined);
    const selected = makeVersion({ id: 'v-final-1', status: 'DRAFT' });
    render(
      <RoadmapResultClient
        role="CONSULTANT"
        projectId="p1"
        versions={[selected]}
        selectedVersion={selected}
        interview={baseInterview}
        onSelectVersion={vi.fn()}
        onEdit={vi.fn()}
        onGenerate={vi.fn()}
        onDownload={vi.fn()}
        onFinalize={onFinalize}
      />
    );

    // 트리거 버튼 (캘린더의 "최종 확정") 클릭 → 다이얼로그 오픈
    await act(async () => {
      fireEvent.click(screen.getByTestId('finalize-roadmap-button'));
    });

    // 다이얼로그 내부의 "최종 확정" 버튼 (alertdialog role 안) 클릭
    const dialog = screen.getByRole('alertdialog');
    const confirmBtn = Array.from(dialog.querySelectorAll('button')).find(
      (b) => b.textContent === '최종 확정'
    );
    expect(confirmBtn).toBeDefined();

    await act(async () => {
      fireEvent.click(confirmBtn!);
    });

    await waitFor(() => {
      expect(onFinalize).toHaveBeenCalledTimes(1);
      expect(onFinalize).toHaveBeenCalledWith('v-final-1');
    });
    // 호출 후 다이얼로그 닫힘
    await waitFor(() =>
      expect(screen.queryByText('로드맵을 최종 확정하시겠습니까?')).not.toBeInTheDocument()
    );
  });

  it('window.confirm 은 더는 호출되지 않는다 (회귀 가드)', async () => {
    const confirmSpy = vi.spyOn(window, 'confirm');
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
      />
    );

    await act(async () => {
      fireEvent.click(screen.getByTestId('finalize-roadmap-button'));
    });

    expect(confirmSpy).not.toHaveBeenCalled();
    confirmSpy.mockRestore();
  });
});

// 다운로드 진행 중 '+ 새 버전 생성' 토글 비활성화 회귀 가드.
// PBL 결과 페이지와 동일한 UX 보장 — 사용자가 다운로드 도중 새 버전 생성을 클릭해
// state 충돌이 일어나는 시나리오 차단.
describe('RoadmapResultClient — 다운로드 진행 중 + 새 버전 생성 토글 비활성화', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // 토글은 인터뷰/자가진단/status 가드와 무관하게 평소 활성. 다운로드 중에만 비활성.
  // (인터뷰 미완료 시의 silent fail 차단은 EmptyState 큰 버튼이 담당.)
  it('자가진단/status 부재 상태에서도 + 새 버전 생성 토글이 enabled', () => {
    render(
      <RoadmapResultClient
        role="CONSULTANT"
        projectId="p1"
        versions={[makeVersion({ status: 'DRAFT' })]}
        selectedVersion={makeVersion({ status: 'DRAFT' })}
        interview={baseInterview}
        selfAssessmentExists={false}
        projectStatus="ASSIGNED"
        onSelectVersion={vi.fn()}
        onEdit={vi.fn()}
        onGenerate={vi.fn()}
        onDownload={vi.fn()}
      />
    );
    expect(screen.getByRole('button', { name: /새 버전 생성/ })).toBeEnabled();
  });

  it('HWPX 다운로드 진행 중에는 + 새 버전 생성 토글이 disabled 상태가 된다', async () => {
    let resolveDownload: () => void = () => {};
    const slowDownload = vi.fn(
      () =>
        new Promise<void>((r) => {
          resolveDownload = () => r();
        })
    );
    render(
      <RoadmapResultClient
        role="CONSULTANT"
        projectId="p1"
        versions={[makeVersion({ status: 'DRAFT' })]}
        selectedVersion={makeVersion({ status: 'DRAFT' })}
        interview={baseInterview}
        selfAssessmentExists={true}
        projectStatus="INTERVIEWED"
        onSelectVersion={vi.fn()}
        onEdit={vi.fn()}
        onGenerate={vi.fn()}
        onDownload={slowDownload}
      />
    );

    // 다운로드 시작 전: 토글 활성화
    expect(screen.getByRole('button', { name: /새 버전 생성/ })).toBeEnabled();

    // HWPX 다운로드 클릭 → pending 상태 유지
    await act(async () => {
      fireEvent.click(screen.getByLabelText('HWPX 다운로드'));
    });

    expect(slowDownload).toHaveBeenCalledWith('HWPX');
    expect(screen.getByRole('button', { name: /새 버전 생성/ })).toBeDisabled();

    // resolve 후 토글 다시 활성화
    await act(async () => {
      resolveDownload();
    });
    await waitFor(() => expect(screen.getByRole('button', { name: /새 버전 생성/ })).toBeEnabled());
  });

  it('PDF·XLSX 다운로드 진행 중에도 + 새 버전 생성 토글이 disabled 가 된다', async () => {
    let resolveDownload: () => void = () => {};
    const slowDownload = vi.fn(
      () =>
        new Promise<void>((r) => {
          resolveDownload = () => r();
        })
    );
    render(
      <RoadmapResultClient
        role="CONSULTANT"
        projectId="p1"
        versions={[makeVersion({ status: 'DRAFT' })]}
        selectedVersion={makeVersion({ status: 'DRAFT' })}
        interview={baseInterview}
        selfAssessmentExists={true}
        projectStatus="INTERVIEWED"
        onSelectVersion={vi.fn()}
        onEdit={vi.fn()}
        onGenerate={vi.fn()}
        onDownload={slowDownload}
      />
    );

    await act(async () => {
      fireEvent.click(screen.getByLabelText('PDF 다운로드'));
    });
    expect(screen.getByRole('button', { name: /새 버전 생성/ })).toBeDisabled();

    await act(async () => {
      resolveDownload();
    });
    await waitFor(() => expect(screen.getByRole('button', { name: /새 버전 생성/ })).toBeEnabled());
  });
});

// M-2 (PR3) — ?regenerate=open 진입 시 scrollIntoView 가 페인트 직후 실행되도록
// requestAnimationFrame 콜백 안에서 호출됨을 검증.
describe('RoadmapResultClient — ?regenerate=open scroll timing (M-2)', () => {
  let scrollIntoViewSpy: ReturnType<typeof vi.fn>;
  let originalScrollIntoView: PropertyDescriptor | undefined;
  let originalRAF: typeof window.requestAnimationFrame;

  beforeEach(() => {
    vi.clearAllMocks();
    searchParamsMock.mockReturnValue(new URLSearchParams('regenerate=open'));

    // JSDOM 은 scrollIntoView 미정의 → Element.prototype 에 직접 정의.
    scrollIntoViewSpy = vi.fn();
    originalScrollIntoView = Object.getOwnPropertyDescriptor(Element.prototype, 'scrollIntoView');
    Object.defineProperty(Element.prototype, 'scrollIntoView', {
      configurable: true,
      writable: true,
      value: scrollIntoViewSpy,
    });

    // rAF 콜백을 동기 즉시 실행으로 대체 (테스트 timing 결정성 확보).
    originalRAF = window.requestAnimationFrame;
  });

  afterEach(() => {
    searchParamsMock.mockReturnValue(new URLSearchParams());
    if (originalScrollIntoView) {
      Object.defineProperty(Element.prototype, 'scrollIntoView', originalScrollIntoView);
    } else {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      delete (Element.prototype as any).scrollIntoView;
    }
    window.requestAnimationFrame = originalRAF;
  });

  it('rAF 콜백이 실행되기 전에는 scrollIntoView 가 호출되지 않는다', () => {
    // rAF 를 호출 큐에 잡아두기만 하고 즉시 실행하지 않음.
    const rafCalls: FrameRequestCallback[] = [];
    window.requestAnimationFrame = ((cb: FrameRequestCallback) => {
      rafCalls.push(cb);
      return rafCalls.length;
    }) as typeof window.requestAnimationFrame;

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
      />
    );

    // rAF 콜백 보류 상태 → scrollIntoView · router.replace 모두 미호출.
    expect(scrollIntoViewSpy).not.toHaveBeenCalled();
    expect(routerReplaceMock).not.toHaveBeenCalled();
    expect(rafCalls.length).toBeGreaterThan(0);

    // rAF 콜백 실행 → scrollIntoView 호출됨.
    act(() => {
      rafCalls.forEach((cb) => cb(performance.now()));
    });
    expect(scrollIntoViewSpy).toHaveBeenCalledWith({
      behavior: 'smooth',
      block: 'center',
    });
    expect(routerReplaceMock).toHaveBeenCalledWith('/consultant/projects/p1/roadmap', {
      scroll: false,
    });
  });
});
