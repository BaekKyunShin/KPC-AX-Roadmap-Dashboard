'use client';

import type { RoadmapCell } from '@/lib/services/roadmap';

interface CoursesListProps {
  courses: RoadmapCell[];
  canEdit?: boolean;
  onEditCourse?: (courseIndex: number) => void;
}

const LEVEL_COLORS: Record<string, string> = {
  BEGINNER: 'bg-green-100 text-green-800',
  INTERMEDIATE: 'bg-yellow-100 text-yellow-800',
  ADVANCED: 'bg-red-100 text-red-800',
};

const LEVEL_LABELS: Record<string, string> = {
  BEGINNER: '초급',
  INTERMEDIATE: '중급',
  ADVANCED: '고급',
};

/**
 * 과정 상세 목록 컴포넌트
 */
export function CoursesList({ courses, canEdit = false, onEditCourse }: CoursesListProps) {
  if (!courses || courses.length === 0) {
    return <p className="text-gray-500">과정 데이터가 없습니다.</p>;
  }

  return (
    <div className="space-y-4">
      {courses.map((course, idx) => (
        <div key={idx} className="border border-gray-200 rounded-lg p-4">
          {/* 헤더 */}
          <div className="flex items-start justify-between mb-3">
            <div>
              <h4 className="font-medium text-gray-900">{course.course_name}</h4>
              <p className="text-sm text-gray-500">대상 업무: {course.target_task}</p>
            </div>
            <div className="flex items-center space-x-2">
              {canEdit && onEditCourse && (
                <button
                  onClick={() => onEditCourse(idx)}
                  className="p-1 text-gray-400 hover:text-purple-600"
                  title="편집"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                    />
                  </svg>
                </button>
              )}
              <span className={`px-2 py-1 text-xs rounded ${LEVEL_COLORS[course.level]}`}>
                {LEVEL_LABELS[course.level]}
              </span>
              <span className="text-sm text-gray-500">{course.recommended_hours}시간</span>
            </div>
          </div>

          {/* 커리큘럼 및 도구 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <h5 className="text-xs font-medium text-gray-500 uppercase mb-1">커리큘럼</h5>
              <ul className="list-disc list-inside text-gray-600">
                {course.curriculum?.map((item, i) => (
                  <li key={i}>{item}</li>
                ))}
              </ul>
            </div>
            <div>
              <h5 className="text-xs font-medium text-gray-500 uppercase mb-1">사용 도구</h5>
              <div className="flex flex-wrap gap-1">
                {course.tools?.map((tool, i) => (
                  <span
                    key={i}
                    className="px-2 py-0.5 bg-gray-100 text-gray-700 text-xs rounded"
                    title={tool.free_tier_info}
                  >
                    {tool.name}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* 기대효과 */}
          <div className="mt-3 pt-3 border-t border-gray-100">
            <p className="text-sm text-gray-600">
              <span className="font-medium">기대효과:</span> {course.expected_outcome}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}
