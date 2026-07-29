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

  // PBL 트랙 프로젝트가 /roadmap 으로 들어오면 상세로 돌려보냄 (PBL 페이지 분기 대칭)
  if (projectInfoResult.success && projectInfoResult.data.track === 'PBL') {
    redirect(`/consultant/projects/${id}`);
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
