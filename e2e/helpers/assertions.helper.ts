// e2e/helpers/assertions.helper.ts
import { type Page, expect } from '@playwright/test';

/**
 * 페이지 JS 콘솔 에러 수집기
 * 사용: const getErrors = setupConsoleErrorCheck(page);
 *       // ... 테스트 ...
 *       expect(getErrors()).toEqual([]);
 */
export function setupConsoleErrorCheck(page: Page): () => string[] {
  const errors: string[] = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      errors.push(msg.text());
    }
  });
  return () => [...errors];
}

/**
 * Sonner 토스트 메시지 확인
 */
export async function expectToast(page: Page, text: string) {
  await expect(
    page.locator('[data-sonner-toast]').filter({ hasText: text }),
  ).toBeVisible({ timeout: 5_000 });
}

/**
 * 빈 상태 메시지 확인
 */
export async function expectEmptyState(page: Page, message?: string) {
  if (message) {
    await expect(page.getByText(message)).toBeVisible();
  } else {
    // 일반적으로 "없습니다" 또는 "비어" 텍스트가 포함됨
    await expect(
      page.locator('text=/없습니다|비어|No /i'),
    ).toBeVisible();
  }
}

/**
 * 페이지 로딩 완료 대기 (스켈레톤/Loader가 사라질 때까지)
 */
export async function waitForPageLoad(page: Page) {
  // Skeleton이 있으면 사라질 때까지 대기
  const skeleton = page.locator('[data-slot="skeleton"], .animate-pulse');
  if (await skeleton.first().isVisible({ timeout: 1_000 }).catch(() => false)) {
    await skeleton.first().waitFor({ state: 'hidden', timeout: 10_000 });
  }
  // 네트워크 안정화 대기
  await page.waitForLoadState('networkidle');
}
