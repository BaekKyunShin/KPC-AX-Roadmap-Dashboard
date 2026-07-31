import { Suspense } from 'react';
import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import { FileText, ClipboardList } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin'; // admin: 산출물 count (RLS 무관 방어 조회)
import { getCachedUser, getCachedProfile } from '@/lib/supabase/cached';
import CollapsibleDirectInput from '@/components/ops/CollapsibleDirectInput';
import AssessmentTokenSection from './_components/AssessmentTokenSection';
import AssignmentTabSection from '@/components/ops/AssignmentTabSection';
import type { Recommendation } from '@/components/ops/assignment/utils';
import { PageHeader } from '@/components/ui/page-header';
import { SelfAssessmentResult } from '@/components/ui/SelfAssessmentResult';
import { Skeleton } from '@/components/ui/Skeleton';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { getProjectStatusBadge, isOpsManager } from '@/lib/constants/status';
import type { ProjectStatus } from '@/types/database';
import { COMPANY_SIZE_LABELS, type CompanySizeValue } from '@/lib/constants/company-size';
import { RoadmapInterviewSummary } from '@/components/interview/RoadmapInterviewSummary';
import { PblInterviewSummary } from '@/components/interview/PblInterviewSummary';
import { TrackBadge } from '@/components/ui/TrackBadge';
import { ClosedBadge } from '@/components/common/ClosedBadge';
import { formatDateKR } from '@/lib/utils/date';
import { mapInterviewRowToRoadmapInterview } from '@/lib/schemas/interview-roadmap';
import type { PBLInterview } from '@/lib/schemas/interview-pbl';
import { getLatestToken } from '../actions';
import ProjectTimeline from '../_components/ProjectTimeline';
import { ProjectClosureControls } from './_components/ProjectClosureControls';

// ============================================================================
// 공통 타입
// ============================================================================

type ProjectRow = {
  id: string;
  company_name: string;
  industry: string;
  company_size: string;
  status: string;
  track: 'ROADMAP' | 'PBL';
  contact_name: string;
  contact_email: string;
  contact_phone: string | null;
  customer_comment: string | null;
  assigned_consultant_id: string | null;
  is_test_mode: boolean;
  // 행정 종결 메타 (마이그 076)
  closed_at: string | null;
  closure_reason: string | null;
  closed_from_status: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
  assigned_consultant: { id: string; name: string; email: string } | null;
  closed_by_user: { name: string } | null;
};

// ============================================================================
// 스켈레톤 폴백 컴포넌트
// ============================================================================

