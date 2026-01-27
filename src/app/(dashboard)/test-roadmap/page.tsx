import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import TestRoadmapClient from './TestRoadmapClient';

export const metadata = {
  title: '테스트 로드맵 - KPC AI 로드맵',
  description: 'AI 교육 로드맵 생성 연습',
};

export default async function TestRoadmapPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // 사용자 프로필 및 역할 확인
  const { data: profile } = await supabase
    .from('users')
    .select('id, name, email, role, status')
    .eq('id', user.id)
    .single();

  if (!profile) {
    redirect('/login');
  }

  // 승인된 컨설턴트 또는 운영관리자만 접근 가능
  const isApprovedConsultant =
    profile.role === 'CONSULTANT_APPROVED' && profile.status === 'ACTIVE';
  const isOpsAdmin =
    (profile.role === 'OPS_ADMIN' || profile.role === 'SYSTEM_ADMIN') && profile.status === 'ACTIVE';
  const canAccessTestRoadmap = isApprovedConsultant || isOpsAdmin;

  // 컨설턴트 프로필 조회 (승인된 컨설턴트인 경우에만)
  let consultantProfile = null;
  if (isApprovedConsultant) {
    const { data: profileData } = await supabase
      .from('consultant_profiles')
      .select('*')
      .eq('user_id', user.id)
      .single();
    consultantProfile = profileData;
  }

  return (
    <TestRoadmapClient
      user={profile}
      canAccess={canAccessTestRoadmap}
      hasProfile={isApprovedConsultant ? !!consultantProfile : true}
    />
  );
}
