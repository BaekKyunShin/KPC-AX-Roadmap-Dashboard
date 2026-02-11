import { redirect, notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { PageHeader } from '@/components/ui/page-header';
import { Badge } from '@/components/ui/badge';
import { Factory, Building2, User } from 'lucide-react';
import { fetchRoadmapDetail } from '../actions';
import { GalleryDetailContent } from './_components/GalleryDetailContent';

interface GalleryDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function GalleryDetailPage({ params }: GalleryDetailPageProps) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // 역할 확인
  const { data: profile } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single();

  if (!profile) {
    redirect('/login');
  }

  const result = await fetchRoadmapDetail(id);

  if (!result.success) {
    notFound();
  }

  const detail = result.data;
  const isConsultant = profile.role === 'CONSULTANT_APPROVED';

  return (
    <div className="space-y-6">
      <PageHeader
        title="로드맵 갤러리"
        backLink={{ href: '/gallery', label: '갤러리로 돌아가기' }}
      />

      {/* 메타 정보 */}
      <div className="space-y-3">
        <h2 className="text-xl font-semibold text-gray-900">
          {detail.pblCourse && typeof detail.pblCourse === 'object' && 'course_name' in detail.pblCourse
            ? (detail.pblCourse as { course_name: string }).course_name
            : `${detail.companyName} 로드맵`}
        </h2>
        <div className="flex flex-wrap items-center gap-2 text-sm text-gray-600">
          <Badge variant="outline">
            <Factory className="mr-1 h-3 w-3" />
            {detail.industry}
          </Badge>
          <Badge variant="outline">
            <Building2 className="mr-1 h-3 w-3" />
            {detail.companySize}
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

      {/* 상세 내용 (클라이언트 컴포넌트) */}
      <GalleryDetailContent
        detail={detail}
        isConsultant={isConsultant}
      />
    </div>
  );
}
