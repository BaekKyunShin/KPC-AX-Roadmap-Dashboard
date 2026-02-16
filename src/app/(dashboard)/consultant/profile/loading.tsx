import { PageHeader } from '@/components/ui/page-header';
import { ProfileFormSkeleton } from '@/components/ui/Skeleton';

export default function ConsultantProfileLoading() {
  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <PageHeader title="프로필 관리" />
      <ProfileFormSkeleton />
    </div>
  );
}
