// e2e/consultant/roadmap-transitions.spec.ts
// 로드맵 상태 전이 (파괴적 동작) 검증.
// LLM 호출 없이 Supabase admin 시드 + UI 조작으로 빠르고 안정적으로 검증.
//
// 시나리오:
//   1) DRAFT → FINAL 전환 시 기존 FINAL이 ARCHIVED로 강등 (RPC `finalize_roadmap`)
//   2) DRAFT 다중 버전이 VersionSelector에 모두 노출 (무제한 생성 가정의 UI 검증)
import { test, expect } from '../fixtures/auth.fixture';
import { createClient } from '@supabase/supabase-js';
import { setupConsoleErrorCheck, expectToast, waitForPageLoad } from '../helpers/assertions.helper';
import { deleteProject } from '../helpers/cleanup.helper';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

const COMPANY_NAME_1 = 'E2E상태전이확정테스트';
const COMPANY_NAME_2 = 'E2E상태전이셀렉터테스트';

/** 컨설턴트 user_id 조회 (테스트 계정) */
async function fetchConsultantUserId(): Promise<string | null> {
  const consultantEmail = process.env.E2E_CONSULTANT_EMAIL;
  if (!consultantEmail) return null;
  const { data } = await supabase
    .from('users')
    .select('id')
    .eq('email', consultantEmail)
    .single();
  return (data?.id as string) ?? null;
}

/**
 * 시드: 컨설턴트가 배정된 ROADMAP_DRAFTED 프로젝트 + 지정된 버전 목록을 삽입.
 * versions 배열은 version_number 오름차순(작은 것부터) 입력 권장.
 */
async function seedProjectWithRoadmaps(
  companyName: string,
  consultantId: string,
  versions: Array<{ version_number: number; status: 'DRAFT' | 'FINAL' | 'ARCHIVED' }>,
): Promise<{ projectId: string; versionIds: string[] } | null> {
  // 프로젝트 생성 — created_by는 NOT NULL이므로 컨설턴트 user_id로 채운다
  const { data: project, error: pErr } = await supabase
    .from('projects')
    .insert({
      company_name: companyName,
      contact_name: 'E2E담당자',
      contact_email: 'e2e-transitions@example.com',
      industry: '제조업',
      company_size: '50~299명',
      status: 'ROADMAP_DRAFTED',
      assigned_consultant_id: consultantId,
      track: 'ROADMAP',
      created_by: consultantId,
    })
    .select('id')
    .single();

  if (pErr || !project) {
    console.warn('[seedProjectWithRoadmaps] 프로젝트 생성 실패:', pErr?.message);
    return null;
  }

  // 로드맵 버전 일괄 삽입 (legacy 컬럼은 default 값 활용)
  const rows = versions.map((v) => ({
    project_id: project.id,
    version_number: v.version_number,
    status: v.status,
    created_by: consultantId,
    finalized_by: v.status === 'FINAL' || v.status === 'ARCHIVED' ? consultantId : null,
    finalized_at:
      v.status === 'FINAL' || v.status === 'ARCHIVED' ? new Date().toISOString() : null,
  }));

  const { data: inserted, error: rErr } = await supabase
    .from('roadmap_versions')
    .insert(rows)
    .select('id, version_number');

  if (rErr || !inserted) {
    console.warn('[seedProjectWithRoadmaps] 로드맵 버전 삽입 실패:', rErr?.message);
    await supabase.from('projects').delete().eq('id', project.id);
    return null;
  }

  // version_number 오름차순으로 정렬해 호출자가 idx로 접근 가능하게
  const sorted = [...inserted].sort((a, b) => a.version_number - b.version_number);
  return {
    projectId: project.id,
    versionIds: sorted.map((r) => r.id as string),
  };
}

