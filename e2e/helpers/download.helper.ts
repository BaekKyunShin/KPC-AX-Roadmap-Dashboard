/**
 * E2E 다운로드 테스트 헬퍼
 *
 * PDF/XLSX 내보내기 등 다운로드 검증에 사용합니다.
 */

import { expect, type Page, type Download } from '@playwright/test';

/**
 * 클릭 후 다운로드 이벤트를 기다립니다.
 */
export async function waitForDownload(
  page: Page,
  clickAction: () => Promise<void>,
): Promise<Download> {
  const [download] = await Promise.all([
    page.waitForEvent('download', { timeout: 30_000 }),
    clickAction(),
  ]);
  return download;
}

/**
 * 다운로드 파일명이 패턴과 일치하는지 검증합니다.
 */
export function expectDownloadFilename(download: Download, pattern: RegExp) {
  expect(download.suggestedFilename()).toMatch(pattern);
}

/**
 * 다운로드 파일 크기가 최소 바이트 이상인지 검증합니다.
 */
export async function expectDownloadSize(download: Download, minBytes: number) {
  const path = await download.path();
  expect(path).toBeTruthy();

  const { stat } = await import('fs/promises');
  const stats = await stat(path!);
  expect(stats.size).toBeGreaterThanOrEqual(minBytes);
}
