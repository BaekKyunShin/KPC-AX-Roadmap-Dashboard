import type { SupabaseClient } from '@supabase/supabase-js';
import { createAdminClient } from '@/lib/supabase/admin';
import { getLatestFinalRoadmap, type RoadmapVersionRow } from '../roadmap/roadmap-crud';
import { mapDbToRoadmapInterview } from '../interview/converters';
import type { RoadmapInterviewStrict } from '@/lib/schemas/interview-roadmap';

/** 로드맵 프로젝트 인터뷰 원시 행 (PBL Ⅱ장 자동 연계에 필요한 컬럼만) */
export interface RoadmapInterviewRow {
  id: string;
  project_id: string;
  company_details: unknown;
  job_tasks: unknown;
  improvement_goals: unknown;
  stt_insights: unknown;
}

const ROADMAP_INTERVIEW_COLUMNS =
  'id, project_id, company_details, job_tasks, improvement_goals, stt_insights';

/** PBL 프로젝트에 연계된 선행 로드맵 데이터 */
export interface LinkedRoadmapData {
  /** 선행 로드맵의 최신 FINAL 버전 (미연계·미확정 시 null) */
  roadmap: RoadmapVersionRow | null;
  /** 선행 로드맵 프로젝트의 인터뷰 원시 행 (없으면 null) */
  interview: RoadmapInterviewRow | null;
}

/**
 * PBL 프로젝트의 선행 로드맵 연계 데이터를 조회한다.
 *
 * 신규 PBL 양식은 Ⅱ장(로드맵 수립·요구분석)을 선행 로드맵 보고서에서 자동 연계한다.
 * 연결은 `projects.roadmap_project_id`(자기참조 FK)로 성립하며, 미연계·자기참조·FINAL 부재는
 * 모두 정상 폴백(null)으로 처리한다(오류 아님 → PBL 결과 Ⅱ장이 빈 양식으로 출력).
 *
 * 서버 전용 모듈 — admin 클라이언트로 다른 프로젝트를 조회하므로 index.ts에 re-export 하지 않는다.
 */
export async function fetchLinkedRoadmapData(
  pblProjectId: string,
  supabase?: SupabaseClient
): Promise<LinkedRoadmapData> {
  const client = supabase ?? createAdminClient();

  // 1. PBL 프로젝트에서 선행 로드맵 연결 해석
  const { data: pblProject } = await client
    .from('projects')
    .select('id, roadmap_project_id')
    .eq('id', pblProjectId)
    .maybeSingle();

  const roadmapProjectId =
    (pblProject as { roadmap_project_id?: string | null } | null)?.roadmap_project_id ?? null;

  // 2. 미연계 또는 자기참조(방어) → 빈 폴백
  if (!roadmapProjectId || roadmapProjectId === pblProjectId) {
    return { roadmap: null, interview: null };
  }

  // 3. 선행 로드맵의 최신 FINAL 버전
  const roadmap = await getLatestFinalRoadmap(roadmapProjectId, client);

  // 4. 선행 로드맵 프로젝트의 인터뷰 (FINAL 유무와 독립적으로 조회)
  const { data: interview } = await client
    .from('interviews')
    .select(ROADMAP_INTERVIEW_COLUMNS)
    .eq('project_id', roadmapProjectId)
    .maybeSingle();

  return { roadmap, interview: (interview as RoadmapInterviewRow) ?? null };
}

/**
 * 선행 로드맵 인터뷰 원시 행을 camelCase 도메인 형태(RoadmapInterview)로 복원한다.
 *
 * PBL Ⅱ장(수립 배경·주요 활동·수립 결과·요구분석·과업분석표·훈련대상 과업)·Ⅲ-1 수행활동·
 * Ⅲ-3-가 과업 목록은 모두 선행 로드맵 인터뷰에서 자동 연계된다. `fetchLinkedRoadmapData`
 * 의 `interview` 를 그대로 넘기면 `mapDbToRoadmapInterview` 로 복원해 읽기 전용 렌더·
 * HWPX payload 에 흘려보낼 수 있다. 미연계(null) 시 null 을 반환한다(재조회 없는 순수 함수).
 */
export function hydrateRoadmapInterview(
  row: RoadmapInterviewRow | null
): Partial<RoadmapInterviewStrict> | null {
  if (!row) return null;
  return mapDbToRoadmapInterview(row as Parameters<typeof mapDbToRoadmapInterview>[0]);
}
