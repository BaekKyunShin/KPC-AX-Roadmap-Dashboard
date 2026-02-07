import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { PageHeader } from '@/components/ui/page-header';
import { COMPANY_SIZE_LABELS, type CompanySizeValue } from '@/lib/constants/company-size';

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
  const assessmentScores = selfAssessment?.scores as {
    total_score?: number;
    max_possible_score?: number;
    dimension_scores?: Array<{ dimension: string; score: number; max_score: number }>;
  } | null;

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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 기업 정보 */}
        <div className="bg-white shadow rounded-lg p-6">
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
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">자가진단 결과</h2>
          {selfAssessment && assessmentScores ? (
            <SelfAssessmentResult
              scores={assessmentScores}
              createdAt={selfAssessment.created_at}
            />
          ) : (
            <p className="text-sm text-gray-500">자가진단이 아직 완료되지 않았습니다.</p>
          )}
        </div>
      </div>

      {/* 인터뷰 정보 - 자가진단 카드 아래 */}
      {interview && (
        <div className="bg-white shadow rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">인터뷰 정보</h2>
            <span className="text-sm text-gray-500">
              {new Date(interview.interview_date).toLocaleDateString('ko-KR')}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* 세부업무 */}
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-2">세부업무</h3>
              <ul className="space-y-2">
                {(interview.job_tasks as Array<{ task_name: string; task_description: string }>)?.map(
                  (task, idx) => (
                    <li key={idx} className="text-sm text-gray-600 bg-gray-50 p-2 rounded">
                      <span className="font-medium">{task.task_name}</span>
                      {task.task_description && (
                        <p className="text-xs text-gray-500 mt-1">{task.task_description}</p>
                      )}
                    </li>
                  )
                )}
              </ul>
            </div>

            {/* 페인포인트 */}
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-2">페인포인트</h3>
              <ul className="space-y-2">
                {(interview.pain_points as Array<{ description: string; severity: string; priority: number }>)?.map(
                  (point, idx) => (
                    <li key={idx} className="text-sm bg-red-50 p-2 rounded">
                      <div className="flex items-center justify-between">
                        <span className="text-gray-700">{point.description}</span>
                        <span
                          className={`text-xs px-2 py-0.5 rounded ${
                            point.severity === 'HIGH'
                              ? 'bg-red-100 text-red-800'
                              : point.severity === 'MEDIUM'
                              ? 'bg-yellow-100 text-yellow-800'
                              : 'bg-gray-100 text-gray-800'
                          }`}
                        >
                          {point.severity}
                        </span>
                      </div>
                    </li>
                  )
                )}
              </ul>
            </div>

            {/* 개선 목표 */}
            <div className="md:col-span-2">
              <h3 className="text-sm font-medium text-gray-700 mb-2">개선 목표</h3>
              <ul className="space-y-2">
                {(interview.improvement_goals as Array<{ goal_description: string; kpi?: string; target_value?: string }>)?.map(
                  (goal, idx) => (
                    <li key={idx} className="text-sm bg-green-50 p-2 rounded">
                      <span className="text-gray-700">{goal.goal_description}</span>
                      {goal.kpi && (
                        <span className="ml-2 text-xs text-green-600">
                          KPI: {goal.kpi} {goal.target_value && `→ ${goal.target_value}`}
                        </span>
                      )}
                    </li>
                  )
                )}
              </ul>
            </div>
          </div>

          {interview.customer_requirements && (
            <div className="mt-4 pt-4 border-t">
              <h3 className="text-sm font-medium text-gray-700 mb-1">기업 요구사항</h3>
              <p className="text-sm text-gray-600 whitespace-pre-wrap">
                {interview.customer_requirements}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// 자가진단 결과 표시 컴포넌트
function SelfAssessmentResult({ scores, createdAt }: {
  scores: {
    total_score?: number;
    max_possible_score?: number;
    dimension_scores?: Array<{ dimension: string; score: number; max_score: number }>;
  };
  createdAt?: string;
}) {
  const totalScore = Math.round(scores.total_score || 0);
  const maxScore = Math.round(scores.max_possible_score || 100);
  const percentage = Math.round((totalScore / maxScore) * 100);

  const getScoreColor = (pct: number) => {
    if (pct > 60) return { bg: 'bg-green-500', text: 'text-green-600', light: 'bg-green-50' };
    if (pct >= 30) return { bg: 'bg-amber-500', text: 'text-amber-600', light: 'bg-amber-50' };
    return { bg: 'bg-red-500', text: 'text-red-600', light: 'bg-red-50' };
  };

  const totalColor = getScoreColor(percentage);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* 좌측: 종합 점수 */}
        <div className="lg:col-span-5">
          <div className="h-full p-5 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl border border-blue-100">
            <h3 className="text-sm font-medium text-gray-500 mb-3">종합 점수</h3>
            <div className="flex items-end gap-2 mb-3">
              <span className="text-4xl font-bold text-gray-900">{totalScore}</span>
              <span className="text-lg text-gray-400 mb-1">/ {maxScore}</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2.5 mb-3">
              <div
                className={`h-2.5 rounded-full ${totalColor.bg} transition-all duration-500`}
                style={{ width: `${percentage}%` }}
              />
            </div>
            <div className="flex items-center justify-between">
              <span className={`px-2.5 py-0.5 rounded-full text-sm font-medium ${totalColor.light} ${totalColor.text}`}>
                {percentage}%
              </span>
              {createdAt && (
                <span className="text-xs text-gray-400">
                  {new Date(createdAt).toLocaleDateString('ko-KR')} 진단
                </span>
              )}
            </div>
          </div>
        </div>

        {/* 우측: 항목별 점수 */}
        {scores.dimension_scores && (
          <div className="lg:col-span-7">
            <div className="h-full p-4 bg-gray-50 rounded-xl border border-gray-100">
              <h3 className="text-sm font-medium text-gray-500 mb-3">항목별 점수</h3>
              <div className="space-y-2.5">
                {scores.dimension_scores.map((ds) => {
                  const dimScore = Math.round(ds.score);
                  const dimMax = Math.round(ds.max_score);
                  const dimPct = Math.round((dimScore / dimMax) * 100);
                  const dimColor = getScoreColor(dimPct);

                  return (
                    <div key={ds.dimension} className="flex items-center gap-3">
                      <span className="text-sm text-gray-700 w-28 truncate">{ds.dimension}</span>
                      <div className="flex-1 bg-gray-200 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full ${dimColor.bg}`}
                          style={{ width: `${dimPct}%` }}
                        />
                      </div>
                      <span className="text-sm text-gray-600 w-16 text-right">{dimScore}/{dimMax}</span>
                      <span className={`text-sm font-medium w-12 text-right ${dimColor.text}`}>{dimPct}%</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>

    </div>
  );
}
