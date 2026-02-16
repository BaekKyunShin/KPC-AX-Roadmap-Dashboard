import ProfilePageClient from '@/components/consultant/ProfilePageClient';

export default function ProfilePage() {
  return (
    <ProfilePageClient
      backUrl="/dashboard"
      successRedirectUrl="/dashboard"
    />
  );
}
