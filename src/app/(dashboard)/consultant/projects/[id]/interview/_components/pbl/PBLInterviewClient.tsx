'use client';

import { useCallback, useEffect, useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';

import { PageContainer } from '@/components/layout/PageContainer';
import { PageHeader } from '@/components/ui/page-header';
import { StickyFormNav } from '@/components/forms/StickyFormNav';
import { showErrorToast, showSuccessToast } from '@/lib/utils';
import { handleSimpleActionResult } from '@/lib/utils/action-result-toast';

import {
  savePBLInterviewV2,
  submitPBLInterviewV2,
} from '../../actions';
import {
  PBLInterviewStrictSchema,
  type PBLInterviewStrict,
  type PBLOverview,
  type PBLOrganization,
  type PBLActivityItem,
  type PBLProblemItem,
  type PBLPriority,
  type PBLTarget,
  type PBLAiLevelAssessment,
} from '@/lib/schemas/interview-pbl';

import InterviewStepper from '../InterviewStepper';
import { StepOverview } from './StepOverview';
import { StepCompanyIssues } from './StepCompanyIssues';
import { StepCourseNecessity } from './StepCourseNecessity';
import { StepOrganization } from './StepOrganization';
import { StepTrainingEnv } from './StepTrainingEnv';
import { StepHrdReportPdf } from './StepHrdReportPdf';
import { StepActivities } from './StepActivities';
import { StepProblems, type StepProblemsValue } from './StepProblems';
import {
  StepTargetAndLevel,
  type StepTargetAndLevelValue,
} from './StepTargetAndLevel';

// ============================================================================
// 9 스텝 정의 (PR #2 Task 2.4 — 양식 2:1 정합)
// ----------------------------------------------------------------------------
// id 는 양식 섹션 의미를 그대로 노출 (camelCase 단일 단어). UI 텍스트는 shortName
// / name. required 는 strict 제출 시 빈 값 금지 여부.
// ============================================================================

export type PBLStepId =
  | 'overview'
  | 'companyIssues'
  | 'organization'
  | 'trainingEnv'
  | 'hrdReport'
  | 'courseNecessity'
  | 'activities'
  | 'problems'
  | 'targetAndLevel';

interface StepDef {
  id: number;
  stepId: PBLStepId;
  shortName: string;
  name: string;
  required: boolean;
}

export const PBL_STEPS: ReadonlyArray<StepDef> = [
  { id: 1, stepId: 'overview', shortName: 'Ⅰ', name: '훈련과정 개요', required: true },
  { id: 2, stepId: 'companyIssues', shortName: 'Ⅱ-1-가', name: '기업 경영 이슈', required: true },
  { id: 3, stepId: 'organization', shortName: 'Ⅱ-1-나', name: '조직 및 주요 업무', required: true },
  { id: 4, stepId: 'trainingEnv', shortName: 'Ⅱ-2', name: '훈련환경 분석', required: true },
  { id: 5, stepId: 'hrdReport', shortName: 'Ⅱ-3-가', name: 'HRD이음 PDF', required: false },
  { id: 6, stepId: 'courseNecessity', shortName: 'Ⅱ-3-나', name: 'AI훈련과정 개발 필요성', required: true },
  { id: 7, stepId: 'activities', shortName: 'Ⅲ-1', name: '수행활동', required: true },
  { id: 8, stepId: 'problems', shortName: 'Ⅲ-2', name: '문제 도출·우선순위', required: true },
  { id: 9, stepId: 'targetAndLevel', shortName: 'Ⅲ-3·4', name: '훈련대상·AI수준', required: true },
];

// ============================================================================
// 빈 슬라이스 헬퍼 — Step 진입 시 undefined 슬라이스를 합리적 기본값으로 채운다.
// ============================================================================

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
  return {
    orgTree: [],
    mainWork: [],
  };
}

// ============================================================================
// Props
// ============================================================================

export interface PBLInterviewClientProps {
  projectId: string;
  initial: Partial<PBLInterviewStrict>;
}

// ============================================================================
// 본 컴포넌트
// ============================================================================

