import { redirect } from 'next/navigation';
import { getCachedUser, getCachedProfile } from '@/lib/supabase/cached';
import { EMAIL_NOTIFY_ROLES } from '@/lib/constants/message';
import { isPendingApproval } from '@/lib/constants/status';
import { PageHeader } from '@/components/ui/page-header';
import DeleteAccountSection from '@/components/auth/DeleteAccountSection';
import EmailNotifyToggle from '@/app/(dashboard)/dashboard/profile/_components/EmailNotifyToggle';
import PasswordChangeSection from './_components/PasswordChangeSection';
import { PAGE_TITLE, PAGE_DESCRIPTION, BACK_LINK } from './_meta';

export default async function SettingsPage() {
  const user = await getCachedUser();
  if (!user) redirect('/login');

  const profile = await getCachedProfile();

  // 승인 대기 사용자는 좌측 메뉴에 설정이 없지만 URL 직접 입력으로는 진입할 수 있었다.
  // profile 이 null 인 경우는 기존처럼 그대로 렌더한다(이메일 토글만 숨김).
  if (profile && isPendingApproval(profile.role)) redirect('/dashboard');

  const isEmailNotifyEligible = profile && EMAIL_NOTIFY_ROLES.includes(profile.role);

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <PageHeader title={PAGE_TITLE} description={PAGE_DESCRIPTION} backLink={BACK_LINK} />

      {/* 이메일 알림 설정 (대상 역할만 표시) */}
      {isEmailNotifyEligible && <EmailNotifyToggle initialEnabled={profile.email_notify_enabled} />}

      {/* 비밀번호 변경 섹션 */}
      <PasswordChangeSection />

      {/* 계정 삭제 섹션 */}
      <DeleteAccountSection />
    </div>
  );
}
