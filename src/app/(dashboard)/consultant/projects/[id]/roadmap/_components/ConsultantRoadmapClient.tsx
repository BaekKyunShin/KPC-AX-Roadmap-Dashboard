'use client';

import { useState, useTransition } from 'react';
import { FileText } from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { showSuccessToast, showErrorToast } from '@/lib/utils/toast';
import { isCancelledError } from '@/lib/services/llm';
import {
  createRoadmap,
  confirmFinalRoadmap,
  fetchRoadmapVersions,
  fetchRoadmapVersion,
  editRoadmapManually,
  cancelRoadmapGeneration,
} from '../actions';
import { useRoadmapDownload } from '@/hooks/useRoadmapDownload';
import RoadmapLoadingOverlay, { COMPLETION_DELAY_MS } from '@/components/roadmap/RoadmapLoadingOverlay';
import { DownloadButton } from '@/components/roadmap/DownloadButton';
import { CompetencyModelingTable } from '@/components/roadmap/CompetencyModelingTable';
import { RoadmapMatrix } from '@/components/roadmap/RoadmapMatrix';
import { AnnualTrainingPlanTable } from '@/components/roadmap/AnnualTrainingPlanTable';
import { CoursesList } from '@/components/roadmap/CoursesList';
import { RoadmapStatusBadge } from '@/components/roadmap/RoadmapStatusBadge';
import { RevisionPromptToggle } from '@/components/roadmap/RevisionPromptToggle';
import { VersionHistoryList } from '@/components/roadmap/VersionHistoryList';
import type {
  RoadmapCompetency,
  RoadmapAnnualPlan,
  RoadmapCourseSpec,
} from '@/lib/services/roadmap';
import { ROADMAP_TABS } from '@/types/roadmap-ui';
import type { RoadmapVersionUI, RoadmapTabKey } from '@/types/roadmap-ui';
import { ShareToggle } from '@/components/gallery/ShareToggle';

interface ConsultantRoadmapClientProps {
  projectId: string;
  initialVersions: RoadmapVersionUI[];
  companyName: string;
}

