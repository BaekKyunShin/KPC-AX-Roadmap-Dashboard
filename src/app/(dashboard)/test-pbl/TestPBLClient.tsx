'use client';

/**
 * PBL 테스트 클라이언트 (Task 2.11-e V2 포팅).
 *
 * 산인공 양식 2번 V2 Step 컴포넌트를 그대로 재사용해 실제 인터뷰 화면(V2)과 **동일**하게
 * 구성한다. DB 저장 없음. 제출 시 `generateTestPBL` 액션이 LLM 결과(PBLContent)만
 * in-memory 로 반환하며, 결과 렌더에는 완성된 `PBLResultClient` (role="CONSULTANT") 를
 * 재사용한다 — 테스트 모드에서 onEdit/onGenerate 는 NOOP.
 */

import { useState } from 'react';
import { Info, FlaskConical, Wand2 } from 'lucide-react';

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { PageContainer } from '@/components/layout/PageContainer';
import { PageHeader } from '@/components/ui/page-header';
import { StickyFormNav } from '@/components/forms/StickyFormNav';
import PendingApprovalCard from '@/components/PendingApprovalCard';
import RoadmapLoadingOverlay, { COMPLETION_DELAY_MS } from '@/components/roadmap/RoadmapLoadingOverlay';
import { showErrorToast } from '@/lib/utils';

import InterviewStepper from '@/app/(dashboard)/consultant/projects/[id]/interview/_components/InterviewStepper';
import { StepOverview } from '@/app/(dashboard)/consultant/projects/[id]/interview/_components/pbl/StepOverview';
import { StepCompanyIssues } from '@/app/(dashboard)/consultant/projects/[id]/interview/_components/pbl/StepCompanyIssues';
import { StepOrganization } from '@/app/(dashboard)/consultant/projects/[id]/interview/_components/pbl/StepOrganization';
import { StepTrainingEnv } from '@/app/(dashboard)/consultant/projects/[id]/interview/_components/pbl/StepTrainingEnv';
import { StepCourseNecessity } from '@/app/(dashboard)/consultant/projects/[id]/interview/_components/pbl/StepCourseNecessity';
import { StepActivities } from '@/app/(dashboard)/consultant/projects/[id]/interview/_components/pbl/StepActivities';
import {
  StepProblems,
  type StepProblemsValue,
} from '@/app/(dashboard)/consultant/projects/[id]/interview/_components/pbl/StepProblems';
import {
  StepTargetAndLevel,
  type StepTargetAndLevelValue,
} from '@/app/(dashboard)/consultant/projects/[id]/interview/_components/pbl/StepTargetAndLevel';

import {
  PBLInterviewStrictSchema,
  type PBLInterviewStrict,
  type PBLOverview,
  type PBLOrganization,
} from '@/lib/schemas/interview-pbl';
import { PBLResultClient } from '@/app/(dashboard)/consultant/projects/[id]/pbl/_components/result-v2/PBLResultClient';
import type {
  PBLResultEditPayload,
  ResultPBLInterviewSnapshot,
} from '@/app/(dashboard)/consultant/projects/[id]/pbl/_components/result-v2/types';
import type { PBLReportRow } from '@/lib/services/pbl/pbl-crud';
import type { PBLContent } from '@/lib/services/pbl/pbl-types';
import { PBL_INTERVIEW_SAMPLE } from '@/lib/fixtures/pbl-interview-sample';

import { generateTestPBL, cancelTestPBLGeneration } from './actions';

// ─── 테스트 모드 스텝 정의 (HRD PDF 업로드는 테스트 불가 → 제외, 8 스텝) ──────

type StepId =
  | 'overview'
  | 'companyIssues'
  | 'organization'
  | 'trainingEnv'
  | 'courseNecessity'
  | 'activities'
  | 'problems'
  | 'targetAndLevel';

