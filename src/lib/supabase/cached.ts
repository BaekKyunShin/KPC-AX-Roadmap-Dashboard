import { cache } from 'react';
import { createClient } from './server';

/**
 * React.cache로 감싼 getUser — 같은 요청(렌더 트리) 내에서 중복 호출을 제거합니다.
 * layout → page → Server Action 체인에서 auth.getUser()가 1회만 실행됩니다.
 */
export const getCachedUser = cache(async () => {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error || !user) return null;
  return user;
});

/**
 * React.cache로 감싼 프로필 조회 — getCachedUser()를 내부에서 호출합니다.
 * users 테이블 PK 조회이므로 빠르며, 같은 요청 내에서 1회만 실행됩니다.
 */
export const getCachedProfile = cache(async () => {
  const user = await getCachedUser();
  if (!user) return null;
  const supabase = await createClient();
  const { data: profile } = await supabase
    .from('users')
    .select('id, name, email, role, status, email_notify_enabled, created_at, updated_at')
    .eq('id', user.id)
    .single();
  return profile;
});
