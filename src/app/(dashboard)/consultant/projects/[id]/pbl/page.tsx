import { redirect } from 'next/navigation';
import { getCachedUser, getCachedProfile } from '@/lib/supabase/cached';
import { createAdminClient } from '@/lib/supabase/admin';
import ConsultantPBLClient from './_components/ConsultantPBLClient';
import { fetchPBLProjectInfo, fetchPBLVersions } from './actions';
import {
  pblInterviewAutoSaveSchema,
  type AILevel,
  type TrainingGoal,
} from '@/lib/schemas/interview-pbl';

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

  const [projectInfoResult, versions] = await Promise.all([
    fetchPBLProjectInfo(id),
    fetchPBLVersions(id),
  ]);

  if (!projectInfoResult.success) {
    redirect('/dashboard');
  }
  // 트랙 불일치 시 프로젝트 상세로 돌려보냄 (이전 버전은 /roadmap으로 강제 리다이렉트해
  // PBL 페이지에서도 튕겨나가는 버그가 있었음 — OFA-11에서 수정)
  if (projectInfoResult.data.track !== 'PBL') {
    redirect(`/consultant/projects/${id}`);
  }

  // 인터뷰 PBL 데이터 → Overview/Targets 요약 구성
  const adminSupabase = createAdminClient();
  const { data: interviewRow } = await adminSupabase
    .from('interviews')
    .select('pbl_data')
    .eq('project_id', id)
    .maybeSingle();

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
        companyName: projectInfoResult.data.companyName,
        courseName: (courseOverview.course_name as string | undefined) ?? '',
        trainingHours: (courseOverview.training_hours as number | undefined) ?? 0,
        traineeCount: (courseOverview.trainee_count as number | undefined) ?? 0,
        trainingJob: (courseOverview.training_job as string | undefined) ?? '',
        aiLevel: ((courseOverview.ai_level as AILevel | undefined) ?? 'AI기초형') as AILevel,
        trainingGoals: ((courseOverview.training_goals as TrainingGoal[] | undefined) ?? []) as TrainingGoal[],
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
    <ConsultantPBLClient
      projectId={id}
      companyName={projectInfoResult.data.companyName}
      initialVersions={versions}
      initialSelected={versions[0] ?? null}
      interviewOverview={overviewSummary}
      interviewTargets={targetsSummary}
    />
  );
}
