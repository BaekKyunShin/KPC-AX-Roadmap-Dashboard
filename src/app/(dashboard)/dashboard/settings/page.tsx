import { redirect } from 'next/navigation';
import { getCachedUser, getCachedProfile } from '@/lib/supabase/cached';
import { EMAIL_NOTIFY_ROLES } from '@/lib/constants/message';
import { PageHeader } from '@/components/ui/page-header';
import DeleteAccountSection from '@/components/auth/DeleteAccountSection';
import EmailNotifyToggle from '@/app/(dashboard)/dashboard/profile/_components/EmailNotifyToggle';
import PasswordChangeSection from './_components/PasswordChangeSection';

export default async function SettingsPage() {
  const user = await getCachedUser();
  if (!user) redirect('/login');

  const profile = await getCachedProfile();

  const isEmailNotifyEligible = profile && EMAIL_NOTIFY_ROLES.includes(profile.role);

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <PageHeader
        title="계정 설정"
        description="비밀번호 변경 및 계정 관리"
        backLink={{ href: '/dashboard', label: '대시보드', useBack: true }}
      />

      {/* 이메일 알림 설정 (대상 역할만 표시) */}
      {isEmailNotifyEligible && (
        <EmailNotifyToggle initialEnabled={profile.email_notify_enabled} />
      )}

      {/* 비밀번호 변경 섹션 */}
      <PasswordChangeSection />

      {/* 계정 삭제 섹션 */}
      <DeleteAccountSection />
    </div>
  );
}
