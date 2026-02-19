'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { FileText } from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { showSuccessToast, showErrorToast } from '@/lib/utils/toast';
import { isCancelledError } from '@/lib/services/llm';
import {
  createRoadmap,
  confirmFinalRoadmap,
  fetchRoadmapVersions,
  fetchRoadmapVersion,
  fetchProjectInfo,
  editRoadmapManually,
  cancelRoadmapGeneration,
} from './actions';
import { useRoadmapDownload } from '@/hooks/useRoadmapDownload';
import RoadmapLoadingOverlay, { COMPLETION_DELAY_MS } from '@/components/roadmap/RoadmapLoadingOverlay';
import { DownloadButton } from '@/components/roadmap/DownloadButton';
import { RoadmapMatrix } from '@/components/roadmap/RoadmapMatrix';
import { PBLCourseView } from '@/components/roadmap/PBLCourseView';
import { CoursesList } from '@/components/roadmap/CoursesList';
import { RoadmapStatusBadge } from '@/components/roadmap/RoadmapStatusBadge';
import { RevisionPromptToggle } from '@/components/roadmap/RevisionPromptToggle';
import { VersionHistoryList } from '@/components/roadmap/VersionHistoryList';
import type { RoadmapCell } from '@/lib/services/roadmap';
import { PAID_TOOL_KEYWORDS, MAX_COURSE_HOURS } from '@/lib/utils/roadmap';
import { ROADMAP_TABS } from '@/types/roadmap-ui';
import type { RoadmapVersionUI, RoadmapTabKey } from '@/types/roadmap-ui';
import CourseEditModal from './_components/CourseEditModal';
import { RoadmapPageSkeleton } from '@/components/ui/Skeleton';
import { ShareToggle } from '@/components/gallery/ShareToggle';

