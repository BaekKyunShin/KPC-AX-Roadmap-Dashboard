import { redirect } from 'next/navigation';
import { getCachedUser, getCachedProfile } from '@/lib/supabase/cached';
import TestPBLClient from './TestPBLClient';

export const metadata = {
  title: 'PBL 테스트 - KPC AI 로드맵',
  description: 'PBL 보고서 생성 연습',
};

export default async function TestPBLPage() {
  const user = await getCachedUser();
  if (!user) redirect('/login');

  const profile = await getCachedProfile();
  if (!profile) redirect('/login');

  const isApprovedConsultant =
    profile.role === 'CONSULTANT_APPROVED' && profile.status === 'ACTIVE';
  const isOpsAdmin =
    (profile.role === 'OPS_ADMIN' || profile.role === 'SYSTEM_ADMIN') &&
    profile.status === 'ACTIVE';
  const canAccess = isApprovedConsultant || isOpsAdmin;

  // ISSUE-02·03 Step E: 자동 prefill 제거 → 빈 폼 + "샘플 데이터 채우기" 버튼.
  return <TestPBLClient user={profile} canAccess={canAccess} />;
}
