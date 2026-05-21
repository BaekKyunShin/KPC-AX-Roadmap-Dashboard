// e2e/scroll-ux/dialog-keyboard-focus-restore.spec.ts
// PR4 P3 회귀 차단 (L-3) — Radix UI AlertDialog 닫힘 후 키보드 사용자에게 포커스
// 가 원래 트리거 버튼으로 복원되는지 명시 검증.
//
// 현재 동작: Radix UI 가 default behavior 로 자동 복원하므로 GREEN.
// 가치: 미래에 Radix 교체·직접 dialog 작성 시 포커스 복원 누락이 발생하면 즉시 fail.
//
// 대상: 운영관리 > 프로젝트 관리의 프로젝트 삭제 다이얼로그
// (DeleteProjectDialog.tsx — destructive 액션 + 입력 필드 포함, 시나리오 폭이 가장 넓음).
import { test, expect } from '../fixtures/auth.fixture';

test.describe('접근성 회귀 차단 — Dialog 닫힘 후 키보드 포커스 복원 (L-3)', () => {
  test('프로젝트 삭제 다이얼로그를 Escape 로 닫으면 포커스가 트리거 버튼으로 복원', async ({
    opsPage: page,
  }) => {
    await page.goto('/ops/projects');
    await page.waitForLoadState('networkidle');

    // 행 단위 "삭제" 트리거 — 운영관리 > 프로젝트 관리의 destructive 액션 버튼.
    const triggerBtn = page.getByRole('button', { name: '삭제' }).first();
    const hasTrigger = await triggerBtn.isVisible().catch(() => false);
    test.skip(!hasTrigger, '프로젝트 시드 부재 — 삭제 트리거를 찾을 수 없음');

    // 키보드 시나리오: 트리거에 직접 포커스 (Tab 시퀀스는 fragile, focus() 가 표준).
    await triggerBtn.focus();
    const isFocusedBefore = await triggerBtn.evaluate(
      (el) => el === document.activeElement,
    );
    expect(isFocusedBefore).toBe(true);

    // Enter 로 다이얼로그 열기.
    await page.keyboard.press('Enter');
    const dialog = page.getByRole('alertdialog');
    await expect(dialog).toBeVisible();

    // Escape 로 닫기.
    await page.keyboard.press('Escape');
    await expect(dialog).not.toBeVisible();

    // 포커스가 원래 트리거 버튼으로 복원되어야 함 (Radix UI 자동 동작).
    const isFocusedAfter = await triggerBtn.evaluate(
      (el) => el === document.activeElement,
    );
    expect(isFocusedAfter).toBe(true);
  });
});
