import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import type { StalledProject } from '../actions';
import {
  PROJECT_STATUS_CONFIG,
  PROJECT_STALL_THRESHOLDS,
  STALLED_STATUS_MESSAGES,
} from '@/lib/constants/status';
import type { ProjectStatus } from '@/types/database';
import { AlertTriangle, ArrowRight, CheckCircle2 } from 'lucide-react';

/** 정체 프로젝트 카드 너비 (px) */
const STALLED_CARD_WIDTH = 220;

// ============================================================================
// 하위 컴포넌트
// ============================================================================

/** 정체 프로젝트 카드 */
function StalledProjectCard({ project }: { project: StalledProject }) {
  const projectStatus = project.status as ProjectStatus;
  const statusMessage =
    STALLED_STATUS_MESSAGES[projectStatus] ?? '상태 변경 후';
  const isSevere = project.days_stalled >= PROJECT_STALL_THRESHOLDS.SEVERE;
  const statusConfig = PROJECT_STATUS_CONFIG[projectStatus];

  return (
    <div
      className="flex-shrink-0 rounded-xl border bg-card p-5 shadow-sm hover:shadow-md transition-shadow"
      style={{ width: STALLED_CARD_WIDTH }}
    >
      {/* 기업명 */}
      <h4
        className="font-semibold text-base text-center truncate"
        title={project.company_name}
      >
        {project.company_name}
      </h4>

      {/* 담당 컨설턴트 */}
      <div className="mt-3 text-center">
        <span className="text-xs text-muted-foreground">담당 컨설턴트</span>
        <p className="text-sm font-medium mt-0.5">
          {project.assigned_consultant?.name || '미배정'}
        </p>
      </div>

      {/* 상태 배지 */}
      <div className="mt-4 flex justify-center">
        <Badge
          variant="outline"
          className={statusConfig?.color || 'bg-gray-100'}
        >
          {statusConfig?.label || project.status}
        </Badge>
      </div>

      {/* 경과일 */}
      <div className="mt-4 text-center">
        <p className="text-xs text-muted-foreground">{statusMessage}</p>
        <p
          className={`text-xl font-bold mt-1 ${
            isSevere ? 'text-red-600' : 'text-amber-600'
          }`}
        >
          {project.days_stalled}일 경과
        </p>
      </div>

      {/* 상세보기 버튼 */}
      <div className="mt-4">
        <Link href={`/ops/projects/${project.id}`} className="block">
          <Button
            variant="ghost"
            size="sm"
            className="w-full text-blue-600 hover:text-blue-700"
          >
            상세보기
            <ArrowRight className="h-4 w-4 ml-1" />
          </Button>
        </Link>
      </div>
    </div>
  );
}

/** 정체 프로젝트 빈 상태 */
function StalledProjectsEmpty() {
  return (
    <div className="flex items-center justify-center text-muted-foreground py-8">
      <CheckCircle2 className="h-5 w-5 mr-2 text-green-500" />
      <span>
        {PROJECT_STALL_THRESHOLDS.DASHBOARD_MIN}일 이상 정체된 프로젝트가
        없습니다
      </span>
    </div>
  );
}

/** 정체 프로젝트 카드 목록 */
function StalledProjectCardList({
  projects,
}: {
  projects: StalledProject[];
}) {
  if (projects.length === 0) {
    return <StalledProjectsEmpty />;
  }

  return (
    <div className="relative">
      {/* 스크롤 영역 */}
      <div
        className="flex gap-4 overflow-x-auto pb-2 scroll-smooth snap-x snap-mandatory"
        style={{ scrollbarWidth: 'thin' }}
      >
        {projects.map((project) => (
          <div key={project.id} className="snap-start">
            <StalledProjectCard project={project} />
          </div>
        ))}
      </div>
      {/* 우측 스크롤 힌트 그라데이션 */}
      {projects.length > 1 && (
        <div className="pointer-events-none absolute right-0 top-0 bottom-2 w-12 bg-gradient-to-l from-background to-transparent" />
      )}
    </div>
  );
}

// ============================================================================
// 메인 컴포넌트
// ============================================================================

export default function StalledProjectsSection({
  projects,
}: {
  projects: StalledProject[];
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-lg">
              <AlertTriangle className="h-5 w-5 text-amber-600" />
              정체 프로젝트
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              {PROJECT_STALL_THRESHOLDS.DASHBOARD_MIN}일 이상 동일 단계에
              머물러 있는 프로젝트
            </p>
          </div>
          {projects.length > 0 && (
            <Badge variant="secondary" className="text-base px-3 py-1">
              {projects.length}건
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <StalledProjectCardList projects={projects} />
      </CardContent>
    </Card>
  );
}
