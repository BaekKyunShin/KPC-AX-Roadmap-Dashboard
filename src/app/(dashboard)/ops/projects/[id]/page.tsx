import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import SelfAssessmentForm from '@/components/ops/SelfAssessmentForm';
import AssignmentTabSection from '@/components/ops/AssignmentTabSection';
import ProjectTimeline from '../_components/ProjectTimeline';
import { PageHeader } from '@/components/ui/page-header';
import { SelfAssessmentResult } from '@/components/ui/SelfAssessmentResult';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { getProjectStatusBadge } from '@/lib/constants/status';
import type { ProjectStatus } from '@/types/database';
import { FileText } from 'lucide-react';
import { COMPANY_SIZE_LABELS, type CompanySizeValue } from '@/lib/constants/company-size';

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

  // 배정 이력 조회 (AssignmentTabSection에서 사용)
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

  // 기업 규모 라벨 변환
  const companySizeLabel = COMPANY_SIZE_LABELS[projectData.company_size as CompanySizeValue]
    ?.replace(/\d+[~,]?\d*명\s*/, '')
    ?.replace(/[()]/g, '')
    || projectData.company_size;

  return (
    <div className="space-y-6">
      <PageHeader
        title={projectData.company_name}
        description={`${projectData.industry} · ${companySizeLabel}`}
        backLink={{ href: '/ops/projects', label: '프로젝트 목록' }}
      />

      {/* 기업 정보 카드 - 컴팩트 2컬럼 레이아웃 */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">기업 정보</CardTitle>
            <span className={`px-3 py-1 rounded-full text-xs font-medium ${statusInfo.color}`}>
              {statusInfo.label}
            </span>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-3">
            {/* 좌측: 기업 정보 */}
            <div className="space-y-2">
              <div className="flex items-baseline gap-2">
                <span className="text-xs text-gray-500 w-12 flex-shrink-0">기업명</span>
                <span className="font-semibold text-gray-900">{projectData.company_name}</span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-xs text-gray-500 w-12 flex-shrink-0">업종</span>
                <span className="text-sm text-gray-700">{projectData.industry}</span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-xs text-gray-500 w-12 flex-shrink-0">규모</span>
                <span className="text-sm text-gray-700">{companySizeLabel}</span>
              </div>
            </div>

            {/* 우측: 담당자 정보 */}
            <div className="space-y-2">
              <div className="flex items-baseline gap-2">
                <span className="text-xs text-gray-500 w-12 flex-shrink-0">담당자</span>
                <span className="font-medium text-gray-900">{projectData.contact_name}</span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-xs text-gray-500 w-12 flex-shrink-0">이메일</span>
                <a href={`mailto:${projectData.contact_email}`} className="text-sm text-gray-600 hover:text-blue-600">
                  {projectData.contact_email}
                </a>
              </div>
              {projectData.contact_phone && (
                <div className="flex items-baseline gap-2">
                  <span className="text-xs text-gray-500 w-12 flex-shrink-0">연락처</span>
                  <a href={`tel:${projectData.contact_phone}`} className="text-sm text-gray-600 hover:text-blue-600">
                    {projectData.contact_phone}
                  </a>
                </div>
              )}
            </div>
          </div>

          {/* 고객 코멘트/요청사항 - 전체 너비 */}
          {projectData.customer_comment && (
            <div className="mt-3 pt-3 border-t border-gray-100">
              <div className="flex items-start gap-2">
                <span className="text-xs text-gray-500 flex-shrink-0 pt-0.5">고객 코멘트/요청사항</span>
                <p className="text-sm text-gray-700 break-keep break-words">{projectData.customer_comment}</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 진행 타임라인 카드 */}
      <ProjectTimeline projectId={id} />

      {/* 하단 영역: 단일 컬럼 */}
      <div className="space-y-6">
        {/* 자가진단 결과 */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">자가진단 결과</CardTitle>
          </CardHeader>
          <CardContent>
            {selfAssessment ? (
              <SelfAssessmentResult scores={selfAssessment.scores} createdAt={selfAssessment.created_at} />
            ) : template ? (
              <SelfAssessmentForm projectId={id} template={template} />
            ) : (
              <p className="text-gray-500">활성화된 자가진단 템플릿이 없습니다.</p>
            )}
          </CardContent>
        </Card>

        {/* 컨설턴트 배정 섹션 */}
        <AssignmentTabSection
          projectData={projectData}
          projectId={id}
          recommendations={matchingRecommendations || []}
          latestAssignment={assignments?.[0]}
          hasSelfAssessment={!!selfAssessment}
        />

        {/* 로드맵 열람 (읽기 전용) */}
        {['ROADMAP_DRAFTED', 'FINALIZED'].includes(projectData.status) && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <FileText className="h-4 w-4 text-purple-600" />
                AI 교육 로드맵
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <p className="text-gray-600">
                  {projectData.status === 'FINALIZED'
                    ? '최종 확정된 로드맵이 있습니다.'
                    : '로드맵 초안이 생성되었습니다.'}
                </p>
                <Link
                  href={`/ops/projects/${id}/roadmap`}
                  className="inline-flex items-center px-4 py-2 bg-purple-600 text-white rounded-md text-sm font-medium hover:bg-purple-700 transition-colors"
                >
                  로드맵 보기
                </Link>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

