import { redirect, notFound } from 'next/navigation';
import { getCachedUser, getCachedProfile } from '@/lib/supabase/cached';
import { createClient } from '@/lib/supabase/server';
import { fetchInterview } from './actions';
import { mapInterviewRowToRoadmapInterview } from '@/lib/schemas/interview-roadmap';
import RoadmapInterviewClient from './_components/RoadmapInterviewClient';

export default async function InterviewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

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

  if (project.track === 'PBL') {
    return (
      <div className="max-w-4xl mx-auto p-8">
        <p className="text-muted-foreground">
          PBL 인터뷰 화면은 곧 제공됩니다 (OFA Step 8).
        </p>
      </div>
    );
  }

  const interviewRow = await fetchInterview(id);
  const initialData = mapInterviewRowToRoadmapInterview(interviewRow);

  return <RoadmapInterviewClient projectId={project.id} initialData={initialData} />;
}
