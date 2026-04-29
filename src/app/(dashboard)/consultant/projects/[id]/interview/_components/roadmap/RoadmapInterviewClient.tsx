'use client';

import { useCallback, useEffect, useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';

import { PageContainer } from '@/components/layout/PageContainer';
import { PageHeader } from '@/components/ui/page-header';
import { StickyFormNav } from '@/components/forms/StickyFormNav';
import { showErrorToast, showSuccessToast } from '@/lib/utils';
import { handleSimpleActionResult } from '@/lib/utils/action-result-toast';

import {
  saveRoadmapInterviewV2,
  submitRoadmapInterviewV2,
} from '../../actions';
import {
  RoadmapInterviewStrictSchema,
  type RoadmapInterviewStrict,
  type RoadmapHrdReportPdf,
  type RoadmapPerformanceActivity,
  type RoadmapCompanyRequirements,
  type RoadmapTaskAnalysisItem,
  type RoadmapTaskAnalysisAttachment,
  type RoadmapTargetTask,
  type RoadmapCompetency,
} from '@/lib/schemas/interview-roadmap';

import InterviewStepper from '../InterviewStepper';
import { StepNecessity } from './StepNecessity';
import { StepMainResult, type StepMainResultValue } from './StepMainResult';
import { StepHrdReportPdf } from './StepHrdReportPdf';
import { StepCompanyRequirements } from './StepCompanyRequirements';
import {
  StepTaskAnalysis,
  type StepTaskAnalysisValue,
} from './StepTaskAnalysis';
import { StepTargetTask } from './StepTargetTask';
import { StepPerformanceActivities } from './StepPerformanceActivities';
import {
  StepCompetencyModeling,
  type StepCompetencyModelingValue,
} from './StepCompetencyModeling';

// ============================================================================
// 8 스텝 정의 (PR #2 Task 2.3 — 양식 1:1 정합)
// ----------------------------------------------------------------------------
// id 는 양식 섹션 의미를 그대로 노출 (snake_case 단일 단어). UI 상의 표시 텍스트는
// shortName / name 을 사용한다. shortName 은 양식 번호, name 은 절 제목.
// ============================================================================

export type RoadmapStepId =
  | 'necessity'
  | 'performance'
  | 'mainResult'
  | 'hrdReport'
  | 'companyReq'
  | 'taskAnalysis'
  | 'targetTask'
  | 'competencyModeling';

interface StepDef {
  /** 1-based 인덱스 (InterviewStepper 가 number 키를 요구한다) */
  id: number;
  stepId: RoadmapStepId;
  /** 양식 번호 (모바일 진행 바 title) */
  shortName: string;
  /** 절 제목 (데스크톱 텍스트, 모바일 현재 단계 표기) */
  name: string;
  /** Strict 검증에 필수인 스텝인지 (Task 2.3-d 의 검증 로직 참조용) */
  required: boolean;
}

export const ROADMAP_STEPS: ReadonlyArray<StepDef> = [
  { id: 1, stepId: 'necessity', shortName: 'Ⅰ-1', name: '수립 필요성', required: true },
  { id: 2, stepId: 'performance', shortName: 'Ⅰ-2', name: '주요 활동', required: true },
  { id: 3, stepId: 'mainResult', shortName: 'Ⅰ-3', name: '수립 주요 결과', required: true },
  { id: 4, stepId: 'hrdReport', shortName: 'Ⅱ-1', name: 'HRD이음 PDF', required: false },
  { id: 5, stepId: 'companyReq', shortName: 'Ⅱ-2', name: '기업 요구분석', required: true },
  { id: 6, stepId: 'taskAnalysis', shortName: 'Ⅱ-3', name: '과업·워크플로우 분석', required: true },
  { id: 7, stepId: 'targetTask', shortName: 'Ⅱ-4', name: '훈련대상 과업', required: true },
  { id: 8, stepId: 'competencyModeling', shortName: 'Ⅲ-1', name: '역량 모델링', required: true },
];

// ============================================================================
// 빈 슬라이스 헬퍼 — Step 진입 시 undefined 인 슬라이스를 합리적 기본값으로 채운다.
// ============================================================================

function emptyOverviewBase(): {
  performanceActivities: RoadmapPerformanceActivity[];
  aiLevel: RoadmapInterviewStrict['aiLevel'];
  selectedTask: string;
  establishmentNecessity: string;
} {
  return {
    establishmentNecessity: '',
    performanceActivities: [],
    aiLevel: 'BEGINNER',
    selectedTask: '',
  };
}

function emptyCompanyRequirements(): RoadmapCompanyRequirements {
  return { status: '', problem: '', will: '', outcomes: '' };
}

function emptyTargetTask(): RoadmapTargetTask {
  return { name: '', reason: '', expectedAsIs: '', expectedToBe: '' };
}

function emptyTraining(): {
  competencies: RoadmapCompetency[];
  ncsUsed: boolean;
} {
  return { competencies: [], ncsUsed: false };
}

// ============================================================================
// Props
// ============================================================================

export interface RoadmapInterviewClientProps {
  projectId: string;
  initial: Partial<RoadmapInterviewStrict>;
}

// ============================================================================
// 본 컴포넌트
// ============================================================================

export function RoadmapInterviewClient({
  projectId,
  initial,
}: RoadmapInterviewClientProps) {
  const router = useRouter();
  const [data, setData] = useState<Partial<RoadmapInterviewStrict>>(initial);
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [isPending, startTransition] = useTransition();
  const [saveState, setSaveState] = useState<
    'idle' | 'saving' | 'saved' | 'error'
  >('idle');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const currentStepDef = ROADMAP_STEPS[currentStep - 1];
  const currentStepId = currentStepDef.stepId;
  const isFirstStep = currentStep === 1;
  const isLastStep = currentStep === ROADMAP_STEPS.length;

  // ---- 슬라이스 업데이트 헬퍼 -------------------------------------------------
  // V2 스키마는 Ⅰ(overview) · Ⅱ(requirements) · Ⅲ-1(training) 3개 슬라이스가 평탄화되어
  // RoadmapInterviewStrict 단일 객체에 합쳐져 있다. 각 Step 은 자신의 영역만 갱신한다.

  const updateOverview = useCallback(
    (patch: Partial<{
      establishmentNecessity: string;
      performanceActivities: RoadmapPerformanceActivity[];
      aiLevel: RoadmapInterviewStrict['aiLevel'];
      selectedTask: string;
    }>) => {
      setData((prev) => {
        const base = {
          establishmentNecessity: prev.establishmentNecessity ?? '',
          performanceActivities: prev.performanceActivities ?? [],
          aiLevel: prev.aiLevel ?? 'BEGINNER',
          selectedTask: prev.selectedTask ?? '',
        };
        return { ...prev, ...base, ...patch };
      });
    },
    [],
  );

  const updateRequirements = useCallback(
    (patch: Partial<{
      hrdReportPdf: RoadmapHrdReportPdf | null;
      companyRequirements: RoadmapCompanyRequirements;
      taskAnalysis: RoadmapTaskAnalysisItem[];
      taskAnalysisNote: string;
      taskAnalysisAttachment: RoadmapTaskAnalysisAttachment | null | undefined;
      targetTask: RoadmapTargetTask;
    }>) => {
      setData((prev) => ({ ...prev, ...patch }));
    },
    [],
  );

  const updateTraining = useCallback(
    (patch: Partial<{
      competencies: RoadmapCompetency[];
      ncsUsed: boolean;
      ncsMethodology: string | undefined;
      ncsDerivationMethod: string | undefined;
    }>) => {
      setData((prev) => ({ ...prev, ...patch }));
    },
    [],
  );

  // ---- 저장 / 제출 ----------------------------------------------------------

  // 수동 저장: StickyFormNav 의 "수동 저장" 버튼에 바인딩. handleSimpleActionResult
  // 로 result.error 가 falsy 해도 fallback 토스트 보장 (#011 fix — silent fail 차단).
  const handleSave = useCallback(() => {
    setSaveState('saving');
    startTransition(async () => {
      const result = await saveRoadmapInterviewV2(projectId, data, {
        autoSave: true,
      });
      const ok = await handleSimpleActionResult(result, {
        successMessage: { title: '자동 저장되었습니다.' },
        errorTitle: '저장 실패',
        errorFallback: '저장 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.',
      });
      setSaveState(ok ? 'saved' : 'error');
    });
  }, [data, projectId]);

  // 디바운스 자동 저장 (500ms)
  //   - `data` 직렬화 기준 변경 감지 → 500ms 대기 → saveRoadmapInterviewV2 호출
  //   - initial 렌더 시에는 발화하지 않도록 initial 직렬화를 기준 값으로 세팅
  //   - 직전 타이머는 재요청 시 자동 클리어
  //   - 성공 시 saveState='saved' → 3초 후 'idle' fade
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
          const result = await saveRoadmapInterviewV2(projectId, data, {
            autoSave: true,
          });
          // #011 fix — handleSimpleActionResult 가 result.error falsy 시
          // errorFallback 으로 토스트 보장 (silent fail 구조적 차단).
          // 자동저장이라 성공 토스트는 미표시 (기존 UX 유지).
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
          console.error('[RoadmapInterviewClient] auto-save error:', error);
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
    // 제출 직전 cleanup — 편집 중 빈 행/슬롯을 strict 검증에 영향 없도록 정리한다.
    //   ① competencies: 기본 4행 프리필되므로 비어 있는 행 제거 (name.min(1) 실패 방지)
    //   ② performanceActivities: 차수별 기본 3행 프리필 — 1·2·3 차 모두 빈 string 으로
    //      들어가도 round.min(1) 외 string 필드들은 통과(스키마가 min(1) 강제하지 않음).
    //      그래도 의미 없는 행을 DB 로 보내는 건 부적절하므로 모든 텍스트 필드가 비어
    //      있는 행은 drop 한다.
    //   ③ taskAnalysis: 사용자가 빈 행을 남겨두면 row-level 필드가 empty 로 fail 한다.
    //      모든 텍스트 필드가 비어 있는 행은 drop 한다 (aiScore 기본값 3 만 남는 경우).
    //   ④ hrdReportPdf: optional Step 이라 미입력 시 키 자체가 객체에 없을 수 있다.
    //      스키마는 `.nullable()` 만 허용 → undefined 면 "Required" 토스트 발생.
    //      초기에 키가 없으면 null 로 명시 주입해 검증을 통과시킨다.
    const cleanedData: Partial<RoadmapInterviewStrict> = {
      ...data,
      hrdReportPdf: data.hrdReportPdf ?? null,
      ...(data.performanceActivities
        ? {
            performanceActivities: data.performanceActivities.filter(
              (a) =>
                (a.date?.trim() ?? '') !== '' ||
                (a.timeRange?.trim() ?? '') !== '' ||
                (a.content?.trim() ?? '') !== '' ||
                (a.pmName?.trim() ?? '') !== '' ||
                (a.expertName?.trim() ?? '') !== '',
            ),
          }
        : {}),
      ...(data.taskAnalysis
        ? {
            taskAnalysis: data.taskAnalysis.filter(
              (t) =>
                (t.domain?.trim() ?? '') !== '' ||
                (t.task?.trim() ?? '') !== '' ||
                (t.asIs?.trim() ?? '') !== '' ||
                (t.problem?.trim() ?? '') !== '' ||
                (t.dataTiming?.trim() ?? '') !== '',
            ),
          }
        : {}),
      ...(data.competencies
        ? {
            competencies: data.competencies.filter(
              (c) => c.name.trim() !== '',
            ),
          }
        : {}),
    };

    // 2) Strict 검증 (safeParse) — NCS XOR + 필수 필드 검증
    const parsed = RoadmapInterviewStrictSchema.safeParse(cleanedData);
    if (!parsed.success) {
      // #012 fix — 모든 zod 에러 메시지를 join 해 사용자가 비어있는 필드를 한 번에
      // 파악할 수 있게 한다 (기존: errors[0] 하나만 표시 → 사용자가 어디 부족한지 모름).
      const messages = parsed.error.errors
        .map((e) => e.message)
        .filter((m) => Boolean(m?.trim()))
        .slice(0, 5);
      showErrorToast(
        '제출 검증 실패',
        messages.length > 0
          ? messages.join('\n')
          : '필수 입력 항목을 확인해주세요.',
      );
      return;
    }

    setIsSubmitting(true);
    startTransition(async () => {
      try {
        const result = await submitRoadmapInterviewV2(projectId, parsed.data);
        // #012 fix — handleSimpleActionResult 가 result.error falsy 시 fallback 토스트 보장
        const ok = await handleSimpleActionResult(result, {
          successMessage: { title: '인터뷰가 제출되었습니다.' },
          errorTitle: '인터뷰 제출 실패',
          errorFallback:
            '인터뷰 제출 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.',
        });
        if (ok) {
          router.push(`/consultant/projects/${projectId}/roadmap`);
        } else {
          setIsSubmitting(false);
        }
      } catch (error) {
        setIsSubmitting(false);
        console.error('[RoadmapInterviewClient] submit error:', error);
        showErrorToast(
          '인터뷰 제출 실패',
          error instanceof Error
            ? error.message
            : '인터뷰 제출 중 오류가 발생했습니다.',
        );
      }
    });
  }, [data, projectId, router]);

  // ---- Step 본문 렌더 -------------------------------------------------------

  function renderStep() {
    switch (currentStepId) {
      case 'necessity':
        return (
          <StepNecessity
            value={data.establishmentNecessity ?? ''}
            onChange={(next) => updateOverview({ establishmentNecessity: next })}
          />
        );
      case 'mainResult': {
        const mainResultValue: StepMainResultValue = {
          aiLevel: data.aiLevel ?? 'BEGINNER',
          selectedTask: data.selectedTask ?? '',
        };
        return (
          <StepMainResult
            value={mainResultValue}
            onChange={(next) =>
              updateOverview({
                aiLevel: next.aiLevel,
                selectedTask: next.selectedTask,
              })
            }
          />
        );
      }
      case 'hrdReport':
        return (
          <StepHrdReportPdf
            projectId={projectId}
            value={data.hrdReportPdf ?? null}
            onChange={(next) => updateRequirements({ hrdReportPdf: next })}
          />
        );
      case 'companyReq':
        return (
          <StepCompanyRequirements
            value={data.companyRequirements ?? emptyCompanyRequirements()}
            onChange={(next) =>
              updateRequirements({ companyRequirements: next })
            }
          />
        );
      case 'taskAnalysis': {
        const taskAnalysisValue: StepTaskAnalysisValue = {
          taskAnalysis: data.taskAnalysis ?? [],
          taskAnalysisNote: data.taskAnalysisNote ?? '',
          taskAnalysisAttachment: data.taskAnalysisAttachment ?? null,
        };
        return (
          <StepTaskAnalysis
            projectId={projectId}
            value={taskAnalysisValue}
            onChange={(next) =>
              updateRequirements({
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
            onChange={(next) => updateRequirements({ targetTask: next })}
          />
        );
      case 'performance':
        return (
          <StepPerformanceActivities
            value={data.performanceActivities ?? []}
            onChange={(next) =>
              updateOverview({ performanceActivities: next })
            }
          />
        );
      case 'competencyModeling': {
        const trainingValue: StepCompetencyModelingValue = {
          competencies: data.competencies ?? [],
          ncsUsed: data.ncsUsed ?? false,
          ncsMethodology: data.ncsMethodology,
          ncsDerivationMethod: data.ncsDerivationMethod,
        };
        return (
          <StepCompetencyModeling
            value={trainingValue}
            onChange={(next) =>
              updateTraining({
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
    <PageContainer>
      <PageHeader
        title="AI훈련로드맵 인터뷰 (양식 1:1 정합)"
        description="산인공 양식 Ⅰ·Ⅱ·Ⅲ-1 절을 8개 스텝으로 입력합니다."
      />

      <InterviewStepper
        steps={ROADMAP_STEPS.map((s) => ({
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

// 빈 슬라이스 헬퍼는 Task 2.3-b/c 에서 재사용한다 (외부 노출).
export const __testing = {
  emptyOverviewBase,
  emptyCompanyRequirements,
  emptyTargetTask,
  emptyTraining,
};
