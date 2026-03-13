const REQUIRED_ENV_VARS = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
  'LLM_API_KEY',
] as const;

export async function register() {
  // 서버 시작 시 1회 실행 — 필수 환경 변수 검증
  const missing = REQUIRED_ENV_VARS.filter((key) => !process.env[key]);
  if (missing.length > 0) {
    throw new Error(`필수 환경 변수 누락: ${missing.join(', ')}`);
  }
}
