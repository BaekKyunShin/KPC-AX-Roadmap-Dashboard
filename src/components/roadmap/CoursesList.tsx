'use client';

import type { RoadmapCell } from '@/lib/services/roadmap';
import type { CourseLevel } from '@/lib/utils/roadmap';
import { getLevelLabel } from '@/lib/utils/roadmap';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  BookOpen,
  Clock,
  Target,
  Users,
  Wrench,
  CheckCircle,
  BarChart3,
  FileText,
  Pencil,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';

// =============================================================================
// 타입 정의
// =============================================================================

interface CoursesListProps {
  courses: RoadmapCell[];
  canEdit?: boolean;
  onEditCourse?: (courseIndex: number) => void;
}

interface CourseCardProps {
  course: RoadmapCell;
  index: number;
  canEdit: boolean;
  onEditCourse?: (courseIndex: number) => void;
}

interface ProfileRow {
  label: string;
  value: ReactNode;
  icon: LucideIcon;
}

// =============================================================================
// 상수
// =============================================================================

/** 레벨별 Badge 색상 클래스 (배경 + 텍스트 + 테두리) */
const LEVEL_BADGE_COLORS: Record<CourseLevel, string> = {
  BEGINNER: 'bg-green-100 text-green-800 border-green-200',
  INTERMEDIATE: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  ADVANCED: 'bg-red-100 text-red-800 border-red-200',
};

/** Accordion 기본 열림 상태 */
const DEFAULT_ACCORDION_VALUES = ['profile', 'curriculum'];

// =============================================================================
// 유틸리티 함수
// =============================================================================

/** 시간을 포맷팅하여 반환 (예: 8 -> "8H") */
function formatHours(hours: number): string {
  return `${hours}H`;
}

/** 레벨에 해당하는 Badge 색상 클래스 반환 */
function getLevelBadgeColor(level: string): string {
  return LEVEL_BADGE_COLORS[level as CourseLevel] || 'bg-gray-100 text-gray-800 border-gray-200';
}

// =============================================================================
// 하위 컴포넌트: 과정 프로파일 테이블
// =============================================================================

