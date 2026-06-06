// e2e/workflow/ofa-smoke.spec.ts
// OFA (Official Form Alignment) Session 1~11 회귀 차단용 스모크 테스트
// 실제 폼 제출·LLM 호출·HWPX 다운로드는 제외. 라우팅·도달·렌더링 확인에 집중.
import { createClient } from '@supabase/supabase-js';
import { test, expect } from '../fixtures/auth.fixture';

// 이 spec은 앱(dev 서버)과 동일한 Supabase 인스턴스에서 프로젝트 ID를 조회해야 한다.
// playwright.config.ts의 webServer.env가 `.env.test`(로컬 Supabase)를 주입하므로
// spec도 같은 `.env.test` 환경(Playwright 프로세스의 dotenv 주입)을 그대로 사용한다.
// 과거에는 `.env.local`을 override 로 덮어써 클라우드 DB를 강제했지만, 이 경로에서는
// dev 서버(로컬)와 spec(클라우드)이 어긋나 잘못된 프로젝트 ID로 404 페이지가 나왔다.

test.describe.configure({ mode: 'serial' });

// ─── 헬퍼: Supabase Admin 클라이언트로 실시간 프로젝트 ID 조회 ─────────────────

/** 컨설턴트(E2E_CONSULTANT_EMAIL)에게 배정된 첫 프로젝트 ID를 반환. 없으면 null */
async function getConsultantProjectId(): Promise<string | null> {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // 컨설턴트 계정의 user.id 조회 — 로컬/원격 모두 `public.users` 테이블 사용
  const consultantEmail = process.env.E2E_CONSULTANT_EMAIL!;
  const { data: user } = await supabase
    .from('users')
    .select('id')
    .eq('email', consultantEmail)
    .maybeSingle();

  if (!user) return null;

  // 해당 사용자가 배정된 프로젝트 조회
  const { data: assignment } = await supabase
    .from('project_assignments')
    .select('project_id')
    .eq('consultant_id', user.id)
    .limit(1)
    .maybeSingle();

  return assignment?.project_id ?? null;
}

/** OPS 프로젝트 중 임의의 첫 프로젝트 ID를 반환. 없으면 null */
async function getAnyProjectId(): Promise<string | null> {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data: project } = await supabase
    .from('projects')
    .select('id')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  return project?.id ?? null;
}

// ─── 공유 상태 ────────────────────────────────────────────────────────────────

let consultantProjectId: string | null = null;
let opsProjectId: string | null = null;

// ─── 시나리오 1: 컨설턴트 로그인 → 담당 프로젝트 목록 진입 ────────────────────

test.describe('시나리오 1: 컨설턴트 로그인 → 담당 프로젝트 목록', () => {
  test('로그인된 컨설턴트가 /consultant/projects 에 정상 도달', async ({
    consultantPage: page,
  }) => {
    await page.goto('/consultant/projects');
    await page.waitForLoadState('networkidle');

    // URL 도달 확인
    await expect(page).toHaveURL('/consultant/projects');

    // 페이지 주요 구조 확인 (nav + main)
    await expect(page.locator('nav')).toBeVisible();
    await expect(page.locator('main')).toBeVisible();

    // 프로젝트 목록 또는 빈 상태 중 하나는 렌더링
    const hasProjects = await page
      .locator('main a[href*="/consultant/projects/"]')
      .first()
      .isVisible()
      .catch(() => false);

    if (hasProjects) {
      // 프로젝트가 있으면 링크 1개 이상 존재
      const links = page.locator('main a[href*="/consultant/projects/"]');
      expect(await links.count()).toBeGreaterThan(0);

      // 실시간 project ID 추출 (이후 시나리오에서 재사용)
      const firstHref = await links.first().getAttribute('href');
      consultantProjectId = firstHref?.split('/consultant/projects/')[1]?.split('/')[0] ?? null;
    }

    // DB에서도 조회 시도 (목록에 없어도 DB에는 있을 수 있음)
    if (!consultantProjectId) {
      consultantProjectId = await getConsultantProjectId();
    }
  });
});

// ─── 시나리오 2: 컨설턴트 네비 주요 링크 도달 확인 ───────────────────────────

test.describe('시나리오 2: 컨설턴트 네비 주요 링크 200 도달', () => {
  const routes: Array<{ url: string; description: string }> = [
    { url: '/gallery', description: '갤러리' },
    { url: '/notices', description: '공지사항' },
    { url: '/dashboard/messages', description: '메시지' },
    { url: '/test-roadmap', description: '테스트 로드맵' },
    { url: '/test-pbl', description: 'PBL 체험' },
  ];

  for (const { url, description } of routes) {
    test(`${description} (${url}) 도달`, async ({ consultantPage: page }) => {
      const response = await page.goto(url);
      await page.waitForLoadState('networkidle');

      // HTTP 200 또는 리다이렉트 후 200 (Next.js App Router는 클라이언트 라우팅 후 200)
      // goto()가 null을 반환하는 경우는 same-origin navigation이므로 URL 확인으로 대체
      if (response) {
        expect(response.status()).toBeLessThan(400);
      }

      // 에러 페이지가 아닌지 확인 (404 Not Found, 500 Error 텍스트 제외)
      const bodyText = await page.locator('body').textContent();
      expect(bodyText).not.toMatch(/404.*Not Found/i);
      expect(bodyText).not.toMatch(/500.*Internal Server/i);

      // 메인 콘텐츠 영역 존재 확인
      await expect(page.locator('main, [role="main"]')).toBeVisible({ timeout: 10_000 });
    });
  }
});

