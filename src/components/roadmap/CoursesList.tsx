'use client';

import { BookOpen, Plus, AlertTriangle } from 'lucide-react';
import type { RoadmapCourseSpec } from '@/lib/services/roadmap/roadmap-types';
import { ROADMAP_COURSE_SPEC_COUNT } from '@/lib/services/roadmap/roadmap-types';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { EmptyState } from '@/components/ui/EmptyState';
import { CourseSpecCard } from './CourseSpecCard';

// ============================================================================
// 타입 & 상수
// ============================================================================

interface CoursesListProps {
  specs: RoadmapCourseSpec[];
  canEdit?: boolean;
  onChange?: (next: RoadmapCourseSpec[]) => void;
}

/** 신규 명세서 기본값 (v2: 훈련시기·훈련수준 추가, format → training_method). */
const EMPTY_SPEC: RoadmapCourseSpec = {
  training_period: '',
  training_level: 'BEGINNER',
  course_name: '',
  training_method: '',
  recommended_program: '',
  goal: '',
  main_content: '',
  target_audience: '',
  subjects: [],
};

/** 양식 Ⅲ장의 명세서 표 개수 (v2: 6개) — 검증기(validateRoadmap)와 동일 기준. */
const MINIMUM_REQUIRED = ROADMAP_COURSE_SPEC_COUNT;

// ============================================================================
// 메인 컴포넌트
// ============================================================================

export function CoursesList({ specs, canEdit = false, onChange }: CoursesListProps) {
  const list = specs ?? [];
  const isEmpty = list.length === 0;

  const updateSpec = (index: number, next: RoadmapCourseSpec) => {
    if (!onChange) return;
    onChange(list.map((s, i) => (i === index ? next : s)));
  };

  const addSpec = () => {
    if (!onChange) return;
    onChange([...list, { ...EMPTY_SPEC, subjects: [] }]);
  };

  const removeSpec = (index: number) => {
    if (!onChange) return;
    onChange(list.filter((_, i) => i !== index));
  };

  // 빈 상태 (편집 모드 아닐 때만 EmptyState)
  if (isEmpty && !canEdit) {
    return (
      <EmptyState
        icon={<BookOpen className="mx-auto h-10 w-10 sm:h-12 sm:w-12 text-gray-400" />}
        title="훈련과정 명세서가 없습니다."
        description="훈련과정 명세서가 아직 작성되지 않았습니다."
      />
    );
  }

  const showWarning = canEdit && list.length < MINIMUM_REQUIRED;

  return (
    <div className="space-y-6 break-keep break-words">
      {/* 최소 개수 경고 */}
      {showWarning && (
        <Alert variant="destructive" role="alert">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>최소 {MINIMUM_REQUIRED}개 필요</AlertTitle>
          <AlertDescription>
            산인공 양식은 최소 {MINIMUM_REQUIRED}개의 훈련과정 명세서를 요구합니다. (현재{' '}
            {list.length}개)
          </AlertDescription>
        </Alert>
      )}

      {/* 명세서 카드 목록 */}
      {isEmpty ? (
        <div className="rounded-md border border-dashed border-border px-3 py-8 text-center text-sm text-muted-foreground">
          명세서가 없습니다. 아래 &quot;+ 명세서 추가&quot; 버튼을 클릭하여 시작하세요.
        </div>
      ) : (
        list.map((spec, idx) => (
          <CourseSpecCard
            key={idx}
            spec={spec}
            index={idx}
            canEdit={canEdit}
            onChange={(next) => updateSpec(idx, next)}
            onDelete={canEdit ? () => removeSpec(idx) : undefined}
          />
        ))
      )}

      {/* 명세서 추가 버튼 */}
      {canEdit && (
        <div className="flex justify-end">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={addSpec}
            aria-label="명세서 추가"
          >
            <Plus className="h-4 w-4" />
            명세서 추가
          </Button>
        </div>
      )}
    </div>
  );
}
