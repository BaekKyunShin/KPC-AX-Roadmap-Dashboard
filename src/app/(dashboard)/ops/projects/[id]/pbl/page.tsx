import { redirect } from 'next/navigation';
import { getCachedUser, getCachedProfile } from '@/lib/supabase/cached';
import { createAdminClient } from '@/lib/supabase/admin';
import { listPBLVersionsForOps } from './actions';
import OpsPBLClient from './_components/OpsPBLClient';
import {
  pblInterviewAutoSaveSchema,
  type AILevel,
  type TrainingGoal,
} from '@/lib/schemas/interview-pbl';

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

  // 컨설턴트 페이지와 동일한 방식으로 인터뷰 요약 + 기업명 조회 (Ⅰ·Ⅱ-1·Ⅲ-3 뷰 보강)
  const adminSupabase = createAdminClient();
  const [versions, projectRow, interviewRow] = await Promise.all([
    listPBLVersionsForOps(id),
    adminSupabase
      .from('projects')
      .select('company_name')
      .eq('id', id)
      .maybeSingle()
      .then((r) => r.data),
    adminSupabase
      .from('interviews')
      .select('pbl_data')
      .eq('project_id', id)
      .maybeSingle()
      .then((r) => r.data),
  ]);

  const companyName = (projectRow?.company_name as string | undefined) ?? '';

  const parsed = interviewRow?.pbl_data
    ? pblInterviewAutoSaveSchema.safeParse(interviewRow.pbl_data)
    : null;
  const pblInterview = parsed?.success
    ? (parsed.data as Record<string, unknown>)
    : null;

  const courseOverview = (pblInterview?.courseOverview ?? {}) as Record<string, unknown>;
  const trainingEnv = (pblInterview?.trainingEnvironment ?? {}) as Record<string, unknown>;
  const targetTasks = (pblInterview?.targetTasks ?? {}) as Record<string, unknown>;

  const overviewSummary = pblInterview
    ? {
        companyName,
        courseName: (courseOverview.course_name as string | undefined) ?? '',
        trainingHours: (courseOverview.training_hours as number | undefined) ?? 0,
        traineeCount: (courseOverview.trainee_count as number | undefined) ?? 0,
        trainingJob: (courseOverview.training_job as string | undefined) ?? '',
        aiLevel: ((courseOverview.ai_level as AILevel | undefined) ?? 'AI기초형') as AILevel,
        trainingGoals: ((courseOverview.training_goals as TrainingGoal[] | undefined) ??
          []) as TrainingGoal[],
      }
    : null;

  const targetsSummary = pblInterview
    ? {
        trainingNeedsAnalysis:
          (trainingEnv.training_needs_analysis as string | undefined) ?? '',
        selectionReason: (targetTasks.selection_reason as string | undefined) ?? '',
        details:
          ((targetTasks.target_task_details as Array<{
            id: string;
            task_name: string;
            as_is: string;
            to_be: string;
            required_knowledge: string;
            required_skill: string;
          }>) ?? []),
      }
    : null;

  return (
    <OpsPBLClient
      projectId={id}
      initialVersions={versions}
      initialSelected={versions[0] ?? null}
      interviewOverview={overviewSummary}
      interviewTargets={targetsSummary}
    />
  );
}
