'use client';

import { useState } from 'react';
import { Copy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CoursesList } from '@/components/roadmap/CoursesList';
import { LikeButton } from '@/components/gallery/LikeButton';
import { UseRoadmapDialog } from '@/components/gallery/UseRoadmapDialog';
import { ROADMAP_TABS, type RoadmapTabKey } from '@/types/roadmap-ui';
import { fromRoadmapVersionColumns } from '@/lib/services/roadmap/roadmap-storage-mapper';
import type { RoadmapDetailView } from '../../actions';

interface GalleryDetailContentProps {
  detail: RoadmapDetailView;
  isConsultant: boolean;
}

export function GalleryDetailContent({ detail, isConsultant }: GalleryDetailContentProps) {
  const [activeTab, setActiveTab] = useState<RoadmapTabKey>('specs');
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  // DB legacy 컬럼(roadmap_matrix/pbl_course/courses) → RoadmapResult(v2)
  const result = fromRoadmapVersionColumns({
    diagnosis_summary: detail.diagnosisSummary,
    roadmap_matrix: detail.roadmapMatrix,
    pbl_course: detail.pblCourse,
    courses: detail.courses,
  });

  return (
    <>
      {/* 액션 바: 좋아요 + 사용하기 */}
      <div className="flex items-center gap-3">
        <LikeButton
          roadmapVersionId={detail.id}
          track="ROADMAP"
          initialLiked={detail.isLiked}
          initialCount={detail.likeCount}
          size="default"
        />
        {isConsultant && (
          <Button onClick={() => setIsDialogOpen(true)} className="gap-1.5">
            <Copy className="h-4 w-4" />이 로드맵 사용하기
          </Button>
        )}
      </div>

      {/* 진단 요약 */}
      {result.diagnosis_summary && (
        <div className="rounded-lg border bg-gray-50 px-4 py-3">
          <p className="text-sm text-gray-700">{result.diagnosis_summary}</p>
        </div>
      )}

      {/* 탭 + 콘텐츠 */}
      <div className="bg-white shadow rounded-lg">
        <div className="border-b">
          <nav className="flex -mb-px overflow-x-auto">
            {ROADMAP_TABS.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`px-6 py-3 text-sm font-medium border-b-2 whitespace-nowrap ${
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
          {activeTab === 'specs' && <CoursesList specs={result.course_specs} canEdit={false} />}
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
