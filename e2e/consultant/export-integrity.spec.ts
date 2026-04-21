// e2e/consultant/export-integrity.spec.ts
// PDF/XLSX 다운로드 파일 무결성 검증.
//
// 시나리오:
//   1) 시드: 컨설턴트 + ROADMAP_DRAFTED 프로젝트 + DRAFT 로드맵 1개
//   2) 컨설턴트가 로드맵 페이지에서 PDF 다운로드 → 매직 바이트 %PDF 확인
//   3) XLSX 다운로드 → 매직 바이트 PK\x03\x04 (ZIP) 확인
//   4) afterAll: 프로젝트 삭제 (roadmap_versions는 CASCADE)
//
// 빈 데이터로도 jspdf/xlsx-js-style은 헤더가 포함된 최소 파일을 생성한다.
import { test, expect } from '../fixtures/auth.fixture';
import { createClient } from '@supabase/supabase-js';
import { readFile } from 'fs/promises';
import {
  waitForDownload,
  expectDownloadFilename,
  expectDownloadSize,
} from '../helpers/download.helper';
import { waitForPageLoad } from '../helpers/assertions.helper';
import { deleteProject } from '../helpers/cleanup.helper';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

const COMPANY_NAME = 'E2E다운로드무결성';

async function fetchConsultantId(): Promise<string | null> {
  const email = process.env.E2E_CONSULTANT_EMAIL;
  if (!email) return null;
  const { data } = await supabase.from('users').select('id').eq('email', email).single();
  return (data?.id as string) ?? null;
}

async function seedRoadmapForExport(consultantId: string) {
  const { data: project, error: pErr } = await supabase
    .from('projects')
    .insert({
      company_name: COMPANY_NAME,
      contact_name: 'E2E내보내기',
      contact_email: 'e2e-export@example.com',
      industry: '제조업',
      company_size: '50~299명',
      status: 'ROADMAP_DRAFTED',
      assigned_consultant_id: consultantId,
      track: 'ROADMAP',
      created_by: consultantId,
    })
    .select('id')
    .single();
  if (pErr || !project) return null;

  const { data: roadmap, error: rErr } = await supabase
    .from('roadmap_versions')
    .insert({
      project_id: project.id,
      version_number: 1,
      status: 'DRAFT',
      created_by: consultantId,
    })
    .select('id')
    .single();
  if (rErr || !roadmap) {
    await supabase.from('projects').delete().eq('id', project.id);
    return null;
  }
  return { projectId: project.id as string, roadmapId: roadmap.id as string };
}

test.describe('로드맵 다운로드 파일 무결성', () => {
  test.describe.configure({ mode: 'serial' });

  let projectId: string | null = null;

  test.afterAll(async () => {
    if (projectId) await deleteProject(projectId);
  });

  test('PDF 다운로드 → 매직 바이트 %PDF + 파일 크기 ≥ 1KB', async ({
    consultantPage: page,
  }) => {
    const consultantId = await fetchConsultantId();
    test.skip(!consultantId, '컨설턴트 사용자 미존재');

    const seed = await seedRoadmapForExport(consultantId!);
    test.skip(!seed, '시드 실패');
    projectId = seed!.projectId;

    await page.goto(`/consultant/projects/${projectId}/roadmap`);
    await page.waitForLoadState('networkidle');
    await waitForPageLoad(page);

    // PDF 버튼 (DownloadButton type="PDF" → name 매칭)
    const pdfButton = page.getByRole('button', { name: /PDF/ }).first();
    await expect(pdfButton).toBeVisible({ timeout: 10_000 });

    const download = await waitForDownload(page, () => pdfButton.click());

    // 파일명 확장자 검증
    expectDownloadFilename(download, /\.pdf$/);

    // 크기 하한 (jspdf는 빈 데이터에도 1KB 이상 출력)
    await expectDownloadSize(download, 1024);

    // 매직 바이트 검증 — PDF 시그니처 "%PDF"
    const path = await download.path();
    expect(path).toBeTruthy();
    const buf = await readFile(path!);
    expect(buf.slice(0, 4).toString('ascii')).toBe('%PDF');
  });

  test('XLSX 다운로드 → 매직 바이트 PK\\x03\\x04 + 파일 크기 ≥ 1KB', async ({
    consultantPage: page,
  }) => {
    test.skip(!projectId, '직전 PDF 테스트의 시드 미존재');

    await page.goto(`/consultant/projects/${projectId}/roadmap`);
    await page.waitForLoadState('networkidle');
    await waitForPageLoad(page);

    const xlsxButton = page.getByRole('button', { name: /Excel|XLSX/ }).first();
    await expect(xlsxButton).toBeVisible({ timeout: 10_000 });

    const download = await waitForDownload(page, () => xlsxButton.click());

    expectDownloadFilename(download, /\.xlsx$/);
    await expectDownloadSize(download, 1024);

    // ZIP 매직 바이트 (XLSX는 OOXML = ZIP 컨테이너)
    const path = await download.path();
    expect(path).toBeTruthy();
    const buf = await readFile(path!);
    expect(buf[0]).toBe(0x50); // P
    expect(buf[1]).toBe(0x4b); // K
    expect(buf[2]).toBe(0x03);
    expect(buf[3]).toBe(0x04);
  });
});