test.describe('로드맵 상태 전이', () => {
  test.describe.configure({ mode: 'serial' });

  let scenario1ProjectId: string | null = null;
  let scenario2ProjectId: string | null = null;

  test.afterAll(async () => {
    if (scenario1ProjectId) await deleteProject(scenario1ProjectId);
    if (scenario2ProjectId) await deleteProject(scenario2ProjectId);
  });

  test('DRAFT → FINAL 전환 시 기존 FINAL이 ARCHIVED("이전 확정본")로 강등', async ({
    consultantPage: page,
  }) => {
    const consultantId = await fetchConsultantUserId();
    test.skip(!consultantId, 'E2E_CONSULTANT_EMAIL 미설정 또는 사용자 미존재');

    const seed = await seedProjectWithRoadmaps(COMPANY_NAME_1, consultantId!, [
      { version_number: 1, status: 'FINAL' }, // 기존 확정본
      { version_number: 2, status: 'DRAFT' }, // 이번에 확정할 버전
    ]);
    test.skip(!seed, '시드 데이터 생성 실패');

    scenario1ProjectId = seed!.projectId;
    const oldFinalId = seed!.versionIds[0];
    const draftId = seed!.versionIds[1];

    // 컨설턴트 로드맵 페이지 진입 — VersionSelector는 version_number DESC 정렬이라
    // 가장 높은 v2(DRAFT)가 기본 선택되어 "최종 확정" 버튼이 노출된다.
    await page.goto(`/consultant/projects/${seed!.projectId}/roadmap`);
    await page.waitForLoadState('networkidle');
    await waitForPageLoad(page);

    await expect(page.locator('h2').filter({ hasText: /^버전 2$/ })).toBeVisible({
      timeout: 10_000,
    });

    // PR #50 (#2) — window.confirm 이 shadcn AlertDialog 로 교체됨.
    // 페이지의 "최종 확정" 버튼 클릭 → AlertDialog 노출 →
    // AlertDialog 내부의 destructive "최종 확정" 버튼을 다시 클릭해야 onFinalize 실행.
    const finalizeButton = page.getByRole('button', { name: '최종 확정' });
    await expect(finalizeButton).toBeVisible({ timeout: 5_000 });
    await expect(finalizeButton).toBeEnabled();
    await finalizeButton.click();

    // AlertDialog 노출 확인
    const confirmDialog = page.getByRole('alertdialog');
    await expect(confirmDialog).toBeVisible({ timeout: 3_000 });
    await expect(
      confirmDialog.getByText('로드맵을 최종 확정하시겠습니까?'),
    ).toBeVisible();

    // AlertDialog 내부의 destructive "최종 확정" 버튼 클릭
    await confirmDialog.getByRole('button', { name: '최종 확정' }).click();

    // 토스트 검증
    await expectToast(page, '로드맵이 최종 확정되었습니다');

    // DB 상태 검증: v1=ARCHIVED, v2=FINAL
    await expect
      .poll(
        async () => {
          const { data } = await supabase
            .from('roadmap_versions')
            .select('id, status')
            .in('id', [oldFinalId, draftId]);
          return Object.fromEntries(
            (data ?? []).map((r) => [r.id as string, r.status as string]),
          );
        },
        { timeout: 10_000, intervals: [500, 1_000, 2_000] },
      )
      .toMatchObject({ [oldFinalId]: 'ARCHIVED', [draftId]: 'FINAL' });
  });

  test('DRAFT 다중 버전이 VersionSelector에 모두 노출', async ({
    consultantPage: page,
  }) => {
    const getErrors = setupConsoleErrorCheck(page);
    const consultantId = await fetchConsultantUserId();
    test.skip(!consultantId, 'E2E_CONSULTANT_EMAIL 미설정 또는 사용자 미존재');

    // DRAFT 3개 시드
    const seed = await seedProjectWithRoadmaps(COMPANY_NAME_2, consultantId!, [
      { version_number: 1, status: 'DRAFT' },
      { version_number: 2, status: 'DRAFT' },
      { version_number: 3, status: 'DRAFT' },
    ]);
    test.skip(!seed, '시드 데이터 생성 실패');
    scenario2ProjectId = seed!.projectId;

    await page.goto(`/consultant/projects/${seed!.projectId}/roadmap`);
    await page.waitForLoadState('networkidle');
    await waitForPageLoad(page);

    // 기본은 가장 높은 v3 선택 (status: DRAFT, version_number: 3 → "수정본" 뱃지)
    await expect(page.locator('h2').filter({ hasText: /^버전 3$/ })).toBeVisible({
      timeout: 10_000,
    });

    // VersionSelector 드롭다운 열기 — combobox 역할의 트리거 클릭
    const trigger = page.getByRole('combobox').first();
    await trigger.click();

    // 옵션 3개 노출 검증 ("버전 1", "버전 2", "버전 3")
    await expect(page.getByRole('option', { name: /버전 1/ })).toBeVisible({
      timeout: 5_000,
    });
    await expect(page.getByRole('option', { name: /버전 2/ })).toBeVisible();
    await expect(page.getByRole('option', { name: /버전 3/ })).toBeVisible();

    // v1 선택 → 헤더 전환 검증
    await page.getByRole('option', { name: /버전 1/ }).click();
    await expect(page.locator('h2').filter({ hasText: /^버전 1$/ })).toBeVisible({
      timeout: 5_000,
    });

    expect(getErrors()).toEqual([]);
  });
});
