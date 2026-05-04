// e2e/ops/consultant-reassignment.spec.ts
// 컨설턴트 재배정 + 해제 알림 검증.
// 참고 커밋: 83adbd8 — 이전 컨설턴트에게 '프로젝트 배정 해제' 알림 전송.
//
// 시나리오:
//   1) 시드: 프로젝트를 테스트 컨설턴트(E2E_CONSULTANT)에게 배정
//   2) beforeAll에서 선청소→더미 컨설턴트 생성 (다른 컨설턴트 후보)
//   3) OPS가 "재배정" → 더미 컨설턴트로 변경
//   4) 테스트 컨설턴트(이전) → '프로젝트 배정 해제' 알림 수신 (DB 검증)
//   5) 더미 컨설턴트(현재) → '프로젝트 배정' 알림 수신 (DB 검증)
import { test, expect } from '../fixtures/auth.fixture';
import { createClient } from '@supabase/supabase-js';
import { deleteProject } from '../helpers/cleanup.helper';
import {
  createDummyConsultant,
  deleteDummyConsultant,
  type DummyConsultant,
} from '../helpers/dummy-user.helper';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

const COMPANY_NAME = 'E2E재배정해제알림테스트';

async function fetchUserIdByEmail(email: string): Promise<string | null> {
  const { data } = await supabase.from('users').select('id').eq('email', email).single();
  return (data?.id as string) ?? null;
}

/**
 * 컨설턴트 A에게 배정된 ASSIGNED 프로젝트 생성.
 * 재배정 RPC(`assign_consultant`)가 `project_assignments.is_current=true`에서
 * 이전 컨설턴트를 조회하므로 배정 이력 행도 함께 INSERT 해야 해제 알림이 발송된다.
 */
async function seedAssignedProject(
  consultantId: string,
): Promise<{ projectId: string } | null> {
  const { data: project, error } = await supabase
    .from('projects')
    .insert({
      company_name: COMPANY_NAME,
      contact_name: 'E2E재배정담당',
      contact_email: 'e2e-reassign@example.com',
      industry: '제조업',
      company_size: '50~299명',
      status: 'ASSIGNED',
      assigned_consultant_id: consultantId,
      track: 'ROADMAP',
      created_by: consultantId,
    })
    .select('id')
    .single();
  if (error || !project) {
    console.warn('[seedAssignedProject]', error?.message);
    return null;
  }

  // 배정 이력 (is_current=true) — 재배정 RPC의 previous_consultant_id 조회 대상
  const { error: asgErr } = await supabase.from('project_assignments').insert({
    project_id: project.id,
    consultant_id: consultantId,
    assigned_by: consultantId,
    assignment_reason: 'E2E 초기 배정',
    is_current: true,
  });
  if (asgErr) {
    console.warn('[seedAssignedProject] project_assignments 실패:', asgErr.message);
    await supabase.from('projects').delete().eq('id', project.id);
    return null;
  }
  return { projectId: project.id as string };
}

test.describe('컨설턴트 재배정 + 해제 알림', () => {
  test.describe.configure({ mode: 'serial' });

  let projectId: string | null = null;
  let dummy: DummyConsultant | null = null;

  test.beforeAll(async () => {
    // 더미 컨설턴트 생성 (선청소 → 생성 패턴)
    dummy = await createDummyConsultant('e2e-reassign-target');
  });

  test.afterAll(async () => {
    if (projectId) await deleteProject(projectId);
    if (dummy) await deleteDummyConsultant(dummy.id);
  });

  test('OPS가 재배정 → 이전 컨설턴트에게 해제 알림, 새 컨설턴트에게 배정 알림', async ({
    opsPage: page,
  }) => {
    test.skip(!dummy, '더미 컨설턴트 생성 실패');

    const consultantEmail = process.env.E2E_CONSULTANT_EMAIL;
    test.skip(!consultantEmail, 'E2E_CONSULTANT_EMAIL 미설정');

    const prevConsultantId = await fetchUserIdByEmail(consultantEmail!);
    test.skip(!prevConsultantId, '테스트 컨설턴트 사용자 미존재');

    const seed = await seedAssignedProject(prevConsultantId!);
    test.skip(!seed, '시드 프로젝트 생성 실패');
    projectId = seed!.projectId;

    // 알림 비교 기준 타임스탬프
    const startedAt = new Date().toISOString();

    await page.goto(`/ops/projects/${seed!.projectId}`);
    await page.waitForLoadState('networkidle');
    // skeleton waiter 대신 '컨설턴트 배정' 카드 가시성으로 로드 완료 판단.
    await expect(
      page.locator('[data-slot="card-title"]').filter({ hasText: '컨설턴트 배정' }),
    ).toBeVisible({ timeout: 15_000 });

    // "재배정" 버튼 → 폼 열기
    await page.getByRole('button', { name: '재배정' }).click();

    // "수동 매칭" 탭
    await page.getByRole('button', { name: '수동 매칭', exact: true }).click();

    // 더미 컨설턴트를 이메일로 정확히 타겟
    const candidateItem = page
      .locator('[data-testid="consultant-list-item"]')
      .filter({ hasText: dummy!.email });
    await expect(candidateItem).toBeVisible({ timeout: 15_000 });
    await candidateItem.click();

    // 배정 사유
    const reasonTextarea = page.locator('textarea').first();
    await expect(reasonTextarea).toBeVisible({ timeout: 10_000 });
    await reasonTextarea.fill('E2E 재배정 해제 알림 검증을 위한 컨설턴트 변경입니다.');

    // 배정 제출 — "배정하기" 클릭 시 AlertDialog 가 노출되고 "배정 확인" 클릭 후에만 실제 RPC 호출.
    // (Nielsen v2 #1: 비가역 액션 사전 차단)
    const assignButton = page.getByRole('button', { name: '배정하기' });
    await expect(assignButton).toBeEnabled({ timeout: 10_000 });
    await assignButton.click();

    // 재배정 확인 다이얼로그 — destructive variant
    const confirmButton = page.getByRole('button', { name: '배정 확인' });
    await expect(confirmButton).toBeVisible({ timeout: 10_000 });
    await confirmButton.click();

    // assignConsultant 성공 시 router.refresh() — networkidle 로 대기
    await page.waitForLoadState('networkidle');

    // DB 검증: 이전 컨설턴트 → '프로젝트 배정 해제' 알림 생성
    await expect
      .poll(
        async () => {
          const { data } = await supabase
            .from('notifications')
            .select('title, message, type')
            .eq('user_id', prevConsultantId!)
            .eq('type', 'assignment')
            .eq('title', '프로젝트 배정 해제')
            .gte('created_at', startedAt);
          return data?.length ?? 0;
        },
        { timeout: 10_000, intervals: [500, 1_000, 2_000] },
      )
      .toBeGreaterThanOrEqual(1);

    // DB 검증: 새(더미) 컨설턴트 → '프로젝트 배정' 알림
    await expect
      .poll(
        async () => {
          const { data } = await supabase
            .from('notifications')
            .select('title, type')
            .eq('user_id', dummy!.id)
            .eq('type', 'assignment')
            .gte('created_at', startedAt);
          return data?.length ?? 0;
        },
        { timeout: 10_000, intervals: [500, 1_000, 2_000] },
      )
      .toBeGreaterThanOrEqual(1);

    // projects.assigned_consultant_id가 더미 컨설턴트로 전환되었는지
    const { data: updated } = await supabase
      .from('projects')
      .select('assigned_consultant_id')
      .eq('id', seed!.projectId)
      .single();
    expect(updated?.assigned_consultant_id).toBe(dummy!.id);
  });
});
