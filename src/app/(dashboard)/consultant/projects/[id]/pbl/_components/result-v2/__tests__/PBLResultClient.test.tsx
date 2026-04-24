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
    trainingEnv: '',
    hrdReportPdf: null,
    courseNecessity: '',
  },
  activities: [],
  problems: [],
  priority: { items: [], method: '' },
  target: { name: '', scope: '', necessity: '', details: [] },
  currentAiLevel: { level: 'BASIC', note: '' },
  expectedAiLevel: { level: 'USER', note: '' },
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
      outcome_analysis: createEmptyOutcomeAnalysis(),
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
      />,
    );
    expect(
      screen.getByRole('heading', { name: /AI PBL 과정개발 결과/, level: 1 }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText('PDF 다운로드')).toBeInTheDocument();
    expect(screen.getByLabelText('Excel 다운로드')).toBeInTheDocument();
    expect(screen.getByLabelText('HWPX 다운로드')).toBeInTheDocument();
  });

  it('5탭 (Ⅰ 개요 / Ⅱ 요구분석 / Ⅲ 훈련과제 도출 / Ⅳ 운영계획 / Ⅴ 성과분석) 을 ResultTabs 에 전달', () => {
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
      />,
    );
    expect(screen.getByRole('tab', { name: 'Ⅰ. 개요' })).toBeInTheDocument();
    expect(
      screen.getByRole('tab', { name: 'Ⅱ. 요구분석' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('tab', { name: 'Ⅲ. 훈련과제 도출' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Ⅳ. 운영계획' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Ⅴ. 성과분석' })).toBeInTheDocument();
    // 탭은 정확히 5개
    expect(screen.getAllByRole('tab')).toHaveLength(5);
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
      />,
    );
    expect(
      screen.getByText(/아직 생성된 PBL 보고서가 없습니다/),
    ).toBeInTheDocument();
    expect(screen.queryByRole('tab', { name: 'Ⅰ. 개요' })).toBeNull();
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
      />,
    );
    expect(
      screen.getByRole('heading', { name: 'AI 로드맵 생성 중' }),
    ).toBeInTheDocument();
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
      />,
    );
    const badgeCandidates = screen.getAllByText(/v3/);
    expect(badgeCandidates.length).toBeGreaterThan(0);
  });

  it('제외 라벨 ("결과물 표지" / "결과보고서" / "수행일지" / "고정 양식·결과 화면 제외" / "Ⅳ-4-나" / "결과평가") 를 렌더하지 않음', () => {
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
      />,
    );
    const text = container.textContent ?? '';
    expect(text).not.toContain('결과물 표지');
    expect(text).not.toContain('결과보고서');
    expect(text).not.toContain('수행일지');
    expect(text).not.toContain('고정 양식·결과 화면 제외');
    expect(text).not.toContain('Ⅳ-4-나');
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
      />,
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
      />,
    );
    // "새 버전 생성" 아코디언 트리거 버튼이 존재하지 않아야 함
    expect(screen.queryByRole('button', { name: /새 버전 생성/ })).toBeNull();
  });

  it('role="OPS" 일 때 DRAFT 상태에서도 InlineEditField 가 편집 가능 상태가 아니다 (readOnly)', () => {
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
      />,
    );
    // InlineEditField 의 편집 아이콘(연필 버튼) 이 Ops 에는 전혀 없어야 함
    const editButtons = container.querySelectorAll('button[aria-label*="편집"]');
    expect(editButtons.length).toBe(0);
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
      />,
    );
    expect(
      screen.queryByRole('heading', { name: 'AI 로드맵 생성 중' }),
    ).toBeNull();
  });
});

