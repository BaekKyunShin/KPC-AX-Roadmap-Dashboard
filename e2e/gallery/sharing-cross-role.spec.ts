// e2e/gallery/sharing-cross-role.spec.ts
// 갤러리 공유 토글 크로스 역할 검증.
//
// 시나리오:
//   1) 시드: 다른 사용자(시드 created_by=ops) 소유의 FINAL 로드맵 (is_shared=false)
//   2) 컨설턴트(B)로 /gallery → 우리 시드 회사명 미노출
//   3) is_shared=true 토글 (admin) → 컨설턴트로 /gallery 다시 → 노출
//   4) is_shared=false 토글 → 다시 미노출
//   5) afterAll: 프로젝트 삭제 (roadmap_versions CASCADE)
//
// 토글 자체를 컨설턴트 UI에서 수행하지 않고 admin client로 시뮬레이션해
// 다른 컨설턴트 계정 의존성을 제거 (is_shared 변경 → 갤러리 가시성 변화만 검증).
import { test, expect } from '../fixtures/auth.fixture';
import { createClient } from '@supabase/supabase-js';
import { deleteProject } from '../helpers/cleanup.helper';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

const COMPANY_NAME = `E2E갤러리공유${Date.now().toString(36)}`;

async function fetchOpsAdminId(): Promise<string | null> {
  const email = process.env.E2E_OPS_ADMIN_EMAIL;
  if (!email) return null;
  const { data } = await supabase.from('users').select('id').eq('email', email).single();
  return (data?.id as string) ?? null;
}

async function seedSharedRoadmap(
  ownerId: string,
): Promise<{ projectId: string; roadmapId: string } | null> {
  const { data: project, error: pErr } = await supabase
    .from('projects')
    .insert({
      company_name: COMPANY_NAME,
      contact_name: 'E2E갤러리담당',
      contact_email: 'e2e-gallery@example.com',
      industry: '제조업',
      company_size: '50~299명',
      status: 'FINALIZED',
      assigned_consultant_id: ownerId,
      track: 'ROADMAP',
      created_by: ownerId,
    })
    .select('id')
    .single();
  if (pErr || !project) return null;

  const { data: roadmap, error: rErr } = await supabase
    .from('roadmap_versions')
    .insert({
      project_id: project.id,
      version_number: 1,
      status: 'FINAL',
      is_shared: false,
      created_by: ownerId,
      finalized_by: ownerId,
      finalized_at: new Date().toISOString(),
    })
    .select('id')
    .single();
  if (rErr || !roadmap) {
    await supabase.from('projects').delete().eq('id', project.id);
    return null;
  }
  return { projectId: project.id as string, roadmapId: roadmap.id as string };
}

async function setShare(roadmapId: string, isShared: boolean) {
  await supabase.from('roadmap_versions').update({ is_shared: isShared }).eq('id', roadmapId);
}

test.describe('갤러리 공유 토글 크로스 역할', () => {
  test.describe.configure({ mode: 'serial' });

  let projectId: string | null = null;
  let roadmapId: string | null = null;

  test.afterAll(async () => {
    if (projectId) await deleteProject(projectId);
  });

  test('is_shared 토글 ON/OFF에 따라 다른 사용자의 갤러리에서 노출/숨김 전환', async ({
    consultantPage: page,
  }) => {
    const ownerId = await fetchOpsAdminId();
    test.skip(!ownerId, 'OPS_ADMIN 사용자 미존재');

    const seed = await seedSharedRoadmap(ownerId!);
    test.skip(!seed, '시드 실패');
    projectId = seed!.projectId;
    roadmapId = seed!.roadmapId;

    const searchUrl = `/gallery?search=${encodeURIComponent(COMPANY_NAME)}`;

    // GalleryCard는 /gallery/{id}로 향하는 Link로 래핑되므로 anchor 스코프로 한정.
    // 검색 필터 영역에는 키워드가 항상 노출되므로 일반 getByText는 혼선을 부른다.
    const card = page.getByRole('link').filter({ hasText: COMPANY_NAME });

    // 1) 초기 상태: is_shared=false → 카드 미노출
    await page.goto(searchUrl);
    await page.waitForLoadState('networkidle');
    await expect(card).toHaveCount(0);

    // 2) is_shared=true 토글 → 카드 노출
    await setShare(roadmapId!, true);
    await page.goto(searchUrl);
    await page.waitForLoadState('networkidle');
    await expect(card.first()).toBeVisible({ timeout: 10_000 });

    // 3) is_shared=false 토글 → 카드 미노출
    await setShare(roadmapId!, false);
    await page.goto(searchUrl);
    await page.waitForLoadState('networkidle');
    await expect(card).toHaveCount(0);
  });
});
