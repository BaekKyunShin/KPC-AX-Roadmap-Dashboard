import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import { getCachedUser, getCachedProfile } from '@/lib/supabase/cached';
import { createClient } from '@/lib/supabase/server';
import { ClosedBadge } from '@/components/common/ClosedBadge';
import { resolveHrdSignedUrl } from '@/lib/services/storage/hrd-signed-url';
import { fetchPBLInterviewV2, fetchRoadmapInterviewV2 } from './actions';
import {
  fetchLinkedRoadmapData,
  hydrateRoadmapInterview,
} from '@/lib/services/pbl/pbl-roadmap-link';
import { RoadmapInterviewClient } from './_components/roadmap/RoadmapInterviewClient';
import { PBLInterviewClient } from './_components/pbl/PBLInterviewClient';

/**
 * HRD 첨부 버킷 이름 (actions.ts 의 HRD_BUCKET 과 동기화).
 * 서버 컴포넌트에서 DB 에 저장된 `storage_path` 를 1시간짜리 signed URL 로
 * 변환해 Client 에 주입한다. extractedText 는 LLM 전용 내부 필드이므로
 * Client 에는 절대 노출하지 않는다 (DB 영속은 유지).
 */
const HRD_BUCKET = 'interview-attachments';

/**
 * Client 에 전달하기 전에 `hrdReportPdf.url` 을 새 signed URL 로 정규화한다.
 *
 * 공통 헬퍼 `resolveHrdSignedUrl` 위임 — storage_path 든 만료된 signed URL 이든
 * 항상 새 URL 발급. 2026-05-18 회귀 수정: 기존 구현이 `url.startsWith('http')`
 * 시 재발급을 건너뛰어 만료된 JWT 가 iframe 에서 InvalidJWT JSON 으로 노출되는
 * 버그가 있었다.
 */
async function hydrateHrdReportSignedUrl(
  initial: Record<string, unknown>
): Promise<Record<string, unknown>> {
  const hrd = initial.hrdReportPdf as
    | {
        fileName: string;
        url: string;
        size?: number;
        extractedText?: string;
        parseError?: string;
      }
    | null
    | undefined;

  if (!hrd || !hrd.url) return initial;
  const fresh = await resolveHrdSignedUrl(hrd.url, HRD_BUCKET);
  if (!fresh || fresh === hrd.url) return initial;

  return {
    ...initial,
    hrdReportPdf: {
      ...hrd,
      url: fresh,
    },
  };
}

export default async function InterviewPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ track?: string }>;
}) {
  const { id } = await params;
  const sp = (await searchParams) ?? {};

  const user = await getCachedUser();
  if (!user) redirect('/login');

  const profile = await getCachedProfile();
  if (!profile || profile.role !== 'CONSULTANT_APPROVED') {
    redirect('/dashboard');
  }

  // 프로젝트 트랙 조회 — RLS가 배정 컨설턴트만 허용하므로 null이면 권한 없음 or 미존재
  const supabase = await createClient();
  const { data: project } = await supabase
    .from('projects')
    .select('id, track, closed_at')
    .eq('id', id)
    .single();

  if (!project) notFound();

  // 행정 종결 프로젝트 — 편집 클라이언트를 마운트하지 않고 잠금 안내 카드 표시
  // (서버 액션도 차단되지만, 진입 자체를 막아 혼란 방지. 열람은 상세 페이지가 담당)
  if (project.closed_at) {
    return (
      <div className="mx-auto max-w-2xl py-12">
        <div className="flex flex-col items-center gap-4 rounded-lg border border-slate-200 bg-slate-50 px-6 py-10 text-center">
          <ClosedBadge />
          <div className="space-y-1">
            <h1 className="text-lg font-semibold text-gray-900">종결된 프로젝트입니다</h1>
            <p className="text-sm text-gray-600">
              운영관리자가 종결 처리하여 인터뷰를 수정할 수 없습니다. 산출물 열람과 내보내기는 계속
              가능합니다.
            </p>
          </div>
          <Link
            href={`/consultant/projects/${id}`}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700"
          >
            프로젝트 상세로 돌아가기
          </Link>
        </div>
      </div>
    );
  }

  // PBL 트랙 — V2 Client (camelCase 스키마 + 10 스텝[양식 9 + STT 첨부 1] + 자동저장)
  // `?track=PBL` 쿼리가 있을 때도 동일 경로. `fetchPBLInterviewV2` 가 DB pbl_data
  // 를 camelCase Partial 로 반환 → signed URL hydration 후 Client 에 주입.
  if (project.track === 'PBL' || sp.track === 'PBL') {
    const rawPbl = (await fetchPBLInterviewV2(project.id)) ?? {};
    const hydratedPbl = await hydrateHrdReportSignedUrl(rawPbl as Record<string, unknown>);
    // Ⅲ-3-가 훈련대상 업무 — 선행 로드맵 과업 목록을 읽기 전용으로 연계.
    // 미연계 시 빈 배열 → StepTarget 이 "선행 로드맵 과업 미연결" 안내를 표시.
    const linked = await fetchLinkedRoadmapData(project.id);
    const roadmapTasks = hydrateRoadmapInterview(linked.interview)?.taskAnalysis ?? [];
    return (
      <PBLInterviewClient
        projectId={project.id}
        initial={hydratedPbl as Parameters<typeof PBLInterviewClient>[0]['initial']}
        roadmapTasks={roadmapTasks}
      />
    );
  }

  // 로드맵 트랙 — V2 Client (camelCase 스키마 + 9 스텝[양식 8 + STT 첨부 1] + 자동저장)
  const raw = (await fetchRoadmapInterviewV2(project.id)) ?? {};
  const hydrated = await hydrateHrdReportSignedUrl(raw as Record<string, unknown>);

  return (
    <RoadmapInterviewClient
      projectId={project.id}
      initial={hydrated as Parameters<typeof RoadmapInterviewClient>[0]['initial']}
    />
  );
}
