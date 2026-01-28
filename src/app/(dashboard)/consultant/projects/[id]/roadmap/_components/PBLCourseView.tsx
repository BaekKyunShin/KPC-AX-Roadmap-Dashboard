'use client';

import type { PBLCourse } from '@/lib/services/roadmap';
import { getLevelLabel } from '@/lib/utils/roadmap';

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
    <div className="space-y-6 break-keep">
      {/* 선정된 과정 정보 */}
      {course.selected_course_name && (
        <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4">
          <h4 className="text-sm font-semibold text-indigo-900 mb-2">선정된 과정</h4>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-medium text-indigo-800">{course.selected_course_name}</span>
            {course.selected_course_level && (
              <span className="px-2 py-0.5 bg-indigo-200 text-indigo-800 text-xs rounded">
                {getLevelLabel(course.selected_course_level)}
              </span>
            )}
            {course.selected_course_task && (
              <span className="px-2 py-0.5 bg-indigo-100 text-indigo-700 text-xs rounded">
                {course.selected_course_task}
              </span>
            )}
          </div>
        </div>
      )}

      {/* 선정 이유 */}
      {course.selection_rationale && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
          <h4 className="text-sm font-semibold text-amber-900 mb-3">PBL 과정 선정 이유</h4>
          <div className="space-y-3">
            {course.selection_rationale.consultant_expertise_fit && (
              <div>
                <span className="text-xs font-medium text-amber-800 uppercase">컨설턴트 전문성 적합도</span>
                <p className="text-sm text-amber-900 mt-0.5">{course.selection_rationale.consultant_expertise_fit}</p>
              </div>
            )}
            {course.selection_rationale.pain_point_alignment && (
              <div>
                <span className="text-xs font-medium text-amber-800 uppercase">페인포인트 연관성</span>
                <p className="text-sm text-amber-900 mt-0.5">{course.selection_rationale.pain_point_alignment}</p>
              </div>
            )}
            {course.selection_rationale.feasibility_assessment && (
              <div>
                <span className="text-xs font-medium text-amber-800 uppercase">현실 가능성 평가</span>
                <p className="text-sm text-amber-900 mt-0.5">{course.selection_rationale.feasibility_assessment}</p>
              </div>
            )}
            {course.selection_rationale.summary && (
              <div className="pt-2 border-t border-amber-200">
                <span className="text-xs font-medium text-amber-800 uppercase">종합 선정 이유</span>
                <p className="text-sm text-amber-900 mt-0.5 font-medium">{course.selection_rationale.summary}</p>
              </div>
            )}
          </div>
        </div>
      )}

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
              {module.practice && (
                <div className="mt-2">
                  <span className="text-xs font-medium text-blue-700 uppercase">실습</span>
                  <p className="text-sm text-blue-600">{module.practice}</p>
                </div>
              )}
              {module.deliverables && module.deliverables.length > 0 && (
                <div className="mt-2">
                  <span className="text-xs font-medium text-green-700 uppercase">모듈 결과물</span>
                  <ul className="list-disc list-inside text-sm text-green-600 mt-1">
                    {module.deliverables.map((deliverable, didx) => (
                      <li key={didx}>{deliverable}</li>
                    ))}
                  </ul>
                </div>
              )}
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

      {/* 최종 산출물 */}
      {course.final_deliverables && course.final_deliverables.length > 0 && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <h4 className="text-sm font-semibold text-green-900 mb-2">최종 산출물</h4>
          <ul className="list-disc list-inside text-sm text-green-800 space-y-1">
            {course.final_deliverables.map((deliverable, idx) => (
              <li key={idx}>{deliverable}</li>
            ))}
          </ul>
        </div>
      )}

      {/* 비즈니스 임팩트 */}
      {course.business_impact && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h4 className="text-sm font-semibold text-blue-900 mb-2">비즈니스 임팩트</h4>
          <p className="text-sm text-blue-800">{course.business_impact}</p>
        </div>
      )}

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
