import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { PageHeader } from '@/components/ui/page-header';
import { Library } from 'lucide-react';

export default async function GalleryPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  return (
    <div className="space-y-6">
      <PageHeader title="로드맵 갤러리" description="과거 로드맵을 검색하고 템플릿으로 재활용할 수 있습니다." />
      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-gray-300 bg-white px-6 py-24">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gray-100">
          <Library className="h-8 w-8 text-gray-400" />
        </div>
        <h3 className="mt-4 text-lg font-semibold text-gray-900">준비 중입니다</h3>
        <p className="mt-2 text-sm text-gray-500">
          로드맵 갤러리 기능은 현재 개발 중입니다. 곧 사용하실 수 있습니다.
        </p>
      </div>
    </div>
  );
}
