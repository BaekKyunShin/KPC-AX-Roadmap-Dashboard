import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fetchLinkedRoadmapData, hydrateRoadmapInterview } from './pbl-roadmap-link';
import { createAdminClient } from '@/lib/supabase/admin';

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: vi.fn(),
}));

// ============================================================================
// 모킹 헬퍼 — 테이블별 maybeSingle 결과를 주입하는 최소 Supabase 체인
//   projects        : select → eq → maybeSingle
//   roadmap_versions: select → eq → eq → order → limit → maybeSingle (getLatestFinalRoadmap)
//   interviews      : select → eq → maybeSingle
// ============================================================================

interface TableData {
  project?: unknown;
  roadmapVersion?: unknown;
  interview?: unknown;
}

function buildClient(data: TableData) {
  const fromCalls: string[] = [];
  const client = {
    from: vi.fn((table: string) => {
      fromCalls.push(table);
      if (table === 'projects') {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: vi.fn().mockResolvedValue({ data: data.project ?? null, error: null }),
            }),
          }),
        };
      }
      if (table === 'roadmap_versions') {
        return {
          select: () => ({
            eq: () => ({
              eq: () => ({
                order: () => ({
                  limit: () => ({
                    maybeSingle: vi
                      .fn()
                      .mockResolvedValue({ data: data.roadmapVersion ?? null, error: null }),
                  }),
                }),
              }),
            }),
          }),
        };
      }
      if (table === 'interviews') {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: vi.fn().mockResolvedValue({ data: data.interview ?? null, error: null }),
            }),
          }),
        };
      }
      throw new Error(`Unexpected from: ${table}`);
    }),
  };
  return { client, fromCalls };
}

describe('fetchLinkedRoadmapData', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('roadmap_project_id가 없으면(미연계) {roadmap:null, interview:null}을 반환하고 로드맵/인터뷰 조회를 하지 않는다', async () => {
    const { client, fromCalls } = buildClient({
      project: { id: 'pbl-1', roadmap_project_id: null },
    });

    const result = await fetchLinkedRoadmapData('pbl-1', client as never);

    expect(result).toEqual({ roadmap: null, interview: null });
    expect(fromCalls).toEqual(['projects']); // roadmap_versions/interviews 미조회
  });

  it('PBL 프로젝트가 존재하지 않으면 {null, null}', async () => {
    const { client } = buildClient({ project: null });
    const result = await fetchLinkedRoadmapData('pbl-missing', client as never);
    expect(result).toEqual({ roadmap: null, interview: null });
  });

  it('자기 자신을 참조하면(방어) {null, null} — 로드맵/인터뷰 조회 안 함', async () => {
    const { client, fromCalls } = buildClient({
      project: { id: 'pbl-1', roadmap_project_id: 'pbl-1' },
    });

    const result = await fetchLinkedRoadmapData('pbl-1', client as never);

    expect(result).toEqual({ roadmap: null, interview: null });
    expect(fromCalls).toEqual(['projects']);
  });

  it('연계 + FINAL 로드맵 존재 시 FINAL 버전과 로드맵 인터뷰를 함께 반환', async () => {
    const { client } = buildClient({
      project: { id: 'pbl-1', roadmap_project_id: 'rm-9' },
      roadmapVersion: { id: 'rv-1', project_id: 'rm-9', status: 'FINAL', version_number: 2 },
      interview: { id: 'iv-1', project_id: 'rm-9', company_details: { name: 'A' } },
    });

    const result = await fetchLinkedRoadmapData('pbl-1', client as never);

    expect(result.roadmap?.status).toBe('FINAL');
    expect(result.roadmap?.id).toBe('rv-1');
    expect(result.interview?.id).toBe('iv-1');
  });

  it('연계됐으나 FINAL 로드맵이 없으면 roadmap은 null, 인터뷰는 존재 시 반환', async () => {
    const { client } = buildClient({
      project: { id: 'pbl-1', roadmap_project_id: 'rm-9' },
      roadmapVersion: null, // FINAL 필터 결과 없음 (DRAFT만 존재)
      interview: { id: 'iv-1', project_id: 'rm-9' },
    });

    const result = await fetchLinkedRoadmapData('pbl-1', client as never);

    expect(result.roadmap).toBeNull();
    expect(result.interview?.id).toBe('iv-1');
  });

  it('supabase 인자를 생략하면 createAdminClient를 사용한다', async () => {
    const { client } = buildClient({ project: { id: 'pbl-1', roadmap_project_id: null } });
    vi.mocked(createAdminClient).mockReturnValue(client as never);

    const result = await fetchLinkedRoadmapData('pbl-1');

    expect(createAdminClient).toHaveBeenCalledTimes(1);
    expect(result).toEqual({ roadmap: null, interview: null });
  });
});

describe('hydrateRoadmapInterview', () => {
  it('null 행 → null (미연계 폴백)', () => {
    expect(hydrateRoadmapInterview(null)).toBeNull();
  });

  it('로드맵 인터뷰 원시 행을 camelCase 도메인 형태로 복원 (수립 배경)', () => {
    const row = {
      id: 'iv-1',
      project_id: 'rm-9',
      company_details: {
        roadmap_overview: {
          establishment_necessity: '수립 배경 텍스트',
          performance_activities: [],
        },
      },
      job_tasks: [],
      improvement_goals: [],
      stt_insights: null,
    };

    const result = hydrateRoadmapInterview(row);

    expect(result?.establishmentNecessity).toBe('수립 배경 텍스트');
  });
});
