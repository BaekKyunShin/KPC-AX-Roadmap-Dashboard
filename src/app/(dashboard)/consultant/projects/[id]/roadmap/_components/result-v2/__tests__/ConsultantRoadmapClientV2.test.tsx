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

import { ConsultantRoadmapClientV2 } from '../ConsultantRoadmapClientV2';
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

describe('ConsultantRoadmapClientV2', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('PageHeader + VersionSelector + DownloadButtonGroup 을 상단에 렌더', () => {
    render(
      <ConsultantRoadmapClientV2
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
      <ConsultantRoadmapClientV2
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
    // 탭 버튼 (ResultTabs TabsTrigger)
    expect(
      screen.getByRole('tab', { name: 'Ⅰ. 개요' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('tab', { name: 'Ⅱ. 요구분석' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('tab', { name: 'Ⅲ. 훈련체계' }),
    ).toBeInTheDocument();
  });

  it('선택 버전 없으면 EmptyState 렌더 (탭 영역 대신)', () => {
    render(
      <ConsultantRoadmapClientV2
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
    // 탭은 렌더되지 않음
    expect(screen.queryByRole('tab', { name: 'Ⅰ. 개요' })).toBeNull();
  });

  it('DRAFT 상태에서 RegenerateAccordion 을 통해 onGenerate 호출', () => {
    const onGenerate = vi.fn().mockResolvedValue(undefined);
    render(
      <ConsultantRoadmapClientV2
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
    // 아코디언 열기
    fireEvent.click(screen.getByRole('button', { name: /새 버전 생성/ }));
    fireEvent.click(screen.getByRole('button', { name: '생성 시작' }));
    expect(onGenerate).toHaveBeenCalled();
  });

  it('isGenerating=true 시 RoadmapLoadingOverlay 표시', () => {
    render(
      <ConsultantRoadmapClientV2
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

  it('VersionStatusBadge 가 선택 버전 상태 + 번호를 표시 (DRAFT v1)', () => {
    render(
      <ConsultantRoadmapClientV2
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
    // 'v3' 텍스트가 포함된 badge 가 존재해야 함
    const badgeCandidates = screen.getAllByText(/v3/);
    expect(badgeCandidates.length).toBeGreaterThan(0);
  });

  it('제외 라벨 3종 (결과물 표지 / 고정 참고자료 / 고정 양식·결과 화면 제외) 미렌더', () => {
    const { container } = render(
      <ConsultantRoadmapClientV2
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
      <ConsultantRoadmapClientV2
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
