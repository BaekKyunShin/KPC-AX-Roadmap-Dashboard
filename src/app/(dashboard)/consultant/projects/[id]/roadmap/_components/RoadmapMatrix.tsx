'use client';

import { useState } from 'react';
import type { RoadmapRow, RoadmapCell } from '@/lib/services/roadmap';

interface RoadmapMatrixProps {
  matrix: RoadmapRow[];
  canEdit?: boolean;
  onEditCourse?: (rowIndex: number, level: 'beginner' | 'intermediate' | 'advanced') => void;
}

type Level = 'beginner' | 'intermediate' | 'advanced';

const TAB_CONFIG: Record<Level, { label: string; bgColor: string; textColor: string; borderColor: string }> = {
  beginner: { label: '초급', bgColor: 'bg-green-50', textColor: 'text-green-600', borderColor: 'border-green-500' },
  intermediate: { label: '중급', bgColor: 'bg-yellow-50', textColor: 'text-yellow-600', borderColor: 'border-yellow-500' },
  advanced: { label: '고급', bgColor: 'bg-red-50', textColor: 'text-red-600', borderColor: 'border-red-500' },
};

/**
 * 매트릭스 셀 컴포넌트
 */
function CourseCell({ course }: { course: RoadmapCell }) {
  return (
    <div className="text-xs">
      <div className="font-medium text-gray-900">{course.course_name}</div>
      <div className="text-gray-500">{course.recommended_hours}시간</div>
    </div>
  );
}

/**
 * 편집 버튼 컴포넌트
 */
function EditButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="opacity-0 group-hover:opacity-100 ml-2 p-1 text-gray-400 hover:text-purple-600 transition-opacity"
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
  );
}

/**
 * NxM 매트릭스 컴포넌트 (반응형)
 */
export function RoadmapMatrix({ matrix, canEdit = false, onEditCourse }: RoadmapMatrixProps) {
  const [mobileTab, setMobileTab] = useState<Level>('beginner');

  if (!matrix || matrix.length === 0) {
    return <p className="text-gray-500">매트릭스 데이터가 없습니다.</p>;
  }

  const renderMatrixCell = (course: RoadmapCell | null | undefined, rowIndex: number, level: Level, bgColor: string) => (
    <td className={`px-4 py-3 ${bgColor}`}>
      {course ? (
        <div className="flex items-center justify-between group">
          <CourseCell course={course} />
          {canEdit && onEditCourse && <EditButton onClick={() => onEditCourse(rowIndex, level)} />}
        </div>
      ) : (
        <span className="text-gray-400 text-xs">-</span>
      )}
    </td>
  );

  return (
    <>
      {/* 데스크톱: 테이블 뷰 */}
      <div className="hidden md:block overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">업무</th>
              <th className="px-4 py-3 text-center text-xs font-medium text-green-600 uppercase bg-green-50">초급</th>
              <th className="px-4 py-3 text-center text-xs font-medium text-yellow-600 uppercase bg-yellow-50">중급</th>
              <th className="px-4 py-3 text-center text-xs font-medium text-red-600 uppercase bg-red-50">고급</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {matrix.map((row, rowIndex) => (
              <tr key={row.task_id}>
                <td className="px-4 py-3 text-sm font-medium text-gray-900">{row.task_name}</td>
                {renderMatrixCell(row.beginner, rowIndex, 'beginner', 'bg-green-50')}
                {renderMatrixCell(row.intermediate, rowIndex, 'intermediate', 'bg-yellow-50')}
                {renderMatrixCell(row.advanced, rowIndex, 'advanced', 'bg-red-50')}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* 모바일: 탭 + 카드 뷰 */}
      <div className="md:hidden">
        {/* 레벨 탭 */}
        <div className="flex border-b border-gray-200 mb-4">
          {(['beginner', 'intermediate', 'advanced'] as const).map((level) => (
            <button
              key={level}
              onClick={() => setMobileTab(level)}
              className={`flex-1 py-2 text-sm font-medium border-b-2 ${
                mobileTab === level
                  ? `${TAB_CONFIG[level].borderColor} ${TAB_CONFIG[level].textColor}`
                  : 'border-transparent text-gray-500'
              }`}
            >
              {TAB_CONFIG[level].label}
            </button>
          ))}
        </div>

        {/* 카드 리스트 */}
        <div className="space-y-3">
          {matrix.map((row, rowIndex) => {
            const course = row[mobileTab];
            return (
              <div key={row.task_id} className={`p-4 rounded-lg border ${TAB_CONFIG[mobileTab].bgColor}`}>
                <div className="flex items-start justify-between">
                  <div>
                    <div className="text-xs text-gray-500 mb-1">업무</div>
                    <div className="font-medium text-gray-900 mb-2">{row.task_name}</div>
                  </div>
                  {canEdit && course && onEditCourse && (
                    <button
                      onClick={() => onEditCourse(rowIndex, mobileTab)}
                      className="p-2 text-gray-400 hover:text-purple-600"
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
                </div>
                {course ? (
                  <>
                    <div className="text-sm font-medium text-gray-800">{course.course_name}</div>
                    <div className="text-xs text-gray-500 mt-1">{course.recommended_hours}시간</div>
                  </>
                ) : (
                  <div className="text-sm text-gray-400">해당 레벨 과정 없음</div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}
