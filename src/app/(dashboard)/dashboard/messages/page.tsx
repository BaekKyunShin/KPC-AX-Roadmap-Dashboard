import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getCachedProfile } from '@/lib/supabase/cached';
import { isPendingApproval } from '@/lib/constants/status';
import { PageHeader } from '@/components/ui/page-header';
import MessagesClient from './_components/MessagesClient';
import { PAGE_TITLE, PAGE_DESCRIPTION } from './_meta';

export default async function MessagesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  // 승인 대기 사용자는 좌측 메뉴에 메시지가 없지만 URL 직접 입력으로는 진입할 수 있었다.
  const profile = await getCachedProfile();
  if (profile && isPendingApproval(profile.role)) redirect('/dashboard');

  return (
    <div className="flex flex-col overflow-hidden h-[calc(100vh-10rem)]">
      <PageHeader title={PAGE_TITLE} description={PAGE_DESCRIPTION} />
      <div className="flex-1 min-h-0 pt-6">
        <Suspense fallback={<MessagesSkeleton />}>
          <MessagesClient />
        </Suspense>
      </div>
    </div>
  );
}

function MessagesSkeleton() {
  return (
    <div className="flex h-full bg-white rounded-lg shadow overflow-hidden">
      {/* 좌측 목록 스켈레톤 */}
      <div className="w-full md:w-80 lg:w-96 border-r">
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <div className="h-5 w-16 bg-gray-100 rounded animate-pulse" />
          <div className="h-8 w-8 bg-gray-100 rounded animate-pulse" />
        </div>
        <div className="divide-y divide-gray-100">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-start gap-3 px-4 py-3">
              <div className="h-10 w-10 rounded-full bg-gray-100 animate-pulse shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-20 bg-gray-100 rounded animate-pulse" />
                <div className="h-3 w-3/4 bg-gray-100 rounded animate-pulse" />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 우측 빈 영역 */}
      <div className="flex-1 hidden md:flex items-center justify-center text-gray-300">
        <div className="h-12 w-12 bg-gray-100 rounded animate-pulse" />
      </div>
    </div>
  );
}
