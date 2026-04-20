import { redirect } from 'next/navigation';
import { getCachedUser, getCachedProfile } from '@/lib/supabase/cached';
import TestPBLClient from './TestPBLClient';
import { PBL_INTERVIEW_SAMPLE } from '../../../../e2e/fixtures/pbl-interview-sample';

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

  return (
    <TestPBLClient
      user={profile}
      canAccess={canAccess}
      sampleData={PBL_INTERVIEW_SAMPLE}
    />
  );
}
