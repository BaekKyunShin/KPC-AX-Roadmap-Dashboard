'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import {
  createRoadmap,
  confirmFinalRoadmap,
  fetchRoadmapVersions,
  fetchRoadmapVersion,
  prepareExportData,
  logDownload,
  editRoadmapManually,
} from './actions';
import type { RoadmapRow, PBLCourse, RoadmapCell, ValidationResult } from '@/lib/services/roadmap';
import CourseEditModal from './_components/CourseEditModal';

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

export default function RoadmapPage() {
  const params = useParams();
  const caseId = params.id as string;

  const [isGenerating, setIsGenerating] = useState(false);
  const [isFinalizing, setIsFinalizing] = useState(false);
  const [isDownloading, setIsDownloading] = useState<'PDF' | 'XLSX' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [versions, setVersions] = useState<RoadmapVersion[]>([]);
  const [selectedVersion, setSelectedVersion] = useState<RoadmapVersion | null>(null);
  const [validation, setValidation] = useState<ValidationResult | null>(null);
  const [revisionPrompt, setRevisionPrompt] = useState('');

  const [activeTab, setActiveTab] = useState<'matrix' | 'pbl' | 'courses'>('matrix');

  // 편집 모드 상태
  const [isEditing, setIsEditing] = useState(false);
  const [editingCourse, setEditingCourse] = useState<RoadmapCell | null>(null);
  const [editingCourseContext, setEditingCourseContext] = useState<{
    type: 'matrix' | 'courses';
    rowIndex?: number;
    level?: 'beginner' | 'intermediate' | 'advanced';
    courseIndex?: number;
  } | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // 버전 목록 로드
  useEffect(() => {
    async function loadVersions() {
      const data = await fetchRoadmapVersions(caseId);
      setVersions(data as RoadmapVersion[]);
      if (data.length > 0) {
        setSelectedVersion(data[0] as RoadmapVersion);
      }
    }
    loadVersions();
  }, [caseId]);

  // 로드맵 생성
  async function handleGenerate() {
    setIsGenerating(true);
    setError(null);
    setSuccess(null);

    const result = await createRoadmap(caseId, revisionPrompt || undefined);

    if (result.success && result.data) {
      setSuccess('로드맵이 생성되었습니다.');
      setValidation(result.data.validation as ValidationResult);
      setRevisionPrompt('');

      // 버전 목록 새로고침
      const data = await fetchRoadmapVersions(caseId);
      setVersions(data as RoadmapVersion[]);
      if (data.length > 0) {
        setSelectedVersion(data[0] as RoadmapVersion);
      }
    } else {
      setError(result.error || '로드맵 생성에 실패했습니다.');
    }

    setIsGenerating(false);
  }

  // FINAL 확정
  async function handleFinalize() {
    if (!selectedVersion) return;

    if (!selectedVersion.free_tool_validated || !selectedVersion.time_limit_validated) {
      setError('검증을 통과하지 못한 로드맵은 FINAL 확정할 수 없습니다.');
      return;
    }

    if (!confirm('이 로드맵을 FINAL로 확정하시겠습니까? 기존 FINAL은 ARCHIVED로 변경됩니다.')) {
      return;
    }

    setIsFinalizing(true);
    setError(null);

    const result = await confirmFinalRoadmap(selectedVersion.id);

    if (result.success) {
      setSuccess('FINAL로 확정되었습니다.');
      // 버전 목록 새로고침
      const data = await fetchRoadmapVersions(caseId);
      setVersions(data as RoadmapVersion[]);
      const updated = data.find(v => v.id === selectedVersion.id);
      if (updated) setSelectedVersion(updated as RoadmapVersion);
    } else {
      setError(result.error || 'FINAL 확정에 실패했습니다.');
    }

    setIsFinalizing(false);
  }

  // 버전 선택
  async function handleVersionSelect(versionId: string) {
    const version = await fetchRoadmapVersion(versionId);
    if (version) {
      setSelectedVersion(version as RoadmapVersion);
      setIsEditing(false);
    }
  }

  // 과정 편집 시작 (매트릭스에서)
  function handleEditMatrixCourse(rowIndex: number, level: 'beginner' | 'intermediate' | 'advanced') {
    if (!selectedVersion || selectedVersion.status !== 'DRAFT') return;
    const row = selectedVersion.roadmap_matrix[rowIndex];
    const course = row[level];
    if (course) {
      setEditingCourse(course);
      setEditingCourseContext({ type: 'matrix', rowIndex, level });
    }
  }

  // 과정 편집 시작 (과정 목록에서)
  function handleEditCourse(courseIndex: number) {
    if (!selectedVersion || selectedVersion.status !== 'DRAFT') return;
    const course = selectedVersion.courses[courseIndex];
    if (course) {
      setEditingCourse(course);
      setEditingCourseContext({ type: 'courses', courseIndex });
    }
  }

  // 과정 편집 저장
  async function handleSaveCourse(updatedCourse: RoadmapCell) {
    if (!selectedVersion || !editingCourseContext) return;

    setIsSaving(true);
    setError(null);

    let updates: {
      roadmap_matrix?: RoadmapRow[];
      courses?: RoadmapCell[];
    } = {};

    if (editingCourseContext.type === 'matrix' && editingCourseContext.rowIndex !== undefined && editingCourseContext.level) {
      const newMatrix = [...selectedVersion.roadmap_matrix];
      newMatrix[editingCourseContext.rowIndex] = {
        ...newMatrix[editingCourseContext.rowIndex],
        [editingCourseContext.level]: updatedCourse,
      };
      updates.roadmap_matrix = newMatrix;
    } else if (editingCourseContext.type === 'courses' && editingCourseContext.courseIndex !== undefined) {
      const newCourses = [...selectedVersion.courses];
      newCourses[editingCourseContext.courseIndex] = updatedCourse;
      updates.courses = newCourses;
    }

    const result = await editRoadmapManually(selectedVersion.id, updates);

    if (result.success) {
      setSuccess('과정이 수정되었습니다.');
      if (result.data?.validation) {
        setValidation(result.data.validation as ValidationResult);
      }
      // 버전 새로고침
      const updated = await fetchRoadmapVersion(selectedVersion.id);
      if (updated) setSelectedVersion(updated as RoadmapVersion);
    } else {
      setError(result.error || '과정 수정에 실패했습니다.');
    }

    setIsSaving(false);
    setEditingCourse(null);
    setEditingCourseContext(null);
  }

  // 편집 모달 닫기
  function handleCloseEditModal() {
    setEditingCourse(null);
    setEditingCourseContext(null);
  }

  // PDF 다운로드
  async function handleDownloadPDF() {
    if (!selectedVersion) return;

    setIsDownloading('PDF');
    setError(null);

    try {
      // 내보내기 데이터 준비
      const result = await prepareExportData(selectedVersion.id);
      if (!result.success || !result.data) {
        setError(result.error || 'PDF 준비에 실패했습니다.');
        return;
      }

      // PDF 생성 (클라이언트 사이드)
      const { generatePDF } = await import('@/lib/services/export-pdf');
      const blob = await generatePDF(result.data);

      // 다운로드
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `roadmap_${result.data.companyName}_v${result.data.versionNumber}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      // 감사 로그 기록
      await logDownload(selectedVersion.id, 'PDF');

      setSuccess('PDF 다운로드가 완료되었습니다.');
    } catch (err) {
      console.error('[PDF Download Error]', err);
      setError('PDF 생성에 실패했습니다.');
    } finally {
      setIsDownloading(null);
    }
  }

  // XLSX 다운로드
  async function handleDownloadXLSX() {
    if (!selectedVersion) return;

    setIsDownloading('XLSX');
    setError(null);

    try {
      // 내보내기 데이터 준비
      const result = await prepareExportData(selectedVersion.id);
      if (!result.success || !result.data) {
        setError(result.error || 'XLSX 준비에 실패했습니다.');
        return;
      }

      // XLSX 생성 (클라이언트 사이드)
      const { downloadXLSX } = await import('@/lib/services/export-xlsx');
      downloadXLSX(
        result.data,
        `roadmap_${result.data.companyName}_v${result.data.versionNumber}.xlsx`
      );

      // 감사 로그 기록
      await logDownload(selectedVersion.id, 'XLSX');

      setSuccess('Excel 다운로드가 완료되었습니다.');
    } catch (err) {
      console.error('[XLSX Download Error]', err);
      setError('Excel 생성에 실패했습니다.');
    } finally {
      setIsDownloading(null);
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

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <Link
            href={`/consultant/cases/${caseId}`}
            className="text-sm text-gray-500 hover:text-gray-700"
          >
            ← 케이스로 돌아가기
          </Link>
          <h1 className="mt-2 text-2xl font-bold text-gray-900">AI 교육 로드맵</h1>
        </div>
      </div>

      {/* 알림 */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}
      {success && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded">
          {success}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* 왼쪽: 버전 목록 및 생성 */}
        <div className="lg:col-span-1 space-y-4">
          {/* 생성 버튼 */}
          <div className="bg-white shadow rounded-lg p-4">
            <h3 className="text-sm font-medium text-gray-900 mb-3">로드맵 생성</h3>
            <textarea
              rows={3}
              value={revisionPrompt}
              onChange={(e) => setRevisionPrompt(e.target.value)}
              placeholder="수정 요청사항 (선택)"
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
            />
            <button
              onClick={handleGenerate}
              disabled={isGenerating}
              className="mt-2 w-full px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 text-sm"
            >
              {isGenerating ? 'AI 생성 중...' : versions.length > 0 ? '새 버전 생성' : '로드맵 생성'}
            </button>
            {isGenerating && (
              <p className="mt-2 text-xs text-gray-500 text-center">
                AI가 로드맵을 생성 중입니다. 잠시 기다려주세요...
              </p>
            )}
          </div>

          {/* 버전 목록 */}
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
                  <div className="flex items-center space-x-2">
                    {/* 다운로드 버튼 */}
                    <button
                      onClick={handleDownloadPDF}
                      disabled={isDownloading !== null}
                      className="px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 disabled:opacity-50 text-sm flex items-center"
                    >
                      {isDownloading === 'PDF' ? (
                        <span>다운로드 중...</span>
                      ) : (
                        <>
                          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                          PDF
                        </>
                      )}
                    </button>
                    <button
                      onClick={handleDownloadXLSX}
                      disabled={isDownloading !== null}
                      className="px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 disabled:opacity-50 text-sm flex items-center"
                    >
                      {isDownloading === 'XLSX' ? (
                        <span>다운로드 중...</span>
                      ) : (
                        <>
                          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                          Excel
                        </>
                      )}
                    </button>

                    {/* FINAL 확정 버튼 */}
                    {selectedVersion.status === 'DRAFT' && (
                      <button
                        onClick={handleFinalize}
                        disabled={isFinalizing || !selectedVersion.free_tool_validated || !selectedVersion.time_limit_validated}
                        className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 text-sm"
                      >
                        {isFinalizing ? '처리 중...' : 'FINAL 확정'}
                      </button>
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
                  <RoadmapMatrix
                    matrix={selectedVersion.roadmap_matrix}
                    canEdit={selectedVersion.status === 'DRAFT'}
                    onEditCourse={handleEditMatrixCourse}
                  />
                )}
                {activeTab === 'pbl' && (
                  <PBLCourseView course={selectedVersion.pbl_course} />
                )}
                {activeTab === 'courses' && (
                  <CoursesList
                    courses={selectedVersion.courses}
                    canEdit={selectedVersion.status === 'DRAFT'}
                    onEditCourse={handleEditCourse}
                  />
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
                왼쪽의 &quot;로드맵 생성&quot; 버튼을 클릭하여 AI 로드맵을 생성하세요.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* 과정 편집 모달 */}
      <CourseEditModal
        isOpen={!!editingCourse}
        course={editingCourse}
        onClose={handleCloseEditModal}
        onSave={handleSaveCourse}
      />
    </div>
  );
}

// NxM 매트릭스 컴포넌트 (반응형)
function RoadmapMatrix({
  matrix,
  canEdit = false,
  onEditCourse,
}: {
  matrix: RoadmapRow[];
  canEdit?: boolean;
  onEditCourse?: (rowIndex: number, level: 'beginner' | 'intermediate' | 'advanced') => void;
}) {
  const [mobileTab, setMobileTab] = useState<'beginner' | 'intermediate' | 'advanced'>('beginner');

  if (!matrix || matrix.length === 0) {
    return <p className="text-gray-500">매트릭스 데이터가 없습니다.</p>;
  }

  const tabConfig = {
    beginner: { label: '초급', color: 'green', bgColor: 'bg-green-50', textColor: 'text-green-600', borderColor: 'border-green-500' },
    intermediate: { label: '중급', color: 'yellow', bgColor: 'bg-yellow-50', textColor: 'text-yellow-600', borderColor: 'border-yellow-500' },
    advanced: { label: '고급', color: 'red', bgColor: 'bg-red-50', textColor: 'text-red-600', borderColor: 'border-red-500' },
  };

  return (
    <>
      {/* 데스크톱: 테이블 뷰 */}
      <div className="hidden md:block overflow-x-auto">
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
            {matrix.map((row, rowIndex) => (
              <tr key={row.task_id}>
                <td className="px-4 py-3 text-sm font-medium text-gray-900">
                  {row.task_name}
                </td>
                <td className="px-4 py-3 bg-green-50">
                  {row.beginner ? (
                    <div className="flex items-center justify-between group">
                      <CourseCell course={row.beginner} />
                      {canEdit && onEditCourse && (
                        <button
                          onClick={() => onEditCourse(rowIndex, 'beginner')}
                          className="opacity-0 group-hover:opacity-100 ml-2 p-1 text-gray-400 hover:text-purple-600 transition-opacity"
                          title="편집"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                      )}
                    </div>
                  ) : (
                    <span className="text-gray-400 text-xs">-</span>
                  )}
                </td>
                <td className="px-4 py-3 bg-yellow-50">
                  {row.intermediate ? (
                    <div className="flex items-center justify-between group">
                      <CourseCell course={row.intermediate} />
                      {canEdit && onEditCourse && (
                        <button
                          onClick={() => onEditCourse(rowIndex, 'intermediate')}
                          className="opacity-0 group-hover:opacity-100 ml-2 p-1 text-gray-400 hover:text-purple-600 transition-opacity"
                          title="편집"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                      )}
                    </div>
                  ) : (
                    <span className="text-gray-400 text-xs">-</span>
                  )}
                </td>
                <td className="px-4 py-3 bg-red-50">
                  {row.advanced ? (
                    <div className="flex items-center justify-between group">
                      <CourseCell course={row.advanced} />
                      {canEdit && onEditCourse && (
                        <button
                          onClick={() => onEditCourse(rowIndex, 'advanced')}
                          className="opacity-0 group-hover:opacity-100 ml-2 p-1 text-gray-400 hover:text-purple-600 transition-opacity"
                          title="편집"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                      )}
                    </div>
                  ) : (
                    <span className="text-gray-400 text-xs">-</span>
                  )}
                </td>
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
                  ? `${tabConfig[level].borderColor} ${tabConfig[level].textColor}`
                  : 'border-transparent text-gray-500'
              }`}
            >
              {tabConfig[level].label}
            </button>
          ))}
        </div>

        {/* 카드 리스트 */}
        <div className="space-y-3">
          {matrix.map((row, rowIndex) => {
            const course = row[mobileTab];
            return (
              <div
                key={row.task_id}
                className={`p-4 rounded-lg border ${tabConfig[mobileTab].bgColor}`}
              >
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
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
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
function CoursesList({
  courses,
  canEdit = false,
  onEditCourse,
}: {
  courses: RoadmapCell[];
  canEdit?: boolean;
  onEditCourse?: (courseIndex: number) => void;
}) {
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
              {canEdit && onEditCourse && (
                <button
                  onClick={() => onEditCourse(idx)}
                  className="p-1 text-gray-400 hover:text-purple-600"
                  title="편집"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                </button>
              )}
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
