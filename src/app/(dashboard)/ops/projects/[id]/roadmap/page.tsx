'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { FileText } from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { fetchRoadmapVersionsForOps, fetchRoadmapVersionForOps } from './actions';
import { useRoadmapDownload } from '@/hooks/useRoadmapDownload';
import { DownloadButton } from '@/components/roadmap/DownloadButton';
import { RoadmapMatrix } from '@/components/roadmap/RoadmapMatrix';
import { PBLCourseView } from '@/components/roadmap/PBLCourseView';
import { CoursesList } from '@/components/roadmap/CoursesList';
import { RoadmapStatusBadge } from '@/components/roadmap/RoadmapStatusBadge';
import { ROADMAP_TABS } from '@/types/roadmap-ui';
import type { RoadmapVersionUI, RoadmapTabKey } from '@/types/roadmap-ui';

export default function OpsRoadmapViewPage() {
  const params = useParams();
  const projectId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [versions, setVersions] = useState<RoadmapVersionUI[]>([]);
  const [selectedVersion, setSelectedVersion] = useState<RoadmapVersionUI | null>(null);
  const [activeTab, setActiveTab] = useState<RoadmapTabKey>('matrix');

  // 다운로드 훅
  const {
    isDownloading,
    error: downloadError,
    success: downloadSuccess,
    downloadPDF,
    downloadXLSX,
    clearMessages,
  } = useRoadmapDownload();

  // 버전 목록 로드
  useEffect(() => {
    async function loadVersions() {
      setLoading(true);
      const data = await fetchRoadmapVersionsForOps(projectId);
      setVersions(data as RoadmapVersionUI[]);
      if (data.length > 0) {
        setSelectedVersion(data[0] as RoadmapVersionUI);
      }
      setLoading(false);
    }
    loadVersions();
  }, [projectId]);

  // 버전 선택
  async function handleVersionSelect(versionId: string) {
    const version = await fetchRoadmapVersionForOps(versionId);
    if (version) {
      setSelectedVersion(version as RoadmapVersionUI);
    }
  }

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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">로딩 중...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="AI 교육 로드맵"
        description="품질 관리 및 감사 목적으로 열람합니다."
        backLink={{ href: `/ops/projects/${projectId}`, label: '프로젝트로 돌아가기' }}
      />

      {/* 에러/성공 메시지 */}
      {downloadError && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded relative">
          {downloadError}
          <button
            onClick={clearMessages}
            className="absolute top-0 right-0 p-3 text-red-500 hover:text-red-700"
          >
            ×
          </button>
        </div>
      )}
      {downloadSuccess && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded relative">
          {downloadSuccess}
          <button
            onClick={clearMessages}
            className="absolute top-0 right-0 p-3 text-green-500 hover:text-green-700"
          >
            ×
          </button>
        </div>
      )}

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
                        <RoadmapStatusBadge status={v.status} />
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
                    <RoadmapStatusBadge status={selectedVersion.status} />
                    {selectedVersion.free_tool_validated && selectedVersion.time_limit_validated ? (
                      <span className="text-xs text-green-600">✓ 검증 통과</span>
                    ) : (
                      <span className="text-xs text-red-600">✗ 검증 실패</span>
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
