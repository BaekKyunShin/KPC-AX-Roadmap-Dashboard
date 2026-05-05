import { Suspense } from 'react';
import { redirect, notFound } from 'next/navigation';
import { getCachedUser, getCachedProfile } from '@/lib/supabase/cached';
import { createClient } from '@/lib/supabase/server';
import {
  fetchPBLInterviewV2,
  fetchRoadmapInterviewV2,
} from '../actions';
import { fetchLatestResultMeta } from './actions';
import { InterviewReviewClient } from './InterviewReviewClient';
import ParentLoading from '../loading';

/**
 * PR5 (R6 spec) — 인터뷰 검토 페이지 (`/consultant/projects/[id]/interview/review`).
 *
 * 인터뷰 최종 제출 직후 redirect 되는 신규 라우트. 8(로드맵) / 9(PBL) Step 의 모든
 * 항목을 한 페이지에서 읽기 전용 + 단일 텍스트 인라인 편집으로 표시한다.
 *
 * 표 영역(performanceActivities / taskAnalysis / competencies / activities / problems)
 * 의 행 추가·삭제는 인터뷰 입력 페이지(`/interview`)에서 처리하고, 검토 페이지에서는
 * read-only 로 보여준다 (하단 CTA `[📝 인터뷰 페이지로 돌아가기]`).
 *
 * `interviews.updated_at > result.created_at` 인 경우 stale 배너를 노출해 결과 재생성을
 * 안내한다.
 */
interface PageProps {
  params: Promise<{ id: string }>;
}

export default function InterviewReviewPage({ params }: PageProps) {
  return (
    <Suspense fallback={<ParentLoading />}>
      <InterviewReviewPageInner params={params} />
    </Suspense>
  );
}

async function InterviewReviewPageInner({ params }: PageProps) {
  const { id } = await params;

  const user = await getCachedUser();
  if (!user) redirect('/login');

  const profile = await getCachedProfile();
  if (!profile || profile.role !== 'CONSULTANT_APPROVED') {
    redirect('/dashboard');
  }

  const supabase = await createClient();

  // 프로젝트 + 인터뷰 updated_at 조회 (RLS — 배정 컨설턴트만)
  const { data: project } = await supabase
    .from('projects')
    .select('id, track')
    .eq('id', id)
    .maybeSingle();

  if (!project) notFound();

  const { data: interviewRow } = await supabase
    .from('interviews')
    .select('updated_at')
    .eq('project_id', id)
    .maybeSingle();

  const interviewUpdatedAt = (interviewRow?.updated_at as string | null) ?? null;
  const track: 'ROADMAP' | 'PBL' = project.track === 'PBL' ? 'PBL' : 'ROADMAP';

  const [interviewData, resultMeta] = await Promise.all([
    track === 'PBL'
      ? fetchPBLInterviewV2(project.id)
      : fetchRoadmapInterviewV2(project.id),
    fetchLatestResultMeta(project.id, track),
  ]);

  return (
    <InterviewReviewClient
      projectId={project.id}
      track={track}
      interviewData={interviewData ?? {}}
      interviewUpdatedAt={interviewUpdatedAt}
      latestResult={resultMeta}
    />
  );
}
