import { redirect, notFound } from 'next/navigation';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { getCachedUser, getCachedProfile } from '@/lib/supabase/cached';
import { PageHeader } from '@/components/ui/page-header';
import { COMPANY_SIZE_LABELS, type CompanySizeValue } from '@/lib/constants/company-size';
import type { SelfAssessmentScores } from '@/lib/constants/score-color';
import { InterviewSummary, toInterviewSummaryProps } from '@/components/interview/InterviewSummary';
import { AssessmentDetailAccordion, type AssessmentAnswer, type AssessmentQuestion } from './_components/AssessmentDetailAccordion';
import { CompanyInfoCard } from './_components/CompanyInfoCard';
import { ProjectDetailTabs } from './_components/ProjectDetailTabs';
import { InterviewGuide } from './_components/InterviewGuide';
import ActivityLog from './_components/ActivityLog';

const ConsultantAssessmentResult = dynamic(
  () => import('./_components/ConsultantAssessmentResult').then(mod => ({ default: mod.ConsultantAssessmentResult })),
  { loading: () => <div className="h-[200px] animate-pulse rounded bg-gray-100" /> }
);

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function ConsultantProjectDetailPage({ params }: PageProps) {
  const { id: projectId } = await params;

  const user = await getCachedUser();
  if (!user) {
    redirect('/login');
  }

  const profile = await getCachedProfile();
  if (!profile || profile.role !== 'CONSULTANT_APPROVED') {
    redirect('/dashboard');
  }

  // 프로젝트 + 사전 분석 가이드 병렬 조회
  const supabase = await createClient();
  const [{ data: projectData }, { data: interviewGuide }] = await Promise.all([
    supabase
      .from('projects')
      .select(`
        *,
        self_assessments(
          id,
          scores,
          answers,
          created_at,
          template:self_assessment_templates(questions)
        ),
        interviews(
          id,
          interview_date,
          company_details,
          job_tasks,
          pain_points,
          constraints,
          improvement_goals,
          notes,
          customer_requirements
        )
      `)
      .eq('id', projectId)
      .eq('assigned_consultant_id', user.id)
      .single(),
    supabase
      .from('interview_guides')
      .select('guide_data, created_at')
      .eq('project_id', projectId)
      .single(),
  ]);

  if (!projectData) {
    notFound();
  }

  // UNIQUE 제약조건(1:1 관계)으로 PostgREST가 단일 객체를 반환
  const selfAssessment = projectData.self_assessments;
  const interview = projectData.interviews;

  // 자가진단 점수 요약
  const assessmentScores = selfAssessment?.scores as SelfAssessmentScores | null;
  const assessmentAnswers = (selfAssessment?.answers ?? []) as AssessmentAnswer[];
  const templateQuestions = ((selfAssessment?.template as { questions?: unknown[] } | null)?.questions ?? []) as AssessmentQuestion[];

  // 기업 규모 라벨 변환
  const companySizeLabel = COMPANY_SIZE_LABELS[projectData.company_size as CompanySizeValue]
    ?.replace(/\d+[~,]?\d*명\s*/, '')
    ?.replace(/[()]/g, '')
    || projectData.company_size;

  const hasSelfAssessment = !!selfAssessment && !!assessmentScores;

  return (
    <div className="space-y-4">
      {/* 헤더 */}
      <PageHeader
        title={projectData.company_name}
        description={`${projectData.industry} · ${companySizeLabel}`}
        backLink={{ href: '/consultant/projects', label: '프로젝트 목록', useBack: true }}
        actions={
          <div className="flex space-x-3">
            {!interview ? (
              <Link
                href={`/consultant/projects/${projectId}/interview`}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                인터뷰 입력
              </Link>
            ) : (
              <>
                <Link
                  href={`/consultant/projects/${projectId}/interview`}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                >
                  인터뷰 수정
                </Link>
                {['INTERVIEWED', 'ROADMAP_DRAFTED', 'FINALIZED'].includes(projectData.status) && (
                  <Link
                    href={`/consultant/projects/${projectId}/roadmap`}
                    className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
                  >
                    {projectData.status === 'INTERVIEWED' ? '로드맵 생성' :
                     projectData.status === 'ROADMAP_DRAFTED' ? '로드맵 편집' : '로드맵 보기'}
                  </Link>
                )}
              </>
            )}
          </div>
        }
      />

      {/* 탭 네비게이션 */}
      <ProjectDetailTabs
        companyInfoContent={
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
            <CompanyInfoCard
              companyName={projectData.company_name}
              industry={projectData.industry}
              companySizeLabel={companySizeLabel}
              contactName={projectData.contact_name}
              contactEmail={projectData.contact_email}
              contactPhone={projectData.contact_phone}
              companyAddress={projectData.company_address}
              customerComment={projectData.customer_comment}
            />
            <div className="lg:col-span-3 bg-white shadow rounded-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900">자가진단 결과</h2>
                {selfAssessment?.created_at && (
                  <span className="text-sm text-gray-500">
                    {new Date(selfAssessment.created_at).toLocaleDateString('ko-KR')} 진단
                  </span>
                )}
              </div>
              {hasSelfAssessment ? (
                <>
                  <ConsultantAssessmentResult scores={assessmentScores} />
                  {assessmentAnswers.length > 0 && templateQuestions.length > 0 && (
                    <AssessmentDetailAccordion
                      answers={assessmentAnswers}
                      questions={templateQuestions}
                    />
                  )}
                </>
              ) : (
                <p className="text-sm text-gray-500">자가진단이 아직 완료되지 않았습니다.</p>
              )}
            </div>
          </div>
        }
        preAnalysisContent={
          <InterviewGuide
            projectId={projectId}
            hasSelfAssessment={hasSelfAssessment}
            guideData={interviewGuide?.guide_data ?? null}
            guideCreatedAt={interviewGuide?.created_at ?? null}
          />
        }
        interviewContent={
          interview ? (
            <div className="bg-white shadow rounded-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900">인터뷰 기록</h2>
                <span className="text-sm text-gray-500">
                  {new Date(interview.interview_date).toLocaleDateString('ko-KR')} 인터뷰
                </span>
              </div>
              <InterviewSummary {...toInterviewSummaryProps(interview)} />
            </div>
          ) : (
            <div className="bg-white shadow rounded-lg p-6">
              <p className="text-sm text-gray-500">인터뷰가 아직 진행되지 않았습니다.</p>
            </div>
          )
        }
        activityContent={
          <ActivityLog projectId={projectId} />
        }
      />
    </div>
  );
}
