'use client';

import type { PBLCourse } from '@/lib/services/roadmap';

interface PBLCourseViewProps {
  course: PBLCourse;
}

/**
 * PBL 과정 상세 컴포넌트
 */
export function PBLCourseView({ course }: PBLCourseViewProps) {
  if (!course) {
    return <p className="text-gray-500">PBL 과정 데이터가 없습니다.</p>;
  }

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900">{course.course_name}</h3>
        <div className="mt-1 flex items-center space-x-4 text-sm text-gray-500">
          <span>총 {course.total_hours}시간</span>
          <span>대상: {course.target_audience}</span>
        </div>
      </div>

      {/* 대상 업무 */}
      <div>
        <h4 className="text-sm font-medium text-gray-700 mb-2">대상 업무</h4>
        <div className="flex flex-wrap gap-2">
          {course.target_tasks?.map((task, idx) => (
            <span key={idx} className="px-2 py-1 bg-purple-100 text-purple-800 text-xs rounded">
              {task}
            </span>
          ))}
        </div>
      </div>

      {/* 커리큘럼 */}
      <div>
        <h4 className="text-sm font-medium text-gray-700 mb-2">커리큘럼</h4>
        <div className="space-y-3">
          {course.curriculum?.map((module, idx) => (
            <div key={idx} className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="font-medium text-gray-900">{module.module_name}</span>
                <span className="text-sm text-gray-500">{module.hours}시간</span>
              </div>
              <p className="text-sm text-gray-600">{module.description}</p>
              {module.practice && <p className="mt-2 text-sm text-blue-600">실습: {module.practice}</p>}
              {module.tools && module.tools.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1">
                  {module.tools.map((tool, tidx) => (
                    <span
                      key={tidx}
                      className="px-2 py-0.5 bg-gray-100 text-gray-700 text-xs rounded"
                      title={tool.free_tier_info}
                    >
                      {tool.name}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* 기대 효과 및 측정 방법 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <h4 className="text-sm font-medium text-gray-700 mb-2">기대 효과</h4>
          <ul className="list-disc list-inside text-sm text-gray-600 space-y-1">
            {course.expected_outcomes?.map((outcome, idx) => (
              <li key={idx}>{outcome}</li>
            ))}
          </ul>
        </div>
        <div>
          <h4 className="text-sm font-medium text-gray-700 mb-2">측정 방법</h4>
          <ul className="list-disc list-inside text-sm text-gray-600 space-y-1">
            {course.measurement_methods?.map((method, idx) => (
              <li key={idx}>{method}</li>
            ))}
          </ul>
        </div>
      </div>

      {/* 준비물 */}
      {course.prerequisites && course.prerequisites.length > 0 && (
        <div>
          <h4 className="text-sm font-medium text-gray-700 mb-2">준비물</h4>
          <ul className="list-disc list-inside text-sm text-gray-600 space-y-1">
            {course.prerequisites.map((prereq, idx) => (
              <li key={idx}>{prereq}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
