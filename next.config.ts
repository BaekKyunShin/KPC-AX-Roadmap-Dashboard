import type { NextConfig } from "next";
import bundleAnalyzer from "@next/bundle-analyzer";

// ─── 환경변수 검증 (빌드 타임) ──────────────────────────────────────────
const REQUIRED_SERVER_ENV = ['SUPABASE_SERVICE_ROLE_KEY', 'LLM_API_KEY'] as const;
const REQUIRED_PUBLIC_ENV = ['NEXT_PUBLIC_SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_ANON_KEY'] as const;

const missingVars = [...REQUIRED_SERVER_ENV, ...REQUIRED_PUBLIC_ENV].filter(
  (key) => !process.env[key]
);

if (missingVars.length > 0) {
  const message = `필수 환경변수 누락: ${missingVars.join(', ')}`;
  if (process.env.NODE_ENV === 'production') {
    throw new Error(message);
  } else {
    console.warn(`⚠️ ${message}`);
  }
}
// ─────────────────────────────────────────────────────────────────────────

const withBundleAnalyzer = bundleAnalyzer({
  enabled: process.env.ANALYZE === "true",
});

const nextConfig: NextConfig = {
  reactCompiler: true,
  async rewrites() {
    // 로컬 개발 시 HWPX Python 함수를 로컬 브리지 서버로 포워딩.
    // next dev / vercel dev 모두 Python 런타임 구성에 실패할 수 있으므로,
    // scripts/dev-hwpx-server.py 를 별도 터미널에서 실행 후
    // HWPX_DEV_PROXY_URL=http://localhost:3010 을 지정하면 동작한다.
    const hwpxProxyUrl = process.env.HWPX_DEV_PROXY_URL;
    if (hwpxProxyUrl) {
      return [
        {
          source: '/api/hwpx/:path*',
          destination: `${hwpxProxyUrl.replace(/\/$/, '')}/api/hwpx/:path*`,
        },
      ];
    }
    return [];
  },
  experimental: {
    optimizePackageImports: [
      'lucide-react',
      'recharts',
      'motion',
      'radix-ui',
      '@radix-ui/react-accordion',
      '@radix-ui/react-avatar',
      '@radix-ui/react-checkbox',
      '@radix-ui/react-dialog',
      '@radix-ui/react-label',
      '@radix-ui/react-select',
      '@radix-ui/react-separator',
      '@radix-ui/react-slot',
      '@radix-ui/react-tabs',
      'cmdk',
      'class-variance-authority',
      'clsx',
      'tailwind-merge',
      'zod',
    ],
  },
};

export default withBundleAnalyzer(nextConfig);
