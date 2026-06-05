import { redirect } from 'next/navigation';
import { getCachedUser, getCachedProfile } from '@/lib/supabase/cached';
import { fetchRoadmapPageDataV2 } from '@/app/(dashboard)/consultant/projects/[id]/roadmap/actions';
import { isOpsManager } from '@/lib/constants/status';
import OpsRoadmapResultPageClient from './_components/OpsRoadmapResultPageClient';

export default async function OpsRoadmapViewPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await getCachedUser();
  if (!user) redirect('/login');

  const profile = await getCachedProfile();
  if (!profile || !isOpsManager(profile.role)) {
    redirect('/dashboard');
  }

  const { id } = await params;
  const pageDataResult = await fetchRoadmapPageDataV2(id);
  const pageData = pageDataResult.success
    ? pageDataResult.data
    : { versions: [], selectedVersion: null, interview: {} };

  return (
    <OpsRoadmapResultPageClient
      projectId={id}
      initialVersions={pageData.versions}
      initialSelected={pageData.selectedVersion}
      initialInterview={pageData.interview}
    />
  );
}
