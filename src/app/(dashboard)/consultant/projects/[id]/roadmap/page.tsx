'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { FileText } from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import {
  createRoadmap,
  confirmFinalRoadmap,
  fetchRoadmapVersions,
  fetchRoadmapVersion,
  fetchProjectInfo,
  editRoadmapManually,
} from './actions';
import { useRoadmapDownload } from '@/hooks/useRoadmapDownload';
import RoadmapLoadingOverlay, { COMPLETION_DELAY_MS } from '@/components/roadmap/RoadmapLoadingOverlay';
import { DownloadButton } from '@/components/roadmap/DownloadButton';
import { RoadmapMatrix } from '@/components/roadmap/RoadmapMatrix';
import { PBLCourseView } from '@/components/roadmap/PBLCourseView';
import { CoursesList } from '@/components/roadmap/CoursesList';
import { RoadmapStatusBadge } from '@/components/roadmap/RoadmapStatusBadge';
import type { RoadmapCell } from '@/lib/services/roadmap';
import { ROADMAP_TABS } from '@/types/roadmap-ui';
import type { RoadmapVersionUI, RoadmapTabKey } from '@/types/roadmap-ui';
import CourseEditModal from './_components/CourseEditModal';

export default function RoadmapPage() {
  const params = useParams();
  const projectId = params.id as string;

  // UI 상태
  const [isGenerating, setIsGenerating] = useState(false);
  const [isGenerationComplete, setIsGenerationComplete] = useState(false);
  const [isFinalizing, setIsFinalizing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // 데이터 상태
  const [versions, setVersions] = useState<RoadmapVersionUI[]>([]);
  const [selectedVersion, setSelectedVersion] = useState<RoadmapVersionUI | null>(null);
  const [revisionPrompt, setRevisionPrompt] = useState('');
  const [activeTab, setActiveTab] = useState<RoadmapTabKey>('matrix');
  const [companyName, setCompanyName] = useState<string>('');

  // 편집 모드 상태
  const [editingCourse, setEditingCourse] = useState<RoadmapCell | null>(null);
  const [editingCourseContext, setEditingCourseContext] = useState<{
    type: 'matrix' | 'courses';
    rowIndex?: number;
    level?: 'beginner' | 'intermediate' | 'advanced';
    courseIndex?: number;
  } | null>(null);

  // 다운로드 훅
  const {
    isDownloading,
    error: downloadError,
    success: downloadSuccess,
    downloadPDF,
    downloadXLSX,
    clearMessages: clearDownloadMessages,
  } = useRoadmapDownload();

  // 버전 목록 로드
  const loadVersions = useCallback(async () => {
    const data = await fetchRoadmapVersions(projectId);
    setVersions(data as RoadmapVersionUI[]);
    if (data.length > 0 && !selectedVersion) {
      setSelectedVersion(data[0] as RoadmapVersionUI);
    }
  }, [projectId, selectedVersion]);

  // 프로젝트 정보 로드
  const loadProjectInfo = useCallback(async () => {
    const result = await fetchProjectInfo(projectId);
    if (result.success && result.data) {
      setCompanyName(result.data.companyName);
    }
  }, [projectId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadVersions();
    loadProjectInfo();
  }, [loadVersions, loadProjectInfo]);

  // 로드맵 생성
  const handleGenerate = async () => {
    setIsGenerating(true);
    setIsGenerationComplete(false);
    setError(null);
    setSuccess(null);

    const result = await createRoadmap(projectId, revisionPrompt || undefined);

    if (result.success && result.data) {
      setSuccess('로드맵이 생성되었습니다.');
      setRevisionPrompt('');
      // 버전 목록 새로고침
      const data = await fetchRoadmapVersions(projectId);
      setVersions(data as RoadmapVersionUI[]);
      if (data.length > 0) {
        setSelectedVersion(data[0] as RoadmapVersionUI);
      }
      // 성공 시 100% 표시 후 오버레이 닫기
      setIsGenerationComplete(true);
      setTimeout(() => {
        setIsGenerating(false);
        setIsGenerationComplete(false);
      }, COMPLETION_DELAY_MS);
    } else {
      setError(result.error || '로드맵 생성에 실패했습니다.');
      setIsGenerating(false);
    }
  };

  // FINAL 확정
  const handleFinalize = async () => {
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
      const data = await fetchRoadmapVersions(projectId);
      setVersions(data as RoadmapVersionUI[]);
      const updated = data.find((v) => v.id === selectedVersion.id);
      if (updated) setSelectedVersion(updated as RoadmapVersionUI);
    } else {
      setError(result.error || 'FINAL 확정에 실패했습니다.');
    }

    setIsFinalizing(false);
  };

  // 버전 선택
  const handleVersionSelect = async (versionId: string) => {
    const version = await fetchRoadmapVersion(versionId);
    if (version) {
      setSelectedVersion(version as RoadmapVersionUI);
    }
  };

  // 과정 편집 (매트릭스) - 매트릭스 셀의 course_name으로 courses에서 해당 과정을 찾아 편집
  const handleEditMatrixCourse = (rowIndex: number, level: 'beginner' | 'intermediate' | 'advanced') => {
    if (!selectedVersion || selectedVersion.status !== 'DRAFT') return;
    const row = selectedVersion.roadmap_matrix[rowIndex];
    const coursesInCell = row[level] || [];
    if (coursesInCell.length > 0) {
      // 첫 번째 과정 선택 (여러 과정이 있으면 첫 번째)
      const firstCourse = coursesInCell[0];
      const courseIndex = selectedVersion.courses.findIndex(
        (c) => c.course_name === firstCourse.course_name
      );
      if (courseIndex !== -1) {
        setEditingCourse(selectedVersion.courses[courseIndex]);
        setEditingCourseContext({ type: 'courses', courseIndex });
      }
    }
  };

  // 과정 편집 (목록)
  const handleEditCourse = (courseIndex: number) => {
    if (!selectedVersion || selectedVersion.status !== 'DRAFT') return;
    const course = selectedVersion.courses[courseIndex];
    if (course) {
      setEditingCourse(course);
      setEditingCourseContext({ type: 'courses', courseIndex });
    }
  };

  // 과정 편집 저장 - courses 배열만 수정 (roadmap_matrix는 서버에서 자동 재생성)
  const handleSaveCourse = async (updatedCourse: RoadmapCell) => {
    if (!selectedVersion || !editingCourseContext) return;
    if (editingCourseContext.courseIndex === undefined) return;

    setError(null);

    const newCourses = [...selectedVersion.courses];
    newCourses[editingCourseContext.courseIndex] = updatedCourse;

    const result = await editRoadmapManually(selectedVersion.id, { courses: newCourses });

    if (result.success) {
      setSuccess('과정이 수정되었습니다.');
      const updated = await fetchRoadmapVersion(selectedVersion.id);
      if (updated) setSelectedVersion(updated as RoadmapVersionUI);
    } else {
      setError(result.error || '과정 수정에 실패했습니다.');
    }

    setEditingCourse(null);
    setEditingCourseContext(null);
  };

  // PDF 다운로드
  const handleDownloadPDF = () => {
    if (selectedVersion) {
      downloadPDF(selectedVersion.id);
    }
  };

  // XLSX 다운로드
  const handleDownloadXLSX = () => {
    if (selectedVersion) {
      downloadXLSX(selectedVersion.id);
    }
  };

  const canEdit = selectedVersion?.status === 'DRAFT';
  const canFinalize = canEdit && selectedVersion?.free_tool_validated && selectedVersion?.time_limit_validated;

  // 로드맵 생성 취소
  const handleCancelGeneration = () => {
    setIsGenerating(false);
    setIsGenerationComplete(false);
  };

  // 에러 메시지 통합 (로컬 에러 또는 다운로드 에러)
  const displayError = error || downloadError;
  const displaySuccess = success || downloadSuccess;

  const clearAllMessages = () => {
    setError(null);
    setSuccess(null);
    clearDownloadMessages();
  };

  return (
    <>
    <div className="space-y-6">
      <PageHeader
        title="AI 교육 로드맵"
        backLink={{ href: `/consultant/projects/${projectId}`, label: '프로젝트로 돌아가기' }}
      />

      {/* 알림 */}
      {displayError && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded relative">
          {displayError}
          <button onClick={clearAllMessages} className="absolute top-0 right-0 p-3 text-red-500 hover:text-red-700">×</button>
        </div>
      )}
      {displaySuccess && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded relative">
          {displaySuccess}
          <button onClick={clearAllMessages} className="absolute top-0 right-0 p-3 text-green-500 hover:text-green-700">×</button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* 왼쪽: 생성 및 버전 목록 */}
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
              <p className="mt-2 text-xs text-gray-500 text-center">AI가 로드맵을 생성 중입니다. 잠시 기다려주세요...</p>
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
                        selectedVersion?.id === v.id ? 'bg-purple-50 border border-purple-200' : 'hover:bg-gray-50'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-medium">v{v.version_number}</span>
                        <RoadmapStatusBadge status={v.status} />
                      </div>
                      <div className="text-xs text-gray-500 mt-1">{new Date(v.created_at).toLocaleDateString('ko-KR')}</div>
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
                    <h2 className="text-lg font-semibold text-gray-900">버전 {selectedVersion.version_number}</h2>
                    <RoadmapStatusBadge status={selectedVersion.status} />
                    {!(selectedVersion.free_tool_validated && selectedVersion.time_limit_validated) && (
                      <span className="text-xs text-amber-600">
                        검토 필요 사항({[!selectedVersion.free_tool_validated, !selectedVersion.time_limit_validated].filter(Boolean).length}건)
                      </span>
                    )}
                  </div>
                  <div className="flex items-center space-x-2">
                    <DownloadButton onClick={handleDownloadPDF} loading={isDownloading === 'PDF'} type="PDF" disabled={isDownloading !== null} />
                    <DownloadButton onClick={handleDownloadXLSX} loading={isDownloading === 'XLSX'} type="Excel" disabled={isDownloading !== null} />
                    {canEdit && (
                      <button
                        onClick={handleFinalize}
                        disabled={isFinalizing || !canFinalize}
                        className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 text-sm"
                      >
                        {isFinalizing ? '처리 중...' : 'FINAL 확정'}
                      </button>
                    )}
                  </div>
                </div>

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
                  {ROADMAP_TABS.map((tab) => (
                    <button
                      key={tab.key}
                      onClick={() => setActiveTab(tab.key)}
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
                  <RoadmapMatrix matrix={selectedVersion.roadmap_matrix} canEdit={canEdit} onEditCourse={handleEditMatrixCourse} />
                )}
                {activeTab === 'pbl' && <PBLCourseView course={selectedVersion.pbl_course} />}
                {activeTab === 'courses' && (
                  <CoursesList courses={selectedVersion.courses} canEdit={canEdit} onEditCourse={handleEditCourse} />
                )}
              </div>
            </div>
          ) : (
            <EmptyRoadmapState />
          )}
        </div>
      </div>

      {/* 과정 편집 모달 */}
      <CourseEditModal
        isOpen={!!editingCourse}
        course={editingCourse}
        onClose={() => {
          setEditingCourse(null);
          setEditingCourseContext(null);
        }}
        onSave={handleSaveCourse}
      />
    </div>

      {/* 로딩 오버레이 */}
      {isGenerating && (
        <RoadmapLoadingOverlay
          isTestMode={false}
          companyName={companyName}
          profileHref="/consultant/profile"
          onCancel={handleCancelGeneration}
          isCompleted={isGenerationComplete}
        />
      )}
    </>
  );
}

// 빈 상태 컴포넌트
function EmptyRoadmapState() {
  return (
    <div className="bg-white shadow rounded-lg p-12 text-center">
      <FileText className="mx-auto h-12 w-12 text-gray-400" />
      <h3 className="mt-2 text-sm font-medium text-gray-900">로드맵이 없습니다</h3>
      <p className="mt-1 text-sm text-gray-500">왼쪽의 &quot;로드맵 생성&quot; 버튼을 클릭하여 AI 로드맵을 생성하세요.</p>
    </div>
  );
}
