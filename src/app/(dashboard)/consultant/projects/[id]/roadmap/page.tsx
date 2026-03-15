import { redirect } from 'next/navigation';
import { getCachedUser, getCachedProfile } from '@/lib/supabase/cached';
import type { RoadmapVersionUI } from '@/types/roadmap-ui';
import { fetchRoadmapVersions, fetchProjectInfo } from './actions';
import ConsultantRoadmapClient from './_components/ConsultantRoadmapClient';

export default async function RoadmapPage({
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
  const [versions, projectInfoResult] = await Promise.all([
    fetchRoadmapVersions(id),
    fetchProjectInfo(id),
  ]);

  const companyName = projectInfoResult.success && projectInfoResult.data
    ? projectInfoResult.data.companyName
    : '';

  return (
    <ConsultantRoadmapClient
      projectId={id}
      initialVersions={versions as RoadmapVersionUI[]}
      companyName={companyName}
    />
  );
}
