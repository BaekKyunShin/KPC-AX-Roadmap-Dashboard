import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { PageHeader } from '@/components/ui/page-header';
import { ConsultantAssessmentResult } from './_components/ConsultantAssessmentResult';
import { COMPANY_SIZE_LABELS, type CompanySizeValue } from '@/lib/constants/company-size';
import type { SelfAssessmentScores } from '@/lib/constants/score-color';
import { InterviewSummary } from './_components/InterviewSummary';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function ConsultantProjectDetailPage({ params }: PageProps) {
  const { id: projectId } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // 현재 사용자 프로필 확인
  const { data: profile } = await supabase
    .from('users')
    .select('role, name')
    .eq('id', user.id)
    .single();

  if (!profile || profile.role !== 'CONSULTANT_APPROVED') {
    redirect('/dashboard');
  }

  // 프로젝트 정보 조회 (배정된 컨설턴트만 접근 가능)
  const { data: projectData } = await supabase
    .from('projects')
    .select(`
      *,
      self_assessments(
        id,
        scores,
        created_at
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
    .single();

  if (!projectData) {
    notFound();
  }

  // UNIQUE 제약조건(1:1 관계)으로 PostgREST가 단일 객체를 반환
  const selfAssessment = projectData.self_assessments;
  const interview = projectData.interviews;

  // 자가진단 점수 요약
  const assessmentScores = selfAssessment?.scores as SelfAssessmentScores | null;

  // 기업 규모 라벨 변환
  const companySizeLabel = COMPANY_SIZE_LABELS[projectData.company_size as CompanySizeValue]
    ?.replace(/\d+[~,]?\d*명\s*/, '')
    ?.replace(/[()]/g, '')
    || projectData.company_size;

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <PageHeader
        title={projectData.company_name}
        description={`${projectData.industry} · ${companySizeLabel}`}
        backLink={{ href: '/consultant/projects', label: '프로젝트 목록' }}
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
                {/* 인터뷰 완료(INTERVIEWED) 이상의 상태에서만 로드맵 버튼 표시 */}
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

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* 기업 정보 */}
        <div className="lg:col-span-2 bg-white shadow rounded-lg p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">기업 정보</h2>
          <dl className="space-y-3">
            <div>
              <dt className="text-sm text-gray-500">회사명</dt>
              <dd className="text-sm font-medium text-gray-900">{projectData.company_name}</dd>
            </div>
            <div>
              <dt className="text-sm text-gray-500">업종</dt>
              <dd className="text-sm font-medium text-gray-900">{projectData.industry}</dd>
            </div>
            <div>
              <dt className="text-sm text-gray-500">규모</dt>
              <dd className="text-sm font-medium text-gray-900">{companySizeLabel}</dd>
            </div>
            <div>
              <dt className="text-sm text-gray-500">담당자</dt>
              <dd className="text-sm font-medium text-gray-900">{projectData.contact_name}</dd>
            </div>
            <div>
              <dt className="text-sm text-gray-500">연락처</dt>
              <dd className="text-sm font-medium text-gray-900">
                {projectData.contact_email}
                {projectData.contact_phone && ` · ${projectData.contact_phone}`}
              </dd>
            </div>
            {projectData.company_address && (
              <div>
                <dt className="text-sm text-gray-500">주소</dt>
                <dd className="text-sm font-medium text-gray-900">{projectData.company_address}</dd>
              </div>
            )}
            {projectData.customer_comment && (
              <div>
                <dt className="text-sm text-gray-500">고객 요청사항</dt>
                <dd className="text-sm text-gray-900 whitespace-pre-wrap">
                  {projectData.customer_comment}
                </dd>
              </div>
            )}
          </dl>
        </div>

        {/* 자가진단 결과 */}
        <div className="lg:col-span-3 flex flex-col bg-white shadow rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">자가진단 결과</h2>
            {selfAssessment?.created_at && (
              <span className="text-sm text-gray-500">
                {new Date(selfAssessment.created_at).toLocaleDateString('ko-KR')} 진단
              </span>
            )}
          </div>
          {selfAssessment && assessmentScores ? (
            <ConsultantAssessmentResult scores={assessmentScores} />
          ) : (
            <p className="text-sm text-gray-500">자가진단이 아직 완료되지 않았습니다.</p>
          )}
        </div>
      </div>

      {/* 인터뷰 정보 - 자가진단 카드 아래 */}
      {interview && (
        <InterviewSummary
          interviewDate={interview.interview_date}
          companyDetails={interview.company_details as { systems_and_tools?: string[]; ai_experience?: string } | null}
          jobTasks={(interview.job_tasks as Array<{ task_name: string; task_description: string }>) ?? []}
          painPoints={(interview.pain_points as Array<{ description: string; severity: string }>) ?? []}
          improvementGoals={(interview.improvement_goals as Array<{ goal_description: string; kpi?: string; target_value?: string }>) ?? []}
          constraints={(interview.constraints as Array<{ description: string }>) ?? []}
          notes={(interview.notes as string) ?? null}
          customerRequirements={(interview.customer_requirements as string) ?? null}
        />
      )}
    </div>
  );
}

