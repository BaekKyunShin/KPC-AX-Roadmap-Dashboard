import { redirect } from 'next/navigation';
import { getCachedUser, getCachedProfile } from '@/lib/supabase/cached';
import { fetchPBLPageDataV2 } from '@/app/(dashboard)/consultant/projects/[id]/pbl/actions';
import OpsPBLResultPageClient from './_components/OpsPBLResultPageClient';

export default async function OpsPBLViewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await getCachedUser();
  if (!user) redirect('/login');

  const profile = await getCachedProfile();
  if (!profile || !['OPS_ADMIN', 'SYSTEM_ADMIN'].includes(profile.role)) {
    redirect('/dashboard');
  }

  const { id } = await params;
  const pageDataResult = await fetchPBLPageDataV2(id);
  const pageData = pageDataResult.success
    ? pageDataResult.data
    : { versions: [], selectedVersion: null, interview: {} };

  return (
    <OpsPBLResultPageClient
      projectId={id}
      initialVersions={pageData.versions}
      initialSelected={pageData.selectedVersion}
      initialInterview={pageData.interview}
    />
  );
}
