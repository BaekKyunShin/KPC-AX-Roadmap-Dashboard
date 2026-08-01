import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act, render, screen, fireEvent, waitFor } from '@testing-library/react';

// next/navigation — ResultTabs / PBLResultClient 가 useSearchParams / useRouter / usePathname 사용
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
  usePathname: () => '/consultant/projects/p1/pbl',
}));

// ShareToggle — Server Action 의존 모킹 (로드맵 테스트와 동일 패턴).
// track 을 data 속성으로 노출해 **PBL 트랙으로 넘기는지**까지 단언한다.
// 이게 없으면 PBL 화면이 로드맵 액션을 호출해도 테스트가 통과해 버린다.
vi.mock('@/components/gallery/ShareToggle', () => ({
  ShareToggle: ({ roadmapVersionId, track }: { roadmapVersionId: string; track?: string }) => (
    <div data-testid="share-toggle" data-version-id={roadmapVersionId} data-track={track}>
      ShareToggle Mock
    </div>
  ),
}));

import { PBLResultClient } from '../PBLResultClient';
import type { PBLReportRow } from '@/lib/services/pbl/pbl-crud';
import { createEmptyOutcomeAnalysis } from '@/lib/services/pbl/__fixtures__/empty-outcome-analysis';
import type { ResultPBLInterviewSnapshot } from '../types';

const baseInterview: Partial<ResultPBLInterviewSnapshot> = {
  overview: {
    companyName: '테스트기업',
    courseName: 'AI 실무 과정',
    trainingHours: 40,
    trainingTarget: '사무직 20명',
    trainingForm: '집체',
    trainingPeriod: '2026.05',
    businessIssues: 'AI 전환 필요',
  },
  analysis: {
    companyIssues: '',
    organization: { orgTree: [], mainWork: [] },
    trainingEnv: {
      properTrainingHours: '',
      internalPlace: '',
      externalPlace: '',
      internalInstructors: [],
      externalInstructors: [],
      aiInfrastructure: '',
      targetCharacteristics: { career: '', level: '' },
      aiInfraDetail: {
        toolCapacity: 'AVAILABLE' as const,
        networkStatus: 'GOOD' as const,
        pcCount: 0,
      },
      trainingNeedsAnalysis: '',
      expectationAsIs: '',
      expectationToBe: '',
      targetTraineeCount: 0,
      internalInstructorUsage: 'NO' as const,
      internalInstructorPrimary: { name: '', position: '' },
      otherEquipment: '',
    },
    hrdReportPdf: null,
    courseNecessity: '',
  },
  problemDefinitionSheet: { background: '', core: '', scope: '', constraints: '' },
  target: { taskSelections: [], necessity: '', details: [] },
};

