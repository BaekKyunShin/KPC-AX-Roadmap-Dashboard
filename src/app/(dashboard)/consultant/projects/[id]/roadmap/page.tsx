import { redirect } from 'next/navigation';
import { getCachedUser, getCachedProfile } from '@/lib/supabase/cached';
import { fetchProjectInfo, fetchRoadmapPageDataV2 } from './actions';
import RoadmapResultPageClient from './_components/RoadmapResultPageClient';

export default async function RoadmapPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await getCachedUser();
  if (!user) redirect('/login');

  const profile = await getCachedProfile();
  if (!profile || profile.role !== 'CONSULTANT_APPROVED') {
    redirect('/dashboard');
  }

  const { id } = await params;
  const [pageDataResult, projectInfoResult] = await Promise.all([
    fetchRoadmapPageDataV2(id),
    fetchProjectInfo(id),
  ]);

  // PBL 트랙 프로젝트가 /roadmap 으로 들어오면 상세로 돌려보냄 (PBL 페이지 분기 대칭).
  // `trackMismatch` 는 상세 페이지가 "왜 돌아왔는지" 배너를 띄우기 위한 사유 플래그다
  // (`login?password-changed=1` 과 같은 방식). 어느 트랙인지는 상세 페이지가
  // 프로젝트를 조회하며 이미 알고 있으므로 플래그 하나면 충분하다.
  if (projectInfoResult.success && projectInfoResult.data.track === 'PBL') {
    redirect(`/consultant/projects/${id}?trackMismatch=1`);
  }

  const companyName =
    projectInfoResult.success && projectInfoResult.data ? projectInfoResult.data.companyName : '';

  const pageData = pageDataResult.success
    ? pageDataResult.data
    : {
        versions: [],
        selectedVersion: null,
        interview: {},
        selfAssessmentExists: false,
        projectStatus: '',
        projectClosed: false,
      };

  return (
    <RoadmapResultPageClient
      projectId={id}
      companyName={companyName}
      initialVersions={pageData.versions}
      initialSelected={pageData.selectedVersion}
      initialInterview={pageData.interview}
      initialSelfAssessmentExists={pageData.selfAssessmentExists}
      initialProjectStatus={pageData.projectStatus}
      initialProjectClosed={pageData.projectClosed}
    />
  );
}
