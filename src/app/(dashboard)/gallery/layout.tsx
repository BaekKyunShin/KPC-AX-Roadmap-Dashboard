import { redirect } from 'next/navigation';
import { getCachedUser, getCachedProfile } from '@/lib/supabase/cached';
import { isPendingApproval } from '@/lib/constants/status';

/**
 * 갤러리 하위 모든 경로(/gallery, /gallery/[id])의 접근을 검증합니다.
 *
 * 승인 대기 사용자는 좌측 메뉴에 갤러리가 노출되지 않지만 URL 직접 입력으로는
 * 진입할 수 있었고, 그 상태에서 타 기업의 공유 FINAL 로드맵·PBL 보고서를
 * 열람할 수 있었다. 승인 심사 전에는 산출물을 볼 수 없어야 하므로 차단한다.
 */
export default async function GalleryLayout({ children }: { children: React.ReactNode }) {
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

  return <>{children}</>;
}
