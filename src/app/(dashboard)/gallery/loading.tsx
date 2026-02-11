import { PageHeader } from '@/components/ui/page-header';

export default function Loading() {
  return (
    <div className="space-y-6">
      <PageHeader title="로드맵 갤러리" />
      <div className="space-y-4">
        <div className="h-10 animate-shimmer rounded-md" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-64 animate-shimmer rounded-lg border" />
          ))}
        </div>
      </div>
    </div>
  );
}