function makeVersion(overrides: Partial<PBLReportRow> = {}): PBLReportRow {
  return {
    id: 'v1',
    project_id: 'p1',
    version_number: 1,
    status: 'DRAFT',
    consultant_profile_snapshot: {},
    diagnosis_summary: '',
    pbl_content: {
      operation_plan: {
        training_goal: '',
        outcome_metrics: createEmptyOutcomeAnalysis(),
        ai_tool_usage_plan: [],
        training_plan: {
          overview: { course_name: '', training_period: { start: '', end: '' } },
          learning_group: { instructors: [], trainees: [] },
          subject_profile: {
            course_name: '',
            total_hours: 0,
            training_goals: [],
            ai_tools: [],
            utilized_data: '',
            analysis_method: '',
            training_contents: [],
            total_sum_hours: 0,
          },
          facilities: [],
          training_instructors: [],
        },
        evaluation_plan: {
          course_evaluation: {
            course_name: '',
            evaluation_methods: [],
            evaluation_target: '',
            evaluation_date: '',
            evaluation_criteria: '',
            evaluation_result: '예정',
            performance_checklist: [],
            overall_comment: '',
            evaluation_scale: '',
          },
          result_evaluation: {
            satisfaction_survey: [],
            achievement_survey: [],
            external_expert_survey: [],
            practical_application_survey: [],
          },
        },
      },
    },
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

describe('PBLResultClient — CONSULTANT role', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('PageHeader + VersionSelector + DownloadButtonGroup 을 상단에 렌더', () => {
    render(
      <PBLResultClient
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
      screen.getByRole('heading', { name: /AI PBL 과정개발 결과/, level: 1 })
    ).toBeInTheDocument();
    expect(screen.getByLabelText('PDF 다운로드')).toBeInTheDocument();
    expect(screen.getByLabelText('Excel 다운로드')).toBeInTheDocument();
    expect(screen.getByLabelText('HWPX 다운로드')).toBeInTheDocument();
  });

  it('selectedVersion 이 truthy 면 다운로드 3종이 모두 활성화 (회귀 #이슈3)', () => {
    render(
      <PBLResultClient
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
    expect(screen.getByLabelText('PDF 다운로드')).toBeEnabled();
    expect(screen.getByLabelText('Excel 다운로드')).toBeEnabled();
    expect(screen.getByLabelText('HWPX 다운로드')).toBeEnabled();
  });

  it('OPS 역할에서도 selectedVersion 이 truthy 면 다운로드 3종이 활성화 (회귀 #이슈3)', () => {
    render(
      <PBLResultClient
        role="OPS"
        projectId="p1"
        versions={[makeVersion()]}
        selectedVersion={makeVersion()}
        interview={baseInterview}
        onSelectVersion={vi.fn()}
        onDownload={vi.fn()}
      />
    );
    expect(screen.getByLabelText('PDF 다운로드')).toBeEnabled();
    expect(screen.getByLabelText('Excel 다운로드')).toBeEnabled();
    expect(screen.getByLabelText('HWPX 다운로드')).toBeEnabled();
  });

  it('selectedVersion=null 일 때만 다운로드 3종이 비활성화 (정상 동작 보존)', () => {
    render(
      <PBLResultClient
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
    expect(screen.getByLabelText('PDF 다운로드')).toBeDisabled();
    expect(screen.getByLabelText('Excel 다운로드')).toBeDisabled();
    expect(screen.getByLabelText('HWPX 다운로드')).toBeDisabled();
  });

  it('4탭 (Ⅰ 개요 / Ⅱ 요구분석 / Ⅲ 훈련과제 도출 / Ⅳ 운영계획) 을 ResultTabs 에 전달 — Ⅴ 성과분석 탭 삭제', () => {
    render(
      <PBLResultClient
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
    expect(screen.getByRole('tab', { name: 'Ⅲ. 훈련과제 도출' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Ⅳ. 운영계획' })).toBeInTheDocument();
    // 구 Ⅴ 성과분석 탭은 삭제 (측정지표는 Ⅳ-2 로 이동)
    expect(screen.queryByRole('tab', { name: 'Ⅴ. 성과분석' })).toBeNull();
    // 탭은 정확히 4개
    expect(screen.getAllByRole('tab')).toHaveLength(4);
  });

  it('선택 버전 없으면 EmptyState 렌더 (탭 영역 대신)', () => {
    render(
      <PBLResultClient
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
    expect(screen.getByText(/아직 생성된 PBL 보고서가 없습니다/)).toBeInTheDocument();
    expect(screen.queryByRole('tab', { name: 'Ⅰ. 개요' })).toBeNull();
  });

  // 로드맵 패턴과의 정합 회귀 — 초안 0건 일 때는 상단의 RegenerateAccordion 이
  // 노출되지 않고 EmptyState 의 "AI PBL 보고서 생성" 버튼으로 첫 초안을 만든다.
  it('versions=0 + CONSULTANT → RegenerateAccordion 숨김 + EmptyState 생성 버튼 노출', () => {
    const onGenerate = vi.fn().mockResolvedValue(undefined);
    render(
      <PBLResultClient
        role="CONSULTANT"
        projectId="p1"
        versions={[]}
        selectedVersion={null}
        interview={baseInterview}
        hasInterview={true}
        projectStatus="INTERVIEWED"
        onSelectVersion={vi.fn()}
        onEdit={vi.fn()}
        onGenerate={onGenerate}
        onDownload={vi.fn()}
      />
    );
    expect(screen.queryByRole('button', { name: /새 버전 생성/ })).toBeNull();
    const ctaButton = screen.getByTestId('empty-state-generate-pbl');
    expect(ctaButton).toBeEnabled();
    fireEvent.click(ctaButton);
    expect(onGenerate).toHaveBeenCalled();
  });

  // versions=0 일 때 인터뷰/status 가드가 불충분하면 EmptyState 생성 버튼이 disabled
  it('versions=0 + hasInterview=false → EmptyState 생성 버튼 disabled', () => {
    render(
      <PBLResultClient
        role="CONSULTANT"
        projectId="p1"
        versions={[]}
        selectedVersion={null}
        interview={baseInterview}
        hasInterview={false}
        projectStatus="ASSIGNED"
        onSelectVersion={vi.fn()}
        onEdit={vi.fn()}
        onGenerate={vi.fn()}
        onDownload={vi.fn()}
      />
    );
    expect(screen.getByTestId('empty-state-generate-pbl')).toBeDisabled();
  });

  it('DRAFT 상태에서 RegenerateAccordion 을 통해 onGenerate 호출', () => {
    const onGenerate = vi.fn().mockResolvedValue(undefined);
    render(
      <PBLResultClient
        role="CONSULTANT"
        projectId="p1"
        versions={[makeVersion({ status: 'DRAFT' })]}
        selectedVersion={makeVersion({ status: 'DRAFT' })}
        interview={baseInterview}
        hasInterview={true}
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

  // 토글은 인터뷰/status 가드와 무관하게 평소 활성. 다운로드 중에만 비활성.
  // (인터뷰 미완료 시의 silent fail 차단은 EmptyState 큰 버튼이 담당.)
  it('hasInterview=false / status 미충족 상태에서도 + 새 버전 생성 토글이 enabled', () => {
    render(
      <PBLResultClient
        role="CONSULTANT"
        projectId="p1"
        versions={[makeVersion({ status: 'DRAFT' })]}
        selectedVersion={makeVersion({ status: 'DRAFT' })}
        interview={baseInterview}
        hasInterview={false}
        projectStatus="ASSIGNED"
        onSelectVersion={vi.fn()}
        onEdit={vi.fn()}
        onGenerate={vi.fn()}
        onDownload={vi.fn()}
      />
    );
    const accordionTrigger = screen.getByRole('button', { name: /새 버전 생성/ });
    expect(accordionTrigger).toBeEnabled();
  });

  it('isGenerating=true 시 RoadmapLoadingOverlay 표시', () => {
    render(
      <PBLResultClient
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
      <PBLResultClient
        role="CONSULTANT"
        projectId="p1"
        versions={[makeVersion({ status: 'DRAFT', version_number: 3 })]}
        selectedVersion={makeVersion({ status: 'DRAFT', version_number: 3 })}
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

  it('제외 라벨 ("결과물 표지" / "결과보고서" / "수행일지" / "고정 양식·결과 화면 제외" / "Ⅳ-5-나" / "결과평가") 를 렌더하지 않음', () => {
    const { container } = render(
      <PBLResultClient
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
    expect(text).not.toContain('결과보고서');
    expect(text).not.toContain('수행일지');
    expect(text).not.toContain('고정 양식·결과 화면 제외');
    expect(text).not.toContain('Ⅳ-5-나');
    expect(text).not.toContain('결과평가');
  });

  it('PDF 다운로드 클릭 시 onDownload("PDF") 호출', async () => {
    const onDownload = vi.fn().mockResolvedValue(undefined);
    render(
      <PBLResultClient
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

describe('PBLResultClient — OPS role', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('role="OPS" 일 때 RegenerateAccordion 이 렌더되지 않는다', () => {
    render(
      <PBLResultClient
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
      <PBLResultClient
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
    // 탭 본문은 코드 분할(next/dynamic)돼 있어 첫 렌더가 스켈레톤이다.
    // 본문이 실제로 렌더된 뒤에 단언해야 "편집 불가"가 공허하게 참이 되지 않는다.
    expect(await screen.findByText('Ⅰ. 훈련과정 개요')).toBeInTheDocument();

    // InlineEditField 는 readOnly 일 때 role="button"·tabIndex 를 부여하지 않는다
    // (InlineEditField.tsx:209-222). Ops 에는 편집 가능한 필드가 하나도 없어야 한다.
    const editableFields = container.querySelectorAll('[data-saving-state][role="button"]');
    expect(editableFields.length).toBe(0);
  });

  it('role="CONSULTANT" + DRAFT 에서는 InlineEditField 가 편집 가능하다 (위 readOnly 단언의 대조군)', async () => {
    const { container } = render(
      <PBLResultClient
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
    expect(await screen.findByText('Ⅰ. 훈련과정 개요')).toBeInTheDocument();

    const editableFields = container.querySelectorAll('[data-saving-state][role="button"]');
    expect(editableFields.length).toBeGreaterThan(0);
  });

  it('role="OPS" 일 때 isGenerating=true 여도 LoadingOverlay 가 렌더되지 않는다', () => {
    render(
      <PBLResultClient
        role="OPS"
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
    expect(screen.queryByRole('heading', { name: 'AI 로드맵 생성 중' })).toBeNull();
  });

  // PR5 (R6) — FINAL in-place 수정 안내 배너 분기 커버
  it('CONSULTANT + FINAL 상태에서 PBL FINAL 안내 배너 노출', () => {
    render(
      <PBLResultClient
        role="CONSULTANT"
        projectId="p1"
        versions={[makeVersion({ status: 'FINAL', version_number: 2 })]}
        selectedVersion={makeVersion({ status: 'FINAL', version_number: 2 })}
        interview={baseInterview}
        onSelectVersion={vi.fn()}
        onEdit={vi.fn()}
        onGenerate={vi.fn()}
        onDownload={vi.fn()}
      />
    );
    expect(screen.getByTestId('pbl-final-edit-warning-banner')).toBeInTheDocument();
  });

  it('CONSULTANT + DRAFT 상태에서는 PBL FINAL 배너 미노출', () => {
    render(
      <PBLResultClient
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
    expect(screen.queryByTestId('pbl-final-edit-warning-banner')).not.toBeInTheDocument();
  });

  it('OPS + FINAL 상태 — PBL FINAL 배너 미노출 (canEdit=false)', () => {
    render(
      <PBLResultClient
        role="OPS"
        projectId="p1"
        versions={[makeVersion({ status: 'FINAL' })]}
        selectedVersion={makeVersion({ status: 'FINAL' })}
        interview={baseInterview}
        onSelectVersion={vi.fn()}
        onDownload={vi.fn()}
      />
    );
    expect(screen.queryByTestId('pbl-final-edit-warning-banner')).not.toBeInTheDocument();
  });
});

// 다운로드 진행 중 '+ 새 버전 생성' 토글 비활성화 회귀 가드 (RoadmapResultClient 와 동일).
describe('PBLResultClient — 다운로드 진행 중 + 새 버전 생성 토글 비활성화', () => {
  beforeEach(() => {
    vi.clearAllMocks();
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
      <PBLResultClient
        role="CONSULTANT"
        projectId="p1"
        versions={[makeVersion({ status: 'DRAFT' })]}
        selectedVersion={makeVersion({ status: 'DRAFT' })}
        interview={baseInterview}
        hasInterview={true}
        projectStatus="INTERVIEWED"
        onSelectVersion={vi.fn()}
        onEdit={vi.fn()}
        onGenerate={vi.fn()}
        onDownload={slowDownload}
      />
    );

    expect(screen.getByRole('button', { name: /새 버전 생성/ })).toBeEnabled();

    await act(async () => {
      fireEvent.click(screen.getByLabelText('HWPX 다운로드'));
    });

    expect(slowDownload).toHaveBeenCalledWith('HWPX');
    expect(screen.getByRole('button', { name: /새 버전 생성/ })).toBeDisabled();

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
      <PBLResultClient
        role="CONSULTANT"
        projectId="p1"
        versions={[makeVersion({ status: 'DRAFT' })]}
        selectedVersion={makeVersion({ status: 'DRAFT' })}
        interview={baseInterview}
        hasInterview={true}
        projectStatus="INTERVIEWED"
        onSelectVersion={vi.fn()}
        onEdit={vi.fn()}
        onGenerate={vi.fn()}
        onDownload={slowDownload}
      />
    );

    await act(async () => {
      fireEvent.click(screen.getByLabelText('Excel 다운로드'));
    });
    expect(screen.getByRole('button', { name: /새 버전 생성/ })).toBeDisabled();

    await act(async () => {
      resolveDownload();
    });
    await waitFor(() => expect(screen.getByRole('button', { name: /새 버전 생성/ })).toBeEnabled());
  });
});

// PBL 결과 페이지 "최종 확정" 버튼 — 로드맵 RoadmapResultClient 패턴 이식.
// DRAFT 상태 + CONSULTANT + onFinalize 제공 시에만 노출. 클릭 → AlertDialog → 확정.
describe('PBLResultClient — 행정 종결(projectClosed)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('종결 시 배너·종결 배지 표시 + DRAFT여도 최종 확정 버튼 숨김', () => {
    render(
      <PBLResultClient
        role="CONSULTANT"
        projectId="p1"
        versions={[makeVersion({ status: 'DRAFT' })]}
        selectedVersion={makeVersion({ status: 'DRAFT' })}
        interview={baseInterview}
        projectClosed
        onSelectVersion={vi.fn()}
        onEdit={vi.fn()}
        onGenerate={vi.fn()}
        onFinalize={vi.fn()}
        onDownload={vi.fn()}
      />
    );
    expect(screen.getByTestId('pbl-project-closed-banner')).toBeInTheDocument();
    expect(screen.getByText('종결')).toBeInTheDocument();
    expect(screen.queryByTestId('finalize-pbl-button')).toBeNull();
  });

  it('종결 + 버전 0개 → EmptyState에 종결 안내 표시 (생성 버튼 없음)', () => {
    render(
      <PBLResultClient
        role="CONSULTANT"
        projectId="p1"
        versions={[]}
        selectedVersion={null}
        interview={baseInterview}
        hasInterview
        projectStatus="FINALIZED"
        projectClosed
        onSelectVersion={vi.fn()}
        onEdit={vi.fn()}
        onGenerate={vi.fn()}
        onDownload={vi.fn()}
      />
    );
    expect(screen.getByText(/새 PBL 보고서를 생성할 수 없습니다/)).toBeInTheDocument();
    expect(screen.queryByTestId('empty-state-generate-pbl')).toBeNull();
  });

  it('미종결(기본값)이면 종결 배너를 표시하지 않는다', () => {
    render(
      <PBLResultClient
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
    expect(screen.queryByTestId('pbl-project-closed-banner')).toBeNull();
  });
});

describe('PBLResultClient — 최종 확정 버튼', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('CONSULTANT + DRAFT + onFinalize 제공 시 "최종 확정" 버튼 노출', () => {
    render(
      <PBLResultClient
        role="CONSULTANT"
        projectId="p1"
        versions={[makeVersion({ status: 'DRAFT' })]}
        selectedVersion={makeVersion({ status: 'DRAFT' })}
        interview={baseInterview}
        onSelectVersion={vi.fn()}
        onEdit={vi.fn()}
        onGenerate={vi.fn()}
        onFinalize={vi.fn()}
        onDownload={vi.fn()}
      />
    );
    expect(screen.getByTestId('finalize-pbl-button')).toBeInTheDocument();
  });

  it('CONSULTANT + FINAL 상태 → 최종 확정 버튼 미노출', () => {
    render(
      <PBLResultClient
        role="CONSULTANT"
        projectId="p1"
        versions={[makeVersion({ status: 'FINAL' })]}
        selectedVersion={makeVersion({ status: 'FINAL' })}
        interview={baseInterview}
        onSelectVersion={vi.fn()}
        onEdit={vi.fn()}
        onGenerate={vi.fn()}
        onFinalize={vi.fn()}
        onDownload={vi.fn()}
      />
    );
    expect(screen.queryByTestId('finalize-pbl-button')).not.toBeInTheDocument();
  });

  it('CONSULTANT + ARCHIVED 상태 → 최종 확정 버튼 미노출', () => {
    render(
      <PBLResultClient
        role="CONSULTANT"
        projectId="p1"
        versions={[makeVersion({ status: 'ARCHIVED' })]}
        selectedVersion={makeVersion({ status: 'ARCHIVED' })}
        interview={baseInterview}
        onSelectVersion={vi.fn()}
        onEdit={vi.fn()}
        onGenerate={vi.fn()}
        onFinalize={vi.fn()}
        onDownload={vi.fn()}
      />
    );
    expect(screen.queryByTestId('finalize-pbl-button')).not.toBeInTheDocument();
  });

  it('onFinalize 미제공 시 최종 확정 버튼 미노출 (옵셔널 prop 안전성)', () => {
    render(
      <PBLResultClient
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
    expect(screen.queryByTestId('finalize-pbl-button')).not.toBeInTheDocument();
  });

  it('OPS 역할 + DRAFT → 최종 확정 버튼 미노출 (canEdit=false)', () => {
    render(
      <PBLResultClient
        role="OPS"
        projectId="p1"
        versions={[makeVersion({ status: 'DRAFT' })]}
        selectedVersion={makeVersion({ status: 'DRAFT' })}
        interview={baseInterview}
        onSelectVersion={vi.fn()}
        onFinalize={vi.fn()}
        onDownload={vi.fn()}
      />
    );
    expect(screen.queryByTestId('finalize-pbl-button')).not.toBeInTheDocument();
  });

  it('최종 확정 버튼 클릭 → AlertDialog 노출 → "최종 확정" Action 클릭 시 onFinalize(versionId) 호출', async () => {
    const onFinalize = vi.fn().mockResolvedValue(undefined);
    const version = makeVersion({ status: 'DRAFT', id: 'pbl-99' });
    render(
      <PBLResultClient
        role="CONSULTANT"
        projectId="p1"
        versions={[version]}
        selectedVersion={version}
        interview={baseInterview}
        onSelectVersion={vi.fn()}
        onEdit={vi.fn()}
        onGenerate={vi.fn()}
        onFinalize={onFinalize}
        onDownload={vi.fn()}
      />
    );

    fireEvent.click(screen.getByTestId('finalize-pbl-button'));
    const dialog = await screen.findByRole('alertdialog');
    expect(dialog).toBeInTheDocument();
    expect(dialog.textContent).toMatch(/최종 확정/);

    await act(async () => {
      // AlertDialog 안 "최종 확정" 버튼 (외부 트리거 testid 와 구분되는 dialog 내부 액션)
      fireEvent.click(screen.getByRole('button', { name: '최종 확정' }));
    });

    expect(onFinalize).toHaveBeenCalledWith('pbl-99');
  });

  it('최종 확정 버튼 클릭 → "취소" 클릭 시 onFinalize 미호출', async () => {
    const onFinalize = vi.fn().mockResolvedValue(undefined);
    render(
      <PBLResultClient
        role="CONSULTANT"
        projectId="p1"
        versions={[makeVersion({ status: 'DRAFT' })]}
        selectedVersion={makeVersion({ status: 'DRAFT' })}
        interview={baseInterview}
        onSelectVersion={vi.fn()}
        onEdit={vi.fn()}
        onGenerate={vi.fn()}
        onFinalize={onFinalize}
        onDownload={vi.fn()}
      />
    );

    fireEvent.click(screen.getByTestId('finalize-pbl-button'));
    await screen.findByRole('alertdialog');

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: '취소' }));
    });

    expect(onFinalize).not.toHaveBeenCalled();
  });
});

// M-2 (PR3) — ?regenerate=open 진입 시 scrollIntoView 가 페인트 직후 실행되도록
// requestAnimationFrame 콜백 안에서 호출됨을 검증.
describe('PBLResultClient — ?regenerate=open scroll timing (M-2)', () => {
  let scrollIntoViewSpy: ReturnType<typeof vi.fn>;
  let originalScrollIntoView: PropertyDescriptor | undefined;
  let originalRAF: typeof window.requestAnimationFrame;

  beforeEach(() => {
    vi.clearAllMocks();
    searchParamsMock.mockReturnValue(new URLSearchParams('regenerate=open'));

    scrollIntoViewSpy = vi.fn();
    originalScrollIntoView = Object.getOwnPropertyDescriptor(Element.prototype, 'scrollIntoView');
    Object.defineProperty(Element.prototype, 'scrollIntoView', {
      configurable: true,
      writable: true,
      value: scrollIntoViewSpy,
    });

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
    const rafCalls: FrameRequestCallback[] = [];
    window.requestAnimationFrame = ((cb: FrameRequestCallback) => {
      rafCalls.push(cb);
      return rafCalls.length;
    }) as typeof window.requestAnimationFrame;

    render(
      <PBLResultClient
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

    expect(scrollIntoViewSpy).not.toHaveBeenCalled();
    expect(routerReplaceMock).not.toHaveBeenCalled();
    expect(rafCalls.length).toBeGreaterThan(0);

    act(() => {
      rafCalls.forEach((cb) => cb(performance.now()));
    });
    expect(scrollIntoViewSpy).toHaveBeenCalledWith({
      behavior: 'smooth',
      block: 'center',
    });
    expect(routerReplaceMock).toHaveBeenCalledWith('/consultant/projects/p1/pbl', {
      scroll: false,
    });
  });
});

/**
 * #011 — PBL 결과 화면 갤러리 공유.
 *
 * 서버 액션(`togglePBLShare`)·DB 컬럼(`is_shared`)·갤러리 PBL 카드는 이미 있었고
 * 화면만 없었다. 로드맵(`RoadmapResultClient`)과 **동일한 규칙**을 적용한다:
 * FINAL 버전에서만, 컨설턴트는 토글 / Ops 는 읽기 전용 배지.
 */
describe('PBLResultClient — 갤러리 공유 (#011)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('role="CONSULTANT" + FINAL 이면 공유 토글이 PBL 트랙으로 노출된다', () => {
    render(
      <PBLResultClient
        role="CONSULTANT"
        projectId="p1"
        versions={[makeVersion({ id: 'pbl-9', status: 'FINAL' })]}
        selectedVersion={makeVersion({ id: 'pbl-9', status: 'FINAL' })}
        interview={baseInterview}
        onSelectVersion={vi.fn()}
        onEdit={vi.fn()}
        onGenerate={vi.fn()}
        onDownload={vi.fn()}
      />
    );

    const toggle = screen.getByTestId('share-toggle');
    expect(toggle).toBeInTheDocument();
    // 로드맵 액션을 타면 서버에서 "보고서를 찾을 수 없다"로 실패한다 — 트랙 단언이 핵심.
    expect(toggle).toHaveAttribute('data-track', 'PBL');
    expect(toggle).toHaveAttribute('data-version-id', 'pbl-9');
  });

  it('DRAFT 상태에서는 공유 토글도 배지도 노출되지 않는다 (서버 가드와 동일 조건)', () => {
    render(
      <PBLResultClient
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

  it('role="OPS" + FINAL 은 읽기 전용 배지만 보고 토글은 볼 수 없다', () => {
    render(
      <PBLResultClient
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
    expect(screen.queryByTestId('share-toggle')).toBeNull();
  });

  it('role="OPS" + FINAL + is_shared=false 이면 "갤러리 미공유" 배지를 노출한다', () => {
    render(
      <PBLResultClient
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
});
