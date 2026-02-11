import { PageHeader } from '@/components/ui/page-header';

export default function Loading() {
  return (
    <div className="space-y-6">
      <PageHeader title="로드맵 갤러리" />
      <div className="flex items-center justify-center rounded-lg border border-dashed border-gray-300 bg-white px-6 py-24">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-gray-600" />
      </div>
    </div>
  );
}
