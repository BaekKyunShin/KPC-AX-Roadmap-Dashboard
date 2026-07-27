import { redirect } from 'next/navigation';
import { getCachedUser, getCachedProfile } from '@/lib/supabase/cached';
import PBLResultPageClient from './_components/PBLResultPageClient';
import { fetchPBLPageDataV2, fetchPBLProjectInfo } from './actions';
import {
  fetchLinkedRoadmapData,
  hydrateRoadmapInterview,
  mergeRoadmapOverrides,
} from '@/lib/services/pbl/pbl-roadmap-link';
import type { PBLRoadmapOverrides } from '@/lib/schemas/interview-pbl';

export default async function PBLPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await getCachedUser();
  if (!user) redirect('/login');

  const profile = await getCachedProfile();
  if (!profile || profile.role !== 'CONSULTANT_APPROVED') {
    redirect('/dashboard');
  }

  const { id } = await params;

  const [projectInfoResult, pageDataResult, linked] = await Promise.all([
    fetchPBLProjectInfo(id),
    fetchPBLPageDataV2(id),
    fetchLinkedRoadmapData(id),
  ]);
  if (!projectInfoResult.success) {
    redirect('/dashboard');
  }
  // 트랙 불일치 시 프로젝트 상세로 돌려보냄 (이전 버전은 /roadmap으로 강제 리다이렉트해
  // PBL 페이지에서도 튕겨나가는 버그가 있었음 — OFA-11에서 수정)
  if (projectInfoResult.data.track !== 'PBL') {
    redirect(`/consultant/projects/${id}`);
  }

  const pageData = pageDataResult.success
    ? pageDataResult.data
    : {
        versions: [],
        selectedVersion: null,
        interview: {},
        hasInterview: false,
        projectStatus: '',
      };

  // 선행 로드맵 인터뷰 복원 후 PBL 수정값(roadmapOverrides)을 얹는다 (Ⅱ장 렌더용).
  // 미연계 시 null → 배너. HWPX export(`actions.ts`)도 같은 병합 함수를 쓰므로
  // 화면과 산출물이 어긋날 수 없다.
  const linkedRoadmap = mergeRoadmapOverrides(
    hydrateRoadmapInterview(linked.interview),
    (pageData.interview as { roadmapOverrides?: PBLRoadmapOverrides }).roadmapOverrides
  );

  return (
    <PBLResultPageClient
      projectId={id}
      companyName={projectInfoResult.data.companyName}
      projectMeta={projectInfoResult.data}
      initialVersions={pageData.versions}
      initialSelected={pageData.selectedVersion}
      initialInterview={pageData.interview}
      initialHasInterview={pageData.hasInterview}
      initialProjectStatus={pageData.projectStatus}
      linkedRoadmap={linkedRoadmap}
    />
  );
}
