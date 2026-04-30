import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: [
        'src/lib/**/*.ts',
        'src/app/**/actions.ts',
        'src/app/**/actions/*.ts',
        'src/components/**/*.tsx',
        'src/hooks/**/*.ts',
        'src/app/api/**/route.ts',
        'src/app/**/_components/**/*.tsx',
      ],
      exclude: [
        'node_modules/',
        'src/test/',
        '.next/',
        '**/*.test.ts',
        '**/*.test.tsx',
        '**/*.d.ts',
        'src/types/**',
        '**/index.ts',
        // shadcn/ui 순수 Radix 래퍼 — 프레임워크가 이미 테스트하므로 제외
        'src/components/ui/accordion.tsx',
        'src/components/ui/alert.tsx',
        'src/components/ui/alert-dialog.tsx',
        'src/components/ui/avatar.tsx',
        'src/components/ui/badge.tsx',
        'src/components/ui/button.tsx',
        'src/components/ui/card.tsx',
        'src/components/ui/checkbox.tsx',
        'src/components/ui/dialog.tsx',
        'src/components/ui/dropdown-menu.tsx',
        'src/components/ui/input.tsx',
        'src/components/ui/label.tsx',
        'src/components/ui/popover.tsx',
        'src/components/ui/select.tsx',
        'src/components/ui/separator.tsx',
        'src/components/ui/switch.tsx',
        'src/components/ui/table.tsx',
        'src/components/ui/tabs.tsx',
        'src/components/ui/textarea.tsx',
        'src/components/ui/toaster.tsx',
        // 0% 커버리지 정당화 — 순수 UI 컴포넌트 (타이머 애니메이션, 대시보드 테이블) → E2E로 검증
        '**/AnalysisProgress.tsx',
        '**/QuotaClient.tsx',
        // PR5 (R6) — 인터뷰 검토 페이지 client/server: 8/9 Step 접힘식 카드 + 인라인
        // 편집 + Stale 배너 조합. helper 컴포넌트 (CompanyReqRow / TargetTaskRow /
        // PblOverviewRow / RoadmapInlineText) 의 핵심 분기는 위 helper 컴포넌트
        // 단위 테스트 (StaleResultBanner, ReviewActions, actions) 와 E2E
        // (e2e/consultant/interview-review.spec.ts) 로 검증. ReviewSection
        // 자체는 conditional rendering 위주라 E2E 가 더 적합.
        '**/InterviewReviewClient.tsx',
        '**/interview/review/page.tsx',
        // 0% 커버리지 정당화 파일 — 팩토리·래퍼·타입·정적 데이터
        'src/lib/services/export-pdf.ts',
        'src/lib/services/export-xlsx.ts',
        'src/lib/services/roadmap/roadmap-types.ts',
        'src/lib/supabase/admin.ts',
        'src/lib/supabase/client.ts',
        'src/lib/supabase/server.ts',
        'src/lib/data/demo-sample.ts',
        'src/app/_components/LandingPageLoader.tsx',
      ],
      thresholds: {
        lines: 89,
        branches: 83,
        functions: 86,
        statements: 89,
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
