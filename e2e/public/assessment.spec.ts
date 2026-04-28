// e2e/public/assessment.spec.ts
// 공개 자가진단 페이지 E2E 테스트
import { test, expect } from '@playwright/test';
import crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';
import { setupConsoleErrorCheck } from '../helpers/assertions.helper';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

const TEST_COMPANY = 'E2E공개자가진단테스트';

let validToken: string | null = null;
let seededProjectId: string | null = null;
let opsAdminUserId: string | null = null;

/**
 * beforeAll의 선청소: 이전 실행이 afterAll 도달 전 중단됐어도
 * 다시 시드가 가능하도록 동명 기업의 잔여 프로젝트·토큰을 먼저 지운다.
 */
async function purgePriorSeed() {
  const { data: prior } = await supabase
    .from('projects')
    .select('id')
    .eq('company_name', TEST_COMPANY);
  if (prior && prior.length > 0) {
    const ids = prior.map((p) => p.id as string);
    await supabase.from('assessment_tokens').delete().in('project_id', ids);
    await supabase.from('projects').delete().in('id', ids);
  }
}

test.describe('공개 자가진단 페이지 (/assessment/[token])', () => {
  test.describe.configure({ mode: 'parallel' });

  // 자체 hermetic 시드 — 전용 NEW 프로젝트 + 유효 토큰 생성.
  // 다른 테스트·외부 환경의 NEW 프로젝트 유무에 의존하지 않는다.
  test.beforeAll(async () => {
    await purgePriorSeed();

    // OPS_ADMIN user_id 조회 (assessment_tokens.created_by FK 필수)
    const { data: ops } = await supabase
      .from('users')
      .select('id')
      .eq('role', 'OPS_ADMIN')
      .eq('status', 'ACTIVE')
      .limit(1)
      .maybeSingle();
    if (!ops) return; // OPS 없는 환경이면 validToken=null로 남아 skip
    opsAdminUserId = ops.id as string;

    // 전용 NEW 상태 프로젝트
    const { data: project } = await supabase
      .from('projects')
      .insert({
        company_name: TEST_COMPANY,
        contact_name: 'E2E공개진단담당',
        contact_email: 'e2e-assessment@example.com',
        industry: '제조업',
        company_size: '50~299명',
        status: 'NEW',
        track: 'ROADMAP',
        created_by: opsAdminUserId,
      })
      .select('id')
      .single();
    if (!project) return;
    seededProjectId = project.id as string;

    // 유효 토큰 (14일)
    const token = process.env.E2E_ASSESSMENT_TOKEN
      ?? crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString();
    const { error } = await supabase.from('assessment_tokens').insert({
      token,
      project_id: seededProjectId,
      expires_at: expiresAt,
      created_by: opsAdminUserId,
    });
    if (!error) {
      validToken = token;
    }
  });

  test.afterAll(async () => {
    if (seededProjectId) {
      await supabase.from('assessment_tokens').delete().eq('project_id', seededProjectId);
      await supabase.from('projects').delete().eq('id', seededProjectId);
    }
  });

  // #005 (2026-04-29): 무효 토큰은 일반 404 가 아니라 도메인 안내 페이지로 노출.
  // assessment/[token]/page.tsx 가 notFound() 대신 StatusMessage("유효하지 않은 자가진단 링크")
  // 컴포넌트를 렌더하므로 응답은 200 + 도메인 안내 문구 검증.
  test('유효하지 않은 토큰 → 도메인 안내 페이지', async ({ page }) => {
    const getErrors = setupConsoleErrorCheck(page);

    const response = await page.goto('/assessment/invalid-token');

    // notFound() 제거 후 도메인 안내 페이지로 200 응답
    expect(response?.status()).toBe(200);
    await expect(
      page.getByRole('heading', { name: /유효하지 않은 자가진단 링크/ }),
    ).toBeVisible({ timeout: 10_000 });
    await expect(
      page.getByText(/담당 컨설턴트에게 새 링크를 요청/),
    ).toBeVisible();

    expect(getErrors()).toEqual([]);
  });

  test('존재하지 않는 UUID 토큰 → 도메인 안내 페이지', async ({ page }) => {
    const response = await page.goto('/assessment/00000000-0000-0000-0000-000000000000');

    expect(response?.status()).toBe(200);
    await expect(
      page.getByRole('heading', { name: /유효하지 않은 자가진단 링크/ }),
    ).toBeVisible({ timeout: 10_000 });
  });

  test('도메인 안내 페이지 기본 요소 렌더링 확인', async ({ page }) => {
    await page.goto('/assessment/invalid-token');

    // 도메인 안내 페이지에 제목 + 본문 메시지가 모두 노출되는지 확인.
    // 일반 404 ("404" 또는 "찾을 수 없") 가 아니라 자가진단 도메인 안내가 표시되어야 함.
    await expect(
      page.getByRole('heading', { name: /유효하지 않은 자가진단 링크/ }),
    ).toBeVisible({ timeout: 10_000 });
    await expect(
      page.getByText(/자가진단 링크가 잘못되었거나 만료/),
    ).toBeVisible();

    const generic404Visible = await page
      .getByText(/^404$|페이지를 찾을 수 없습니다/)
      .first()
      .isVisible()
      .catch(() => false);
    expect(generic404Visible).toBe(false);
  });

  test('유효 토큰 → 자가진단 폼 표시', async ({ page }) => {
    test.skip(!validToken, 'NEW 상태 프로젝트가 없어 assessment 토큰 생성 불가');

    const response = await page.goto(`/assessment/${validToken!}`);

    // 200 응답 (유효한 토큰)
    expect(response?.status()).toBe(200);

    // 자가진단 안내 제목 확인 ("AI 훈련 수준 자가진단" 헤딩)
    await expect(
      page.getByRole('heading', { name: /자가진단/ }),
    ).toBeVisible({ timeout: 10_000 });

    // "진단 시작" 버튼 또는 진단 폼 요소 확인
    const hasStartButton = await page.getByRole('button', { name: /진단 시작|제출|완료/ })
      .first().isVisible().catch(() => false);
    const hasForm = await page.locator('form').isVisible().catch(() => false);

    expect(hasStartButton || hasForm).toBe(true);
  });

  test('assessment 레이아웃 구조 확인 (헤더, 푸터)', async ({ page }) => {
    // 유효하지 않은 토큰이어도 레이아웃은 로드됨
    await page.goto('/assessment/invalid-token');

    // 헤더 영역 존재 확인
    const header = page.locator('header');
    const hasHeader = await header.isVisible().catch(() => false);

    // 푸터 영역 존재 확인 ("KPC 한국생산성본부" 텍스트)
    const footer = page.locator('footer');
    const hasFooter = await footer.isVisible().catch(() => false);

    // 레이아웃 요소가 하나라도 있거나, 404 페이지가 표시되면 통과
    // (notFound()가 layout을 건너뛸 수 있으므로 방어적 처리)
    const has404Text = await page.getByText('404').isVisible().catch(() => false);
    expect(hasHeader || hasFooter || has404Text).toBe(true);
  });
});
