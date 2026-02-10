import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { PageHeader } from '@/components/ui/page-header';
import MessagesClient from './_components/MessagesClient';

export default async function MessagesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  return (
    <div className="space-y-6">
      <PageHeader
        title="메시지"
        description="팀원에게 메시지를 보내보세요."
      />
      <Suspense fallback={<MessagesSkeleton />}>
        <MessagesClient />
      </Suspense>
    </div>
  );
}

function MessagesSkeleton() {
  return (
    <div className="flex h-[calc(100vh-10rem)] bg-white rounded-lg shadow overflow-hidden">
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
