import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { getCachedUser, getCachedProfile } from '@/lib/supabase/cached';

/**
 * consultant 하위 모든 경로에 대해 CONSULTANT_APPROVED 역할을 검증합니다.
 * V3: layout sync wrapper + inner async Suspense — 라우트 변경 시 children swap이
 * 검증 await에 막히지 않도록 함. auth/role 검증 흐름 자체는 inner에 그대로.
 */
export default function ConsultantLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={null}>
      <ConsultantLayoutInner>{children}</ConsultantLayoutInner>
    </Suspense>
  );
}

async function ConsultantLayoutInner({ children }: { children: React.ReactNode }) {
  const user = await getCachedUser();
  if (!user) {
    redirect('/login');
  }

  const profile = await getCachedProfile();
  if (!profile || profile.role !== 'CONSULTANT_APPROVED') {
    redirect('/dashboard');
  }

  return <>{children}</>;
}
