import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import SelfAssessmentForm from '@/components/ops/SelfAssessmentForm';
import AssignmentTabSection from '@/components/ops/AssignmentTabSection';
import { getProjectStatusBadge } from '@/lib/constants/status';
import type { ProjectStatus } from '@/types/database';

export default async function ProjectDetailPage({ params }: { params: Promise<{ id: string }> }) {
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

  // 프로젝트 조회
  const { data: projectData } = await supabase
    .from('projects')
    .select(`
      *,
      assigned_consultant:users!projects_assigned_consultant_id_fkey(id, name, email)
    `)
    .eq('id', id)
    .single();

  if (!projectData) {
    notFound();
  }

  // 자가진단 조회
  const { data: selfAssessment } = await supabase
    .from('self_assessments')
    .select('*')
    .eq('project_id', id)
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
    .eq('project_id', id)
    .order('rank', { ascending: true });

  // 배정 이력 조회
  const { data: assignments } = await supabase
    .from('project_assignments')
    .select(`
      *,
      consultant:users!project_assignments_consultant_id_fkey(id, name, email),
      assigned_by_user:users!project_assignments_assigned_by_fkey(id, name)
    `)
    .eq('project_id', id)
    .order('assigned_at', { ascending: false });

  const statusInfo = getProjectStatusBadge(projectData.status as ProjectStatus);

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6">
        <Link href="/ops/projects" className="text-sm text-gray-500 hover:text-gray-700">
          ← 프로젝트 목록으로
        </Link>
      </div>

      {/* 프로젝트 기본 정보 */}
      <div className="bg-white shadow rounded-lg p-6 mb-6">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{projectData.company_name}</h1>
            <p className="text-gray-500">{projectData.industry} | {projectData.company_size}</p>
          </div>
          <span className={`px-3 py-1 rounded-full text-sm ${statusInfo.color}`}>
            {statusInfo.label}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-4 mt-4">
          <div>
            <h3 className="text-sm font-medium text-gray-500">담당자</h3>
            <p className="text-gray-900">{projectData.contact_name}</p>
            <p className="text-sm text-gray-500">{projectData.contact_email}</p>
            {projectData.contact_phone && (
              <p className="text-sm text-gray-500">{projectData.contact_phone}</p>
            )}
          </div>
          <div>
            <h3 className="text-sm font-medium text-gray-500">배정 컨설턴트</h3>
            {projectData.assigned_consultant ? (
              <>
                <p className="text-gray-900">{projectData.assigned_consultant.name}</p>
                <p className="text-sm text-gray-500">{projectData.assigned_consultant.email}</p>
              </>
            ) : (
              <p className="text-gray-400">미배정</p>
            )}
          </div>
        </div>

        {projectData.customer_comment && (
          <div className="mt-4">
            <h3 className="text-sm font-medium text-gray-500">고객 코멘트</h3>
            <p className="mt-1 text-gray-900">{projectData.customer_comment}</p>
          </div>
        )}
      </div>

      {/* 자가진단 섹션 */}
      <div className="bg-white shadow rounded-lg p-6 mb-6">
        <h2 className="text-lg font-bold text-gray-900 mb-4">자가진단</h2>

        {selfAssessment ? (
          (() => {
            const totalScore = Math.round(selfAssessment.scores.total_score);
            const maxScore = Math.round(selfAssessment.scores.max_possible_score);
            const percentage = Math.round((totalScore / maxScore) * 100);
            const getScoreColor = (pct: number) => {
              if (pct > 60) return { bg: 'bg-green-500', text: 'text-green-600', light: 'bg-green-50' };
              if (pct >= 30) return { bg: 'bg-yellow-500', text: 'text-yellow-600', light: 'bg-yellow-50' };
              return { bg: 'bg-red-500', text: 'text-red-600', light: 'bg-red-50' };
            };
            const totalColor = getScoreColor(percentage);

            return (
              <div>
                {/* 총점 - 크고 가시적으로 */}
                <div className="mb-6 p-6 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-100">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-medium text-gray-500">종합 점수</h3>
                    <span className="text-xs text-gray-400">
                      {new Date(selfAssessment.created_at).toLocaleDateString('ko-KR')} 진단
                    </span>
                  </div>
                  <div className="flex items-end gap-3 mb-3">
                    <span className="text-5xl font-bold text-gray-900">{totalScore}</span>
                    <span className="text-2xl text-gray-400 mb-1">/ {maxScore}</span>
                    <span className={`ml-2 px-3 py-1 rounded-full text-sm font-medium ${totalColor.light} ${totalColor.text}`}>
                      {percentage}%
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3">
                    <div
                      className={`h-3 rounded-full ${totalColor.bg} transition-all duration-500`}
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>

                {/* 항목별 점수 - 작고 컴팩트하게 */}
                {selfAssessment.scores.dimension_scores && (
                  <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
                    {selfAssessment.scores.dimension_scores.map((ds: { dimension: string; score: number; max_score: number }) => {
                      const dimScore = Math.round(ds.score);
                      const dimMax = Math.round(ds.max_score);
                      const dimPct = Math.round((dimScore / dimMax) * 100);
                      const dimColor = getScoreColor(dimPct);

                      return (
                        <div key={ds.dimension} className="p-3 bg-gray-50 rounded-lg border border-gray-100">
                          <div className="flex justify-between items-center mb-2">
                            <p className="text-xs font-medium text-gray-600 truncate">{ds.dimension}</p>
                            <span className={`text-xs font-medium ${dimColor.text}`}>{dimPct}%</span>
                          </div>
                          <div className="flex items-baseline gap-1 mb-2">
                            <span className="text-lg font-bold text-gray-800">{dimScore}</span>
                            <span className="text-xs text-gray-400">/ {dimMax}</span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-1.5">
                            <div
                              className={`h-1.5 rounded-full ${dimColor.bg}`}
                              style={{ width: `${dimPct}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {selfAssessment.summary_text && (
                  <div className="mt-4 p-3 bg-gray-50 rounded-lg border border-gray-100">
                    <h3 className="text-xs font-medium text-gray-500 mb-1">요약</h3>
                    <p className="text-sm text-gray-700">{selfAssessment.summary_text}</p>
                  </div>
                )}
              </div>
            );
          })()
        ) : template ? (
          <SelfAssessmentForm projectId={id} template={template} />
        ) : (
          <p className="text-gray-500">활성화된 자가진단 템플릿이 없습니다.</p>
        )}
      </div>

      {/* 컨설턴트 배정 섹션 (자동 매칭 / 수동 매칭 통합) */}
      <AssignmentTabSection
        projectData={projectData}
        projectId={id}
        recommendations={matchingRecommendations || []}
        latestAssignment={assignments?.[0]}
        hasSelfAssessment={!!selfAssessment}
      />

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
      {['ROADMAP_DRAFTED', 'FINALIZED'].includes(projectData.status) && (
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-4">AI 교육 로드맵</h2>
          <div className="flex items-center justify-between">
            <p className="text-gray-600">
              {projectData.status === 'FINALIZED'
                ? '최종 확정된 로드맵이 있습니다.'
                : '로드맵 초안이 생성되었습니다.'}
            </p>
            <Link
              href={`/ops/projects/${id}/roadmap`}
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
