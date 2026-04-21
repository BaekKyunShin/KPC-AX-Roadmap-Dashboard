// e2e/negative/cross-role-access.spec.ts
// 권한 위반 negative — 컨설턴트 간 격리(RLS + 서버 가드).
//
// 기존 role-access.spec.ts / role-violation.spec.ts에서 미커버:
//   - 컨설턴트 A → 컨설턴트 B 소유 프로젝트 ID 직접 goto → 404/redirect (서버 컴포넌트의
//     `assigned_consultant_id == user.id` 필터로 notFound 트리거)
//   - 비인증 사용자가 `/consultant/projects/{id}` 직접 goto → /login 리다이렉트
//
// 실 환경에 컨설턴트 계정이 1명뿐일 수 있으므로 beforeAll에서 더미 컨설턴트를 생성해
// 시나리오를 hermetic하게 만든다.
import { test, expect } from '../fixtures/auth.fixture';
import { test as bareTest, expect as bareExpect } from '@playwright/test';
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

const COMPANY_NAME = 'E2E권한격리프로젝트';

async function seedProjectFor(consultantId: string): Promise<string | null> {
  const { data, error } = await supabase
    .from('projects')
    .insert({
      company_name: COMPANY_NAME,
      contact_name: 'E2E격리담당',
      contact_email: 'e2e-isolation@example.com',
      industry: '제조업',
      company_size: '50~299명',
      status: 'ASSIGNED',
      assigned_consultant_id: consultantId,
      track: 'ROADMAP',
      created_by: consultantId,
    })
    .select('id')
    .single();
  if (error || !data) {
    console.warn('[seedProjectFor]', error?.message);
    return null;
  }
  return data.id as string;
}

test.describe('컨설턴트 격리 — 다른 컨설턴트 프로젝트 접근 차단', () => {
  test.describe.configure({ mode: 'serial' });

  let foreignProjectId: string | null = null;
  let dummy: DummyConsultant | null = null;

  test.beforeAll(async () => {
    dummy = await createDummyConsultant('e2e-foreign-consultant');
  });

  test.afterAll(async () => {
    if (foreignProjectId) await deleteProject(foreignProjectId);
    if (dummy) await deleteDummyConsultant(dummy.id);
  });

  test('컨설턴트 A → 컨설턴트 B 프로젝트 직접 URL 접근 시 404 또는 차단', async ({
    consultantPage: page,
  }) => {
    test.skip(!dummy, '더미 컨설턴트 생성 실패');

    foreignProjectId = await seedProjectFor(dummy!.id);
    test.skip(!foreignProjectId, '시드 프로젝트 생성 실패');

    const response = await page.goto(`/consultant/projects/${foreignProjectId}`);

    // 테스트 컨설턴트는 더미 소유 회사명에 도달하면 안됨
    await expect(page.getByText(COMPANY_NAME)).toHaveCount(0);

    const status = response?.status() ?? 0;
    const url = page.url();
    const safelyHandled =
      status === 404 ||
      /\/dashboard/.test(url) ||
      /\/login/.test(url) ||
      /\/consultant\/projects(?!\/[a-f0-9-]+)/.test(url) ||
      /not-found|찾을 수 없습니다/.test(await page.content());
    expect(safelyHandled).toBe(true);
  });
});

bareTest.describe('비인증 → 컨설턴트 프로젝트 상세 직접 접근 시 /login 리다이렉트', () => {
  bareTest('비인증 → /consultant/projects/{임의ID} → /login', async ({ browser }) => {
    const context = await browser.newContext();
    const page = await context.newPage();
    try {
      const fakeId = '00000000-0000-0000-0000-000000000000';
      await page.goto(`/consultant/projects/${fakeId}`);

      await bareExpect(page).toHaveURL(/\/login/, { timeout: 10_000 });
      const url = new URL(page.url());
      bareExpect(url.pathname).toBe('/login');
      bareExpect(url.searchParams.get('redirect')).toBe(`/consultant/projects/${fakeId}`);
    } finally {
      await context.close();
    }
  });
});