export default function RoadmapPage() {
  const params = useParams();
  const projectId = params.id as string;

  // UI 상태
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isGenerationComplete, setIsGenerationComplete] = useState(false);
  const [isFinalizing, setIsFinalizing] = useState(false);

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
  const { isDownloading, downloadPDF, downloadXLSX } = useRoadmapDownload();

  // 버전 목록 로드
  const loadVersions = async () => {
    const data = await fetchRoadmapVersions(projectId);
    setVersions(data as RoadmapVersionUI[]);
    if (data.length > 0 && !selectedVersion) {
      setSelectedVersion(data[0] as RoadmapVersionUI);
    }
  };

  // 프로젝트 정보 로드
  const loadProjectInfo = async () => {
    const result = await fetchProjectInfo(projectId);
    if (result.success && result.data) {
      setCompanyName(result.data.companyName);
    }
  };

  useEffect(() => {
    async function loadInitialData() {
      setIsLoading(true);
      await Promise.all([loadVersions(), loadProjectInfo()]);
      setIsLoading(false);
    }
    loadInitialData();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- React Compiler가 메모이제이션 처리
  }, [projectId]);

  // 로드맵 생성
  const handleGenerate = async () => {
    setIsGenerating(true);
    setIsGenerationComplete(false);

    const result = await createRoadmap(projectId, revisionPrompt || undefined);

    if (result.success) {
      showSuccessToast('로드맵이 생성되었습니다.');
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
      // 사용자가 직접 취소한 경우 에러 토스트를 표시하지 않음
      if (!isCancelledError(result.error)) {
        showErrorToast('로드맵 생성 실패', result.error);
      }
      setIsGenerating(false);
    }
  };

  // 최종 확정
  const handleFinalize = async () => {
    if (!selectedVersion) return;

    const hasValidationIssues = !selectedVersion.free_tool_validated || !selectedVersion.time_limit_validated;
    const confirmMessage = hasValidationIssues
      ? '검토 필요 사항이 있습니다. 그래도 최종 확정하시겠습니까?\n(기존 확정본은 이전 확정본으로 변경됩니다.)'
      : '이 로드맵을 최종 확정하시겠습니까? 기존 확정본은 이전 확정본으로 변경됩니다.';

    if (!confirm(confirmMessage)) {
      return;
    }

    setIsFinalizing(true);

    const result = await confirmFinalRoadmap(selectedVersion.id);

    if (result.success) {
      showSuccessToast('최종 확정되었습니다.');
      const data = await fetchRoadmapVersions(projectId);
      setVersions(data as RoadmapVersionUI[]);
      const updated = data.find((v) => v.id === selectedVersion.id);
      if (updated) setSelectedVersion(updated as RoadmapVersionUI);
    } else {
      showErrorToast('최종 확정 실패', result.error || '최종 확정에 실패했습니다.');
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

    const newCourses = [...selectedVersion.courses];
    newCourses[editingCourseContext.courseIndex] = updatedCourse;

    const result = await editRoadmapManually(selectedVersion.id, { courses: newCourses });

    if (result.success) {
      showSuccessToast('과정이 수정되었습니다.');
      const updated = await fetchRoadmapVersion(selectedVersion.id);
      if (updated) setSelectedVersion(updated as RoadmapVersionUI);
    } else {
      showErrorToast('과정 수정 실패', result.error || '과정 수정에 실패했습니다.');
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

  // 로드맵 생성 취소 (서버 LLM 호출도 중단)
  const handleCancelGeneration = async () => {
    setIsGenerating(false);
    setIsGenerationComplete(false);
    await cancelRoadmapGeneration();
  };

  if (isLoading) {
    return <RoadmapPageSkeleton />;
  }

  return (
    <>
    <div className="space-y-6">
      <PageHeader
        title="AI 교육 로드맵"
        backLink={{ href: `/consultant/projects/${projectId}`, label: '프로젝트로 돌아가기' }}
      />

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* 왼쪽: 생성 및 버전 목록 */}
        <div className="lg:col-span-1 space-y-4">
          {/* 생성 버튼 */}
          <div className="bg-white shadow rounded-lg p-4">
            <h3 className="text-sm font-medium text-gray-900 mb-3">로드맵 생성</h3>
            {versions.length > 0 && (
              <textarea
                rows={9}
                value={revisionPrompt}
                onChange={(e) => setRevisionPrompt(e.target.value)}
                placeholder="수정 요청사항 (선택)"
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
              />
            )}
            <button
              onClick={handleGenerate}
              disabled={isGenerating}
              className={`${versions.length > 0 ? 'mt-2 ' : ''}w-full px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 text-sm`}
            >
              {isGenerating ? 'AI 생성 중...' : versions.length > 0 ? '새 버전 로드맵 생성' : '로드맵 생성'}
            </button>
            {isGenerating && (
              <p className="mt-2 text-xs text-gray-500 text-center">AI가 로드맵을 생성 중입니다. 잠시 기다려주세요...</p>
            )}
          </div>

          {/* 버전 목록 */}
          <div className="bg-white shadow rounded-lg p-4">
            <h3 className="text-sm font-medium text-gray-900 mb-3">버전 히스토리</h3>
            <VersionHistoryList
              versions={versions}
              selectedVersionId={selectedVersion?.id}
              onVersionSelect={handleVersionSelect}
            />
          </div>
        </div>

        {/* 오른쪽: 로드맵 내용 */}
        <div className="lg:col-span-3">
          {selectedVersion ? (
            <div className="bg-white shadow rounded-lg pb-1">
              {/* 버전 헤더 */}
              <div className="px-6 py-4 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <h2 className="text-lg font-semibold text-gray-900">버전 {selectedVersion.version_number}</h2>
                    <RoadmapStatusBadge status={selectedVersion.status} versionNumber={selectedVersion.version_number} />
                  </div>
                  <div className="flex items-center space-x-2">
                    <DownloadButton onClick={handleDownloadPDF} loading={isDownloading === 'PDF'} type="PDF" disabled={isDownloading !== null} />
                    <DownloadButton onClick={handleDownloadXLSX} loading={isDownloading === 'XLSX'} type="Excel" disabled={isDownloading !== null} />
                    {canEdit && (
                      <button
                        onClick={handleFinalize}
                        disabled={isFinalizing}
                        className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 text-sm"
                      >
                        {isFinalizing ? '처리 중...' : '최종 확정'}
                      </button>
                    )}
                  </div>
                </div>

                {selectedVersion.revision_prompt && (
                  <RevisionPromptToggle prompt={selectedVersion.revision_prompt} />
                )}

                <p className="mt-3 text-sm text-gray-600">{selectedVersion.diagnosis_summary}</p>

                {/* FINAL 버전 공유 토글 */}
                {selectedVersion.status === 'FINAL' && (
                  <div className="mt-4">
                    <ShareToggle
                      roadmapVersionId={selectedVersion.id}
                      initialShared={selectedVersion.is_shared ?? false}
                    />
                  </div>
                )}
              </div>

              {/* 탭 */}
              <div className="border-b border-gray-200">
                <nav className="flex -mb-px overflow-x-auto">
                  {ROADMAP_TABS.map((tab) => (
                    <button
                      key={tab.key}
                      onClick={() => setActiveTab(tab.key)}
                      className={`px-3 py-2 sm:px-6 sm:py-3 text-xs sm:text-sm font-medium border-b-2 whitespace-nowrap flex-shrink-0 ${
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
              <div className="p-4 sm:p-6">
                {activeTab === 'matrix' && (
                  <RoadmapMatrix matrix={selectedVersion.roadmap_matrix} canEdit={canEdit} onEditCourse={handleEditMatrixCourse} />
                )}
                {activeTab === 'pbl' && <PBLCourseView course={selectedVersion.pbl_course} />}
                {activeTab === 'courses' && (
                  <CoursesList courses={selectedVersion.courses} canEdit={canEdit} onEditCourse={handleEditCourse} />
                )}
              </div>

              {/* 검토 필요 사항 */}
              {!(selectedVersion.free_tool_validated && selectedVersion.time_limit_validated) && (
                <ValidationDetails
                  courses={selectedVersion.courses}
                  freeToolValidated={selectedVersion.free_tool_validated}
                  timeLimitValidated={selectedVersion.time_limit_validated}
                />
              )}
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

// 검토 필요 사항 상세 컴포넌트
function ValidationDetails({
  courses,
  freeToolValidated,
  timeLimitValidated,
}: {
  courses: RoadmapCell[];
  freeToolValidated: boolean;
  timeLimitValidated: boolean;
}) {
  const [isExpanded, setIsExpanded] = useState(false);

  // 유료 도구 사용 과정 찾기
  const paidToolCourses = !freeToolValidated
    ? courses.flatMap((course) => {
        const paidTools = (course.tools || []).filter((tool) => {
          if (!tool.free_tier_info || tool.free_tier_info.trim() === '') return true;
          return PAID_TOOL_KEYWORDS.some((kw) =>
            tool.free_tier_info?.toLowerCase().includes(kw.toLowerCase())
          );
        });
        return paidTools.length > 0
          ? [{ courseName: course.course_name, tools: paidTools }]
          : [];
      })
    : [];

  // 시간 초과 과정 찾기
  const overHoursCourses = !timeLimitValidated
    ? courses.filter((c) => c.recommended_hours > MAX_COURSE_HOURS)
    : [];

  const totalIssues = (paidToolCourses.length > 0 ? 1 : 0) + (overHoursCourses.length > 0 ? 1 : 0);

  return (
    <div className="mx-6 mb-6 border border-amber-200 bg-amber-50 rounded-lg">
      <button
        type="button"
        onClick={() => setIsExpanded((prev) => !prev)}
        className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-amber-100/50 transition-colors rounded-lg"
      >
        <h4 className="text-sm font-normal text-amber-800">
          검토 필요 사항({totalIssues}건)
        </h4>
        <svg
          className={`h-4 w-4 text-amber-500 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {isExpanded && (
        <div className="px-4 pb-4 space-y-3">
          {paidToolCourses.length > 0 && (
            <div>
              <p className="text-sm text-amber-700 mb-1">
                {paidToolCourses.length}개 과정에 무료 범위 확인이 필요한 도구가 포함되어 있습니다.
              </p>
              <ul className="space-y-1 ml-4">
                {paidToolCourses.map((item, idx) => (
                  <li key={idx} className="text-sm text-amber-700 flex items-start gap-2">
                    <span className="text-amber-400 shrink-0">•</span>
                    <span>
                      <span>{item.courseName}</span>
                      {' — '}
                      {item.tools.map((t) => `${t.name}${t.free_tier_info ? ` (${t.free_tier_info})` : ' (무료 범위 미표기)'}`).join(', ')}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {overHoursCourses.length > 0 && (
            <div>
              <p className="text-sm text-amber-700 mb-1">
                {overHoursCourses.length}개 과정이 권장 교육 시간({MAX_COURSE_HOURS}시간)을 초과합니다.
              </p>
              <ul className="space-y-1 ml-4">
                {overHoursCourses.map((course, idx) => (
                  <li key={idx} className="text-sm text-amber-700 flex items-start gap-2">
                    <span className="text-amber-400 shrink-0">•</span>
                    <span>
                      <span>{course.course_name}</span>
                      {' — '}{course.recommended_hours}시간
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
