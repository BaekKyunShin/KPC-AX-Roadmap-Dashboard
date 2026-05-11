'use client';

/**
 * 로드맵 테스트 클라이언트 (Task 2.11-e V2 포팅).
 *
 * 산인공 양식 1번 V2 Step 컴포넌트를 그대로 재사용해 실제 인터뷰 화면(V2)과 **동일**하게
 * 구성한다. DB 저장은 하지 않으며, "생성" 버튼 클릭 시 `createTestRoadmap` 액션이
 * LLM 결과만 in-memory 로 반환한다. 결과 렌더에는 완성된 `RoadmapResultClient`
 * (role="CONSULTANT") 를 재사용한다 — 테스트 모드에서 onEdit/onGenerate 는 NOOP.
 */

import { useState } from 'react';
import Link from 'next/link';
import { Info, FlaskConical, Wand2 } from 'lucide-react';

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { PageContainer } from '@/components/layout/PageContainer';
import { PageHeader } from '@/components/ui/page-header';
import { StickyFormNav } from '@/components/forms/StickyFormNav';
import PendingApprovalCard from '@/components/PendingApprovalCard';
import RoadmapLoadingOverlay, { COMPLETION_DELAY_MS } from '@/components/roadmap/RoadmapLoadingOverlay';
import { showErrorToast, showSuccessToast } from '@/lib/utils';
import { formatZodIssuesForToast } from '@/lib/utils/zod-error-format';
import { ROADMAP_FIELD_LABELS } from '@/lib/schemas/interview-roadmap-labels';
import { PAGE_TITLE, PAGE_DESCRIPTION } from './_meta';

import InterviewStepper from '@/app/(dashboard)/consultant/projects/[id]/interview/_components/InterviewStepper';
import { StepNecessity } from '@/app/(dashboard)/consultant/projects/[id]/interview/_components/roadmap/StepNecessity';
import {
  StepMainResult,
  type StepMainResultValue,
} from '@/app/(dashboard)/consultant/projects/[id]/interview/_components/roadmap/StepMainResult';
import { StepCompanyRequirements } from '@/app/(dashboard)/consultant/projects/[id]/interview/_components/roadmap/StepCompanyRequirements';
import {
  StepTaskAnalysis,
  type StepTaskAnalysisValue,
} from '@/app/(dashboard)/consultant/projects/[id]/interview/_components/roadmap/StepTaskAnalysis';
import { StepTargetTask } from '@/app/(dashboard)/consultant/projects/[id]/interview/_components/roadmap/StepTargetTask';
import { StepPerformanceActivities } from '@/app/(dashboard)/consultant/projects/[id]/interview/_components/roadmap/StepPerformanceActivities';
import {
  StepCompetencyModeling,
  type StepCompetencyModelingValue,
} from '@/app/(dashboard)/consultant/projects/[id]/interview/_components/roadmap/StepCompetencyModeling';

import {
  RoadmapInterviewStrictSchema,
  type RoadmapInterviewStrict,
  type RoadmapCompanyRequirements,
  type RoadmapTargetTask,
} from '@/lib/schemas/interview-roadmap';
import { RoadmapResultClient } from '@/app/(dashboard)/consultant/projects/[id]/roadmap/_components/result-v2/RoadmapResultClient';
import type { ResultInterviewSnapshot } from '@/app/(dashboard)/consultant/projects/[id]/roadmap/_components/result-v2/types';
import type { RoadmapVersionUI } from '@/types/roadmap-ui';
import { ROADMAP_INTERVIEW_SAMPLE } from '@/lib/fixtures/roadmap-interview-sample';

import {
  createTestRoadmap,
  cancelTestRoadmapGeneration,
  reviseTestRoadmap,
  exportTestRoadmapHwpx,
} from './actions';
import type { RoadmapResult, ValidationResult } from '@/lib/services/roadmap';
import { isCancelledError } from '@/lib/services/llm';

// ─── 8 스텝 정의 (V2 인터뷰 Client 와 동일 구성) ─────────────────────────────

type StepId =
  | 'necessity'
  | 'performance'
  | 'mainResult'
  | 'hrdReport'
  | 'companyReq'
  | 'taskAnalysis'
  | 'targetTask'
  | 'competencyModeling';

