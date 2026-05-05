import { redirect } from 'next/navigation';
import { Suspense } from 'react';
import { getCachedUser, getCachedProfile } from '@/lib/supabase/cached';
import { PageHeader } from '@/components/ui/page-header';
import { GalleryContent } from './_components/GalleryContent';
import { fetchGalleryItems } from './actions';
import {
  PAGE_TITLE,
  PAGE_DESCRIPTION_ADMIN,
  PAGE_DESCRIPTION_CONSULTANT,
} from './_meta';

interface GalleryPageProps {
  searchParams: Promise<Record<string, string | undefined>>;
}

export default async function GalleryPage({ searchParams }: GalleryPageProps) {
  const user = await getCachedUser();
  if (!user) {
    redirect('/login');
  }

  const profile = await getCachedProfile();
  if (!profile) {
    redirect('/login');
  }

  const isAdmin = ['OPS_ADMIN', 'SYSTEM_ADMIN'].includes(profile.role);
  const params = await searchParams;

  return (
    <div className="space-y-6">
      <PageHeader
        title={PAGE_TITLE}
        description={isAdmin ? PAGE_DESCRIPTION_ADMIN : PAGE_DESCRIPTION_CONSULTANT}
      />
      <Suspense fallback={<GalleryLoadingSkeleton />}>
        <GallerySection isAdmin={isAdmin} searchParams={params} />
      </Suspense>
    </div>
  );
}

async function GallerySection({
  isAdmin,
  searchParams,
}: {
  isAdmin: boolean;
  searchParams: Record<string, string | undefined>;
}) {
  // 통합 fetch — track 파라미터(ALL/ROADMAP/PBL)에 따라 분기
  const result = await fetchGalleryItems(searchParams);

  return (
    <GalleryContent
      isAdmin={isAdmin}
      searchParams={searchParams}
      initialData={result.success ? result.data : undefined}
    />
  );
}

function GalleryLoadingSkeleton() {
  return (
    <div className="space-y-4">
      <div className="h-10 animate-shimmer rounded-md" />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-64 animate-shimmer rounded-lg" />
        ))}
      </div>
    </div>
  );
}