function SelfAssessmentSkeleton() {
  return (
    <Card>
      <CardHeader className="pb-3">
        <Skeleton className="h-5 w-28" />
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-3 w-full max-w-[200px]" />
              <Skeleton className="h-4 w-10" />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function AssignmentSkeleton() {
  return (
    <Card>
      <CardHeader className="pb-3">
        <Skeleton className="h-5 w-28" />
      </CardHeader>
      <CardContent>
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full mt-3" />
      </CardContent>
    </Card>
  );
}

function InterviewSkeleton() {
  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <Skeleton className="h-5 w-24" />
          <Skeleton className="h-4 w-28" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="space-y-1">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-4 w-full" />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// ============================================================================
// 비동기 섹션 Server Components
// ============================================================================

async function SelfAssessmentSection({ projectId }: { projectId: string }) {
  const supabase = await createClient();

  const [{ data: selfAssessment }, { data: template }, latestTokenData] = await Promise.all([
    supabase
      .from('self_assessments')
      .select('scores, created_at')
      .eq('project_id', projectId)
      .single(),
    supabase
      .from('self_assessment_templates')
      .select('id, version, name, questions')
      .eq('is_active', true)
      .single(),
    getLatestToken(projectId),
  ]);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">자가진단 결과</CardTitle>
      </CardHeader>
      <CardContent>
        {selfAssessment ? (
          <SelfAssessmentResult
            scores={selfAssessment.scores}
            createdAt={selfAssessment.created_at}
          />
        ) : template ? (
          <div className="space-y-6">
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-3">고객사 자가진단 링크</h3>
              <AssessmentTokenSection projectId={projectId} latestToken={latestTokenData} />
            </div>
            <CollapsibleDirectInput projectId={projectId} template={template} />
          </div>
        ) : (
          <p className="text-gray-500">활성화된 자가진단 템플릿이 없습니다.</p>
        )}
      </CardContent>
    </Card>
  );
}

async function AssignmentSection({
  projectId,
  projectData,
}: {
  projectId: string;
  projectData: ProjectRow;
}) {
  const supabase = await createClient();

  const [{ data: selfAssessment }, { data: matchingRecommendations }, { data: assignments }] =
    await Promise.all([
      supabase.from('self_assessments').select('scores').eq('project_id', projectId).single(),
      supabase
        .from('matching_recommendations')
        .select(
          `
          id, project_id, candidate_user_id, total_score, score_breakdown, rationale, rank, created_at,
          candidate:users!matching_recommendations_candidate_user_id_fkey(
            id, name, email,
            consultant_profile:consultant_profiles(expertise_domains, available_industries, sub_industries, teaching_levels, skill_tags, years_of_experience, strengths_constraints)
          )
        `
        )
        .eq('project_id', projectId)
        .order('rank', { ascending: true })
        .returns<Recommendation[]>(),
      supabase
        .from('project_assignments')
        .select(
          `
          id, project_id, consultant_id, assigned_by, assignment_reason, is_current, assigned_at,
          consultant:users!project_assignments_consultant_id_fkey(id, name, email),
          assigned_by_user:users!project_assignments_assigned_by_fkey(id, name)
        `
        )
        .eq('project_id', projectId)
        .order('assigned_at', { ascending: false })
        .returns<
          {
            id: string;
            project_id: string;
            consultant_id: string;
            assigned_by: string;
            assignment_reason: string;
            is_current: boolean;
            assigned_at: string;
            consultant: { id: string; name: string; email: string } | null;
            assigned_by_user: { id: string; name: string } | null;
          }[]
        >(),
    ]);

  return (
    <AssignmentTabSection
      projectData={projectData}
      projectId={projectId}
      recommendations={matchingRecommendations || []}
      latestAssignment={assignments?.[0]}
      hasSelfAssessment={!!selfAssessment}
    />
  );
}

async function InterviewSection({
  projectId,
  track,
}: {
  projectId: string;
  track: 'ROADMAP' | 'PBL';
}) {
  const supabase = await createClient();

  // ISSUE-17 Step D-1: Batch 1 에서 추가된 필드까지 모두 조회.
  //   - interview_round, participants, stt_insights → ROADMAP/PBL 공통
  //   - pbl_data JSONB → PBL 전용 (trainingEnvironment, hrdNecessity 등)
  //   - company_details JSONB 안에 roadmap_* 키들이 들어 있어 그대로 noarrow 조회
  const { data: interview } = await supabase
    .from('interviews')
    .select(
      'id, interview_date, interview_round, interview_time, participants, company_details, job_tasks, pain_points, constraints, improvement_goals, notes, customer_requirements, stt_insights, pbl_data'
    )
    .eq('project_id', projectId)
    .maybeSingle();

  if (!interview) return null;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <ClipboardList className="h-4 w-4 text-blue-600" />
            인터뷰 기록
          </CardTitle>
          {interview.interview_date && (
            <span className="text-sm text-gray-500">
              {formatDateKR(interview.interview_date)} 인터뷰
            </span>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {track === 'PBL' ? (
          <PblInterviewSummary interview={(interview.pbl_data ?? {}) as Partial<PBLInterview>} />
        ) : (
          <RoadmapInterviewSummary interview={mapInterviewRowToRoadmapInterview(interview)} />
        )}
      </CardContent>
    </Card>
  );
}

// ============================================================================
// 메인 페이지 컴포넌트
// ============================================================================

export default async function ProjectDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCachedUser();
  if (!user) redirect('/login');

  const profile = await getCachedProfile();
  if (!profile || !isOpsManager(profile.role)) {
    redirect('/dashboard');
  }

  const supabase = await createClient();

  // 프로젝트 조회 (헤더 즉시 렌더링에 필요)
  const { data: projectData } = await supabase
    .from('projects')
    .select(
      `
      id, company_name, industry, company_size, status, track,
      contact_name, contact_email, contact_phone,
      customer_comment, assigned_consultant_id, is_test_mode,
      closed_at, closure_reason, closed_from_status,
      created_by, created_at, updated_at,
      assigned_consultant:users!projects_assigned_consultant_id_fkey(id, name, email),
      closed_by_user:users!projects_closed_by_fkey(name)
    `
    )
    .eq('id', id)
    .returns<ProjectRow[]>()
    .single();

  if (!projectData) {
    notFound();
  }
  const statusInfo = getProjectStatusBadge(projectData.status as ProjectStatus);

  // 기업 규모 라벨 변환
  const companySizeLabel =
    COMPANY_SIZE_LABELS[projectData.company_size as CompanySizeValue]
      ?.replace(/\d+[~,]?\d*명\s*/, '')
      ?.replace(/[()]/g, '') || projectData.company_size;

  // 산출물 카드 방어 — 산출물 0개인 종결 프로젝트에서 "최종 확정된 로드맵이 있습니다"
  // 허위 문구가 뜨지 않도록 track별 버전 존재 여부를 서버에서 count 조회.
  const showArtifactCard = ['ROADMAP_DRAFTED', 'PBL_DRAFTED', 'FINALIZED'].includes(
    projectData.status
  );
  let hasArtifact = false;
  if (showArtifactCard) {
    const artifactTable = projectData.track === 'PBL' ? 'pbl_reports' : 'roadmap_versions';
    const { count } = await createAdminClient()
      .from(artifactTable)
      .select('id', { count: 'exact', head: true })
      .eq('project_id', id);
    hasArtifact = (count ?? 0) > 0;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={projectData.company_name}
        description={`${projectData.industry} · ${companySizeLabel}`}
        backLink={{ href: '/ops/projects', label: '프로젝트 목록', useBack: true }}
        actions={<TrackBadge track={projectData.track} />}
      />

      {/* 기업 정보 카드 - 컴팩트 2컬럼 레이아웃 */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">기업 정보</CardTitle>
            <div className="flex items-center gap-2">
              <span className={`px-3 py-1 rounded-full text-xs font-medium ${statusInfo.color}`}>
                {statusInfo.label}
              </span>
              {projectData.closed_at && <ClosedBadge />}
            </div>
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
                <a
                  href={`mailto:${projectData.contact_email}`}
                  className="text-sm text-gray-600 hover:text-blue-600"
                >
                  {projectData.contact_email}
                </a>
              </div>
              {projectData.contact_phone && (
                <div className="flex items-baseline gap-2">
                  <span className="text-xs text-gray-500 w-12 flex-shrink-0">연락처</span>
                  <a
                    href={`tel:${projectData.contact_phone}`}
                    className="text-sm text-gray-600 hover:text-blue-600"
                  >
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
                <span className="text-xs text-gray-500 flex-shrink-0 pt-0.5">
                  고객 코멘트/요청사항
                </span>
                <p className="text-sm text-gray-700 break-keep break-words">
                  {projectData.customer_comment}
                </p>
              </div>
            </div>
          )}

          {/* 행정 종결 정보 - 종결 상태에서만 표시 */}
          {projectData.closed_at && (
            <div className="mt-3 pt-3 border-t border-gray-100">
              <div className="flex items-start gap-2">
                <span className="text-xs text-gray-500 flex-shrink-0 pt-0.5">종결 정보</span>
                <div className="text-sm text-gray-700 space-y-0.5">
                  <p>
                    {formatDateKR(projectData.closed_at)}
                    {projectData.closed_by_user?.name && ` · ${projectData.closed_by_user.name}`}
                    {projectData.closed_from_status &&
                      ` · '${getProjectStatusBadge(projectData.closed_from_status as ProjectStatus).label}' 상태에서 종결`}
                  </p>
                  {projectData.closure_reason && (
                    <p className="text-gray-600 break-keep break-words">
                      사유: {projectData.closure_reason}
                    </p>
                  )}
                </div>
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
        <Suspense fallback={<SelfAssessmentSkeleton />}>
          <SelfAssessmentSection projectId={id} />
        </Suspense>

        {/* 컨설턴트 배정 섹션 */}
        <Suspense fallback={<AssignmentSkeleton />}>
          <AssignmentSection projectId={id} projectData={projectData} />
        </Suspense>

        {/* 인터뷰 정보 (읽기 전용) — 트랙별 분기 (ISSUE-17) */}
        <Suspense fallback={<InterviewSkeleton />}>
          <InterviewSection projectId={id} track={projectData.track} />
        </Suspense>

        {/* 산출물 열람 (읽기 전용) — 트랙별 분기 (OFA-11) */}
        {showArtifactCard && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <FileText className="h-4 w-4 text-purple-600" />
                {projectData.track === 'PBL' ? 'PBL 보고서' : 'AI 교육 로드맵'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <p className="text-gray-600">
                  {/* 행정 종결은 FINAL 승격 없이 status만 FINALIZED — 산출물 실상태로 문구 분기 */}
                  {!hasArtifact
                    ? '아직 생성된 산출물이 없습니다.'
                    : projectData.status === 'FINALIZED' && !projectData.closed_at
                      ? projectData.track === 'PBL'
                        ? '최종 확정된 PBL 보고서가 있습니다.'
                        : '최종 확정된 로드맵이 있습니다.'
                      : projectData.track === 'PBL'
                        ? 'PBL 보고서 초안이 생성되었습니다.'
                        : '로드맵 초안이 생성되었습니다.'}
                </p>
                <Link
                  href={
                    projectData.track === 'PBL'
                      ? `/ops/projects/${id}/pbl`
                      : `/ops/projects/${id}/roadmap`
                  }
                  className="inline-flex items-center px-4 py-2 bg-purple-600 text-white rounded-md text-sm font-medium hover:bg-purple-700 transition-colors"
                >
                  {projectData.track === 'PBL' ? 'PBL 보고서 보기' : '로드맵 보기'}
                </Link>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* 행정 종결/해제 컨트롤 — 드문 관리 작업이라 최하단 배치.
          정식 확정(FINALIZED + 종결 메타 없음) 프로젝트는 종결 대상이 아니므로 미노출 */}
      {!(projectData.status === 'FINALIZED' && !projectData.closed_at) && (
        <ProjectClosureControls
          projectId={id}
          companyName={projectData.company_name}
          closedAt={projectData.closed_at}
        />
      )}
    </div>
  );
}
