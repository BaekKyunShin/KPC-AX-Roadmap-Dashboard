'use client';

import { useState } from 'react';
import { ChevronDown, ChevronUp, FlaskConical, Info, Loader2, Pencil, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { RoadmapResult, ValidationResult } from '@/lib/services/roadmap';
import { CompetencyModelingTable } from '@/components/roadmap/CompetencyModelingTable';
import { RoadmapMatrix } from '@/components/roadmap/RoadmapMatrix';
import { AnnualTrainingPlanTable } from '@/components/roadmap/AnnualTrainingPlanTable';
import { CoursesList } from '@/components/roadmap/CoursesList';
import { RoadmapOverviewSummary } from '@/components/roadmap/RoadmapOverviewSummary';
import { ROADMAP_TABS } from '@/types/roadmap-ui';

// =============================================================================
// 타입 정의
// =============================================================================

interface TestRoadmapResultProps {
  result: RoadmapResult;
  validation: ValidationResult;
  companyName: string;
  industry: string;
  onReset: () => void;
  onRevisionRequest?: (revisionPrompt: string) => Promise<void>;
  isRevising?: boolean;
}

interface ValidationNotesSectionProps {
  validation: ValidationResult;
}

interface RevisionRequestSectionProps {
  onRevisionRequest: (revisionPrompt: string) => Promise<void>;
  isRevising: boolean;
}

// =============================================================================
// 상수
// =============================================================================

const REVISION_PLACEHOLDER =
  '예: 초급 과정에 Python 기초 내용을 추가해주세요. / 연간계획에 데이터 분석 과정을 추가해주세요.';

// =============================================================================
// 하위 컴포넌트: 테스트 모드 배너
// =============================================================================

function TestModeBanner() {
  return (
    <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex items-start gap-3">
      <FlaskConical className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
      <div>
        <h3 className="font-medium text-amber-800">로드맵 테스트</h3>
        <p className="text-sm text-amber-700 mt-1">
          이 로드맵은 테스트 목적으로 생성되었습니다. 실제 기업 진단 결과가 아닌 입력된 정보만을
          기반으로 생성되었으므로 참고용으로만 활용하세요.
        </p>
      </div>
    </div>
  );
}

// =============================================================================
// 하위 컴포넌트: 검토 필요 사항 섹션
// =============================================================================

function ValidationNotesSection({ validation }: ValidationNotesSectionProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const errorCount = validation.errors.length;
  const warningCount = validation.warnings.length;
  const totalCount = errorCount + warningCount;

  const handleToggle = () => {
    setIsExpanded((prev) => !prev);
  };

  const ChevronIcon = isExpanded ? ChevronUp : ChevronDown;

  return (
    <div className="border border-gray-200 rounded-lg">
      <button
        type="button"
        className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-gray-50 transition-colors"
        onClick={handleToggle}
      >
        <div className="flex items-center gap-2 text-amber-600">
          <Info className="h-4 w-4" />
          <span className="text-sm font-medium">검토 필요 사항({totalCount}건)</span>
        </div>
        <ChevronIcon className="h-4 w-4 text-gray-400" />
      </button>
      {isExpanded && (
        <div className="px-4 pb-4 space-y-3">
          {errorCount > 0 && (
            <div>
              <div className="flex items-center gap-1.5 text-sm font-medium text-red-600 mb-1">
                <AlertTriangle className="h-3.5 w-3.5" />
                오류 ({errorCount})
              </div>
              <ul className="space-y-1">
                {validation.errors.map((item, index) => (
                  <li key={`err-${index}`} className="text-sm text-gray-700 flex items-start gap-2 pl-5">
                    <span className="text-red-400">•</span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {warningCount > 0 && (
            <div>
              <div className="flex items-center gap-1.5 text-sm font-medium text-amber-600 mb-1">
                <Info className="h-3.5 w-3.5" />
                경고 ({warningCount})
              </div>
              <ul className="space-y-1">
                {validation.warnings.map((item, index) => (
                  <li key={`warn-${index}`} className="text-sm text-gray-600 flex items-start gap-2 pl-5">
                    <span className="text-amber-400">•</span>
                    {item}
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

// =============================================================================
// 하위 컴포넌트: 수정 요청 섹션
// =============================================================================

function RevisionRequestSection({ onRevisionRequest, isRevising }: RevisionRequestSectionProps) {
  const [revisionPrompt, setRevisionPrompt] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    const trimmedPrompt = revisionPrompt.trim();
    if (!trimmedPrompt) {
      setError('수정 요청 내용을 입력해주세요.');
      return;
    }
    setError(null);
    await onRevisionRequest(trimmedPrompt);
    setRevisionPrompt('');
  };

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setRevisionPrompt(e.target.value);
  };

  const isSubmitDisabled = isRevising || !revisionPrompt.trim();

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Pencil className="h-4 w-4" />
          수정 요청
        </CardTitle>
        <CardDescription>
          로드맵 수정이 필요하면 요청 내용을 입력하세요. AI가 수정 사항을 반영하여 새 로드맵을
          생성합니다.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <textarea
          value={revisionPrompt}
          onChange={handleChange}
          placeholder={REVISION_PLACEHOLDER}
          rows={9}
          disabled={isRevising}
          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm disabled:bg-gray-100 disabled:cursor-not-allowed"
        />
        {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
        <div className="mt-3 flex justify-end">
          <Button
            onClick={handleSubmit}
            disabled={isSubmitDisabled}
            className="bg-purple-600 hover:bg-purple-700"
          >
            {isRevising ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                수정 중...
              </>
            ) : (
              '수정 요청 반영'
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// =============================================================================
// 메인 컴포넌트
// =============================================================================

/**
 * 로드맵 테스트 결과 컴포넌트 (산인공 양식 4섹션 읽기 전용 표시)
 *   Ⅲ-1. 역량 모델링
 *   Ⅲ-2. 훈련체계도
 *   Ⅲ-3. 연간 훈련계획
 *   Ⅲ-4. 훈련과정 명세서
 */
export default function TestRoadmapResult({
  result,
  validation,
  companyName,
  industry,
  onReset,
  onRevisionRequest,
  isRevising = false,
}: TestRoadmapResultProps) {
  const hasValidationNotes = validation.errors.length > 0 || validation.warnings.length > 0;
  const canRevise = !!onRevisionRequest;

  return (
    <div className="space-y-6 break-keep">
      <TestModeBanner />

      {/* 헤더 */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900">{companyName}</h2>
          <p className="text-gray-500">{industry}</p>
        </div>
        <Button variant="outline" onClick={onReset} className="self-start sm:self-auto shrink-0">
          새 테스트 시작
        </Button>
      </div>

      {/* Ⅰ장 요약 블록 */}
      <RoadmapOverviewSummary
        setupNecessity={result.setup_necessity}
        outcomeSummary={result.outcome_summary}
      />

      {/* 진단 요약 */}
      <Card>
        <CardHeader>
          <CardTitle>진단 요약</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-700 whitespace-pre-wrap">{result.diagnosis_summary}</p>
        </CardContent>
      </Card>

      {/* 로드맵 4섹션 탭 */}
      <Tabs defaultValue="competencies" className="w-full">
        <div className="sticky top-16 z-10 bg-card border-b border-gray-200">
          <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4">
            {ROADMAP_TABS.map((tab) => (
              <TabsTrigger key={tab.key} value={tab.key}>
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>

        <TabsContent value="competencies">
          <Card>
            <CardHeader>
              <CardTitle>역량 모델링</CardTitle>
              <CardDescription>
                산인공 양식 Ⅲ-1 — KSA(지식/기술/태도) 기반 역량 정의
              </CardDescription>
            </CardHeader>
            <CardContent>
              <CompetencyModelingTable competencies={result.competencies} canEdit={false} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="structure">
          <Card>
            <CardHeader>
              <CardTitle>훈련체계도</CardTitle>
              <CardDescription>
                산인공 양식 Ⅲ-2 — 역량 × 수준(초/중/고급) 매트릭스
              </CardDescription>
            </CardHeader>
            <CardContent>
              <RoadmapMatrix
                competencies={result.competencies}
                trainingStructure={result.training_structure}
                canEdit={false}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="plan">
          <Card>
            <CardHeader>
              <CardTitle>연간 훈련계획</CardTitle>
              <CardDescription>
                산인공 양식 Ⅲ-3 — 훈련과정 목록 + 활용방안
              </CardDescription>
            </CardHeader>
            <CardContent>
              <AnnualTrainingPlanTable
                plan={result.annual_plan}
                competencies={result.competencies}
                canEdit={false}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="specs">
          <Card>
            <CardHeader>
              <CardTitle>훈련과정 명세서</CardTitle>
              <CardDescription>
                산인공 양식 Ⅲ-4 — 과정별 프로파일 및 교과목 상세
              </CardDescription>
            </CardHeader>
            <CardContent>
              <CoursesList specs={result.course_specs} canEdit={false} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {hasValidationNotes && <ValidationNotesSection validation={validation} />}

      {canRevise && (
        <RevisionRequestSection onRevisionRequest={onRevisionRequest!} isRevising={isRevising} />
      )}
    </div>
  );
}