// ─── 시나리오 3: OPS 로그인 → 프로젝트 생성 화면 도달 ────────────────────────

test.describe('시나리오 3: OPS 로그인 → 프로젝트 생성 화면', () => {
  test('/ops/projects/new 도달 + 필수 폼 요소 존재', async ({ opsPage: page }) => {
    await page.goto('/ops/projects/new');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500); // 렌더링 안정화 여유

    // URL 도달 확인
    await expect(page).toHaveURL('/ops/projects/new');

    // 메인 콘텐츠 영역 존재 확인
    await expect(page.locator('main')).toBeVisible();

    // 핵심 입력 필드 존재 (회사명은 항상 있음)
    await expect(page.locator('#company_name, input[name="company_name"]').first()).toBeVisible({
      timeout: 5_000,
    });

    // 제출 버튼 존재
    await expect(page.getByRole('button', { name: /프로젝트 생성/ })).toBeVisible({
      timeout: 5_000,
    });
  });
});

// ─── 시나리오 4: OPS 프로젝트 상세 3경로 ─────────────────────────────────────

test.describe('시나리오 4: OPS 프로젝트 상세 3경로', () => {
  test.beforeAll(async () => {
    if (!opsProjectId) {
      opsProjectId = await getAnyProjectId();
    }
  });

  test('/ops/projects/[id] 상세 페이지 도달', async ({ opsPage: page }) => {
    if (!opsProjectId) {
      // 프로젝트 목록에서 첫 번째 ID를 동적으로 추출
      await page.goto('/ops/projects');
      await page.waitForLoadState('networkidle');
      const firstLink = page.locator('main a[href*="/ops/projects/"]').first();
      const hasLink = await firstLink.isVisible().catch(() => false);
      test.skip(!hasLink, '테스트 데이터 없음: OPS 프로젝트가 존재하지 않습니다');
      const href = await firstLink.getAttribute('href');
      opsProjectId = href?.split('/ops/projects/')[1]?.split('/')[0]?.split('?')[0] ?? null;
    }

    test.skip(!opsProjectId, '테스트 데이터 없음: OPS 프로젝트 ID를 획득하지 못했습니다');

    await page.goto(`/ops/projects/${opsProjectId!}`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500); // 렌더링 안정화 여유

    await expect(page).toHaveURL(new RegExp(`/ops/projects/${opsProjectId!}`));
    await expect(page.locator('main')).toBeVisible();
    // 에러 페이지(not-found) 아님 — not-found.tsx 의 <h1>페이지를 찾을 수 없습니다</h1> heading 으로 특정.
    // getByText(/404/) 는 활동로그 마커 타임스탬프(…251404 등) 본문의 "404" 부분문자열에 오매칭되어 flaky 했음.
    await expect(page.getByRole('heading', { name: /페이지를 찾을 수 없/i })).not.toBeVisible();
  });

  test('/ops/projects/[id]/roadmap 로드맵 서브페이지 도달', async ({ opsPage: page }) => {
    test.skip(!opsProjectId, '테스트 데이터 없음: OPS 프로젝트 ID를 획득하지 못했습니다');

    await page.goto(`/ops/projects/${opsProjectId!}/roadmap`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500); // 렌더링 안정화 여유

    await expect(page).toHaveURL(new RegExp(`/ops/projects/${opsProjectId!}/roadmap`));
    await expect(page.locator('main')).toBeVisible();
    await expect(page.getByRole('heading', { name: /페이지를 찾을 수 없/i })).not.toBeVisible();
  });

  test('/ops/projects/[id]/pbl PBL 서브페이지 도달', async ({ opsPage: page }) => {
    test.skip(!opsProjectId, '테스트 데이터 없음: OPS 프로젝트 ID를 획득하지 못했습니다');

    await page.goto(`/ops/projects/${opsProjectId!}/pbl`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500); // 렌더링 안정화 여유

    await expect(page).toHaveURL(new RegExp(`/ops/projects/${opsProjectId!}/pbl`));
    await expect(page.locator('main')).toBeVisible();
    await expect(page.getByRole('heading', { name: /페이지를 찾을 수 없/i })).not.toBeVisible();
  });
});

// ─── 시나리오 5: 컨설턴트 프로젝트 상세 4경로 ───────────────────────────────