function CourseProfileTable({ course }: { course: RoadmapCell }) {
  const profileRows: ProfileRow[] = [
    { label: '과정명', value: course.course_name, icon: BookOpen },
    { label: '과정 목표', value: course.expected_outcome, icon: Target },
    { label: '교육 대상', value: course.target_audience, icon: Users },
    { label: '대상 업무', value: course.target_task, icon: FileText },
    {
      label: '난이도',
      value: (
        <Badge variant="outline" className={getLevelBadgeColor(course.level)}>
          {getLevelLabel(course.level)}
        </Badge>
      ),
      icon: BarChart3,
    },
    { label: '교육 시간', value: `${course.recommended_hours}시간`, icon: Clock },
    {
      label: '사용 도구',
      value: (
        <div className="flex flex-wrap gap-1.5">
          {course.tools?.map((tool, i) => (
            <Badge key={i} variant="secondary" className="font-normal" title={tool.free_tier_info}>
              {tool.name}
              {tool.free_tier_info && (
                <span className="ml-1 text-xs opacity-70">({tool.free_tier_info})</span>
              )}
            </Badge>
          ))}
        </div>
      ),
      icon: Wrench,
    },
    {
      label: '선수 조건',
      value:
        course.prerequisites && course.prerequisites.length > 0
          ? course.prerequisites.join(', ')
          : '없음',
      icon: CheckCircle,
    },
  ];

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <tbody className="divide-y divide-gray-200">
          {profileRows.map((row, idx) => {
            const IconComponent = row.icon;
            return (
              <tr key={idx} className="hover:bg-gray-50/50">
                <td className="w-[140px] px-4 py-3 bg-gray-50/80 font-medium text-gray-700 text-left whitespace-nowrap align-top">
                  <div className="flex items-center gap-2">
                    <IconComponent className="h-4 w-4 text-gray-500 shrink-0" />
                    {row.label}
                  </div>
                </td>
                <td className="px-4 py-3 text-left text-gray-900 align-top">
                  {typeof row.value === 'string' ? (
                    <span className="break-keep">{row.value}</span>
                  ) : (
                    row.value
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// =============================================================================
// 하위 컴포넌트: 커리큘럼 테이블
// =============================================================================

function CurriculumTable({ course }: { course: RoadmapCell }) {
  const curriculum = course.curriculum || [];

  if (curriculum.length === 0) {
    return <p className="text-gray-500 text-sm py-2">커리큘럼 정보가 없습니다.</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-indigo-50/80">
            <th className="w-[70px] px-4 py-3 text-center text-indigo-700 font-semibold text-sm">
              시간
            </th>
            <th className="px-4 py-3 text-left text-indigo-700 font-semibold text-sm">학습 모듈</th>
            <th className="px-4 py-3 text-left text-indigo-700 font-semibold text-sm">실습/과제</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200">
          {curriculum.map((module, idx) => (
            <tr key={idx} className="hover:bg-indigo-50/30">
              <td className="px-4 py-3 text-center font-medium text-indigo-600 whitespace-nowrap align-top">
                {formatHours(module.hours)}
              </td>
              <td className="px-4 py-3 text-left align-top">
                <div className="space-y-1">
                  <span className="text-gray-900 font-medium break-keep">{module.module_name}</span>
                  {module.details && module.details.length > 0 && (
                    <ul className="ml-3 mt-1 space-y-0.5">
                      {module.details.map((detail, detailIdx) => (
                        <li key={detailIdx} className="text-gray-600 text-sm break-keep">
                          - {detail}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </td>
              <td className="px-4 py-3 text-left text-gray-600 align-top">
                {module.practice ? (
                  <span className="break-keep">{module.practice}</span>
                ) : (
                  <span className="text-gray-400">-</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// =============================================================================
// 하위 컴포넌트: 기대효과 및 측정 테이블
// =============================================================================

function OutcomeTable({ course }: { course: RoadmapCell }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-emerald-50/80">
            <th className="w-1/2 px-4 py-3 text-left text-emerald-700 font-semibold text-sm">
              기대효과
            </th>
            <th className="w-1/2 px-4 py-3 text-left text-emerald-700 font-semibold text-sm">
              측정 방법
            </th>
          </tr>
        </thead>
        <tbody>
          <tr className="hover:bg-emerald-50/30">
            <td className="px-4 py-3 text-left align-top">
              <p className="text-gray-900 break-keep">{course.expected_outcome || '-'}</p>
            </td>
            <td className="px-4 py-3 text-left align-top">
              <p className="text-gray-900 break-keep">{course.measurement_method || '-'}</p>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

// =============================================================================
// 하위 컴포넌트: 편집 버튼
// =============================================================================

function EditButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="p-2 text-gray-400 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
      title="편집"
    >
      <Pencil className="w-5 h-5" />
    </button>
  );
}

// =============================================================================
// 하위 컴포넌트: 개별 과정 카드
// =============================================================================

function CourseCard({ course, index, canEdit, onEditCourse }: CourseCardProps) {
  const moduleCount = course.curriculum?.length || 0;

  return (
    <Card className="overflow-hidden shadow-sm hover:shadow-md transition-shadow">
      <CardHeader className="pb-3 bg-gradient-to-r from-gray-50 to-white">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-semibold text-gray-900 break-keep">{course.course_name}</h3>
            <div className="flex flex-wrap items-center gap-2 mt-2">
              <Badge variant="outline" className="text-gray-600 border-gray-300">
                {course.target_task}
              </Badge>
              <Badge variant="outline" className={getLevelBadgeColor(course.level)}>
                {getLevelLabel(course.level)}
              </Badge>
              <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                <Clock className="h-3 w-3 mr-1" />
                {course.recommended_hours}시간
              </Badge>
            </div>
          </div>
          {canEdit && onEditCourse && <EditButton onClick={() => onEditCourse(index)} />}
        </div>
      </CardHeader>

      <CardContent className="pt-0 px-0">
        <Accordion type="multiple" defaultValue={DEFAULT_ACCORDION_VALUES} className="w-full">
          {/* 과정 프로파일 */}
          <AccordionItem value="profile" className="border-b-0">
            <AccordionTrigger className="px-6 py-3 hover:no-underline hover:bg-gray-50/50 text-sm font-medium text-gray-700">
              <div className="flex items-center gap-2">
                <BookOpen className="h-4 w-4 text-gray-500" />
                과정 프로파일
              </div>
            </AccordionTrigger>
            <AccordionContent className="px-6 pb-4">
              <div className="border border-gray-200 rounded-lg overflow-hidden">
                <CourseProfileTable course={course} />
              </div>
            </AccordionContent>
          </AccordionItem>

          {/* 커리큘럼 */}
          <AccordionItem value="curriculum" className="border-b-0">
            <AccordionTrigger className="px-6 py-3 hover:no-underline hover:bg-gray-50/50 text-sm font-medium text-gray-700">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-indigo-500" />
                커리큘럼
                <Badge variant="secondary" className="ml-2 text-xs">
                  {moduleCount}개 모듈
                </Badge>
              </div>
            </AccordionTrigger>
            <AccordionContent className="px-6 pb-4">
              <div className="border border-gray-200 rounded-lg overflow-hidden">
                <CurriculumTable course={course} />
              </div>
            </AccordionContent>
          </AccordionItem>

          {/* 기대효과 및 측정 */}
          <AccordionItem value="outcome" className="border-b-0">
            <AccordionTrigger className="px-6 py-3 hover:no-underline hover:bg-gray-50/50 text-sm font-medium text-gray-700">
              <div className="flex items-center gap-2">
                <Target className="h-4 w-4 text-emerald-500" />
                기대효과 및 측정
              </div>
            </AccordionTrigger>
            <AccordionContent className="px-6 pb-4">
              <div className="border border-gray-200 rounded-lg overflow-hidden">
                <OutcomeTable course={course} />
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </CardContent>
    </Card>
  );
}

// =============================================================================
// 빈 상태 컴포넌트
// =============================================================================

function EmptyState() {
  return (
    <div className="text-center py-12">
      <BookOpen className="h-12 w-12 text-gray-300 mx-auto mb-3" />
      <p className="text-gray-500">과정 데이터가 없습니다.</p>
    </div>
  );
}

// =============================================================================
// 메인 컴포넌트
// =============================================================================

/**
 * 과정 상세 목록 컴포넌트
 * - 각 과정을 카드 형태로 표시
 * - Accordion을 통해 프로파일, 커리큘럼, 기대효과 섹션 제공
 */
export function CoursesList({ courses, canEdit = false, onEditCourse }: CoursesListProps) {
  if (!courses || courses.length === 0) {
    return <EmptyState />;
  }

  return (
    <div className="space-y-6 break-keep break-words">
      {courses.map((course, idx) => (
        <CourseCard
          key={idx}
          course={course}
          index={idx}
          canEdit={canEdit}
          onEditCourse={onEditCourse}
        />
      ))}
    </div>
  );
}