// 테스트 모드는 HRD PDF 업로드 불가 → Ⅱ-1 스텝 자체를 제외 (총 7스텝)
const STEPS: ReadonlyArray<{
  id: number;
  stepId: Exclude<StepId, 'hrdReport'>;
  shortName: string;
  name: string;
}> = [
  { id: 1, stepId: 'necessity', shortName: 'Ⅰ-1', name: '수립 필요성' },
  { id: 2, stepId: 'performance', shortName: 'Ⅰ-2', name: '주요 활동' },
  { id: 3, stepId: 'mainResult', shortName: 'Ⅰ-3', name: '수립 주요 결과' },
  { id: 4, stepId: 'companyReq', shortName: 'Ⅱ-2', name: '기업 요구분석' },
  { id: 5, stepId: 'taskAnalysis', shortName: 'Ⅱ-3', name: '과업·워크플로우 분석' },
  { id: 6, stepId: 'targetTask', shortName: 'Ⅱ-4', name: '훈련대상 과업' },
  { id: 7, stepId: 'competencyModeling', shortName: 'Ⅲ-1', name: '역량 모델링' },
];

const ADMIN_ROLES = ['OPS_ADMIN', 'SYSTEM_ADMIN'] as const;
function isAdminRole(role: string): boolean {
  return ADMIN_ROLES.includes(role as (typeof ADMIN_ROLES)[number]);
}

function getBackLink(isOpsAdmin: boolean) {
  return isOpsAdmin
    ? { href: '/ops/projects', label: '프로젝트 관리로 돌아가기' }
    : { href: '/consultant/projects', label: '담당 프로젝트로 돌아가기' };
}

function emptyCompanyRequirements(): RoadmapCompanyRequirements {
  return { status: '', problem: '', will: '', outcomes: '' };
}

function emptyTargetTask(): RoadmapTargetTask {
  return { name: '', reason: '', expectedAsIs: '', expectedToBe: '' };
}

function emptyInitial(): Partial<RoadmapInterviewStrict> {
  return {
    establishmentNecessity: '',
    performanceActivities: [],
    aiLevel: 'BEGINNER',
    selectedTask: '',
    hrdReportPdf: null,
    companyRequirements: emptyCompanyRequirements(),
    taskAnalysis: [],
    taskAnalysisNote: '',
    taskAnalysisAttachment: null,
    targetTask: emptyTargetTask(),
    competencies: [],
    ncsUsed: false,
  };
}

// ─── RoadmapResult → RoadmapVersionUI 어댑터 (in-memory 렌더용) ───────────────

function toRoadmapVersionUI(result: RoadmapResult): RoadmapVersionUI {
  return {
    id: 'test-version',
    version_number: 1,
    status: 'DRAFT',
    diagnosis_summary: result.diagnosis_summary,
    setup_necessity: result.setup_necessity ?? '',
    outcome_summary: result.outcome_summary,
    competencies: result.competencies,
    ncs_used: result.ncs_used ?? false,
    ncs_methodology: result.ncs_methodology ?? '',
    ncs_derivation_method: result.ncs_derivation_method ?? '',
    training_structure: result.training_structure,
    training_structure_method: result.training_structure_method ?? '',
    annual_plan: result.annual_plan,
    course_specs: result.course_specs,
    revision_prompt: null,
    is_shared: false,
    created_at: new Date().toISOString(),
    finalized_at: null,
  };
}

// ─── RoadmapResult → RoadmapExportData (테스트 모드 PDF/Excel 다운로드용) ────

/**
 * 테스트 로드맵 결과(in-memory) → PDF/Excel 다운로드용 RoadmapExportData 변환.
 *
 * 실제 로드맵은 `prepareExportData(roadmapId)` 가 DB row → ExportData 매핑을
 * 수행하지만, 테스트 모드는 DB 저장이 없으므로 4섹션 RoadmapResult 를 그대로
 * camelCase 로 옮긴다.
 */
export function buildTestRoadmapExportData(
  result: RoadmapResult,
  companyName: string,
): import('@/lib/services/export-pdf').RoadmapExportData {
  return {
    companyName,
    projectId: 'test-mode',
    versionNumber: 1,
    status: 'DRAFT',
    diagnosisSummary: result.diagnosis_summary ?? '',
    competencies: result.competencies ?? [],
    ncsUsed: result.ncs_used ?? false,
    ncsMethodology: result.ncs_methodology ?? '',
    ncsDerivationMethod: result.ncs_derivation_method ?? '',
    trainingStructure: result.training_structure ?? [],
    trainingStructureMethod: result.training_structure_method ?? '',
    annualPlan: result.annual_plan ?? { items: [], usage_plan: '' },
    courseSpecs: result.course_specs ?? [],
    createdAt: new Date().toISOString(),
    finalizedAt: null,
  };
}

