'use server';

import { requireAuth } from '@/lib/actions/auth-helpers';
import { createAdminClient } from '@/lib/supabase/admin';
import type { SearchResults, CommandItem } from '@/components/command-palette/types';
import type { ActionResult } from '@/lib/types/action-result';
import { successResult, errorResult } from '@/lib/types/action-result';
import { PROJECT_STATUS_CONFIG, ROADMAP_VERSION_STATUS_CONFIG } from '@/lib/constants/status';
import { ROLE_LABELS } from '@/lib/constants/message';
import type { ProjectStatus, RoadmapVersionStatus } from '@/types/database';

const MIN_QUERY_LENGTH = 2;
const MAX_RESULTS_PER_CATEGORY = 5;

export async function unifiedSearch(
  query: string,
): Promise<ActionResult<SearchResults>> {
  const auth = await requireAuth();
  if ('error' in auth) return errorResult(auth.error);

  if (query.length < MIN_QUERY_LENGTH) {
    return successResult({ projects: [], users: [], gallery: [] });
  }

  const { user, role } = auth;
  const isAdmin = role === 'OPS_ADMIN' || role === 'SYSTEM_ADMIN';
  const isConsultant = role === 'CONSULTANT_APPROVED';
  const admin = createAdminClient();
  const pattern = `%${query}%`;

  // ─── 프로젝트 검색 ──────────────────────────────────────────────────

  const projectPromise = (async (): Promise<CommandItem[]> => {
    let q = admin
      .from('projects')
      .select('id, company_name, industry, status')
      .ilike('company_name', pattern)
      .limit(MAX_RESULTS_PER_CATEGORY);

    if (isConsultant) {
      q = q.eq('assigned_consultant_id', user.id);
    }

    const { data, error } = await q;
    if (error || !data) return [];

    const basePath = isConsultant ? '/consultant/projects' : '/ops/projects';
    return data.map((p) => ({
      id: p.id,
      label: p.company_name,
      href: `${basePath}/${p.id}`,
      category: 'project' as const,
      description: `${p.industry} · ${PROJECT_STATUS_CONFIG[p.status as ProjectStatus]?.label ?? p.status}`,
    }));
  })();

  // ─── 사용자 검색 (관리자 전용) ──────────────────────────────────────

  const userPromise = (async (): Promise<CommandItem[]> => {
    if (!isAdmin) return [];

    const { data, error } = await admin
      .from('users')
      .select('id, name, email, role')
      .or(`name.ilike.${pattern},email.ilike.${pattern}`)
      .limit(MAX_RESULTS_PER_CATEGORY);

    if (error || !data) return [];

    return data.map((u) => ({
      id: u.id,
      label: u.name,
      href: `/ops/users`,
      category: 'user' as const,
      description: `${u.email} · ${ROLE_LABELS[u.role] ?? u.role}`,
    }));
  })();

  // ─── 갤러리 검색 ────────────────────────────────────────────────────

  const galleryPromise = (async (): Promise<CommandItem[]> => {
    let q = admin
      .from('roadmap_versions')
      .select('id, status, is_shared, pbl_course, projects!inner(company_name)')
      .ilike('projects.company_name', pattern)
      .limit(MAX_RESULTS_PER_CATEGORY);

    if (!isAdmin) {
      q = q.eq('is_shared', true).eq('status', 'FINAL');
    }

    const { data, error } = await q;
    if (error || !data) return [];

    return data.map((r) => {
      const companyName = (r.projects as unknown as { company_name: string }).company_name;
      const courseName = (r.pbl_course as { course_name?: string } | null)?.course_name;
      return {
        id: r.id,
        label: courseName ? `${companyName} — ${courseName}` : `${companyName} 로드맵`,
        href: `/gallery/${r.id}`,
        category: 'gallery' as const,
        description: `${ROADMAP_VERSION_STATUS_CONFIG[r.status as RoadmapVersionStatus]?.label ?? r.status}${r.is_shared ? ' · 공유' : ''}`,
      };
    });
  })();

  // ─── 병렬 실행 ──────────────────────────────────────────────────────

  const [projects, users, gallery] = await Promise.all([
    projectPromise,
    userPromise,
    galleryPromise,
  ]);

  return successResult({ projects, users, gallery });
}
