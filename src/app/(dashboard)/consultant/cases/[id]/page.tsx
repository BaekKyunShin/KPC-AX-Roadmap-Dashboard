import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function ConsultantCaseDetailPage({ params }: PageProps) {
  const { id: caseId } = await params;
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

  // 케이스 정보 조회 (배정된 컨설턴트만 접근 가능)
  const { data: caseData } = await supabase
    .from('cases')
    .select(`
      *,
      self_assessments(
        id,
        scores,
        summary_text,
        template_version
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
    .eq('id', caseId)
    .eq('assigned_consultant_id', user.id)
    .single();

  if (!caseData) {
    notFound();
  }

  const selfAssessment = caseData.self_assessments?.[0];
  const interview = caseData.interviews?.[0];

  // 자가진단 점수 요약
  const assessmentScores = selfAssessment?.scores as {
    total_score?: number;
    max_score?: number;
    dimension_scores?: Array<{ dimension: string; score: number; max_score: number }>;
  } | null;

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <Link
            href="/consultant/cases"
            className="text-sm text-gray-500 hover:text-gray-700"
          >
            ← 케이스 목록
          </Link>
          <h1 className="mt-2 text-2xl font-bold text-gray-900">{caseData.company_name}</h1>
          <p className="text-sm text-gray-500">
            {caseData.industry} · {caseData.company_size}
          </p>
        </div>
        <div className="flex space-x-3">
          {!interview ? (
            <Link
              href={`/consultant/cases/${caseId}/interview`}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              인터뷰 입력
            </Link>
          ) : (
            <>
              <Link
                href={`/consultant/cases/${caseId}/interview`}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
              >
                인터뷰 수정
              </Link>
              <Link
                href={`/consultant/cases/${caseId}/roadmap`}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
              >
                로드맵 생성
              </Link>
            </>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 기업 정보 */}
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">기업 정보</h2>
          <dl className="space-y-3">
            <div>
              <dt className="text-sm text-gray-500">회사명</dt>
              <dd className="text-sm font-medium text-gray-900">{caseData.company_name}</dd>
            </div>
            <div>
              <dt className="text-sm text-gray-500">업종</dt>
              <dd className="text-sm font-medium text-gray-900">{caseData.industry}</dd>
            </div>
            <div>
              <dt className="text-sm text-gray-500">규모</dt>
              <dd className="text-sm font-medium text-gray-900">{caseData.company_size}</dd>
            </div>
            <div>
              <dt className="text-sm text-gray-500">담당자</dt>
              <dd className="text-sm font-medium text-gray-900">{caseData.contact_name}</dd>
            </div>
            <div>
              <dt className="text-sm text-gray-500">연락처</dt>
              <dd className="text-sm font-medium text-gray-900">
                {caseData.contact_email}
                {caseData.contact_phone && ` · ${caseData.contact_phone}`}
              </dd>
            </div>
            {caseData.company_address && (
              <div>
                <dt className="text-sm text-gray-500">주소</dt>
                <dd className="text-sm font-medium text-gray-900">{caseData.company_address}</dd>
              </div>
            )}
            {caseData.customer_comment && (
              <div>
                <dt className="text-sm text-gray-500">고객 요청사항</dt>
                <dd className="text-sm text-gray-900 whitespace-pre-wrap">
                  {caseData.customer_comment}
                </dd>
              </div>
            )}
          </dl>
        </div>

        {/* 자가진단 결과 */}
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">자가진단 결과</h2>
          {selfAssessment ? (
            <div className="space-y-4">
              {/* 총점 */}
              {assessmentScores && (
                <div className="bg-blue-50 rounded-lg p-4">
                  <div className="text-sm text-blue-600">총점</div>
                  <div className="text-2xl font-bold text-blue-900">
                    {assessmentScores.total_score} / {assessmentScores.max_score}
                  </div>
                  <div className="text-sm text-blue-600">
                    ({Math.round(((assessmentScores.total_score || 0) / (assessmentScores.max_score || 1)) * 100)}%)
                  </div>
                </div>
              )}

              {/* 차원별 점수 */}
              {assessmentScores?.dimension_scores && (
                <div className="space-y-2">
                  <h3 className="text-sm font-medium text-gray-700">영역별 점수</h3>
                  {assessmentScores.dimension_scores.map((dim) => (
                    <div key={dim.dimension} className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">{dim.dimension}</span>
                      <div className="flex items-center">
                        <div className="w-24 bg-gray-200 rounded-full h-2 mr-2">
                          <div
                            className="bg-blue-600 h-2 rounded-full"
                            style={{ width: `${(dim.score / dim.max_score) * 100}%` }}
                          />
                        </div>
                        <span className="text-sm text-gray-900 w-16 text-right">
                          {dim.score}/{dim.max_score}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* 요약 */}
              {selfAssessment.summary_text && (
                <div>
                  <h3 className="text-sm font-medium text-gray-700 mb-1">요약</h3>
                  <p className="text-sm text-gray-600 whitespace-pre-wrap">
                    {selfAssessment.summary_text}
                  </p>
                </div>
              )}
            </div>
          ) : (
            <p className="text-sm text-gray-500">자가진단이 아직 완료되지 않았습니다.</p>
          )}
        </div>
      </div>

      {/* 인터뷰 정보 */}
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
