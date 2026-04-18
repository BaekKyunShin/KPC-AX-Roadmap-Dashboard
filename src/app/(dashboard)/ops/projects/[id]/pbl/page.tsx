import { redirect } from 'next/navigation';
import { getCachedUser, getCachedProfile } from '@/lib/supabase/cached';
import { listPBLVersionsForOps } from './actions';
import OpsPBLClient from './_components/OpsPBLClient';

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
  const versions = await listPBLVersionsForOps(id);

  return (
    <OpsPBLClient
      projectId={id}
      initialVersions={versions}
      initialSelected={versions[0] ?? null}
    />
  );
}
