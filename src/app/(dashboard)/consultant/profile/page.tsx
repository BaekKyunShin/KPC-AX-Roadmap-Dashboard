'use client';

import { useState, useEffect } from 'react';
import { getConsultantProfile } from '@/app/(auth)/actions';
import ProfileForm from '@/components/consultant/ProfileForm';
import { Loader2 } from 'lucide-react';
import type { ConsultantProfile } from '@/types/database';

export default function ConsultantProfilePage() {
  const [profile, setProfile] = useState<ConsultantProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const result = await getConsultantProfile();
        if (result.success && result.data?.profile) {
          setProfile(result.data.profile as ConsultantProfile);
        } else if (!result.success) {
          setError(result.error || '프로필을 불러오는데 실패했습니다.');
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
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600 mx-auto" />
          <p className="mt-2 text-muted-foreground">프로필 불러오는 중...</p>
        </div>
      </div>
    );
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
      backUrl="/consultant/cases"
      successRedirectUrl="/consultant/cases"
      backLabel="케이스 목록으로"
    />
  );
}