const STEPS: ReadonlyArray<{
  id: number;
  stepId: StepId;
  shortName: string;
  name: string;
}> = [
  { id: 1, stepId: 'overview', shortName: 'Ⅰ', name: '훈련과정 개요' },
  { id: 2, stepId: 'companyIssues', shortName: 'Ⅱ-1-가', name: '기업 경영 이슈' },
  { id: 3, stepId: 'organization', shortName: 'Ⅱ-1-나', name: '조직 및 주요 업무' },
  { id: 4, stepId: 'trainingEnv', shortName: 'Ⅱ-2', name: '훈련환경 분석' },
  { id: 5, stepId: 'courseNecessity', shortName: 'Ⅱ-3-나', name: 'AI훈련과정 개발 필요성' },
  { id: 6, stepId: 'activities', shortName: 'Ⅲ-1', name: '수행활동' },
  { id: 7, stepId: 'problems', shortName: 'Ⅲ-2', name: '문제 도출·우선순위' },
  { id: 8, stepId: 'targetAndLevel', shortName: 'Ⅲ-3·4', name: '훈련대상·AI수준' },
];

function emptyOverview(): PBLOverview {
  return {
    companyName: '',
    courseName: '',
    ncsCode: '',
    trainingHours: 0,
    trainingTarget: '',
    trainingForm: '',
    trainingPeriod: '',
    businessIssues: '',
  };
}

function emptyOrganization(): PBLOrganization {
  return { orgTree: [], mainWork: [] };
}

function emptyInitial(): Partial<PBLInterviewStrict> {
  return {
    ...emptyOverview(),
    companyIssues: '',
    organization: emptyOrganization(),
    trainingEnv: '',
    hrdReportPdf: null,
    courseNecessity: '',
    activities: [],
    problems: [],
    priority: { items: [], method: '' },
    target: { name: '', code: '', scope: '', necessity: '', necessity_score: 3, details: [] },
    currentAiLevel: { level: 'BASIC', note: '' },
    expectedAiLevel: { level: 'USER', note: '' },
  };
}

// ─── PBLContent → PBLReportRow 어댑터 (in-memory 렌더용) ─────────────────────

