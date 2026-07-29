// e2e/ops/projects-deeplink.spec.ts
// 운영 프로젝트 목록 — URL 딥링크 필터 회귀 감시
//
// 배경: `/ops/projects?industry=...` 로 북마크·공유 링크를 타고 들어오면
//   드롭다운은 선택돼 있는데 목록은 전체가 나오는 불일치가 있었다.
//   page.tsx 가 search 만 서버 조회에 넘기고, ProjectList 의 isInitialMount
//   가드가 이를 바로잡을 첫 클라이언트 fetch 를 건너뛰기 때문이었다.
//
// 이 spec 은 **스크롤 높이에 의존하지 않는다** — scroll-ux/ops-projects-filter
//   와 달리 isScrollable 가드가 없으므로 시드가 적어도 항상 실행된다.
//
// 시드 구성: 시드기업A(제조업·NEW) · B(IT/SW·ASSIGNED)
//           · C(제조업·ASSIGNED) · D(IT/SW·FINALIZED)
import { test, expect } from '../fixtures/auth.fixture';

test.describe('운영 프로젝트 목록 — URL 딥링크 필터', () => {
  test('업종 딥링크 — 해당 업종 프로젝트만 목록에 나온다', async ({ opsPage: page }) => {
    await page.goto('/ops/projects?industry=IT%2FSW');
    await page.waitForLoadState('networkidle');

    await expect(page.getByText('시드기업B').first()).toBeVisible();
    await expect(page.getByText('시드기업D').first()).toBeVisible();
    // 제조업 프로젝트는 목록에 없어야 한다 (이전에는 전체가 나왔다)
    await expect(page.getByText('시드기업A')).toHaveCount(0);
    await expect(page.getByText('시드기업C')).toHaveCount(0);
  });

  test('업종 딥링크 — 드롭다운 표시와 목록 내용이 일치한다', async ({ opsPage: page }) => {
    await page.goto('/ops/projects?industry=IT%2FSW');
    await page.waitForLoadState('networkidle');

    // 드롭다운은 이전에도 URL 값을 읽어 'IT/SW' 를 표시했다.
    // 깨져 있던 것은 목록 쪽이므로 둘이 같은 상태인지 함께 확인한다.
    await expect(page.getByRole('combobox', { name: /업종/ })).toContainText('IT/SW');
    await expect(page.getByText('시드기업A')).toHaveCount(0);
  });

  test('상태 딥링크 — 워크플로 단계 키가 실제 상태로 변환된다', async ({ opsPage: page }) => {
    // 'finalized' 는 화면용 단계 키다. 서버에 그대로 .eq('status','finalized') 로
    // 넘기면 항상 0건이 되므로 getStatusesByFilterKey 변환이 필요하다.
    await page.goto('/ops/projects?status=finalized');
    await page.waitForLoadState('networkidle');

    await expect(page.getByText('시드기업D').first()).toBeVisible();
    await expect(page.getByText('시드기업A')).toHaveCount(0);
    await expect(page.getByText('시드기업B')).toHaveCount(0);
  });

  test('알 수 없는 상태 키는 필터 없이 전체를 보여준다', async ({ opsPage: page }) => {
    await page.goto('/ops/projects?status=nonexistent');
    await page.waitForLoadState('networkidle');

    await expect(page.getByText('시드기업A').first()).toBeVisible();
    await expect(page.getByText('시드기업D').first()).toBeVisible();
  });
});
