import { redirect, notFound } from 'next/navigation';
import { Factory, Building2, User } from 'lucide-react';
import { getCachedUser, getCachedProfile } from '@/lib/supabase/cached';
import { PageHeader } from '@/components/ui/page-header';
import { Badge } from '@/components/ui/badge';
import { TrackBadge } from '@/components/ui/TrackBadge';
import { COMPANY_SIZE_LABELS } from '@/lib/constants/company-size';
import type { CompanySizeValue } from '@/lib/constants/company-size';
import { fetchRoadmapDetail, fetchPBLReportDetail } from '../actions';
import { GalleryDetailContent } from './_components/GalleryDetailContent';
import { GalleryPBLDetailContent } from './_components/GalleryPBLDetailContent';

interface GalleryDetailPageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ track?: string }>;
}

export default async function GalleryDetailPage({
  params,
  searchParams,
}: GalleryDetailPageProps) {
  const { id } = await params;
  const sp = await searchParams;
  const track: 'ROADMAP' | 'PBL' = sp.track === 'PBL' ? 'PBL' : 'ROADMAP';

  const user = await getCachedUser();
  if (!user) redirect('/login');

  const profile = await getCachedProfile();
  if (!profile) redirect('/login');

  const result = track === 'PBL'
    ? await fetchPBLReportDetail(id)
    : await fetchRoadmapDetail(id);

  if (!result.success) {
    notFound();
  }

  const detail = result.data;
  const isConsultant = profile.role === 'CONSULTANT_APPROVED';

  return (
    <div className="space-y-6">
      <PageHeader
        title="로드맵·PBL 갤러리"
        backLink={{ href: '/gallery', label: '갤러리로 돌아가기', useBack: true }}
      />

      {/* 메타 정보 */}
      <div className="space-y-3">
        <div className="flex items-start gap-3 flex-wrap">
          <h2 className="text-xl font-semibold text-gray-900">
            {detail.title}
          </h2>
          <TrackBadge track={detail.track} />
        </div>
        <div className="flex flex-wrap items-center gap-2 text-sm text-gray-600">
          <Badge variant="outline">
            <Factory className="mr-1 h-3 w-3" />
            {detail.industry}
          </Badge>
          <Badge variant="outline">
            <Building2 className="mr-1 h-3 w-3" />
            {COMPANY_SIZE_LABELS[detail.companySize as CompanySizeValue] || detail.companySize}
          </Badge>
          <span className="text-gray-400">|</span>
          <span>{detail.companyName}</span>
          <span className="text-gray-400">|</span>
          <span className="flex items-center gap-1">
            <User className="h-3 w-3" />
            {detail.createdByName}
          </span>
        </div>
      </div>

      {/* 상세 내용 (클라이언트 컴포넌트 트랙별 분기) */}
      {detail.track === 'PBL' ? (
        <GalleryPBLDetailContent detail={detail} isConsultant={isConsultant} />
      ) : (
        <GalleryDetailContent detail={detail} isConsultant={isConsultant} />
      )}
    </div>
  );
}
