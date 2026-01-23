import { createClient } from '@supabase/supabase-js';

// 서비스 역할 키를 사용하는 admin 클라이언트
// 주의: 서버 사이드에서만 사용해야 함 (RLS 우회)
export function createAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Supabase URL 또는 서비스 역할 키가 설정되지 않았습니다.');
  }

  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
