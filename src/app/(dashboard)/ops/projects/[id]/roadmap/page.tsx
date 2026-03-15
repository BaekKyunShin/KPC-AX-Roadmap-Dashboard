import { redirect } from 'next/navigation';
import { getCachedUser, getCachedProfile } from '@/lib/supabase/cached';
import type { RoadmapVersionUI } from '@/types/roadmap-ui';
import { fetchRoadmapVersionsForOps } from './actions';
import OpsRoadmapClient from './_components/OpsRoadmapClient';

export default async function OpsRoadmapViewPage({
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
  const versions = await fetchRoadmapVersionsForOps(id);

  return (
    <OpsRoadmapClient
      projectId={id}
      initialVersions={versions as RoadmapVersionUI[]}
    />
  );
}
