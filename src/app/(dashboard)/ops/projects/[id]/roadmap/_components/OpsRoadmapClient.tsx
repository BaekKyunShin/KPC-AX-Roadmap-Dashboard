'use client';

import { useState } from 'react';
import { FileText } from 'lucide-react';
import { showErrorToast } from '@/lib/utils/toast';
import { TOAST_ERROR } from '@/lib/constants/toast-messages';
import { PageHeader } from '@/components/ui/page-header';
import { useRoadmapDownload } from '@/hooks/useRoadmapDownload';
import { DownloadButton } from '@/components/roadmap/DownloadButton';
import { CompetencyModelingTable } from '@/components/roadmap/CompetencyModelingTable';
import { NcsMethodologyBox } from '@/components/roadmap/NcsMethodologyBox';
import { RoadmapMatrix } from '@/components/roadmap/RoadmapMatrix';
import { RoadmapOverviewSummary } from '@/components/roadmap/RoadmapOverviewSummary';
import { AnnualTrainingPlanTable } from '@/components/roadmap/AnnualTrainingPlanTable';
import { CoursesList } from '@/components/roadmap/CoursesList';
import { RoadmapStatusBadge } from '@/components/roadmap/RoadmapStatusBadge';
import { RevisionPromptToggle } from '@/components/roadmap/RevisionPromptToggle';
import { VersionHistoryList } from '@/components/roadmap/VersionHistoryList';
import { ROADMAP_TABS } from '@/types/roadmap-ui';
import type { RoadmapVersionUI, RoadmapTabKey } from '@/types/roadmap-ui';
import { fetchRoadmapVersionForOps } from '../actions';

interface OpsRoadmapClientProps {
  projectId: string;
  initialVersions: RoadmapVersionUI[];
}

export default function OpsRoadmapClient({ projectId, initialVersions }: OpsRoadmapClientProps) {
  const versions = initialVersions;
  const [selectedVersion, setSelectedVersion] = useState<RoadmapVersionUI | null>(
    initialVersions.length > 0 ? initialVersions[0] : null,
  );
  const [activeTab, setActiveTab] = useState<RoadmapTabKey>('competencies');

  const { isDownloading, downloadPDF, downloadXLSX } = useRoadmapDownload();

  async function handleVersionSelect(versionId: string) {
    try {
      const version = await fetchRoadmapVersionForOps(versionId);
      if (version) {
        setSelectedVersion(version as RoadmapVersionUI);
      }
    } catch {
      showErrorToast('버전 불러오기 실패', TOAST_ERROR.NETWORK);
    }
  }

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

  return (
    <div className="space-y-6">
      <PageHeader
        title="AI 교육 로드맵"
        description="품질 관리 및 감사 목적으로 열람합니다."
        backLink={{
          href: `/ops/projects/${projectId}`,
          label: '프로젝트로 돌아가기',
          useBack: true,
        }}
      />

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* 왼쪽: 버전 목록 */}
        <div className="lg:col-span-1">
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
            <div className="bg-white shadow rounded-lg">
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
                  </div>
                </div>

                {selectedVersion.revision_prompt && (
                  <RevisionPromptToggle prompt={selectedVersion.revision_prompt} />
                )}

                {/* 진단 요약 */}
                <p className="mt-3 text-sm text-gray-600">{selectedVersion.diagnosis_summary}</p>

                <div className="mt-4">
                  <RoadmapOverviewSummary
                    setupNecessity={selectedVersion.setup_necessity}
                    outcomeSummary={selectedVersion.outcome_summary}
                  />
                </div>
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

              {/* 탭 내용 (읽기 전용) */}
              <div className="p-4 sm:p-6">
                {activeTab === 'competencies' && (
                  <div className="space-y-5">
                    <CompetencyModelingTable
                      competencies={selectedVersion.competencies}
                      canEdit={false}
                    />
                    <NcsMethodologyBox
                      ncsUsed={selectedVersion.ncs_used}
                      ncsMethodology={selectedVersion.ncs_methodology}
                      ncsDerivationMethod={selectedVersion.ncs_derivation_method}
                      canEdit={false}
                    />
                  </div>
                )}
                {activeTab === 'structure' && (
                  <RoadmapMatrix
                    competencies={selectedVersion.competencies}
                    trainingStructure={selectedVersion.training_structure}
                    trainingStructureMethod={selectedVersion.training_structure_method}
                    canEdit={false}
                  />
                )}
                {activeTab === 'plan' && (
                  <AnnualTrainingPlanTable
                    plan={selectedVersion.annual_plan}
                    competencies={selectedVersion.competencies}
                    canEdit={false}
                  />
                )}
                {activeTab === 'specs' && (
                  <CoursesList specs={selectedVersion.course_specs} canEdit={false} />
                )}
              </div>
            </div>
          ) : (
            <div className="bg-white shadow rounded-lg p-12 text-center">
              <FileText className="mx-auto h-12 w-12 text-gray-400" />
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
