'use client';

import { Sparkles } from 'lucide-react';

import { SectionCard } from '@/components/result/SectionCard';

import type { TabPBLCommonProps } from './types';

/**
 * Ⅳ. AI 기반 운영계획 탭 — PBL 결과 V2.
 *
 * 섹션:
 *  - P-16 Ⅳ-1 훈련 목표                — LLM placeholder (Task 2.10)
 *  - P-17 Ⅳ-2 AI 도구 활용 계획        — LLM placeholder
 *  - P-18 Ⅳ-3-가 훈련과정 개요          — LLM placeholder
 *  - P-19 Ⅳ-3-나 학습그룹 구성          — LLM placeholder
 *  - P-20 Ⅳ-3-다 훈련 교과목 프로파일   — LLM placeholder
 *  - P-21 Ⅳ-3-라 시설·장비              — LLM placeholder
 *  - P-22 Ⅳ-3-마 훈련강사               — LLM placeholder
 *  - P-23 Ⅳ-4-가 과정평가 계획          — LLM placeholder
 *
 * 제외 (양식·결과 화면 제외 항목):
 *  - **Ⅳ-4-나 결과평가 계획** [고정 양식·결과 화면 제외] — 렌더 금지.
 *    양식에 고정 설문(만족도 · 성취도 · 외부전문가 · 현업적용도) 이 포함되어 있지만
 *    계획서 §1.2 기준 결과 화면에서는 노출하지 않는다.
 */
