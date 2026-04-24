import { redirect, notFound } from 'next/navigation';
import { getCachedUser, getCachedProfile } from '@/lib/supabase/cached';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import {
  fetchPBLInterviewV2,
  fetchRoadmapInterviewV2,
} from './actions';
import { RoadmapInterviewClientV2 } from './_components/roadmap-v2/RoadmapInterviewClientV2';
import { PBLInterviewClientV2 } from './_components/pbl-v2/PBLInterviewClientV2';

/**
 * HRD 첨부 버킷 이름 (actions.ts 의 HRD_BUCKET 과 동기화).
 * 서버 컴포넌트에서 DB 에 저장된 `storage_path` 를 1시간짜리 signed URL 로
 * 변환해 Client 에 주입한다. extractedText 는 LLM 전용 내부 필드이므로
 * Client 에는 절대 노출하지 않는다 (DB 영속은 유지).
 */
const HRD_BUCKET = 'interview-attachments';

/**
 * Client 에 전달하기 전에 `hrdReportPdf.url` 을 signed URL 로 교체한다.
 *
 * 현재 DB 에는 `storage_path` 가 `url` 자리에 담겨 저장되는 경로가 있으므로
 * (StepHrdReportPdf 가 storage_path 를 url 자리에 둔 채 저장함), `url` 이
 * `http` 로 시작하지 않으면 storage_path 로 간주하고 signed URL 을 생성한다.
 */
async function hydrateHrdReportSignedUrl(
  initial: Record<string, unknown>,
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
  if (hrd.url.startsWith('http')) return initial;

  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase.storage
      .from(HRD_BUCKET)
      .createSignedUrl(hrd.url, 3600);
    if (error || !data) return initial;

    return {
      ...initial,
      hrdReportPdf: {
        ...hrd,
        url: data.signedUrl,
      },
    };
  } catch {
    return initial;
  }
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
    .select('id, track')
    .eq('id', id)
    .single();

  if (!project) notFound();

  // PBL 트랙 — Task 2.4: V2 Client (camelCase 스키마 + 9 스텝 + 자동저장)
  // `?track=PBL` 쿼리가 있을 때도 동일 경로. `fetchPBLInterviewV2` 가 DB pbl_data
  // 를 camelCase Partial 로 반환 → signed URL hydration 후 Client 에 주입.
  if (project.track === 'PBL' || sp.track === 'PBL') {
    const rawPbl = (await fetchPBLInterviewV2(project.id)) ?? {};
    const hydratedPbl = await hydrateHrdReportSignedUrl(
      rawPbl as Record<string, unknown>,
    );
    return (
      <PBLInterviewClientV2
        projectId={project.id}
        initial={
          hydratedPbl as Parameters<typeof PBLInterviewClientV2>[0]['initial']
        }
      />
    );
  }

  // 로드맵 트랙 — V2 Client (camelCase 스키마 + 8 스텝 + 자동저장)
  const raw = (await fetchRoadmapInterviewV2(project.id)) ?? {};
  const hydrated = await hydrateHrdReportSignedUrl(
    raw as Record<string, unknown>,
  );

  return (
    <RoadmapInterviewClientV2
      projectId={project.id}
      initial={hydrated as Parameters<typeof RoadmapInterviewClientV2>[0]['initial']}
    />
  );
}