export default function ConsultantRoadmapClient({
  projectId,
  initialVersions,
  companyName,
}: ConsultantRoadmapClientProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [isGenerationComplete, setIsGenerationComplete] = useState(false);
  const [isFinalizing, setIsFinalizing] = useState(false);

  const [versions, setVersions] = useState<RoadmapVersionUI[]>(initialVersions);
  const [selectedVersion, setSelectedVersion] = useState<RoadmapVersionUI | null>(
    initialVersions.length > 0 ? initialVersions[0] : null,
  );
  const [revisionPrompt, setRevisionPrompt] = useState('');
  const [activeTab, setActiveTab] = useState<RoadmapTabKey>('competencies');

  const [, startTransition] = useTransition();
  const [isSaving, setIsSaving] = useState(false);

  const { isDownloading, downloadPDF, downloadXLSX } = useRoadmapDownload();

  const handleGenerate = async () => {
    setIsGenerating(true);
    setIsGenerationComplete(false);

    const result = await createRoadmap(projectId, revisionPrompt || undefined);

    if (result.success) {
      showSuccessToast('로드맵 생성 완료', '로드맵이 생성되었습니다.');
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

    if (
      !confirm(
        '이 로드맵을 최종 확정하시겠습니까? 기존 확정본은 이전 확정본으로 변경됩니다.',
      )
    ) {
      return;
    }

    setIsFinalizing(true);

    const result = await confirmFinalRoadmap(selectedVersion.id);

    if (result.success) {
      showSuccessToast('최종 확정 완료', '로드맵이 최종 확정되었습니다.');
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

  // ───── 섹션 편집 핸들러 (controlled 패턴) ─────
  // 즉시 낙관적 업데이트 → 서버 반영 → 실패 시 토스트
  const runSectionUpdate = async (
    updates: Parameters<typeof editRoadmapManually>[1],
    optimisticPatch: Partial<RoadmapVersionUI>,
  ) => {
    if (!selectedVersion) return;

    // 낙관적 업데이트
    const prev = selectedVersion;
    const next: RoadmapVersionUI = { ...prev, ...optimisticPatch };
    setSelectedVersion(next);
    setVersions((vs) => vs.map((v) => (v.id === next.id ? next : v)));

    setIsSaving(true);
    const result = await editRoadmapManually(prev.id, updates);
    setIsSaving(false);

    if (!result.success) {
      // 실패 시 롤백
      setSelectedVersion(prev);
      setVersions((vs) => vs.map((v) => (v.id === prev.id ? prev : v)));
      showErrorToast('저장 실패', result.error || '변경사항 저장에 실패했습니다.');
      return;
    }

    // 서버에서 최신본 재조회 (검증 결과 등 반영)
    startTransition(async () => {
      const fresh = await fetchRoadmapVersion(prev.id);
      if (fresh) {
        setSelectedVersion(fresh as RoadmapVersionUI);
        setVersions((vs) =>
          vs.map((v) => (v.id === fresh.id ? (fresh as RoadmapVersionUI) : v)),
        );
      }
    });
  };

  const handleCompetenciesChange = (next: RoadmapCompetency[]) =>
    runSectionUpdate({ competencies: next }, { competencies: next });

  const handleAnnualPlanChange = (next: RoadmapAnnualPlan) =>
    runSectionUpdate({ annual_plan: next }, { annual_plan: next });

  const handleCourseSpecsChange = (next: RoadmapCourseSpec[]) =>
    runSectionUpdate({ course_specs: next }, { course_specs: next });

  const handleDownloadPDF = () => {
    if (selectedVersion) {
      downloadPDF(selectedVersion.id);
    }
  };

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

  return (
    <>
      <div className="space-y-6">
        <PageHeader
          title="AI 교육 로드맵"
          backLink={{
            href: `/consultant/projects/${projectId}`,
            label: '프로젝트로 돌아가기',
            useBack: true,
          }}
        />

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* 왼쪽: 생성 및 버전 목록 */}
          <div className="lg:col-span-1 space-y-4">
            {/* 생성 버튼 */}
            <div className="bg-white shadow rounded-lg p-4">
              <h3 className="text-sm font-medium text-gray-900 mb-3">로드맵 생성</h3>
              {versions.length > 0 && (
                <Textarea
                  rows={9}
                  value={revisionPrompt}
                  onChange={(e) => setRevisionPrompt(e.target.value)}
                  placeholder="수정 요청사항 (선택)"
                  className="text-sm"
                />
              )}
              <Button
                onClick={handleGenerate}
                disabled={isGenerating}
                className={`${versions.length > 0 ? 'mt-2 ' : ''}w-full text-sm`}
              >
                {isGenerating
                  ? 'AI 생성 중...'
                  : versions.length > 0
                    ? '새 버전 로드맵 생성'
                    : '로드맵 생성'}
              </Button>
              {isGenerating && (
                <p className="mt-2 text-xs text-gray-500 text-center">
                  AI가 로드맵을 생성 중입니다. 잠시 기다려주세요...
                </p>
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
                      <h2 className="text-lg font-semibold text-gray-900">
                        버전 {selectedVersion.version_number}
                      </h2>
                      <RoadmapStatusBadge
                        status={selectedVersion.status}
                        versionNumber={selectedVersion.version_number}
                      />
                      {isSaving && (
                        <span className="text-xs text-gray-400">저장 중…</span>
                      )}
                    </div>
                    <div className="flex items-center space-x-2">
                      <DownloadButton
                        onClick={handleDownloadPDF}
                        loading={isDownloading === 'PDF'}
                        type="PDF"
                        disabled={isDownloading !== null}
                      />
                      <DownloadButton
                        onClick={handleDownloadXLSX}
                        loading={isDownloading === 'XLSX'}
                        type="Excel"
                        disabled={isDownloading !== null}
                      />
                      {canEdit && (
                        <Button
                          onClick={handleFinalize}
                          disabled={isFinalizing}
                          className="bg-green-600 hover:bg-green-700 text-white text-sm"
                        >
                          {isFinalizing ? '처리 중...' : '최종 확정'}
                        </Button>
                      )}
                    </div>
                  </div>

                  {selectedVersion.revision_prompt && (
                    <RevisionPromptToggle prompt={selectedVersion.revision_prompt} />
                  )}

                  <p className="mt-3 text-sm text-gray-600">
                    {selectedVersion.diagnosis_summary}
                  </p>

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
                  {activeTab === 'competencies' && (
                    <CompetencyModelingTable
                      competencies={selectedVersion.competencies}
                      canEdit={canEdit}
                      onChange={handleCompetenciesChange}
                    />
                  )}
                  {activeTab === 'structure' && (
                    <RoadmapMatrix
                      competencies={selectedVersion.competencies}
                      trainingStructure={selectedVersion.training_structure}
                      canEdit={canEdit}
                    />
                  )}
                  {activeTab === 'plan' && (
                    <AnnualTrainingPlanTable
                      plan={selectedVersion.annual_plan}
                      competencies={selectedVersion.competencies}
                      canEdit={canEdit}
                      onChange={handleAnnualPlanChange}
                    />
                  )}
                  {activeTab === 'specs' && (
                    <CoursesList
                      specs={selectedVersion.course_specs}
                      canEdit={canEdit}
                      onChange={handleCourseSpecsChange}
                    />
                  )}
                </div>
              </div>
            ) : (
              <EmptyRoadmapState />
            )}
          </div>
        </div>
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
      <p className="mt-1 text-sm text-gray-500">
        왼쪽의 &quot;로드맵 생성&quot; 버튼을 클릭하여 AI 로드맵을 생성하세요.
      </p>
    </div>
  );
}