export function TabPBLOps({ version }: TabPBLCommonProps) {
  const ops = version?.pbl_content?.operation_plan;

  // 각 하위 섹션별로 LLM 결과 존재 여부를 판정. Task 2.10 이후 실제 렌더 확장.
  const hasTrainingGoal = Boolean(ops?.training_goal && ops.training_goal.trim().length > 0);
  const hasAIToolUsage = (ops?.ai_tool_usage_plan?.length ?? 0) > 0;
  const hasCourseOverview = Boolean(ops?.training_plan?.overview?.course_name);
  const hasLearningGroup =
    (ops?.training_plan?.learning_group?.instructors?.length ?? 0) > 0 ||
    (ops?.training_plan?.learning_group?.trainees?.length ?? 0) > 0;
  const hasSubjectProfile = Boolean(ops?.training_plan?.subject_profile?.course_name);
  const hasFacilities = (ops?.training_plan?.facilities?.length ?? 0) > 0;
  const hasTrainingInstructors =
    (ops?.training_plan?.training_instructors?.length ?? 0) > 0;
  const hasCourseEvaluation = Boolean(
    ops?.evaluation_plan?.course_evaluation?.course_name,
  );

  return (
    <div className="space-y-6">
      {/* Ⅳ-1 훈련 목표 */}
      <SectionCard
        title="Ⅳ-1. 훈련 목표"
        description="LLM 생성 (Task 2.10)"
      >
        {hasTrainingGoal ? (
          <p className="whitespace-pre-wrap text-sm">{ops?.training_goal}</p>
        ) : (
          <RegeneratePlaceholder section="Ⅳ-1 훈련 목표" />
        )}
      </SectionCard>

      {/* Ⅳ-2 AI 도구 활용 계획 */}
      <SectionCard
        title="Ⅳ-2. AI 도구 활용 계획"
        description="단계별 주요활동 · AI 도구 · 데이터 · 목적 · 방법 (LLM 생성)"
      >
        {hasAIToolUsage ? (
          <ul className="list-disc space-y-2 pl-5 text-sm">
            {ops?.ai_tool_usage_plan.map((item, idx) => (
              <li key={idx}>
                <span className="font-medium">
                  {item.stage} — {item.main_activity}
                </span>
                <div className="text-xs text-muted-foreground">
                  AI 도구: {item.ai_tools.join(', ') || '-'}
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <RegeneratePlaceholder section="Ⅳ-2 AI 도구 활용 계획" />
        )}
      </SectionCard>

      {/* Ⅳ-3-가 훈련과정 개요 */}
      <SectionCard
        title="Ⅳ-3-가. 훈련과정 개요"
        description="과정명 · 훈련기간 (LLM 생성)"
      >
        {hasCourseOverview ? (
          <p className="text-sm">
            {ops?.training_plan.overview.course_name}{' '}
            <span className="text-xs text-muted-foreground">
              ({ops?.training_plan.overview.training_period?.start} ~{' '}
              {ops?.training_plan.overview.training_period?.end})
            </span>
          </p>
        ) : (
          <RegeneratePlaceholder section="Ⅳ-3-가 훈련과정 개요" />
        )}
      </SectionCard>

      {/* Ⅳ-3-나 학습그룹 구성 */}
      <SectionCard
        title="Ⅳ-3-나. 학습그룹 구성"
        description="강사(외부/내부) + 훈련생 명단 (LLM 생성)"
      >
        {hasLearningGroup ? (
          <div className="space-y-2 text-sm">
            <p className="text-xs text-muted-foreground">
              강사 {ops?.training_plan.learning_group.instructors.length ?? 0} 명 ·
              훈련생 {ops?.training_plan.learning_group.trainees.length ?? 0} 명
            </p>
          </div>
        ) : (
          <RegeneratePlaceholder section="Ⅳ-3-나 학습그룹 구성" />
        )}
      </SectionCard>

      {/* Ⅳ-3-다 훈련 교과목 프로파일 */}
      <SectionCard
        title="Ⅳ-3-다. 훈련 교과목 프로파일"
        description="과정명 · 전체 훈련시간 · 훈련목표 · AI 도구 · 교과목 (LLM 생성)"
      >
        {hasSubjectProfile ? (
          <p className="text-sm">
            {ops?.training_plan.subject_profile.course_name}{' '}
            <span className="text-xs text-muted-foreground">
              (총 {ops?.training_plan.subject_profile.total_hours ?? 0}시간)
            </span>
          </p>
        ) : (
          <RegeneratePlaceholder section="Ⅳ-3-다 훈련 교과목 프로파일" />
        )}
      </SectionCard>

      {/* Ⅳ-3-라 시설·장비 */}
      <SectionCard
        title="Ⅳ-3-라. 시설·장비"
        description="시설 · 장비 목록 (LLM 생성)"
      >
        {hasFacilities ? (
          <p className="text-sm text-muted-foreground">
            총 {ops?.training_plan.facilities.length ?? 0} 건
          </p>
        ) : (
          <RegeneratePlaceholder section="Ⅳ-3-라 시설·장비" />
        )}
      </SectionCard>

      {/* Ⅳ-3-마 훈련강사 */}
      <SectionCard
        title="Ⅳ-3-마. 훈련강사"
        description="강사별 경력 · 담당 교과 (LLM 생성)"
      >
        {hasTrainingInstructors ? (
          <p className="text-sm text-muted-foreground">
            총 {ops?.training_plan.training_instructors.length ?? 0} 명
          </p>
        ) : (
          <RegeneratePlaceholder section="Ⅳ-3-마 훈련강사" />
        )}
      </SectionCard>

      {/* Ⅳ-4-가 과정평가 계획 */}
      <SectionCard
        title="Ⅳ-4-가. 과정평가 계획"
        description="평가방법 · 평가기준 · 수행 수준 체크리스트 (LLM 생성)"
      >
        {hasCourseEvaluation ? (
          <p className="text-sm">
            {ops?.evaluation_plan.course_evaluation.course_name}
          </p>
        ) : (
          <RegeneratePlaceholder section="Ⅳ-4-가 과정평가 계획" />
        )}
      </SectionCard>

      {/*
        Ⅳ-4-나 결과평가 계획
        [고정 양식·결과 화면 제외] — 렌더 금지 (계획서 §1.2)
        만족도 · 성취도 · 외부전문가 · 현업적용도 설문은 양식 고정으로 결과 화면에서
        노출하지 않는다. 본 주석은 의도적 미렌더의 근거를 코드에서 추적 가능하게
        남긴 것이며, 실제 UI 에는 출력되지 않는다.
      */}
    </div>
  );
}

/** Ⅳ-* LLM 결과가 없을 때 재생성 안내. */
function RegeneratePlaceholder({ section }: { section: string }) {
  return (
    <div className="flex flex-col items-center justify-center rounded border border-dashed bg-muted/20 px-6 py-10 text-center">
      <Sparkles className="mb-2 size-8 text-muted-foreground" aria-hidden />
      <p className="text-sm font-medium">{section} 가 아직 생성되지 않았습니다</p>
      <p className="mt-1 text-xs text-muted-foreground">
        상단 &quot;새 버전 생성&quot; 버튼을 눌러 LLM 이 결과를 생성하도록 요청하세요.
      </p>
    </div>
  );
}