// ─── 인터뷰(camelCase) → 결과 페이지 snapshot ────────────────────────────────

function toInterviewSnapshot(
  interview: RoadmapInterviewStrict,
): ResultInterviewSnapshot {
  return {
    establishmentNecessity: interview.establishmentNecessity,
    performanceActivities: interview.performanceActivities,
    aiLevel: interview.aiLevel,
    selectedTask: interview.selectedTask,
  } as ResultInterviewSnapshot;
}

// ─── Props ─────────────────────────────────────────────────────────────────

interface UserInfo {
  id: string;
  name: string;
  email: string;
  role: string;
  status: string;
}

interface TestRoadmapClientProps {
  user: UserInfo;
  canAccess: boolean;
  hasProfile: boolean;
}

interface TestResultState {
  result: RoadmapResult;
  validation: ValidationResult;
}

export default function TestRoadmapClient({ user, canAccess, hasProfile }: TestRoadmapClientProps) {
  const isOpsAdmin = isAdminRole(user.role);
  const backLink = getBackLink(isOpsAdmin);

  // ── 인터뷰 상태 (V2 스키마) ──────────────────────────────────────────────
  const [data, setData] = useState<Partial<RoadmapInterviewStrict>>(() => emptyInitial());
  const [currentStep, setCurrentStep] = useState<number>(1);

  // ── 테스트 전용: 기업 기본정보 ─────────────────────────────────────────────
  const [companyName, setCompanyName] = useState('테스트 기업');
  const [industry, setIndustry] = useState('제조/생산');
  const [companySize, setCompanySize] = useState('small');

  // ── 생성 상태 ────────────────────────────────────────────────────────────
  const [isGenerating, setIsGenerating] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [testResult, setTestResult] = useState<TestResultState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isRevising, setIsRevising] = useState(false);
  const [isRevisionComplete, setIsRevisionComplete] = useState(false);

  const currentStepDef = STEPS[currentStep - 1];
  const isFirstStep = currentStep === 1;
  const isLastStep = currentStep === STEPS.length;

  // ── 슬라이스 업데이트 ─────────────────────────────────────────────────────
  const update = <K extends keyof RoadmapInterviewStrict>(
    patch: Partial<Pick<RoadmapInterviewStrict, K>>,
  ) => setData((prev) => ({ ...prev, ...patch }));

  // ── 샘플 데이터 채우기 ───────────────────────────────────────────────────
  const fillSample = () => {
    const hasInput =
      (data.establishmentNecessity ?? '').trim() !== '' ||
      (data.selectedTask ?? '').trim() !== '' ||
      (data.companyRequirements?.status ?? '').trim() !== '' ||
      (data.taskAnalysis ?? []).length > 0 ||
      (data.competencies ?? []).length > 0;
    if (
      hasInput &&
      typeof window !== 'undefined' &&
      !window.confirm('기존 입력값이 모두 덮어써집니다. 계속하시겠습니까?')
    ) {
      return;
    }
    const sample = JSON.parse(
      JSON.stringify(ROADMAP_INTERVIEW_SAMPLE),
    ) as RoadmapInterviewStrict;
    setData(sample);
    setCurrentStep(1);
  };

  // ── 생성 / 수정 / 리셋 ───────────────────────────────────────────────────
  const buildActionInput = (validated: RoadmapInterviewStrict) => ({
    interview: validated,
    companyName,
    industry,
    companySize,
  });

  const handleSubmit = async () => {
    const parsed = RoadmapInterviewStrictSchema.safeParse(data);
    if (!parsed.success) {
      const message = formatZodIssuesForToast(parsed.error, ROADMAP_FIELD_LABELS);
      showErrorToast(
        '제출 검증 실패',
        message || '필수 입력 항목을 확인해주세요.',
      );
      return;
    }

    setError(null);
    setIsGenerating(true);
    setIsComplete(false);
    try {
      const result = await createTestRoadmap(buildActionInput(parsed.data));
      if (result.success) {
        setIsComplete(true);
        setTimeout(() => {
          setTestResult({
            result: result.data.result,
            validation: result.data.validation,
          });
          setIsGenerating(false);
          setIsComplete(false);
        }, COMPLETION_DELAY_MS);
      } else if (!isCancelledError(result.error)) {
        setError(result.error);
        showErrorToast('로드맵 생성 실패', result.error);
        setIsGenerating(false);
      } else {
        setIsGenerating(false);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : '로드맵 생성 중 오류가 발생했습니다.';
      setError(message);
      showErrorToast('로드맵 생성 실패', message);
      setIsGenerating(false);
    }
  };

  const handleCancelGeneration = async () => {
    setIsGenerating(false);
    setIsComplete(false);
    await cancelTestRoadmapGeneration();
  };

  const handleRegenerate = async (revisionPrompt?: string) => {
    if (!testResult) return;
    const parsed = RoadmapInterviewStrictSchema.safeParse(data);
    if (!parsed.success) {
      const message = formatZodIssuesForToast(parsed.error, ROADMAP_FIELD_LABELS);
      showErrorToast(
        '수정 검증 실패',
        message || '인터뷰 입력을 확인해주세요.',
      );
      return;
    }
    setIsRevising(true);
    setIsRevisionComplete(false);
    try {
      const result = await reviseTestRoadmap(
        buildActionInput(parsed.data),
        testResult.result,
        revisionPrompt ?? '',
      );
      if (result.success) {
        setIsRevisionComplete(true);
        setTimeout(() => {
          setTestResult({
            result: result.data.result,
            validation: result.data.validation,
          });
          setIsRevising(false);
          setIsRevisionComplete(false);
          showSuccessToast('로드맵 수정 완료', '요청 내용이 반영되었습니다.');
        }, COMPLETION_DELAY_MS);
      } else if (!isCancelledError(result.error)) {
        showErrorToast('로드맵 수정 실패', result.error);
        setIsRevising(false);
      } else {
        setIsRevising(false);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : '로드맵 수정 중 오류가 발생했습니다.';
      showErrorToast('로드맵 수정 실패', message);
      setIsRevising(false);
    }
  };

  const handleReset = () => {
    setTestResult(null);
    setError(null);
    setCurrentStep(1);
  };

  // ── 미승인 사용자 차단 ────────────────────────────────────────────────────
  if (!canAccess) {
    const userRole = user.role === 'USER_PENDING' ? 'CONSULTANT' : 'OPS_ADMIN';
    return (
      <div className="max-w-2xl mx-auto py-8">
        <PendingApprovalCard
          userName={user.name}
          userEmail={user.email}
          userRole={userRole}
          hasProfile={hasProfile}
        />
      </div>
    );
  }

  // ── 결과 화면 (RoadmapResultClient 재사용) ──────────────────────────────
  if (testResult) {
    const version = toRoadmapVersionUI(testResult.result);
    const parsedInterview = RoadmapInterviewStrictSchema.safeParse(data);
    const snapshot = parsedInterview.success
      ? toInterviewSnapshot(parsedInterview.data)
      : undefined;

    return (
      <div className="max-w-5xl mx-auto py-6 space-y-4">
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="flex items-center justify-between">
          <Alert className="flex-1">
            <FlaskConical className="h-4 w-4 text-amber-600" />
            <AlertTitle>테스트 결과 — DB 저장되지 않음</AlertTitle>
            <AlertDescription>
              페이지 이탈 시 결과는 휘발됩니다. 실제 프로젝트에서 로드맵을 생성하려면
              담당 프로젝트의 인터뷰 화면을 이용하세요.
            </AlertDescription>
          </Alert>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleReset}
            className="ml-4"
          >
            처음으로
          </Button>
        </div>

        <RoadmapResultClient
          role="CONSULTANT"
          projectId="test-mode"
          versions={[version]}
          selectedVersion={version}
          interview={snapshot}
          onSelectVersion={() => undefined}
          /* 테스트 모드 — 인라인 편집은 NOOP (in-memory 저장 없음). */
          onEdit={async () => undefined}
          onGenerate={handleRegenerate}
          onDownload={async (type) => {
            try {
              if (type === 'PDF') {
                const exportData = buildTestRoadmapExportData(
                  testResult.result,
                  companyName,
                );
                const { generatePDF } = await import(
                  '@/lib/services/export-pdf'
                );
                const blob = await generatePDF(exportData);
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `roadmap_test_${companyName}_v1.pdf`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
                showSuccessToast('PDF 다운로드 완료');
                return;
              }
              if (type === 'XLSX') {
                const exportData = buildTestRoadmapExportData(
                  testResult.result,
                  companyName,
                );
                const { downloadXLSX } = await import(
                  '@/lib/services/export-xlsx'
                );
                await downloadXLSX(
                  exportData,
                  `roadmap_test_${companyName}_v1.xlsx`,
                );
                showSuccessToast('Excel 다운로드 완료');
                return;
              }
              if (type === 'HWPX') {
                const parsedInterview =
                  RoadmapInterviewStrictSchema.safeParse(data);
                if (!parsedInterview.success) {
                  showErrorToast(
                    'HWPX 다운로드 실패',
                    '인터뷰 검증에 실패했습니다.',
                  );
                  return;
                }
                const result = await exportTestRoadmapHwpx({
                  result: testResult.result,
                  interview: parsedInterview.data,
                  companyName,
                });
                if (!result.success) {
                  // 실패 시 영구 토스트 + 콘솔 풀 로그 (요청 ID 추적용)
                  console.error('[TestRoadmap HWPX] result.success=false', result);
                  showErrorToast('HWPX 다운로드 실패', result.error, {
                    duration: Infinity,
                  });
                  return;
                }
                const { fileName, contentBase64, mimeType } = result.data;
                const binary = atob(contentBase64);
                const bytes = new Uint8Array(binary.length);
                for (let i = 0; i < binary.length; i++) {
                  bytes[i] = binary.charCodeAt(i);
                }
                const blob = new Blob([bytes], { type: mimeType });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = fileName;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
                showSuccessToast('HWPX 다운로드 완료');
                return;
              }
            } catch (err) {
              const message =
                err instanceof Error
                  ? err.message
                  : '다운로드 중 오류가 발생했습니다.';
              console.error('[TestRoadmapClient] 다운로드 예외:', err);
              showErrorToast('다운로드 실패', message);
            }
          }}
          isGenerating={isRevising}
          isGenerationComplete={isRevisionComplete}
          onCancelGenerate={async () => {
            setIsRevising(false);
            setIsRevisionComplete(false);
            await cancelTestRoadmapGeneration();
          }}
          companyName={companyName}
        />
      </div>
    );
  }

  // ── 인터뷰 폼 (V2 Step 컴포넌트 재사용) ─────────────────────────────────
  function renderStep() {
    switch (currentStepDef.stepId) {
      case 'necessity':
        return (
          <StepNecessity
            value={data.establishmentNecessity ?? ''}
            onChange={(next) => update({ establishmentNecessity: next })}
          />
        );
      case 'performance':
        return (
          <StepPerformanceActivities
            value={data.performanceActivities ?? []}
            onChange={(next) => update({ performanceActivities: next })}
          />
        );
      case 'mainResult': {
        const value: StepMainResultValue = {
          aiLevel: data.aiLevel ?? 'BEGINNER',
          selectedTask: data.selectedTask ?? '',
        };
        return (
          <StepMainResult
            value={value}
            onChange={(next) =>
              update({ aiLevel: next.aiLevel, selectedTask: next.selectedTask })
            }
          />
        );
      }
      case 'companyReq':
        return (
          <StepCompanyRequirements
            value={data.companyRequirements ?? emptyCompanyRequirements()}
            onChange={(next) => update({ companyRequirements: next })}
          />
        );
      case 'taskAnalysis': {
        const value: StepTaskAnalysisValue = {
          taskAnalysis: data.taskAnalysis ?? [],
          taskAnalysisNote: data.taskAnalysisNote ?? '',
          taskAnalysisAttachment: data.taskAnalysisAttachment ?? null,
        };
        return (
          <StepTaskAnalysis
            projectId="test-mode"
            value={value}
            onChange={(next) =>
              update({
                taskAnalysis: next.taskAnalysis,
                taskAnalysisNote: next.taskAnalysisNote,
                taskAnalysisAttachment: next.taskAnalysisAttachment,
              })
            }
          />
        );
      }
      case 'targetTask':
        return (
          <StepTargetTask
            value={data.targetTask ?? emptyTargetTask()}
            onChange={(next) => update({ targetTask: next })}
          />
        );
      case 'competencyModeling': {
        const value: StepCompetencyModelingValue = {
          competencies: data.competencies ?? [],
          ncsUsed: data.ncsUsed ?? false,
          ncsMethodology: data.ncsMethodology,
          ncsDerivationMethod: data.ncsDerivationMethod,
        };
        return (
          <StepCompetencyModeling
            value={value}
            onChange={(next) =>
              update({
                competencies: next.competencies,
                ncsUsed: next.ncsUsed,
                ncsMethodology: next.ncsMethodology,
                ncsDerivationMethod: next.ncsDerivationMethod,
              })
            }
          />
        );
      }
      default:
        return null;
    }
  }

  return (
    <>
      <PageContainer>
        <PageHeader
          title={PAGE_TITLE}
          description={PAGE_DESCRIPTION}
          backLink={{ ...backLink, useBack: true }}
          actions={
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={fillSample}
              data-testid="test-roadmap-fill-sample"
            >
              <Wand2 className="w-4 h-4 mr-1.5" />
              샘플 데이터 채우기
            </Button>
          }
        />

        <Alert>
          <Info className="h-4 w-4" />
          <AlertTitle>테스트 모드 안내</AlertTitle>
          <AlertDescription>
            이 화면의 UI/UX는 실제 현장 인터뷰(로드맵)와 동일합니다. Ⅱ-1 HRD이음 PDF 첨부는
            테스트 모드에서 지원되지 않습니다.
            <strong className="block mt-2 text-amber-700">
              입력값은 DB에 저장되지 않으며, 페이지를 떠나면 사라집니다.
            </strong>
          </AlertDescription>
        </Alert>

        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {!hasProfile && (
          <Alert variant="destructive">
            <AlertTitle>컨설턴트 프로필 미등록</AlertTitle>
            <AlertDescription>
              컨설턴트 프로필 정보가 로드맵 생성에 활용됩니다. 먼저 프로필을 등록해주세요.
              <Link href="/consultant/profile" className="ml-2 underline">
                프로필 등록하기
              </Link>
            </AlertDescription>
          </Alert>
        )}

        <div className="bg-muted/30 border border-border rounded-lg p-4 flex items-center gap-3 flex-wrap text-sm">
          <FlaskConical className="h-4 w-4 text-amber-600" />
          <strong className="text-foreground">테스트 대상 기업</strong>
          <input
            type="text"
            value={companyName}
            onChange={(e) => setCompanyName(e.target.value)}
            className="px-2 py-1 border rounded text-sm"
            aria-label="기업명"
          />
          <select
            value={industry}
            onChange={(e) => setIndustry(e.target.value)}
            className="px-2 py-1 border rounded text-sm"
            aria-label="업종"
          >
            <option>제조/생산</option>
            <option>IT/소프트웨어</option>
            <option>유통/물류</option>
            <option>금융/보험</option>
            <option>의료/헬스케어</option>
            <option>건설/플랜트</option>
            <option>서비스업</option>
            <option>교육</option>
          </select>
          <select
            value={companySize}
            onChange={(e) => setCompanySize(e.target.value)}
            className="px-2 py-1 border rounded text-sm"
            aria-label="규모"
          >
            <option value="micro">소상공인</option>
            <option value="small">소기업</option>
            <option value="medium">중기업</option>
            <option value="large">중견/대기업</option>
          </select>
        </div>

        <InterviewStepper
          steps={STEPS.map((s) => ({
            id: s.id,
            name: s.name,
            shortName: s.shortName,
          }))}
          currentStep={currentStep}
          onStepClick={(idx) => setCurrentStep(idx)}
          completedSteps={[]}
        />

        <div className="min-h-[400px]">{renderStep()}</div>

        <StickyFormNav
          onPrev={!isFirstStep ? () => setCurrentStep((s) => s - 1) : undefined}
          onNext={!isLastStep ? () => setCurrentStep((s) => s + 1) : undefined}
          // 테스트 모드 — 저장 없음. 버튼은 노출되나 NOOP.
          onSave={() => undefined}
          isFirstStep={isFirstStep}
          isLastStep={isLastStep}
          submit={
            isLastStep
              ? {
                  label: isGenerating ? '생성 중…' : '로드맵 생성',
                  onSubmit: handleSubmit,
                  disabled: isGenerating,
                }
              : undefined
          }
        />
      </PageContainer>

      {isGenerating && (
        <RoadmapLoadingOverlay
          isTestMode={true}
          profileHref="/consultant/profile"
          onCancel={handleCancelGeneration}
          isCompleted={isComplete}
        />
      )}
    </>
  );
}
