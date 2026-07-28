import { redirect } from 'next/navigation';
import { getCachedUser, getCachedProfile } from '@/lib/supabase/cached';
import { isPendingApproval } from '@/lib/constants/status';

/**
 * 로드맵 테스트 라우트의 maxDuration 설정
 * Vercel 배포 시 Server Action 타임아웃을 5분으로 확장
 * (LLM 호출 4분 + 후처리 여유 1분)
 */
export const maxDuration = 300;

/**
 * 승인 대기 사용자의 접근을 차단합니다.
 *
 * 페이지 자체는 canAccess=false 로 "권한 없음" 화면을 렌더해 데이터는 막고 있었으나,
 * 승인 전 사용자에게는 라우트 진입 자체를 허용하지 않는다.
 * (canAccess 분기는 SUSPENDED 사용자용으로 계속 유효)
 */
export default async function TestRoadmapLayout({ children }: { children: React.ReactNode }) {
  const user = await getCachedUser();
  if (!user) {
    redirect('/login');
  }

  const profile = await getCachedProfile();
  if (!profile) {
    redirect('/login');
  }

  if (isPendingApproval(profile.role)) {
    redirect('/dashboard');
  }

  return children;
}
