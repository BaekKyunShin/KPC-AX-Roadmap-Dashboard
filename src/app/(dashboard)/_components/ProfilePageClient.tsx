'use client';

import { useState, useEffect } from 'react';
import {
  fetchConsultantProfile,
  saveConsultantProfile,
  updateConsultantProfile,
} from '@/app/(auth)/actions';
import ProfileForm from '@/components/consultant/ProfileForm';
import { ProfileFormSkeleton } from '@/components/ui/Skeleton';
import type { ConsultantProfile } from '@/types/database';

interface ProfilePageClientProps {
  backUrl: string;
  successRedirectUrl: string;
  backLabel?: string;
}

export default function ProfilePageClient({
  backUrl,
  successRedirectUrl,
  backLabel = '돌아가기',
}: ProfilePageClientProps) {
  const [profile, setProfile] = useState<ConsultantProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const result = await fetchConsultantProfile();
        if (result.success) {
          if (result.data.profile) {
            setProfile(result.data.profile as ConsultantProfile);
          }
        } else {
          setError(result.error);
        }
      } catch (err) {
        console.error('프로필 조회 오류:', err);
        setError('프로필을 불러오는데 실패했습니다.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchProfile();
  }, []);

  if (isLoading) {
    return <ProfileFormSkeleton />;
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center text-red-600">{error}</div>
      </div>
    );
  }

  return (
    <ProfileForm
      profile={profile}
      backUrl={backUrl}
      successRedirectUrl={successRedirectUrl}
      backLabel={backLabel}
      submitAction={profile ? updateConsultantProfile : saveConsultantProfile}
    />
  );
}
