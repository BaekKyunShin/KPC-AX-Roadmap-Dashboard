// e2e/gallery/share-control-role.spec.ts
// 갤러리 공유 컨트롤의 역할별 UI 분기 검증.
//
// 회귀 배경: V2 화면 통합(#28) 시 ROLE_CAPABILITIES 가 반대로 매핑되어 권한자인
// 컨설턴트에게는 토글이 사라지고, 권한 없는 Ops 에만 노출돼 눌러도 실패했다.
// 기존 sharing-cross-role.spec.ts 는 is_shared 를 admin client 로 직접 UPDATE 하므로
// UI 경로를 타지 않아 이 회귀를 잡지 못했다. 본 스펙이 그 공백을 메운다.
//
// 시나리오:
//   1) 시드: 컨설턴트 본인 소유·본인 배정 프로젝트 + FINAL 로드맵 (is_shared=false)
//   2) 컨설턴트 UI 에서 토글 클릭 → 성공 토스트 → DB 반영 → 갤러리 노출
//   3) Ops 화면은 토글 없이 읽기 전용 배지만 노출
//   4) afterAll: 프로젝트 삭제 (roadmap_versions CASCADE)
import { test, expect } from '../fixtures/auth.fixture';
import { createClient } from '@supabase/supabase-js';
import { deleteProject } from '../helpers/cleanup.helper';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const COMPANY_NAME = `E2E공유컨트롤${Date.now().toString(36)}`;

async function fetchConsultantId(): Promise<string | null> {
  const email = process.env.E2E_CONSULTANT_EMAIL;
  if (!email) return null;
  const { data } = await supabase.from('users').select('id').eq('email', email).single();
  return (data?.id as string) ?? null;
}

/**
 * 컨설턴트 본인이 작성하고 본인에게 배정된 FINAL 로드맵을 시드한다.
 * toggleShare 가 `created_by === user.id` 를 요구하므로 owner 는 반드시 컨설턴트여야 한다.
 */
async function seedOwnedFinalRoadmap(
  consultantId: string
): Promise<{ projectId: string; roadmapId: string } | null> {
  const { data: project } = await supabase
    .from('projects')
    .insert({
      company_name: COMPANY_NAME,
      contact_name: 'E2E공유담당',
      contact_email: 'e2e-share-control@example.com',
      industry: '제조업',
      company_size: '50~299명',
      status: 'FINALIZED',
      assigned_consultant_id: consultantId,
      track: 'ROADMAP',
      created_by: consultantId,
    })
    .select('id')
    .single();
  if (!project) return null;

  const { data: roadmap } = await supabase
    .from('roadmap_versions')
    .insert({
      project_id: project.id,
      version_number: 1,
      status: 'FINAL',
      is_shared: false,
      created_by: consultantId,
      finalized_by: consultantId,
      finalized_at: new Date().toISOString(),
    })
    .select('id')
    .single();
  if (!roadmap) {
    await deleteProject(project.id as string);
    return null;
  }
  return { projectId: project.id as string, roadmapId: roadmap.id as string };
}

async function setShare(roadmapId: string, isShared: boolean) {
  await supabase.from('roadmap_versions').update({ is_shared: isShared }).eq('id', roadmapId);
}

test.describe('갤러리 공유 컨트롤 역할 분기', () => {
  test.describe.configure({ mode: 'serial' });

  let projectId: string | null = null;
  let roadmapId: string | null = null;

  test.beforeAll(async () => {
    const consultantId = await fetchConsultantId();
    if (!consultantId) return;
    const seed = await seedOwnedFinalRoadmap(consultantId);
    if (!seed) return;
    projectId = seed.projectId;
    roadmapId = seed.roadmapId;
  });

  test.afterAll(async () => {
    if (projectId) await deleteProject(projectId);
  });

  test('컨설턴트 — FINAL 로드맵의 공유 토글로 갤러리에 공유된다', async ({
    consultantPage: page,
  }) => {
    test.skip(!projectId, '시드 실패 (컨설턴트 계정 또는 프로젝트 생성 불가)');
    await setShare(roadmapId!, false);

    await page.goto(`/consultant/projects/${projectId}/roadmap`);
    await page.waitForLoadState('networkidle');

    // 회귀 지점 — 권한자인 컨설턴트에게 토글이 보여야 한다.
    await expect(page.getByText('갤러리에 공유')).toBeVisible();
    const toggle = page.getByRole('switch');
    await expect(toggle).toHaveAttribute('aria-checked', 'false');

    await toggle.click();

    // 권한 오류가 아니라 성공이어야 한다.
    await expect(page.getByText('갤러리에 공유되었습니다.')).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText('컨설턴트만 공유 설정을 변경할 수 있습니다.')).toHaveCount(0);
    await expect(toggle).toHaveAttribute('aria-checked', 'true');

    const { data } = await supabase
      .from('roadmap_versions')
      .select('is_shared')
      .eq('id', roadmapId!)
      .single();
    expect(data?.is_shared).toBe(true);

    // UI 토글 결과가 실제 갤러리 노출로 이어지는지까지 확인.
    await page.goto(`/gallery?search=${encodeURIComponent(COMPANY_NAME)}`);
    await page.waitForLoadState('networkidle');
    const card = page.getByRole('link').filter({ hasText: COMPANY_NAME });
    await expect(card.first()).toBeVisible({ timeout: 10_000 });
  });

  test('운영관리자 — 토글 없이 읽기 전용 공유 배지만 노출된다', async ({ opsPage: page }) => {
    test.skip(!projectId, '시드 실패 (컨설턴트 계정 또는 프로젝트 생성 불가)');
    await setShare(roadmapId!, false);

    await page.goto(`/ops/projects/${projectId}/roadmap`);
    await page.waitForLoadState('networkidle');

    await expect(page.getByText('갤러리 미공유')).toBeVisible();
    // 권한 없는 조작 컨트롤이 노출되어서는 안 된다.
    await expect(page.getByRole('switch')).toHaveCount(0);
    await expect(page.getByText('갤러리에 공유')).toHaveCount(0);

    await setShare(roadmapId!, true);
    await page.reload();
    await page.waitForLoadState('networkidle');

    await expect(page.getByText('갤러리 공유됨')).toBeVisible();
    await expect(page.getByRole('switch')).toHaveCount(0);
  });
});
