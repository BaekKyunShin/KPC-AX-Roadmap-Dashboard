'use server';

import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { PROJECT_STALL_THRESHOLDS } from '@/lib/constants/status';
import { MILLISECONDS_PER_DAY } from '@/lib/constants/time';

/**
 * 상태별 프로젝트 통계 조회
 */
export interface ProjectStats {
  total: number;
  byStatus: Record<string, number>;
}

export async function fetchProjectStats(): Promise<ProjectStats> {
  const supabase = await createClient();

  const { data: projects, error } = await supabase
    .from('projects')
    .select('status');

  if (error || !projects) {
    console.error('[fetchProjectStats Error]', error);
    return { total: 0, byStatus: {} };
  }

  const byStatus: Record<string, number> = {};
  for (const project of projects) {
    byStatus[project.status] = (byStatus[project.status] || 0) + 1;
  }

  return {
    total: projects.length,
    byStatus,
  };
}

/**
 * 월별 로드맵 확정 현황 조회 (최근 6개월)
 */
export interface MonthlyCompletion {
  month: string; // YYYY-MM
  label: string; // 표시용 (예: "1월")
  count: number;
}

export async function fetchMonthlyCompletions(): Promise<MonthlyCompletion[]> {
  const supabase = await createClient();

  // 최근 6개월 범위 계산
  const now = new Date();
  const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);

  const { data: versions, error } = await supabase
    .from('roadmap_versions')
    .select('finalized_at')
    .eq('status', 'FINAL')
    .not('finalized_at', 'is', null)
    .gte('finalized_at', sixMonthsAgo.toISOString());

  if (error) {
    console.error('[fetchMonthlyCompletions Error]', error);
    return [];
  }

  // 월별 집계
  const monthlyCount: Record<string, number> = {};

  // 최근 6개월 초기화
  for (let i = 5; i >= 0; i--) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    monthlyCount[key] = 0;
  }

  // 데이터 집계
  for (const version of versions || []) {
    if (version.finalized_at) {
      const date = new Date(version.finalized_at);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      if (key in monthlyCount) {
        monthlyCount[key]++;
      }
    }
  }

  // 결과 변환 (첫 월 + 연도 변경 시점에 연도 표시)
  const entries = Object.entries(monthlyCount);
  let prevYear: string | null = null;

  return entries.map(([month, count], index) => {
    const [year, monthNum] = month.split('-');
    const isFirst = index === 0;
    const yearChanged = prevYear !== null && prevYear !== year;
    const showYear = isFirst || yearChanged;
    prevYear = year;

    return {
      month,
      label: showYear ? `${year.slice(2)}년 ${parseInt(monthNum)}월` : `${parseInt(monthNum)}월`,
      count,
    };
  });
}

/**
 * 컨설턴트별 프로젝트 진행 현황 조회
 */
export interface ConsultantProgress {
  id: string;
  name: string;
  email: string;
  assigned: number; // 배정 대기 (ASSIGNED 상태)
  interviewing: number; // 인터뷰 중 (INTERVIEWED 상태)
  drafting: number; // 로드맵 작업 중 (ROADMAP_DRAFTED 상태)
  completed: number; // 완료 (FINALIZED 상태)
  total: number;
}

export async function fetchConsultantProgress(): Promise<ConsultantProgress[]> {
  const adminSupabase = createAdminClient();

  // 승인된 컨설턴트 목록 조회
  const { data: consultants, error: consultantError } = await adminSupabase
    .from('users')
    .select('id, name, email')
    .eq('role', 'CONSULTANT_APPROVED')
    .eq('status', 'ACTIVE');

  if (consultantError || !consultants) {
    console.error('[fetchConsultantProgress Error]', consultantError);
    return [];
  }

  // 프로젝트별 컨설턴트 배정 현황 조회
  const { data: projects, error: projectError } = await adminSupabase
    .from('projects')
    .select('assigned_consultant_id, status')
    .not('assigned_consultant_id', 'is', null);

  if (projectError) {
    console.error('[fetchConsultantProgress Error]', projectError);
    return [];
  }

  // 컨설턴트별 통계 계산
  const progressMap: Record<string, ConsultantProgress> = {};

  for (const consultant of consultants) {
    progressMap[consultant.id] = {
      id: consultant.id,
      name: consultant.name,
      email: consultant.email,
      assigned: 0,
      interviewing: 0,
      drafting: 0,
      completed: 0,
      total: 0,
    };
  }

  for (const project of projects || []) {
    const consultantId = project.assigned_consultant_id;
    if (consultantId && progressMap[consultantId]) {
      progressMap[consultantId].total++;

      switch (project.status) {
        case 'ASSIGNED':
          progressMap[consultantId].assigned++;
          break;
        case 'INTERVIEWED':
          progressMap[consultantId].interviewing++;
          break;
        case 'ROADMAP_DRAFTED':
          progressMap[consultantId].drafting++;
          break;
        case 'FINALIZED':
          progressMap[consultantId].completed++;
          break;
      }
    }
  }

  // 담당 프로젝트가 있는 컨설턴트만 필터링하고 총합 기준 정렬
  return Object.values(progressMap)
    .filter(c => c.total > 0)
    .sort((a, b) => b.total - a.total);
}

/**
 * 정체 프로젝트 조회 (특정 일수 이상 동일 상태 유지)
 */
export interface StalledProject {
  id: string;
  company_name: string;
  contact_email: string;
  status: string;
  days_stalled: number;
  assigned_consultant?: { id: string; name: string } | null;
  severity: 'high' | 'medium'; // 14일 이상: high, 7-13일: medium
}

export async function fetchStalledProjects(minDays: number = PROJECT_STALL_THRESHOLDS.DASHBOARD_MIN): Promise<StalledProject[]> {
  const supabase = await createClient();

  // 완료되지 않은 프로젝트 조회
  const { data: projects, error } = await supabase
    .from('projects')
    .select(`
      id,
      company_name,
      contact_email,
      status,
      updated_at,
      assigned_consultant:users!projects_assigned_consultant_id_fkey(id, name)
    `)
    .neq('status', 'FINALIZED');

  if (error || !projects) {
    console.error('[fetchStalledProjects Error]', error);
    return [];
  }

  const now = new Date();
  const stalledProjects: StalledProject[] = [];

  for (const project of projects) {
    const updatedAt = new Date(project.updated_at);
    const daysDiff = Math.floor((now.getTime() - updatedAt.getTime()) / MILLISECONDS_PER_DAY);

    if (daysDiff >= minDays) {
      stalledProjects.push({
        id: project.id,
        company_name: project.company_name,
        contact_email: project.contact_email,
        status: project.status,
        days_stalled: daysDiff,
        assigned_consultant: Array.isArray(project.assigned_consultant)
          ? project.assigned_consultant[0] || null
          : project.assigned_consultant,
        severity: daysDiff >= PROJECT_STALL_THRESHOLDS.SEVERE ? 'high' : 'medium',
      });
    }
  }

  // 정체 일수 기준 내림차순 정렬
  return stalledProjects.sort((a, b) => b.days_stalled - a.days_stalled);
}
