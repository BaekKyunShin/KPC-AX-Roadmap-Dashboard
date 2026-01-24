'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { fetchRoadmapVersionsForOps, fetchRoadmapVersionForOps } from './actions';
import type { RoadmapRow, PBLCourse, RoadmapCell } from '@/lib/services/roadmap';

interface RoadmapVersion {
  id: string;
  version_number: number;
  status: 'DRAFT' | 'FINAL' | 'ARCHIVED';
  diagnosis_summary: string;
  roadmap_matrix: RoadmapRow[];
  pbl_course: PBLCourse;
  courses: RoadmapCell[];
  free_tool_validated: boolean;
  time_limit_validated: boolean;
  revision_prompt: string | null;
  created_at: string;
  finalized_at: string | null;
}

export default function OpsRoadmapViewPage() {
  const params = useParams();
  const projectId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [versions, setVersions] = useState<RoadmapVersion[]>([]);
  const [selectedVersion, setSelectedVersion] = useState<RoadmapVersion | null>(null);
  const [activeTab, setActiveTab] = useState<'matrix' | 'pbl' | 'courses'>('matrix');

  // 버전 목록 로드
  useEffect(() => {
    async function loadVersions() {
      setLoading(true);
      const data = await fetchRoadmapVersionsForOps(projectId);
      setVersions(data as RoadmapVersion[]);
      if (data.length > 0) {
        setSelectedVersion(data[0] as RoadmapVersion);
      }
      setLoading(false);
    }
    loadVersions();
  }, [projectId]);

  // 버전 선택
  async function handleVersionSelect(versionId: string) {
    const version = await fetchRoadmapVersionForOps(versionId);
    if (version) {
      setSelectedVersion(version as RoadmapVersion);
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'DRAFT':
        return <span className="px-2 py-1 text-xs rounded bg-gray-100 text-gray-800">초안</span>;
      case 'FINAL':
        return <span className="px-2 py-1 text-xs rounded bg-green-100 text-green-800">확정</span>;
      case 'ARCHIVED':
        return <span className="px-2 py-1 text-xs rounded bg-yellow-100 text-yellow-800">보관</span>;
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">로딩 중...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <Link
            href={`/ops/projects/${projectId}`}
            className="text-sm text-gray-500 hover:text-gray-700"
          >
            ← 프로젝트로 돌아가기
          </Link>
          <h1 className="mt-2 text-2xl font-bold text-gray-900">AI 교육 로드맵 (읽기 전용)</h1>
          <p className="mt-1 text-sm text-yellow-600">
            * 운영관리자는 품질 관리/감사 목적으로 열람만 가능합니다.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* 왼쪽: 버전 목록 */}
        <div className="lg:col-span-1">
          <div className="bg-white shadow rounded-lg p-4">
            <h3 className="text-sm font-medium text-gray-900 mb-3">버전 히스토리</h3>
            {versions.length > 0 ? (
              <ul className="space-y-2">
                {versions.map((v) => (
                  <li key={v.id}>
                    <button
                      onClick={() => handleVersionSelect(v.id)}
                      className={`w-full text-left px-3 py-2 rounded text-sm ${
                        selectedVersion?.id === v.id
                          ? 'bg-purple-50 border border-purple-200'
                          : 'hover:bg-gray-50'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-medium">v{v.version_number}</span>
                        {getStatusBadge(v.status)}
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        {new Date(v.created_at).toLocaleDateString('ko-KR')}
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-gray-500">아직 생성된 로드맵이 없습니다.</p>
            )}
          </div>
        </div>

        {/* 오른쪽: 로드맵 내용 */}
        <div className="lg:col-span-3">
          {selectedVersion ? (
            <div className="bg-white shadow rounded-lg">
              {/* 버전 헤더 */}
              <div className="px-6 py-4 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <h2 className="text-lg font-semibold text-gray-900">
                      버전 {selectedVersion.version_number}
                    </h2>
                    {getStatusBadge(selectedVersion.status)}
                    {selectedVersion.free_tool_validated && selectedVersion.time_limit_validated ? (
                      <span className="text-xs text-green-600">✓ 검증 통과</span>
                    ) : (
                      <span className="text-xs text-red-600">✗ 검증 실패</span>
                    )}
                  </div>
                </div>

                {/* 진단 요약 */}
                <p className="mt-2 text-sm text-gray-600">{selectedVersion.diagnosis_summary}</p>

                {selectedVersion.revision_prompt && (
                  <div className="mt-2 p-2 bg-yellow-50 rounded text-sm">
                    <span className="font-medium text-yellow-800">수정 요청:</span>{' '}
                    <span className="text-yellow-700">{selectedVersion.revision_prompt}</span>
                  </div>
                )}
              </div>

              {/* 탭 */}
              <div className="border-b border-gray-200">
                <nav className="flex -mb-px">
                  {[
                    { key: 'matrix', label: 'NxM 매트릭스' },
                    { key: 'pbl', label: 'PBL 과정' },
                    { key: 'courses', label: '과정 상세' },
                  ].map((tab) => (
                    <button
                      key={tab.key}
                      onClick={() => setActiveTab(tab.key as 'matrix' | 'pbl' | 'courses')}
                      className={`px-6 py-3 text-sm font-medium border-b-2 ${
                        activeTab === tab.key
                          ? 'border-purple-500 text-purple-600'
                          : 'border-transparent text-gray-500 hover:text-gray-700'
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </nav>
              </div>

              {/* 탭 내용 */}
              <div className="p-6">
                {activeTab === 'matrix' && (
                  <RoadmapMatrix matrix={selectedVersion.roadmap_matrix} />
                )}
                {activeTab === 'pbl' && (
                  <PBLCourseView course={selectedVersion.pbl_course} />
                )}
                {activeTab === 'courses' && (
                  <CoursesList courses={selectedVersion.courses} />
                )}
              </div>
            </div>
          ) : (
            <div className="bg-white shadow rounded-lg p-12 text-center">
              <svg
                className="mx-auto h-12 w-12 text-gray-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
              <h3 className="mt-2 text-sm font-medium text-gray-900">로드맵이 없습니다</h3>
              <p className="mt-1 text-sm text-gray-500">
                아직 컨설턴트가 로드맵을 생성하지 않았습니다.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// NxM 매트릭스 컴포넌트
function RoadmapMatrix({ matrix }: { matrix: RoadmapRow[] }) {
  if (!matrix || matrix.length === 0) {
    return <p className="text-gray-500">매트릭스 데이터가 없습니다.</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
              업무
            </th>
            <th className="px-4 py-3 text-center text-xs font-medium text-green-600 uppercase bg-green-50">
              초급
            </th>
            <th className="px-4 py-3 text-center text-xs font-medium text-yellow-600 uppercase bg-yellow-50">
              중급
            </th>
            <th className="px-4 py-3 text-center text-xs font-medium text-red-600 uppercase bg-red-50">
              고급
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {matrix.map((row) => (
            <tr key={row.task_id}>
              <td className="px-4 py-3 text-sm font-medium text-gray-900">
                {row.task_name}
              </td>
              <td className="px-4 py-3 bg-green-50">
                {row.beginner ? (
                  <CourseCell course={row.beginner} />
                ) : (
                  <span className="text-gray-400 text-xs">-</span>
                )}
              </td>
              <td className="px-4 py-3 bg-yellow-50">
                {row.intermediate ? (
                  <CourseCell course={row.intermediate} />
                ) : (
                  <span className="text-gray-400 text-xs">-</span>
                )}
              </td>
              <td className="px-4 py-3 bg-red-50">
                {row.advanced ? (
                  <CourseCell course={row.advanced} />
                ) : (
                  <span className="text-gray-400 text-xs">-</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// 매트릭스 셀 컴포넌트
function CourseCell({ course }: { course: RoadmapCell }) {
  return (
    <div className="text-xs">
      <div className="font-medium text-gray-900">{course.course_name}</div>
      <div className="text-gray-500">{course.recommended_hours}시간</div>
    </div>
  );
}

// PBL 과정 컴포넌트
function PBLCourseView({ course }: { course: PBLCourse }) {
  if (!course) {
    return <p className="text-gray-500">PBL 과정 데이터가 없습니다.</p>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-900">{course.course_name}</h3>
        <div className="mt-1 flex items-center space-x-4 text-sm text-gray-500">
          <span>총 {course.total_hours}시간</span>
          <span>대상: {course.target_audience}</span>
        </div>
      </div>

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
                <p className="mt-2 text-sm text-blue-600">실습: {module.practice}</p>
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

// 과정 상세 목록 컴포넌트
function CoursesList({ courses }: { courses: RoadmapCell[] }) {
  if (!courses || courses.length === 0) {
    return <p className="text-gray-500">과정 데이터가 없습니다.</p>;
  }

  const levelColors = {
    BEGINNER: 'bg-green-100 text-green-800',
    INTERMEDIATE: 'bg-yellow-100 text-yellow-800',
    ADVANCED: 'bg-red-100 text-red-800',
  };

  return (
    <div className="space-y-4">
      {courses.map((course, idx) => (
        <div key={idx} className="border border-gray-200 rounded-lg p-4">
          <div className="flex items-start justify-between mb-3">
            <div>
              <h4 className="font-medium text-gray-900">{course.course_name}</h4>
              <p className="text-sm text-gray-500">대상 업무: {course.target_task}</p>
            </div>
            <div className="flex items-center space-x-2">
              <span className={`px-2 py-1 text-xs rounded ${levelColors[course.level]}`}>
                {course.level === 'BEGINNER' ? '초급' : course.level === 'INTERMEDIATE' ? '중급' : '고급'}
              </span>
              <span className="text-sm text-gray-500">{course.recommended_hours}시간</span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <h5 className="text-xs font-medium text-gray-500 uppercase mb-1">커리큘럼</h5>
              <ul className="list-disc list-inside text-gray-600">
                {course.curriculum?.slice(0, 3).map((item, i) => (
                  <li key={i}>{item}</li>
                ))}
                {course.curriculum && course.curriculum.length > 3 && (
                  <li className="text-gray-400">외 {course.curriculum.length - 3}개...</li>
                )}
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
