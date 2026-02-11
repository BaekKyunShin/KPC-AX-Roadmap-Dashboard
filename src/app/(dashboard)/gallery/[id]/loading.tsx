import { PageHeader } from '@/components/ui/page-header';

export default function Loading() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="로드맵 갤러리"
        backLink={{ href: '/gallery', label: '갤러리로 돌아가기' }}
      />
      <div className="space-y-4">
        <div className="h-8 w-2/3 animate-shimmer rounded" />
        <div className="flex gap-2">
          <div className="h-6 w-20 animate-shimmer rounded" />
          <div className="h-6 w-24 animate-shimmer rounded" />
        </div>
        <div className="h-96 animate-shimmer rounded-lg border" />
      </div>
    </div>
  );
}
