import type { NextConfig } from "next";
import bundleAnalyzer from "@next/bundle-analyzer";

// ─── 환경변수 검증 (빌드 타임) ──────────────────────────────────────────
// NEXT_PUBLIC_* 변수만 빌드 타임에 검증 (클라이언트 번들에 인라인됨)
// 서버 전용 변수(SUPABASE_SERVICE_ROLE_KEY, LLM_API_KEY)는 런타임에 사용되므로
// CI 빌드 환경에서는 불필요 — 런타임 호출 시점에 개별 검증됨
const REQUIRED_PUBLIC_ENV = ['NEXT_PUBLIC_SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_ANON_KEY'] as const;

const missingPublicVars = REQUIRED_PUBLIC_ENV.filter((key) => !process.env[key]);

if (missingPublicVars.length > 0) {
  const message = `필수 환경변수 누락: ${missingPublicVars.join(', ')}`;
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
};

export default withBundleAnalyzer(nextConfig);
