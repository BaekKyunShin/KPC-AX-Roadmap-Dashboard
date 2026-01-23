import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import SelfAssessmentForm from '@/components/ops/SelfAssessmentForm';
import MatchingRecommendations from '@/components/ops/MatchingRecommendations';
import RecalculateMatchingButton from '@/components/ops/RecalculateMatchingButton';
import ReassignmentSection from '@/components/ops/ReassignmentSection';
import { getCaseStatusBadge } from '@/lib/constants/status';
import type { CaseStatus } from '@/types/database';

export default async function CaseDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // 현재 사용자 역할 확인
  const { data: currentUser } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single();

  if (!currentUser || !['OPS_ADMIN', 'SYSTEM_ADMIN'].includes(currentUser.role)) {
    redirect('/dashboard');
  }

  // 케이스 조회
  const { data: caseData } = await supabase
    .from('cases')
    .select(`
      *,
      assigned_consultant:users!cases_assigned_consultant_id_fkey(id, name, email)
    `)
    .eq('id', id)
    .single();

  if (!caseData) {
    notFound();
  }

  // 자가진단 조회
  const { data: selfAssessment } = await supabase
    .from('self_assessments')
    .select('*')
    .eq('case_id', id)
    .single();

  // 활성 템플릿 조회
  const { data: template } = await supabase
    .from('self_assessment_templates')
    .select('*')
    .eq('is_active', true)
    .single();

  // 매칭 추천 조회
  const { data: matchingRecommendations } = await supabase
    .from('matching_recommendations')
    .select(`
      *,
      candidate:users!matching_recommendations_candidate_user_id_fkey(
        id, name, email,
        consultant_profile:consultant_profiles(*)
      )
    `)
    .eq('case_id', id)
    .order('rank', { ascending: true });

  // 배정 이력 조회
  const { data: assignments } = await supabase
    .from('case_assignments')
    .select(`
      *,
      consultant:users!case_assignments_consultant_id_fkey(id, name, email),
      assigned_by_user:users!case_assignments_assigned_by_fkey(id, name)
    `)
    .eq('case_id', id)
    .order('assigned_at', { ascending: false });

  const statusInfo = getCaseStatusBadge(caseData.status as CaseStatus);

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6">
        <Link href="/ops/cases" className="text-sm text-gray-500 hover:text-gray-700">
          ← 케이스 목록으로
        </Link>
      </div>

      {/* 케이스 기본 정보 */}
      <div className="bg-white shadow rounded-lg p-6 mb-6">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{caseData.company_name}</h1>
            <p className="text-gray-500">{caseData.industry} | {caseData.company_size}</p>
          </div>
          <span className={`px-3 py-1 rounded-full text-sm ${statusInfo.color}`}>
            {statusInfo.label}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-4 mt-4">
          <div>
            <h3 className="text-sm font-medium text-gray-500">담당자</h3>
            <p className="text-gray-900">{caseData.contact_name}</p>
            <p className="text-sm text-gray-500">{caseData.contact_email}</p>
            {caseData.contact_phone && (
              <p className="text-sm text-gray-500">{caseData.contact_phone}</p>
            )}
          </div>
          <div>
            <h3 className="text-sm font-medium text-gray-500">배정 컨설턴트</h3>
            {caseData.assigned_consultant ? (
              <>
                <p className="text-gray-900">{caseData.assigned_consultant.name}</p>
                <p className="text-sm text-gray-500">{caseData.assigned_consultant.email}</p>
              </>
            ) : (
              <p className="text-gray-400">미배정</p>
            )}
          </div>
        </div>

        {caseData.customer_comment && (
          <div className="mt-4">
            <h3 className="text-sm font-medium text-gray-500">고객 코멘트</h3>
            <p className="mt-1 text-gray-900">{caseData.customer_comment}</p>
          </div>
        )}
      </div>

      {/* 자가진단 섹션 */}
      <div className="bg-white shadow rounded-lg p-6 mb-6">
        <h2 className="text-lg font-bold text-gray-900 mb-4">자가진단</h2>

        {selfAssessment ? (
          <div>
            <div className="mb-4 p-4 bg-blue-50 rounded-lg">
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-sm text-blue-800">
                    총점: <span className="font-bold">{selfAssessment.scores.total_score}</span>
                    {' / '}
                    {selfAssessment.scores.max_possible_score}
                  </p>
                </div>
                <p className="text-xs text-blue-600">
                  입력일: {new Date(selfAssessment.created_at).toLocaleDateString('ko-KR')}
                </p>
              </div>
            </div>

            {selfAssessment.scores.dimension_scores && (
              <div className="grid grid-cols-2 gap-4 mt-4">
                {selfAssessment.scores.dimension_scores.map((ds: { dimension: string; score: number; max_score: number }) => (
                  <div key={ds.dimension} className="p-3 bg-gray-50 rounded">
                    <p className="text-sm font-medium text-gray-700">{ds.dimension}</p>
                    <p className="text-lg font-bold text-gray-900">
                      {ds.score} / {ds.max_score}
                    </p>
                  </div>
                ))}
              </div>
            )}

            {selfAssessment.summary_text && (
              <div className="mt-4">
                <h3 className="text-sm font-medium text-gray-500">요약</h3>
                <p className="mt-1 text-gray-900">{selfAssessment.summary_text}</p>
              </div>
            )}
          </div>
        ) : template ? (
          <SelfAssessmentForm caseId={id} template={template} />
        ) : (
          <p className="text-gray-500">활성화된 자가진단 템플릿이 없습니다.</p>
        )}
      </div>

      {/* 매칭 추천 섹션 */}
      {selfAssessment && (
        <div className="bg-white shadow rounded-lg p-6 mb-6">
          <h2 className="text-lg font-bold text-gray-900 mb-4">매칭 추천</h2>

          {matchingRecommendations && matchingRecommendations.length > 0 ? (
            <>
              <MatchingRecommendations recommendations={matchingRecommendations} />
              <RecalculateMatchingButton
                caseId={id}
                hasAssignment={!!caseData.assigned_consultant}
              />
            </>
          ) : (
            <div className="text-center py-8">
              <p className="text-gray-500 mb-4">매칭 추천이 생성되지 않았습니다.</p>
              <Link
                href={`/ops/cases/${id}/matching`}
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-purple-600 hover:bg-purple-700"
              >
                매칭 추천 생성
              </Link>
            </div>
          )}
        </div>
      )}

      {/* 배정 섹션 */}
      {matchingRecommendations && matchingRecommendations.length > 0 && (
        <ReassignmentSection
          caseData={caseData}
          caseId={id}
          recommendations={matchingRecommendations}
          latestAssignment={assignments?.[0]}
        />
      )}

      {/* 배정 이력 */}
      {assignments && assignments.length > 0 && (
        <div className="bg-white shadow rounded-lg p-6 mb-6">
          <h2 className="text-lg font-bold text-gray-900 mb-4">배정 이력</h2>
          <div className="space-y-4">
            {assignments.map((assignment) => (
              <div
                key={assignment.id}
                className={`p-4 rounded-lg ${assignment.is_current ? 'bg-green-50' : 'bg-gray-50'}`}
              >
                <div className="flex justify-between">
                  <div>
                    <p className="font-medium text-gray-900">
                      {assignment.consultant?.name}
                      {assignment.is_current && (
                        <span className="ml-2 text-xs text-green-600">(현재)</span>
                      )}
                    </p>
                    <p className="text-sm text-gray-500">배정: {assignment.assignment_reason}</p>
                    {assignment.unassignment_reason && (
                      <p className="text-sm text-red-500">해제: {assignment.unassignment_reason}</p>
                    )}
                  </div>
                  <div className="text-right text-sm text-gray-500">
                    <p>{new Date(assignment.assigned_at).toLocaleDateString('ko-KR')}</p>
                    <p>by {assignment.assigned_by_user?.name}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 로드맵 열람 (읽기 전용) */}
      {['ROADMAP_DRAFTED', 'FINALIZED'].includes(caseData.status) && (
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-4">AI 교육 로드맵</h2>
          <div className="flex items-center justify-between">
            <p className="text-gray-600">
              {caseData.status === 'FINALIZED'
                ? '최종 확정된 로드맵이 있습니다.'
                : '로드맵 초안이 생성되었습니다.'}
            </p>
            <Link
              href={`/ops/cases/${id}/roadmap`}
              className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
            >
              로드맵 보기 (읽기 전용)
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
