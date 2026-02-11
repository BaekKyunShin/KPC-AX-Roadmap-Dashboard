'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Copy } from 'lucide-react';
import { RoadmapMatrix } from '@/components/roadmap/RoadmapMatrix';
import { PBLCourseView } from '@/components/roadmap/PBLCourseView';
import { CoursesList } from '@/components/roadmap/CoursesList';
import { LikeButton } from '@/components/gallery/LikeButton';
import { UseRoadmapDialog } from '@/components/gallery/UseRoadmapDialog';
import { ROADMAP_TABS } from '@/types/roadmap-ui';
import type { RoadmapTabKey } from '@/types/roadmap-ui';
import type { RoadmapDetailView } from '../../actions';
import type { RoadmapRow, PBLCourse, RoadmapCell } from '@/lib/services/roadmap';

interface GalleryDetailContentProps {
  detail: RoadmapDetailView;
  isConsultant: boolean;
}

export function GalleryDetailContent({ detail, isConsultant }: GalleryDetailContentProps) {
  const [activeTab, setActiveTab] = useState<RoadmapTabKey>('matrix');
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const matrix = detail.roadmapMatrix as RoadmapRow[];
  const pblCourse = detail.pblCourse as PBLCourse;
  const courses = detail.courses as RoadmapCell[];

  return (
    <>
      {/* 액션 바: 좋아요 + 사용하기 */}
      <div className="flex items-center gap-3">
        <LikeButton
          roadmapVersionId={detail.id}
          initialLiked={detail.isLiked}
          initialCount={detail.likeCount}
          size="default"
        />
        {isConsultant && (
          <Button
            onClick={() => setIsDialogOpen(true)}
            className="gap-1.5"
          >
            <Copy className="h-4 w-4" />
            이 로드맵 사용하기
          </Button>
        )}
      </div>

      {/* 진단 요약 */}
      {detail.diagnosisSummary && (
        <div className="rounded-lg border bg-gray-50 px-4 py-3">
          <p className="text-sm text-gray-700">{detail.diagnosisSummary}</p>
        </div>
      )}

      {/* 탭 + 콘텐츠 */}
      <div className="bg-white shadow rounded-lg">
        <div className="border-b">
          <nav className="flex -mb-px">
            {ROADMAP_TABS.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`px-6 py-3 text-sm font-medium border-b-2 ${
                  activeTab === tab.key
                    ? 'border-primary text-primary'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        <div className="p-6">
          {activeTab === 'matrix' && (
            <RoadmapMatrix matrix={matrix} canEdit={false} />
          )}
          {activeTab === 'courses' && (
            <CoursesList courses={courses} canEdit={false} />
          )}
          {activeTab === 'pbl' && (
            <PBLCourseView course={pblCourse} />
          )}
        </div>
      </div>

      {/* 사용하기 다이얼로그 */}
      <UseRoadmapDialog
        isOpen={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
        roadmapVersionId={detail.id}
      />
    </>
  );
}