function toPBLReportRow(content: PBLContent): PBLReportRow {
  return {
    id: 'test-version',
    project_id: 'test-mode',
    version_number: 1,
    status: 'DRAFT',
    consultant_profile_snapshot: {},
    diagnosis_summary: '',
    pbl_content: content,
    free_tool_validated: true,
    time_limit_validated: true,
    revision_prompt: null,
    is_shared: false,
    like_count: 0,
    created_by: 'test-mode',
    finalized_by: null,
    finalized_at: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
}

function toInterviewSnapshot(
  interview: PBLInterviewStrict,
): ResultPBLInterviewSnapshot {
  return {
    overview: {
      companyName: interview.companyName,
      courseName: interview.courseName,
      ncsCode: interview.ncsCode ?? '',
      trainingHours: interview.trainingHours,
      trainingTarget: interview.trainingTarget,
      trainingForm: interview.trainingForm,
      trainingPeriod: interview.trainingPeriod,
      businessIssues: interview.businessIssues,
    },
    analysis: {
      companyIssues: interview.companyIssues,
      organization: interview.organization,
      trainingEnv: interview.trainingEnv,
      hrdReportPdf: interview.hrdReportPdf,
      courseNecessity: interview.courseNecessity,
    },
    activities: interview.activities,
    problems: interview.problems,
    priority: interview.priority,
    target: interview.target,
    currentAiLevel: interview.currentAiLevel,
    expectedAiLevel: interview.expectedAiLevel,
  };
}

// ─── Props ─────────────────────────────────────────────────────────────────

interface UserInfo {
  id: string;
  name: string;
  email: string;
  role: string;
  status: string;
}

interface TestPBLClientProps {
  user: UserInfo;
  canAccess: boolean;
}

interface TestResultState {
  content: PBLContent;
  interview: PBLInterviewStrict;
}

export default function TestPBLClient({ user, canAccess }: TestPBLClientProps) {
  const [data, setData] = useState<Partial<PBLInterviewStrict>>(() => emptyInitial());
  const [currentStep, setCurrentStep] = useState<number>(1);

  const [companyName, setCompanyName] = useState('테스트 기업');
  const [industry, setIndustry] = useState('제조/생산');
  const [companySize, setCompanySize] = useState('small');

  const [isGenerating, setIsGenerating] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [testResult, setTestResult] = useState<TestResultState | null>(null);
  const [error, setError] = useState<string | null>(null);

  const currentStepDef = STEPS[currentStep - 1];
  const isFirstStep = currentStep === 1;
  const isLastStep = currentStep === STEPS.length;

  const update = (patch: Partial<PBLInterviewStrict>) =>
    setData((prev) => ({ ...prev, ...patch }));

  const updateOverview = (patch: Partial<PBLOverview>) => update(patch);

  // ── 샘플 데이터 채우기 ───────────────────────────────────────────────────
  const fillSample = () => {
    const hasInput =
      (data.courseName ?? '').trim() !== '' ||
      (data.companyName ?? '').trim() !== '' ||
      (data.companyIssues ?? '').trim() !== '' ||
      (data.activities ?? []).length > 0 ||
      (data.problems ?? []).length > 0;
    if (
      hasInput &&
      typeof window !== 'undefined' &&
      !window.confirm('기존 입력값이 모두 덮어써집니다. 계속하시겠습니까?')
    ) {
      return;
    }
    const sample = JSON.parse(
      JSON.stringify(PBL_INTERVIEW_SAMPLE),
    ) as PBLInterviewStrict;
    setData(sample);
    setCurrentStep(1);
  };

  const handleSubmit = async () => {
    const parsed = PBLInterviewStrictSchema.safeParse(data);
    if (!parsed.success) {
      showErrorToast(parsed.error.errors[0]?.message ?? '제출 검증에 실패했습니다.');
      return;
    }

    setError(null);
    setIsGenerating(true);
    setIsComplete(false);
    try {
      const res = await generateTestPBL({
        interview: parsed.data,
        companyName,
        industry,
        companySize,
      });
      if (res.success) {
        setIsComplete(true);
        setTimeout(() => {
          setTestResult({
            content: res.data.content,
            interview: res.data.interview,
          });
          setIsGenerating(false);
          setIsComplete(false);
        }, COMPLETION_DELAY_MS);
      } else {
        setError(res.error);
        showErrorToast('PBL 생성 실패', res.error);
        setIsGenerating(false);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'PBL 생성 중 오류가 발생했습니다.';
      setError(message);
      showErrorToast('PBL 생성 실패', message);
      setIsGenerating(false);
    }
  };

  const handleCancelGeneration = async () => {
    setIsGenerating(false);
    setIsComplete(false);
    await cancelTestPBLGeneration();
  };

  const handleReset = () => {
    setTestResult(null);
    setError(null);
    setCurrentStep(1);
  };

  if (!canAccess) {
    const userRole = user.role === 'USER_PENDING' ? 'CONSULTANT' : 'OPS_ADMIN';
    return (
      <div className="max-w-2xl mx-auto py-8">
        <PendingApprovalCard
          userName={user.name}
          userEmail={user.email}
          userRole={userRole}
          hasProfile={true}
        />
      </div>
    );
  }

  // ── 결과 화면 (PBLResultClient 재사용) ───────────────────────────────────
  if (testResult) {
    const version = toPBLReportRow(testResult.content);
    const snapshot = toInterviewSnapshot(testResult.interview);

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
              페이지 이탈 시 결과는 휘발됩니다. 실제 프로젝트에서 PBL 보고서를 생성하려면
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

        <PBLResultClient
          role="CONSULTANT"
          projectId="test-mode"
          versions={[version]}
          selectedVersion={version}
          interview={snapshot}
          onSelectVersion={() => undefined}
          /* 테스트 모드 — 인라인 편집·재생성은 NOOP. */
          onEdit={async (_patch: PBLResultEditPayload) => undefined}
          onGenerate={async () => {
            showErrorToast('테스트 모드에서는 재생성이 비활성화되어 있습니다.');
          }}
          onDownload={async () => {
            showErrorToast('테스트 모드에서는 다운로드가 비활성화되어 있습니다.');
          }}
          companyName={companyName}
        />
      </div>
    );
  }

  // ── 인터뷰 폼 (V2 Step 컴포넌트 재사용) ─────────────────────────────────
  function renderStep() {
    switch (currentStepDef.stepId) {
      case 'overview': {
        const value: PBLOverview = {
          companyName: data.companyName ?? '',
          courseName: data.courseName ?? '',
          ncsCode: data.ncsCode ?? '',
          trainingHours: data.trainingHours ?? 0,
          trainingTarget: data.trainingTarget ?? '',
          trainingForm: data.trainingForm ?? '',
          trainingPeriod: data.trainingPeriod ?? '',
          businessIssues: data.businessIssues ?? '',
        };
        return <StepOverview value={value} onChange={(next) => updateOverview(next)} />;
      }
      case 'companyIssues':
        return (
          <StepCompanyIssues
            value={data.companyIssues ?? ''}
            onChange={(next) => update({ companyIssues: next })}
          />
        );
      case 'organization':
        return (
          <StepOrganization
            value={data.organization ?? emptyOrganization()}
            onChange={(next) => update({ organization: next })}
          />
        );
      case 'trainingEnv':
        return (
          <StepTrainingEnv
            value={data.trainingEnv ?? ''}
            onChange={(next) => update({ trainingEnv: next })}
          />
        );
      case 'courseNecessity':
        return (
          <StepCourseNecessity
            value={data.courseNecessity ?? ''}
            onChange={(next) => update({ courseNecessity: next })}
          />
        );
      case 'activities':
        return (
          <StepActivities
            value={data.activities ?? []}
            onChange={(next) => update({ activities: next })}
          />
        );
      case 'problems': {
        const value: StepProblemsValue = {
          problems: data.problems ?? [],
          priority: data.priority ?? { items: [], method: '' },
        };
        return (
          <StepProblems
            value={value}
            onChange={(next) =>
              update({ problems: next.problems, priority: next.priority })
            }
          />
        );
      }
      case 'targetAndLevel': {
        const value: StepTargetAndLevelValue = {
          target: data.target ?? {
            name: '',
            code: '',
            scope: '',
            necessity: '',
            necessity_score: 3,
            details: [],
          },
          currentAiLevel: data.currentAiLevel ?? { level: 'BASIC', note: '' },
          expectedAiLevel: data.expectedAiLevel ?? { level: 'USER', note: '' },
        };
        return (
          <StepTargetAndLevel
            value={value}
            onChange={(next) =>
              update({
                target: next.target,
                currentAiLevel: next.currentAiLevel,
                expectedAiLevel: next.expectedAiLevel,
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
          title="PBL 테스트"
          description="산인공 양식 2번 V2 기반 PBL 인터뷰 연습 — 입력 내용은 저장되지 않습니다."
          backLink={{
            href: '/consultant/projects',
            label: '담당 프로젝트로 돌아가기',
            useBack: true,
          }}
          actions={
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={fillSample}
              data-testid="test-pbl-fill-sample"
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
            이 화면의 UI/UX는 실제 현장 인터뷰(PBL)와 동일합니다. Ⅱ-3-가 HRD이음 PDF 첨부는
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
          onSave={() => undefined}
          isFirstStep={isFirstStep}
          isLastStep={isLastStep}
          submit={
            isLastStep
              ? {
                  label: isGenerating ? '생성 중…' : 'PBL 보고서 생성',
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
