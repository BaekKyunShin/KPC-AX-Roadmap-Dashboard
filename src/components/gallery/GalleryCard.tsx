'use client';

import Link from 'next/link';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Factory, Building2, User } from 'lucide-react';
import { LikeButton } from './LikeButton';
import type { GalleryRoadmapItem } from '@/app/(dashboard)/gallery/actions';

interface GalleryCardProps {
  item: GalleryRoadmapItem;
}

export function GalleryCard({ item }: GalleryCardProps) {
  return (
    <Link href={`/gallery/${item.id}`} className="block group">
      <Card className="overflow-hidden transition-all duration-200 group-hover:-translate-y-0.5 group-hover:shadow-md">
        <CardHeader className="pb-3">
          <div className="space-y-2">
            <CardTitle className="text-base leading-tight line-clamp-2">
              {item.pblCourseName || `${item.companyName} 로드맵`}
            </CardTitle>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline" className="text-xs">
                <Factory className="mr-1 h-3 w-3" />
                {item.industry}
              </Badge>
              <Badge variant="outline" className="text-xs">
                <Building2 className="mr-1 h-3 w-3" />
                {item.companySize}
              </Badge>
            </div>
            <p className="text-xs text-gray-500">
              {item.companyName}
            </p>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-gray-600 line-clamp-2">
            {item.diagnosisSummary}
          </p>

          {item.pblCourseName && (
            <div className="rounded-md bg-gray-50 px-3 py-2">
              <p className="text-xs text-gray-500">PBL 최적 과정</p>
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

          <div className="flex items-center justify-between pt-2 border-t text-xs text-gray-500">
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1">
                <User className="h-3 w-3" />
                {item.createdByName}
              </span>
              <LikeButton
                roadmapVersionId={item.id}
                initialLiked={item.isLiked}
                initialCount={item.likeCount}
                size="sm"
              />
            </div>
            <span className="text-xs text-primary font-medium">
              상세 보기
            </span>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