test.describe('시나리오 5: 컨설턴트 프로젝트 상세 4경로', () => {
  test('/consultant/projects/[id] 상세 페이지 도달', async ({ consultantPage: page }) => {
    if (!consultantProjectId) {
      // 프로젝트 목록에서 동적으로 추출
      await page.goto('/consultant/projects');
      await page.waitForLoadState('networkidle');
      const firstLink = page.locator('main a[href*="/consultant/projects/"]').first();
      const hasLink = await firstLink.isVisible().catch(() => false);
      test.skip(!hasLink, '테스트 데이터 없음: 컨설턴트에게 배정된 프로젝트가 없습니다');
      const href = await firstLink.getAttribute('href');
      consultantProjectId =
        href?.split('/consultant/projects/')[1]?.split('/')[0]?.split('?')[0] ?? null;
    }

    test.skip(
      !consultantProjectId,
      '테스트 데이터 없음: 컨설턴트 프로젝트 ID를 획득하지 못했습니다'
    );

    await page.goto(`/consultant/projects/${consultantProjectId!}`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500); // 렌더링 안정화 여유

    await expect(page).toHaveURL(new RegExp(`/consultant/projects/${consultantProjectId!}`));
    await expect(page.locator('main')).toBeVisible();
    await expect(page.getByRole('heading', { name: /페이지를 찾을 수 없/i })).not.toBeVisible();
  });

  test('/consultant/projects/[id]/interview 인터뷰 서브페이지 도달', async ({
    consultantPage: page,
  }) => {
    test.skip(
      !consultantProjectId,
      '테스트 데이터 없음: 컨설턴트 프로젝트 ID를 획득하지 못했습니다'
    );

    await page.goto(`/consultant/projects/${consultantProjectId!}/interview`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500); // 렌더링 안정화 여유

    // 인터뷰 페이지 또는 접근 제한 안내 중 하나 렌더링 (상태에 따라 다를 수 있음)
    await expect(page.locator('main')).toBeVisible();
    // 서버 에러(500)는 아님
    const bodyText = await page.locator('body').textContent();
    expect(bodyText).not.toMatch(/500.*Internal Server/i);
  });

  test('/consultant/projects/[id]/roadmap 로드맵 서브페이지 도달', async ({
    consultantPage: page,
  }) => {
    test.skip(
      !consultantProjectId,
      '테스트 데이터 없음: 컨설턴트 프로젝트 ID를 획득하지 못했습니다'
    );

    await page.goto(`/consultant/projects/${consultantProjectId!}/roadmap`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500); // 렌더링 안정화 여유

    await expect(page.locator('main')).toBeVisible();
    const bodyText = await page.locator('body').textContent();
    expect(bodyText).not.toMatch(/500.*Internal Server/i);
  });

  test('/consultant/projects/[id]/pbl PBL 서브페이지 도달', async ({ consultantPage: page }) => {
    test.skip(
      !consultantProjectId,
      '테스트 데이터 없음: 컨설턴트 프로젝트 ID를 획득하지 못했습니다'
    );

    await page.goto(`/consultant/projects/${consultantProjectId!}/pbl`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500); // 렌더링 안정화 여유

    await expect(page.locator('main')).toBeVisible();
    const bodyText = await page.locator('body').textContent();
    expect(bodyText).not.toMatch(/500.*Internal Server/i);
  });
});

// ─── 시나리오 6: 갤러리 트랙 필터 + 카드 렌더 ────────────────────────────────

test.describe('시나리오 6: 갤러리 트랙 필터 + 카드 렌더', () => {
  test('트랙 필터 토글 3개 노출 + ROADMAP/PBL 전환 동작', async ({ opsPage: page }) => {
    await page.goto('/gallery');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500); // 렌더링 안정화 여유

    // 3개 트랙 필터 버튼 존재 확인
    await expect(page.getByTestId('track-filter-ALL')).toBeVisible({ timeout: 10_000 });
    await expect(page.getByTestId('track-filter-ROADMAP')).toBeVisible();
    await expect(page.getByTestId('track-filter-PBL')).toBeVisible();

    // ROADMAP 필터 클릭 → URL 파라미터 반영
    await page.getByTestId('track-filter-ROADMAP').click();
    await expect(page).toHaveURL(/track=ROADMAP/, { timeout: 5_000 });

    // PBL 필터 클릭 → URL 파라미터 변경
    await page.getByTestId('track-filter-PBL').click();
    await expect(page).toHaveURL(/track=PBL/, { timeout: 5_000 });

    // ALL 필터 클릭 → track 파라미터 제거
    await page.getByTestId('track-filter-ALL').click();
    await expect(page).not.toHaveURL(/track=/, { timeout: 5_000 });
  });

  test('갤러리 카드 최소 1개 렌더링 또는 빈 상태 표시', async ({ opsPage: page }) => {
    await page.goto('/gallery');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500); // 렌더링 안정화 여유

    const cards = page.locator('a[href*="/gallery/"]');
    const cardCount = await cards.count();

    if (cardCount > 0) {
      // 카드가 있으면 트랙 뱃지도 존재해야 함 (OFA-11 도입)
      await expect(cards.first()).toBeVisible();
      const badges = page.locator('[data-testid="track-badge"]');
      expect(await badges.count()).toBeGreaterThan(0);
    } else {
      // 카드가 없으면 빈 상태 안내 메시지가 렌더링되어야 함
      const mainText = await page.locator('main').textContent();
      expect(mainText!.length).toBeGreaterThan(0);
    }
  });
});
