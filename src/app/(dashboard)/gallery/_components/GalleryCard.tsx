'use client';

import Link from 'next/link';
import { Factory, Building2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { COMPANY_SIZE_LABELS } from '@/lib/constants/company-size';
import type { CompanySizeValue } from '@/lib/constants/company-size';
import type { GalleryRoadmapItem } from '../actions';
import { LikeButton } from './LikeButton';
import { TrackBadge } from '@/components/ui/TrackBadge';

const AVATAR_COLORS = [
  'bg-blue-600',
  'bg-emerald-600',
  'bg-violet-600',
  'bg-amber-600',
  'bg-rose-600',
  'bg-cyan-600',
] as const;

function getAvatarColor(name: string): (typeof AVATAR_COLORS)[number] {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

interface GalleryCardProps {
  item: GalleryRoadmapItem;
}

/** company_size 값을 사용자 친화적 레이블로 변환 */
function formatCompanySize(raw: string): string {
  // COMPANY_SIZE_VALUES 형식인 경우 레이블로 변환
  const label = COMPANY_SIZE_LABELS[raw as CompanySizeValue];
  if (label) return label;
  // 이미 표시용 형식인 경우 그대로 반환
  return raw;
}

export function GalleryCard({ item }: GalleryCardProps) {
  // 트랙 정보는 ?track 쿼리로 명시 — roadmap_versions.id와 pbl_reports.id 모두 UUID라
  // id만으로 테이블 판별 불가.
  const detailHref = `/gallery/${item.id}?track=${item.track}`;

  return (
    <Link href={detailHref} className="block group">
      <Card className="overflow-hidden transition-all duration-200 group-hover:-translate-y-0.5 group-hover:shadow-md">
        <CardHeader className="pb-3">
          <div className="space-y-2">
            <div className="flex items-start justify-between gap-2">
              <CardTitle className="text-base leading-tight line-clamp-2 flex-1">
                {item.title}
              </CardTitle>
              <TrackBadge track={item.track} className="shrink-0" />
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline" className="text-xs">
                <Factory className="mr-1 h-3 w-3" />
                {item.industry}
              </Badge>
              <Badge variant="outline" className="text-xs">
                <Building2 className="mr-1 h-3 w-3" />
                {formatCompanySize(item.companySize)}
              </Badge>
            </div>
            <p className="text-xs text-gray-500">{item.companyName}</p>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-gray-600 line-clamp-2">{item.diagnosisSummary}</p>

          {item.pblCourseName && (
            <div className="rounded-md bg-gray-50 px-3 py-2">
              <p className="text-xs text-gray-500">
                {item.track === 'PBL' ? '훈련과정' : 'PBL 최적 과정'}
              </p>
              <p className="text-sm font-medium text-gray-800">
                {item.pblCourseName}
                {item.pblTotalHours > 0 && (
                  <span className="ml-1 text-xs font-normal text-gray-500">
                    ({item.pblTotalHours}h)
                  </span>
                )}
              </p>
            </div>
          )}

          {/* 태그 */}
          {item.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {item.tags.map((tag) => (
                <Badge key={tag} variant="secondary" className="text-xs px-2 py-0">
                  {tag}
                </Badge>
              ))}
            </div>
          )}

          <div className="flex items-center justify-between pt-3 border-t">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <div
                  className={cn(
                    'flex items-center justify-center h-6 w-6 rounded-full text-[10px] font-semibold text-white shrink-0',
                    getAvatarColor(item.createdByName)
                  )}
                >
                  {item.createdByName?.charAt(0) || '?'}
                </div>
                <span className="text-sm font-medium text-gray-700">{item.createdByName}</span>
              </div>
              <LikeButton
                roadmapVersionId={item.id}
                track={item.track}
                initialLiked={item.isLiked}
                initialCount={item.likeCount}
              />
            </div>
            <span className="text-sm text-primary font-medium group-hover:underline">
              상세 보기
            </span>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
