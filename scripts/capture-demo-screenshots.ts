/**
 * 데모 페이지 스크린샷 캡처 스크립트
 *
 * 사용법:
 *   1. 개발 서버 실행: npm run dev
 *   2. 스크립트 실행: npx tsx scripts/capture-demo-screenshots.ts
 *
 * 생성되는 파일:
 *   - public/demo/diagnosis.png (기업 진단 - NxM 매트릭스)
 *   - public/demo/matching.png (컨설턴트 매칭 - PBL 과정)
 *   - public/demo/roadmap.png (로드맵 생성 - 과정 상세)
 */

import { chromium } from 'playwright';
import path from 'path';

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const OUTPUT_DIR = path.join(process.cwd(), 'public', 'demo');

interface ScreenshotConfig {
  name: string;
  filename: string;
  tabSelector?: string;
  waitForSelector?: string;
}

const screenshots: ScreenshotConfig[] = [
  {
    name: '기업 진단 (NxM 매트릭스)',
    filename: 'diagnosis.png',
    // 첫 번째 탭이 기본 선택됨
    waitForSelector: 'table',
  },
  {
    name: '컨설턴트 매칭 (PBL 과정)',
    filename: 'matching.png',
    tabSelector: 'button:has-text("PBL 최적 과정")',
    waitForSelector: 'text=커리큘럼',
  },
  {
    name: '로드맵 생성 (과정 상세)',
    filename: 'roadmap.png',
    tabSelector: 'button:has-text("과정 상세")',
    waitForSelector: 'text=전체 과정 상세',
  },
];

async function captureScreenshots() {
  console.log('🚀 스크린샷 캡처 시작...\n');

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
    deviceScaleFactor: 2, // Retina 품질
  });
  const page = await context.newPage();

  try {
    // 데모 페이지로 이동
    console.log(`📍 ${BASE_URL}/demo 접속 중...`);
    await page.goto(`${BASE_URL}/demo`, { waitUntil: 'networkidle' });

    // 페이지 로드 대기
    await page.waitForSelector('.bg-white.shadow.rounded-lg', { timeout: 10000 });

    for (const config of screenshots) {
      console.log(`\n📸 ${config.name} 캡처 중...`);

      // 탭 클릭 (필요한 경우)
      if (config.tabSelector) {
        await page.click(config.tabSelector);
        await page.waitForTimeout(300); // 애니메이션 대기
      }

      // 콘텐츠 로드 대기
      if (config.waitForSelector) {
        await page.waitForSelector(config.waitForSelector, { timeout: 5000 });
      }

      // 로드맵 영역만 캡처 (헤더와 안내 배너 제외)
      const roadmapCard = page.locator('.bg-white.shadow.rounded-lg').last();
      await roadmapCard.screenshot({
        path: path.join(OUTPUT_DIR, config.filename),
        animations: 'disabled',
      });

      console.log(`   ✅ ${config.filename} 저장 완료`);
    }

    console.log('\n✨ 모든 스크린샷 캡처 완료!');
    console.log(`📁 저장 위치: ${OUTPUT_DIR}`);
  } catch (error) {
    console.error('\n❌ 오류 발생:', error);
    console.log('\n💡 해결 방법:');
    console.log('   1. 개발 서버가 실행 중인지 확인하세요: npm run dev');
    console.log('   2. http://localhost:3000/demo 에 접속 가능한지 확인하세요');
    process.exit(1);
  } finally {
    await browser.close();
  }
}

captureScreenshots();
