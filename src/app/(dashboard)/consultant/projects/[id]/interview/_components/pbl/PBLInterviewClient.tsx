'use client';

import { useCallback, useEffect, useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';

import { PageContainer } from '@/components/layout/PageContainer';
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { StickyFormNav } from '@/components/forms/StickyFormNav';
import { showErrorToast } from '@/lib/utils';
import { handleSimpleActionResult } from '@/lib/utils/action-result-toast';
import { formatZodIssuesForToast } from '@/lib/utils/zod-error-format';
import { PBL_FIELD_LABELS } from '@/lib/schemas/interview-pbl-labels';

import {
  savePBLInterviewV2,
  submitPBLInterviewV2,
  extractSttInsights,
} from '../../actions';
import {
  PBLInterviewStrictSchema,
  type PBLInterviewStrict,
  type PBLOverview,
  type PBLActivityRow,
  type PBLProblemDefinitionSheet,
  type PBLPriority,
  type PBLTarget,
  type PBLAiLevelAssessment,
} from '@/lib/schemas/interview-pbl';
import type { SttInsights } from '@/lib/schemas/interview-roadmap';

import { useBeforeUnloadGuard } from '@/hooks/useBeforeUnloadGuard';
import InterviewStepper from '../InterviewStepper';
import { StepOverview } from './StepOverview';
import { StepCompanyIssues } from './StepCompanyIssues';
import { StepCourseNecessity } from './StepCourseNecessity';
import { StepTrainingEnv } from './StepTrainingEnv';
import { StepExpectations } from './StepExpectations';
import { StepHrdReportPdf } from './StepHrdReportPdf';
import { StepActivities } from './StepActivities';
import { StepProblems, type StepProblemsValue } from './StepProblems';
import {
  StepTargetAndLevel,
  type StepTargetAndLevelValue,
} from './StepTargetAndLevel';
import { StepSttAttach } from '@/components/interview/StepSttAttach';

// ============================================================================
// 10 스텝 정의 — 양식 2:1 정합 9개 + STT 첨부 1개 (선택)
// ----------------------------------------------------------------------------
// id 는 양식 섹션 의미를 그대로 노출 (camelCase 단일 단어). UI 텍스트는 shortName
// / name. required 는 strict 제출 시 빈 값 금지 여부.
// ============================================================================

export type PBLStepId =
  | 'overview'
  | 'companyIssues'
  | 'trainingEnv'
  | 'expectations'
  | 'hrdReport'
  | 'courseNecessity'
  | 'activities'
  | 'problems'
  | 'targetAndLevel'
  | 'sttAttach';

interface StepDef {
  id: number;
  stepId: PBLStepId;
  shortName: string;
  /** 절 제목 — FormSection h2·페이지 헤더용 풀텍스트 */
  name: string;
  /** 데스크톱 Stepper 라벨 단축 텍스트(선택). 미지정 시 name 사용 */
  stepperLabel?: string;
  required: boolean;
}

export const PBL_STEPS: ReadonlyArray<StepDef> = [
  { id: 1, stepId: 'overview', shortName: 'Ⅰ', name: '훈련과정 개요', required: true },
  { id: 2, stepId: 'companyIssues', shortName: 'Ⅱ-1-가', name: '기업 경영 이슈', required: true },
  // Phase E: Step 3a 훈련환경 (기본 6 영역) — stepperLabel 5자 단축
  { id: 3, stepId: 'trainingEnv', shortName: 'Ⅱ-2-a', name: '훈련환경 분석', stepperLabel: '훈련환경', required: true },
  // Phase E: Step 3b 기대효과·요구분석 (5 신규 영역, 양식 P-05 row 6~11 정합)
  { id: 4, stepId: 'expectations', shortName: 'Ⅱ-2-b', name: '기대효과·요구분석', required: true },
  // Stepper 라벨 22자 → 8자 단축 (페이지 헤더는 풀텍스트 유지)
  { id: 5, stepId: 'hrdReport', shortName: 'Ⅱ-3-가', name: '기업HRD이음컨설팅 결과 (PDF 첨부)', stepperLabel: 'HRD이음 결과', required: false },
  // Stepper 라벨 13자 → 8자 단축 (사용자 보고 — '과정 개발 필요성', 말줄임 사라지도록)
  { id: 6, stepId: 'courseNecessity', shortName: 'Ⅱ-3-나', name: 'AI훈련과정 개발 필요성', stepperLabel: '과정 개발 필요성', required: true },
  { id: 7, stepId: 'activities', shortName: 'Ⅲ-1', name: '수행활동', required: true },
  // Stepper 라벨 10자 → 7자 단축
  { id: 8, stepId: 'problems', shortName: 'Ⅲ-2', name: '문제 도출·우선순위', stepperLabel: '문제·우선순위', required: true },
  { id: 9, stepId: 'targetAndLevel', shortName: 'Ⅲ-3·Ⅲ-4', name: '훈련대상·AI수준', required: true },
  // Stepper 라벨 10자 → 6자 단축
  { id: 10, stepId: 'sttAttach', shortName: '선택', name: '인터뷰 녹취 STT 첨부', stepperLabel: '인터뷰 STT', required: false },
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
      // R8 PBL-자체-02 — string → 정형 객체
      trainingEnv?: PBLInterviewStrict['trainingEnv'];
      hrdReportPdf?: PBLInterviewStrict['hrdReportPdf'];
      courseNecessity?: string;
    }) => {
      setData((prev) => ({ ...prev, ...patch }));
    },
    [],
  );

  const updateTasks = useCallback(
    (patch: {
      activities?: PBLActivityRow[];
      problemDefinitionSheet?: PBLProblemDefinitionSheet;
      priority?: PBLPriority;
      target?: PBLTarget;
      currentAiLevel?: PBLAiLevelAssessment;
      expectedAiLevel?: PBLAiLevelAssessment;
    }) => {
      setData((prev) => ({ ...prev, ...patch }));
    },
    [],
  );

  // STT 인사이트(선택) — 10번째 Step. PBL 스키마는 camelCase 그대로 pbl_data JSONB
  // 에 저장되므로 별도 converter 매핑 불필요. mapPBLInterviewToDb 가 통째 보존.
  const updateSttInsights = useCallback(
    (next: SttInsights | undefined) => {
      setData((prev) => ({ ...prev, sttInsights: next }));
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

  // #003 (Nielsen H3) — 자동저장 디바운스 중 탭 닫기 시 변경분 손실 방지.
  // dirty 일 때만 브라우저 기본 경고를 띄운다. 디바운스 윈도우(500ms) 내 변경분도
  // 보호하기 위해 lastSerializedRef 비교까지 포함. ref 는 렌더 중 직접 읽지 않고
  // useEffect 로 state 와 동기화한다 (react-hooks/refs 정책 준수).
  // 자동저장 effect 와는 별개의 동기화 effect 로 분리해 dirty 추적 책임을 격리.
  const [isDirty, setIsDirty] = useState<boolean>(false);
  useEffect(() => {
    const dirty =
      saveState === 'saving' ||
      saveState === 'error' ||
      JSON.stringify(data) !== lastSerializedRef.current;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- 자동저장 패턴: data/saveState/ref 변경에 응답해 dirty 추적
    setIsDirty(dirty);
  }, [data, saveState]);
  useBeforeUnloadGuard(isDirty);

  const handleSubmit = useCallback(() => {
    // Strict 검증 — hrdReportPdf=null 일 때 courseNecessity 비공백 조건 포함
    const parsed = PBLInterviewStrictSchema.safeParse(data);
    if (!parsed.success) {
      // 누락된 필드 모두 노출 + path → 사용자 라벨 매핑으로 Step·항목 명시
      const message = formatZodIssuesForToast(parsed.error, PBL_FIELD_LABELS);
      showErrorToast(
        '제출 검증 실패',
        message || '필수 입력 항목을 확인해주세요.',
      );
      return;
    }

    setIsSubmitting(true);
    startTransition(async () => {
      try {
        const result = await submitPBLInterviewV2(projectId, parsed.data);
        // #012 fix — handleSimpleActionResult 가 result.error falsy 시 fallback 토스트 보장
        const ok = await handleSimpleActionResult(result, {
          successMessage: { title: '인터뷰가 제출되었습니다.' },
          errorTitle: '인터뷰 제출 실패',
          errorFallback:
            '인터뷰 제출 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.',
        });
        if (ok) {
          // PR5 (R6 spec) — 제출 직후 검토 페이지로 redirect.
          router.push(`/consultant/projects/${projectId}/interview/review`);
        } else {
          setIsSubmitting(false);
        }
      } catch (error) {
        setIsSubmitting(false);
        console.error('[PBLInterviewClient] submit error:', error);
        showErrorToast(
          '인터뷰 제출 실패',
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
      case 'trainingEnv':
        return (
          <StepTrainingEnv
            value={
              data.trainingEnv ?? {
                properTrainingHours: '',
                internalPlace: '',
                externalPlace: '',
                internalInstructors: [],
                externalInstructors: [],
                aiInfrastructure: '',
                targetCharacteristics: { career: '', level: '' },
                aiInfraDetail: { toolCapacity: 'AVAILABLE', networkStatus: 'GOOD', pcCount: 0 },
                trainingNeedsAnalysis: '',
                expectationAsIs: '',
                expectationToBe: '',
                targetTraineeCount: 0,
                internalInstructorUsage: 'NO',
                internalInstructorPrimary: { name: '', position: '' },
                otherEquipment: '',
              }
            }
            onChange={(next) => updateAnalysis({ trainingEnv: next })}
          />
        );
      case 'expectations':
        return (
          <StepExpectations
            value={
              data.trainingEnv ?? {
                properTrainingHours: '',
                internalPlace: '',
                externalPlace: '',
                internalInstructors: [],
                externalInstructors: [],
                aiInfrastructure: '',
                targetCharacteristics: { career: '', level: '' },
                aiInfraDetail: { toolCapacity: 'AVAILABLE', networkStatus: 'GOOD', pcCount: 0 },
                trainingNeedsAnalysis: '',
                expectationAsIs: '',
                expectationToBe: '',
                targetTraineeCount: 0,
                internalInstructorUsage: 'NO',
                internalInstructorPrimary: { name: '', position: '' },
                otherEquipment: '',
              }
            }
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
          problemDefinitionSheet:
            data.problemDefinitionSheet ?? {
              background: '',
              core: '',
              scope: '',
              constraints: '',
            },
          priority: data.priority ?? { items: [], method: '' },
        };
        return (
          <StepProblems
            value={problemsValue}
            onChange={(next) =>
              updateTasks({
                problemDefinitionSheet: next.problemDefinitionSheet,
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
      case 'sttAttach':
        return (
          <StepSttAttach
            value={data.sttInsights}
            onChange={updateSttInsights}
            onExtract={(text) => extractSttInsights(projectId, text)}
          />
        );
      default:
        return null;
    }
  }

  return (
    <PageContainer>
      <PageHeader
        title="AI PBL 인터뷰"
        description="산인공 양식 2 9개 장과 선택 항목인 STT 첨부를 포함해 총 10개 스텝으로 진행합니다."
      />

      <InterviewStepper
        steps={PBL_STEPS.map((s) => ({
          id: s.id,
          name: s.name,
          shortName: s.shortName,
          stepperLabel: s.stepperLabel,
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
          saveState === 'saving' ? (
            '저장 중…'
          ) : saveState === 'saved' ? (
            '자동 저장됨'
          ) : saveState === 'error' ? (
            <span className="inline-flex items-center gap-2">
              <span className="text-destructive">저장 실패</span>
              <Button
                type="button"
                variant="link"
                size="sm"
                onClick={handleSave}
                disabled={isPending}
                className="h-auto p-0 text-xs"
              >
                다시 저장
              </Button>
            </span>
          ) : undefined
        }
        submit={
          isLastStep
            ? {
                label: '최종 제출',
                onSubmit: handleSubmit,
                disabled: isPending || isSubmitting || saveState === 'error',
                disabledReason:
                  saveState === 'error'
                    ? "자동 저장이 실패했습니다. 화면 하단의 '저장' 버튼을 눌러 직접 저장한 뒤 다시 시도해주세요."
                    : undefined,
              }
            : undefined
        }
      />
    </PageContainer>
  );
}

export const __testing = {
  emptyOverview,
};
