import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  extractLinkedRoadmapSummary,
  fetchLinkedRoadmapData,
  hydrateRoadmapInterview,
  mergeRoadmapOverrides,
} from './pbl-roadmap-link';
import { createAdminClient } from '@/lib/supabase/admin';
import type { RoadmapInterviewStrict } from '@/lib/schemas/interview-roadmap';

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

describe('extractLinkedRoadmapSummary', () => {
  it('연계 로드맵 없음(roadmap null) → 빈 문자열', () => {
    expect(extractLinkedRoadmapSummary({ roadmap: null, interview: null })).toBe('');
  });

  it('FINAL 로드맵의 outcome_summary.main_content 를 요약으로 추출', () => {
    const linked = {
      roadmap: { pbl_course: { outcome_summary: { main_content: '로드맵 수립 결과 요약' } } },
      interview: null,
    } as never;
    expect(extractLinkedRoadmapSummary(linked)).toBe('로드맵 수립 결과 요약');
  });

  it('main_content 비면 로드맵 인터뷰 overview.roadmap_summary 로 폴백', () => {
    const linked = {
      roadmap: { pbl_course: { outcome_summary: {} } },
      interview: { company_details: { roadmap_overview: { roadmap_summary: '폴백 요약' } } },
    } as never;
    expect(extractLinkedRoadmapSummary(linked)).toBe('폴백 요약');
  });
});

// ============================================================================
// mergeRoadmapOverrides — Ⅱ장 "불러오기 + PBL 수정 가능"
// ============================================================================

describe('mergeRoadmapOverrides', () => {
  const linked: Partial<RoadmapInterviewStrict> = {
    establishmentNecessity: '로드맵 수립 배경',
    aiLevel: 'INTERMEDIATE',
    selectedTask: '로드맵 선정 과업',
    companyRequirements: {
      status: '로드맵 현황',
      problem: '로드맵 문제',
      will: '로드맵 의지',
      outcomes: '로드맵 성과',
    },
    taskAnalysis: [
      { domain: '품질', task: '외관검사', asIs: '육안', improvement: 'AI 비전' },
      { domain: '생산', task: '설비점검', asIs: '수기', improvement: '센서' },
    ],
    targetTask: {
      name: '로드맵 과업명',
      reason: '로드맵 사유',
      expectedAsIs: '로드맵 현행',
      expectedToBe: '로드맵 개선',
    },
    performanceActivities: [
      {
        round: 1,
        date: '26.04.01',
        timeRange: '10:00~12:00',
        content: '로드맵 킥오프',
        method: 'ONSITE',
        pmName: '로드맵PM',
        expertName: '로드맵전문가',
      },
    ],
  };

  it('override 미설정 시 로드맵 값을 그대로 반환한다', () => {
    const merged = mergeRoadmapOverrides(linked, undefined);
    expect(merged).toEqual(linked);
  });

  it('override 빈 객체도 로드맵 값을 그대로 반환한다', () => {
    const merged = mergeRoadmapOverrides(linked, {});
    expect(merged?.establishmentNecessity).toBe('로드맵 수립 배경');
    expect(merged?.companyRequirements?.status).toBe('로드맵 현황');
  });

  it('설정된 필드만 override 되고 나머지는 로드맵 값을 유지한다', () => {
    const merged = mergeRoadmapOverrides(linked, {
      establishmentNecessity: 'PBL 에서 보정한 배경',
      selectedTask: 'PBL 선정 과업',
    });
    expect(merged?.establishmentNecessity).toBe('PBL 에서 보정한 배경');
    expect(merged?.selectedTask).toBe('PBL 선정 과업');
    // 미설정 필드는 로드맵 값 유지
    expect(merged?.aiLevel).toBe('INTERMEDIATE');
    expect(merged?.companyRequirements?.problem).toBe('로드맵 문제');
  });

  it('companyRequirements 는 필드 단위로 부분 병합된다', () => {
    const merged = mergeRoadmapOverrides(linked, {
      companyRequirements: { problem: 'PBL 시점 문제 재정의' },
    });
    expect(merged?.companyRequirements?.problem).toBe('PBL 시점 문제 재정의');
    expect(merged?.companyRequirements?.status).toBe('로드맵 현황');
    expect(merged?.companyRequirements?.will).toBe('로드맵 의지');
  });

  it('targetTask 도 필드 단위로 부분 병합된다', () => {
    const merged = mergeRoadmapOverrides(linked, {
      targetTask: { reason: 'PBL 재작성 사유' },
    });
    expect(merged?.targetTask?.reason).toBe('PBL 재작성 사유');
    expect(merged?.targetTask?.name).toBe('로드맵 과업명');
  });

  it('taskAnalysis 는 행·셀 단위로 부분 병합된다 (미지정 행·셀은 로드맵 값)', () => {
    const merged = mergeRoadmapOverrides(linked, {
      taskAnalysis: [{ improvement: 'PBL 보정 개선점' }],
    });
    expect(merged?.taskAnalysis?.[0].improvement).toBe('PBL 보정 개선점');
    // 같은 행의 다른 셀은 로드맵 값
    expect(merged?.taskAnalysis?.[0].domain).toBe('품질');
    // 두 번째 행은 손대지 않았으므로 전부 로드맵 값
    expect(merged?.taskAnalysis?.[1]).toEqual({
      domain: '생산',
      task: '설비점검',
      asIs: '수기',
      improvement: '센서',
    });
  });

  it('주요 활동(performanceActivities)은 override 대상이 아니다 — 로드맵 값 고정', () => {
    const merged = mergeRoadmapOverrides(linked, {
      establishmentNecessity: '보정',
    });
    expect(merged?.performanceActivities?.[0].pmName).toBe('로드맵PM');
    expect(merged?.performanceActivities?.[0].date).toBe('26.04.01');
  });

  it('미연계(linked=null) 면 override 가 있어도 null 을 반환한다', () => {
    expect(mergeRoadmapOverrides(null, { establishmentNecessity: 'x' })).toBeNull();
  });

  it('로드맵 원본 객체를 변형하지 않는다 (순수 함수)', () => {
    const before = JSON.stringify(linked);
    mergeRoadmapOverrides(linked, {
      establishmentNecessity: '보정',
      companyRequirements: { status: '보정' },
      taskAnalysis: [{ domain: '보정' }],
    });
    expect(JSON.stringify(linked)).toBe(before);
  });
});
