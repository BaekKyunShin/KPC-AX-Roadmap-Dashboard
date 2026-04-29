import { redirect } from 'next/navigation';
import { getCachedUser, getCachedProfile } from '@/lib/supabase/cached';
import PBLResultPageClient from './_components/PBLResultPageClient';
import { fetchPBLPageDataV2, fetchPBLProjectInfo } from './actions';

export default async function PBLPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await getCachedUser();
  if (!user) redirect('/login');

  const profile = await getCachedProfile();
  if (!profile || profile.role !== 'CONSULTANT_APPROVED') {
    redirect('/dashboard');
  }

  const { id } = await params;

  const [projectInfoResult, pageDataResult] = await Promise.all([
    fetchPBLProjectInfo(id),
    fetchPBLPageDataV2(id),
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

  return (
    <PBLResultPageClient
      projectId={id}
      companyName={projectInfoResult.data.companyName}
      initialVersions={pageData.versions}
      initialSelected={pageData.selectedVersion}
      initialInterview={pageData.interview}
      initialHasInterview={pageData.hasInterview}
      initialProjectStatus={pageData.projectStatus}
    />
  );
}
