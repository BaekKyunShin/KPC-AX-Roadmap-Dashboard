'use server';

import { requireAuthWithRole } from '@/lib/actions/auth-helpers';
import { OPS_MANAGER_ROLES } from '@/lib/constants/status';
import { getPBLReport, listVersions, type PBLReportRow } from '@/lib/services/pbl/pbl-crud';

// ============================================================================
// 운영자 전용 PBL 조회 액션 (읽기 전용)
// ----------------------------------------------------------------------------
// 운영자는 편집·확정·공유 권한 없음 — 감사·조회 범위만 제공.
// ============================================================================

export async function fetchPBLForOps(pblId: string): Promise<PBLReportRow | null> {
  const auth = await requireAuthWithRole(OPS_MANAGER_ROLES, {
    roleError: '운영자만 접근 가능합니다.',
  });
  if ('error' in auth) return null;

  return await getPBLReport(pblId);
}

export async function listPBLVersionsForOps(projectId: string): Promise<PBLReportRow[]> {
  const auth = await requireAuthWithRole(OPS_MANAGER_ROLES, {
    roleError: '운영자만 접근 가능합니다.',
  });
  if ('error' in auth) return [];

  return await listVersions(projectId);
}
