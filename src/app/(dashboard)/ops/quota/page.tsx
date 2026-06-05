import { redirect } from 'next/navigation';
import { getCachedUser, getCachedProfile } from '@/lib/supabase/cached';
import { isOpsManager } from '@/lib/constants/status';
import { PageHeader } from '@/components/ui/page-header';
import { fetchUsageStats } from './actions';
import QuotaClient from './_components/QuotaClient';

// =============================================================================
// Helpers (순수 함수 — 서버에서 안전하게 실행)
// =============================================================================

function getMonthOptions() {
  const options: string[] = [];
  const now = new Date();
  for (let i = 0; i < 12; i++) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    options.push(`${year}-${month}`);
  }
  return options;
}

export default async function QuotaManagementPage() {
  const user = await getCachedUser();
  if (!user) redirect('/login');

  const profile = await getCachedProfile();
  if (!profile || !isOpsManager(profile.role)) redirect('/dashboard');

  // 서버에서 월 옵션 계산 + 초기 데이터 프리페치 — 클라이언트 useEffect 워터폴 제거
  const monthOptions = getMonthOptions();
  const initialMonth = monthOptions[0];
  const initialData = await fetchUsageStats({ page: 1, limit: 20, month: initialMonth });

  return (
    <div className="space-y-6">
      <PageHeader title="쿼터 관리" description="사용자별 LLM 호출 한도를 관리합니다." />

      <QuotaClient
        initialData={initialData}
        initialMonth={initialMonth}
        monthOptions={monthOptions}
      />
    </div>
  );
}