export function PBLInterviewClient({
  projectId,
  initial,
}: PBLInterviewClientProps) {
  const router = useRouter();
  const [data, setData] = useState<Partial<PBLInterviewStrict>>(initial);
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [isPending, startTransition] = useTransition();
  const [saveState, setSaveState] = useState<
    'idle' | 'saving' | 'saved' | 'error'
  >('idle');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const currentStepDef = PBL_STEPS[currentStep - 1];
  const currentStepId = currentStepDef.stepId;
  const isFirstStep = currentStep === 1;
  const isLastStep = currentStep === PBL_STEPS.length;

  // ---- 슬라이스 업데이트 헬퍼 ---------------------------------------------
  // V2 스키마는 Ⅰ(overview 필드들) + Ⅱ(analysis 필드들) + Ⅲ(tasks 필드들) 이
  // 평탄화되어 PBLInterviewStrict 단일 객체에 합쳐져 있다. 각 Step 은 자신의
  // 영역(키 묶음)만 patch 로 갱신한다.

  const updateOverview = useCallback(
    (patch: Partial<PBLOverview>) => {
      setData((prev) => {
        const base: PBLOverview = {
          companyName: prev.companyName ?? '',
          courseName: prev.courseName ?? '',
          ncsCode: prev.ncsCode ?? '',
          trainingHours: prev.trainingHours ?? 0,
          trainingTarget: prev.trainingTarget ?? '',
          trainingForm: prev.trainingForm ?? '',
          trainingPeriod: prev.trainingPeriod ?? '',
          businessIssues: prev.businessIssues ?? '',
        };
        return { ...prev, ...base, ...patch };
      });
    },
    [],
  );

  const updateAnalysis = useCallback(
    (patch: {
      companyIssues?: string;
      organization?: PBLInterviewStrict['organization'];
      trainingEnv?: string;
      hrdReportPdf?: PBLInterviewStrict['hrdReportPdf'];
      courseNecessity?: string;
    }) => {
      setData((prev) => ({ ...prev, ...patch }));
    },
    [],
  );

  const updateTasks = useCallback(
    (patch: {
      activities?: PBLActivityItem[];
      problems?: PBLProblemItem[];
      priority?: PBLPriority;
      target?: PBLTarget;
      currentAiLevel?: PBLAiLevelAssessment;
      expectedAiLevel?: PBLAiLevelAssessment;
    }) => {
      setData((prev) => ({ ...prev, ...patch }));
    },
    [],
  );

  // ---- 저장 / 제출 --------------------------------------------------------

  const handleSave = useCallback(() => {
    setSaveState('saving');
    startTransition(async () => {
      const result = await savePBLInterviewV2(projectId, data, {
        autoSave: true,
      });
      // #011 fix — handleSimpleActionResult 가 result.error falsy 시 fallback 토스트 보장
      const ok = await handleSimpleActionResult(result, {
        successMessage: { title: '자동 저장되었습니다.' },
        errorTitle: '저장 실패',
        errorFallback: '저장 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.',
      });
      setSaveState(ok ? 'saved' : 'error');
    });
  }, [data, projectId]);

  // 디바운스 자동 저장 (500ms) — 로드맵 V2 와 동일 패턴
  const lastSerializedRef = useRef<string>(JSON.stringify(initial));
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fadeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const serialized = JSON.stringify(data);
    if (serialized === lastSerializedRef.current) return;
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      setSaveState('saving');
      void (async () => {
        try {
          const result = await savePBLInterviewV2(projectId, data, {
            autoSave: true,
          });
          // #011 fix — handleSimpleActionResult 가 result.error falsy 시
          // errorFallback 으로 토스트 보장. 자동저장 성공 토스트는 미표시.
          const ok = await handleSimpleActionResult(result, {
            errorTitle: '자동 저장 실패',
            errorFallback: '자동 저장 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.',
          });
          if (ok) {
            lastSerializedRef.current = serialized;
            setSaveState('saved');
            if (fadeTimerRef.current) clearTimeout(fadeTimerRef.current);
            fadeTimerRef.current = setTimeout(() => {
              setSaveState('idle');
            }, 3000);
          } else {
            setSaveState('error');
          }
        } catch (error) {
          console.error('[PBLInterviewClient] auto-save error:', error);
          setSaveState('error');
          showErrorToast(
            error instanceof Error
              ? error.message
              : '자동 저장 중 오류가 발생했습니다.',
          );
        }
      })();
    }, 500);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [data, projectId]);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      if (fadeTimerRef.current) clearTimeout(fadeTimerRef.current);
    };
  }, []);

  const handleSubmit = useCallback(() => {
    // Strict 검증 — hrdReportPdf=null 일 때 courseNecessity 비공백 조건 포함
    const parsed = PBLInterviewStrictSchema.safeParse(data);
    if (!parsed.success) {
      showErrorToast(
        parsed.error.errors[0]?.message ?? '제출 검증에 실패했습니다.',
      );
      return;
    }

    setIsSubmitting(true);
    startTransition(async () => {
      try {
        const result = await submitPBLInterviewV2(projectId, parsed.data);
        if (result.success) {
          showSuccessToast('인터뷰가 제출되었습니다.');
          router.push(`/consultant/projects/${projectId}/pbl`);
        } else {
          setIsSubmitting(false);
          showErrorToast(result.error);
        }
      } catch (error) {
        setIsSubmitting(false);
        console.error('[PBLInterviewClient] submit error:', error);
        showErrorToast(
          error instanceof Error
            ? error.message
            : '인터뷰 제출 중 오류가 발생했습니다.',
        );
      }
    });
  }, [data, projectId, router]);

  // ---- Step 본문 렌더 -----------------------------------------------------
  // Task 2.4-a: 3 간단 Step (overview / companyIssues / courseNecessity) 만
  // 실제 컴포넌트 연결. 나머지 6 Step 은 placeholder — Task 2.4-b/c 에서 대체.

  function renderStep() {
    switch (currentStepId) {
      case 'overview': {
        const overviewValue: PBLOverview = {
          companyName: data.companyName ?? '',
          courseName: data.courseName ?? '',
          ncsCode: data.ncsCode ?? '',
          trainingHours: data.trainingHours ?? 0,
          trainingTarget: data.trainingTarget ?? '',
          trainingForm: data.trainingForm ?? '',
          trainingPeriod: data.trainingPeriod ?? '',
          businessIssues: data.businessIssues ?? '',
        };
        return (
          <StepOverview
            value={overviewValue}
            onChange={(next) => updateOverview(next)}
          />
        );
      }
      case 'companyIssues':
        return (
          <StepCompanyIssues
            value={data.companyIssues ?? ''}
            onChange={(next) => updateAnalysis({ companyIssues: next })}
          />
        );
      case 'courseNecessity':
        return (
          <StepCourseNecessity
            value={data.courseNecessity ?? ''}
            onChange={(next) => updateAnalysis({ courseNecessity: next })}
          />
        );
      case 'organization':
        return (
          <StepOrganization
            value={data.organization ?? emptyOrganization()}
            onChange={(next) => updateAnalysis({ organization: next })}
          />
        );
      case 'trainingEnv':
        return (
          <StepTrainingEnv
            value={data.trainingEnv ?? ''}
            onChange={(next) => updateAnalysis({ trainingEnv: next })}
          />
        );
      case 'hrdReport':
        return (
          <StepHrdReportPdf
            projectId={projectId}
            value={data.hrdReportPdf ?? null}
            onChange={(next) => updateAnalysis({ hrdReportPdf: next })}
          />
        );
      case 'activities':
        return (
          <StepActivities
            value={data.activities ?? []}
            onChange={(next) => updateTasks({ activities: next })}
          />
        );
      case 'problems': {
        const problemsValue: StepProblemsValue = {
          problems: data.problems ?? [],
          priority: data.priority ?? { items: [], method: '' },
        };
        return (
          <StepProblems
            value={problemsValue}
            onChange={(next) =>
              updateTasks({
                problems: next.problems,
                priority: next.priority,
              })
            }
          />
        );
      }
      case 'targetAndLevel': {
        const targetValue: StepTargetAndLevelValue = {
          target: data.target ?? {
            name: '',
            code: '',
            scope: '',
            necessity: '',
            necessity_score: 3,
            details: [],
          },
          currentAiLevel: data.currentAiLevel ?? {
            level: 'BASIC',
            note: '',
          },
          expectedAiLevel: data.expectedAiLevel ?? {
            level: 'USER',
            note: '',
          },
        };
        return (
          <StepTargetAndLevel
            value={targetValue}
            onChange={(next) =>
              updateTasks({
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
    <PageContainer>
      <PageHeader
        title="AI PBL 인터뷰 (양식 2:1 정합)"
        description="산인공 양식 2 Ⅰ·Ⅱ·Ⅲ 장을 9개 스텝으로 입력합니다."
      />

      <InterviewStepper
        steps={PBL_STEPS.map((s) => ({
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
        onSave={handleSave}
        isFirstStep={isFirstStep}
        isLastStep={isLastStep}
        isSaving={isPending}
        saveIndicator={
          saveState === 'saving'
            ? '저장 중…'
            : saveState === 'saved'
              ? '자동 저장됨'
              : saveState === 'error'
                ? '저장 실패'
                : undefined
        }
        submit={
          isLastStep
            ? {
                label: '최종 제출',
                onSubmit: handleSubmit,
                disabled: isPending || isSubmitting,
              }
            : undefined
        }
      />
    </PageContainer>
  );
}

export const __testing = {
  emptyOverview,
  emptyOrganization,
};
