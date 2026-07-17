'use client';

import { Sparkles } from 'lucide-react';

import { FormTable, type FormTableRow } from '@/components/forms/FormTable';
import { InlineEditField } from '@/components/result/InlineEditField';
import { SectionCard } from '@/components/result/SectionCard';
import { Badge } from '@/components/ui/badge';
import { bulletize, bulletizeText, parseBullets, splitByUnit } from '@/lib/utils/list-format';
import type {
  PBLInstructor,
  PBLSubjectProfile,
  PBLTrainee,
  PBLTrainingContent,
  PBLTrainingInstructor,
} from '@/lib/services/pbl/pbl-types';

import type { PBLResultEditPayload, TabPBLCommonProps } from './types';

/**
 * Ⅳ. AI 기반 운영계획 탭 — PBL 결과 V2.
 *
 * 섹션 (양식 v2 — 성과분석 측정지표가 Ⅳ-2 로 이동, 이후 섹션 번호 한 칸씩 밀림):
 *  - Ⅳ-1 훈련 목표                — LLM 생성
 *  - Ⅳ-2 성과분석 측정지표        — LLM 생성 (v1 Ⅴ장에서 이동, operation_plan.outcome_metrics)
 *  - Ⅳ-3 AI 도구 활용 계획        — LLM 생성
 *  - Ⅳ-4-가 훈련과정 개요          — LLM 생성
 *  - Ⅳ-4-나 학습그룹 구성          — LLM 생성
 *  - Ⅳ-4-다 훈련 교과목 프로파일   — LLM 생성
 *  - Ⅳ-4-라 시설·장비              — LLM 생성
 *  - Ⅳ-4-마 훈련강사               — LLM 생성
 *  - Ⅳ-5-가 과정평가 계획          — LLM 생성
 *
 * 제외 (양식·결과 화면 제외 항목):
 *  - **Ⅳ-5-나 결과평가 계획** [고정 양식·결과 화면 제외] — 렌더 금지.
 *    양식에 고정 설문(만족도 · 성취도 · 외부전문가 · 현업적용도) 이 포함되어 있지만
 *    계획서 §1.2 기준 결과 화면에서는 노출하지 않는다.
 */
export function TabPBLOps({ version, readOnly, onEdit }: TabPBLCommonProps) {
  const ops = version?.pbl_content?.operation_plan;
  const outcomeMetrics = ops?.outcome_metrics;
  const trainingContents = ops?.training_plan?.subject_profile?.training_contents ?? [];
  const trainingInstructors = ops?.training_plan?.training_instructors ?? [];

  const saveTrainingContent = async (index: number, nextDetail: string) => {
    const next: PBLTrainingContent[] = trainingContents.map((c, i) =>
      i === index ? { ...c, detail: nextDetail } : c
    );
    const payload: PBLResultEditPayload = {
      operations: {
        training_plan: { subject_profile: { training_contents: next } },
      },
    };
    await onEdit(payload);
  };

  const saveInstructorDetail = async (index: number, nextText: string) => {
    const list = parseBullets(nextText);
    if (list.length === 0) {
      // 빈 입력 차단 — Zod min(1) 사전 가드
      throw new Error('세부 훈련 내용은 최소 1개 항목이 필요합니다.');
    }
    const next: PBLTrainingInstructor[] = trainingInstructors.map((it, i) =>
      i === index ? { ...it, detailed_training_content: list } : it
    );
    const payload: PBLResultEditPayload = {
      operations: { training_plan: { training_instructors: next } },
    };
    await onEdit(payload);
  };

  // 각 하위 섹션별로 LLM 결과 존재 여부를 판정. Task 2.10 이후 실제 렌더 확장.
  const hasTrainingGoal = Boolean(ops?.training_goal && ops.training_goal.trim().length > 0);
  // Ⅳ-2 성과분석 측정지표 (v1 Ⅴ장에서 이동) — selected_goals·정량·정성 중 하나라도 있으면 표출.
  const hasOutcomeMetrics = Boolean(
    outcomeMetrics &&
    ((outcomeMetrics.selected_goals?.length ?? 0) > 0 ||
      outcomeMetrics.quantitative?.trim() ||
      outcomeMetrics.qualitative?.trim())
  );
  const hasAIToolUsage = (ops?.ai_tool_usage_plan?.length ?? 0) > 0;
  const hasCourseOverview = Boolean(ops?.training_plan?.overview?.course_name);
  const hasLearningGroup =
    (ops?.training_plan?.learning_group?.instructors?.length ?? 0) > 0 ||
    (ops?.training_plan?.learning_group?.trainees?.length ?? 0) > 0;
  const hasSubjectProfile = Boolean(ops?.training_plan?.subject_profile?.course_name);
  const hasFacilities = (ops?.training_plan?.facilities?.length ?? 0) > 0;
  const hasTrainingInstructors = (ops?.training_plan?.training_instructors?.length ?? 0) > 0;
  const hasCourseEvaluation = Boolean(ops?.evaluation_plan?.course_evaluation?.course_name);

  return (
    <div className="space-y-6">
      {/* Ⅳ-1 훈련 목표 */}
      <SectionCard title="Ⅳ-1. 훈련 목표" description="LLM 생성 (Task 2.10)" dataSource="ai">
        {hasTrainingGoal ? (
          <p className="whitespace-pre-wrap text-sm">{ops?.training_goal}</p>
        ) : (
          <RegeneratePlaceholder section="Ⅳ-1 훈련 목표" />
        )}
      </SectionCard>

      {/* Ⅳ-2 성과분석 측정지표 (v1 Ⅴ장에서 이동 — operation_plan.outcome_metrics) */}
      <SectionCard
        title="Ⅳ-2. 성과분석 측정지표"
        description="선택 훈련 목표 + 정량·정성 측정 지표 (LLM 생성, v1 Ⅴ장에서 이동)"
        dataSource="ai"
      >
        {hasOutcomeMetrics ? (
          <div className="space-y-3">
            {(outcomeMetrics?.selected_goals?.length ?? 0) > 0 && (
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm font-medium text-muted-foreground">선택된 훈련 목표</span>
                {outcomeMetrics?.selected_goals.map((goal) => (
                  <Badge key={goal} variant="secondary">
                    {goal}
                  </Badge>
                ))}
              </div>
            )}
            <FormTable
              caption="성과분석 측정 지표"
              bodyRows={[
                {
                  cells: [
                    {
                      content: '정량 지표',
                      header: true,
                      className: 'w-[160px]',
                      align: 'center',
                    },
                    {
                      content: (
                        <span className="whitespace-pre-wrap text-sm">
                          {outcomeMetrics?.quantitative?.trim() || '-'}
                        </span>
                      ),
                      align: 'left',
                    },
                  ],
                },
                {
                  cells: [
                    { content: '정성 지표', header: true, align: 'center' },
                    {
                      content: (
                        <span className="whitespace-pre-wrap text-sm">
                          {outcomeMetrics?.qualitative?.trim() || '-'}
                        </span>
                      ),
                      align: 'left',
                    },
                  ],
                },
              ]}
            />
          </div>
        ) : (
          <RegeneratePlaceholder section="Ⅳ-2 성과분석 측정지표" />
        )}
      </SectionCard>

      {/* Ⅳ-3 AI 도구 활용 계획 */}
      <SectionCard
        title="Ⅳ-3. AI 도구 활용 계획"
        description="단계별 주요활동 · AI 도구 · 데이터 · 목적 · 방법 (LLM 생성)"
        dataSource="ai"
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
          <RegeneratePlaceholder section="Ⅳ-3 AI 도구 활용 계획" />
        )}
      </SectionCard>

      {/* Ⅳ-4-가 훈련과정 개요 (P-18 양식 2x2 mini-table) */}
      <SectionCard
        title="Ⅳ-4-가. 훈련과정 개요"
        description="과정명 · 훈련기간 (LLM 생성)"
        dataSource="ai"
      >
        {hasCourseOverview ? (
          <FormTable
            caption="훈련과정 개요"
            bodyRows={[
              {
                cells: [
                  { content: '과정명', header: true, className: 'w-[160px]' },
                  {
                    content: ops?.training_plan.overview.course_name || '-',
                    align: 'left',
                  },
                ],
              },
              {
                cells: [
                  { content: '훈련기간', header: true },
                  {
                    content: formatTrainingPeriod(ops?.training_plan.overview.training_period),
                    align: 'left',
                  },
                ],
              },
            ]}
          />
        ) : (
          <RegeneratePlaceholder section="Ⅳ-4-가 훈련과정 개요" />
        )}
      </SectionCard>

      {/* Ⅳ-4-나 학습그룹 구성 (P-19 양식 6 컬럼 — instructors + trainees 병합) */}
      <SectionCard
        title="Ⅳ-4-나. 학습그룹 구성"
        description="강사(외부/내부) + 훈련생 명단 (LLM 생성)"
        dataSource="ai"
      >
        {hasLearningGroup ? (
          <FormTable
            caption="학습그룹 구성"
            headerRows={[
              {
                cells: [
                  { content: '구분', header: true, className: 'w-[100px]' },
                  { content: '유형', header: true, className: 'w-[80px]' },
                  { content: '역할', header: true, className: 'w-[80px]' },
                  { content: '소속', header: true },
                  { content: '직위', header: true, className: 'w-[140px]' },
                  { content: '성명', header: true, className: 'w-[120px]' },
                ],
              },
            ]}
            bodyRows={buildLearningGroupRows(
              ops?.training_plan.learning_group.instructors ?? [],
              ops?.training_plan.learning_group.trainees ?? []
            )}
          />
        ) : (
          <RegeneratePlaceholder section="Ⅳ-4-나 학습그룹 구성" />
        )}
      </SectionCard>

      {/* Ⅳ-4-다 훈련 교과목 프로파일 (P-20 양식 15x10 — 메타 표 + training_contents 표 분리) */}
      <SectionCard
        title="Ⅳ-4-다. 훈련 교과목 프로파일"
        description="과정명 · 전체 훈련시간 · 훈련목표 · AI 도구 · 교과목 (LLM 생성)"
        dataSource="ai"
      >
        {hasSubjectProfile ? (
          <div className="space-y-4">
            <SubjectProfileMetaTable profile={ops!.training_plan.subject_profile} />
            {(ops?.training_plan.subject_profile.training_contents.length ?? 0) > 0 ? (
              <FormTable
                caption="훈련 교과목 (단원별)"
                headerRows={[
                  {
                    cells: [
                      {
                        content: '업무(단원)명',
                        header: true,
                        className: 'w-[200px]',
                      },
                      { content: '세부 내용', header: true },
                      {
                        content: '훈련시간(H)',
                        header: true,
                        className: 'w-[100px]',
                      },
                      {
                        content: '외부 강사 (H)',
                        header: true,
                        className: 'w-[100px]',
                      },
                      {
                        content: '내부 강사 (H)',
                        header: true,
                        className: 'w-[100px]',
                      },
                    ],
                  },
                ]}
                bodyRows={trainingContents.map((c, idx) => ({
                  cells: [
                    { content: c.unit_name || '-', align: 'left' },
                    {
                      content: readOnly ? (
                        <span className="whitespace-pre-wrap text-sm">
                          {bulletizeText(splitByUnit(c.detail)) || '-'}
                        </span>
                      ) : (
                        <InlineEditField
                          multiline
                          value={c.detail ?? ''}
                          onSave={(next) => saveTrainingContent(idx, next)}
                          placeholder="세부 내용을 입력하세요"
                          className="text-sm"
                          displayTransform={(raw) => bulletizeText(splitByUnit(raw))}
                        />
                      ),
                      align: 'left',
                    },
                    {
                      content: c.training_hours != null ? String(c.training_hours) : '-',
                      align: 'center',
                    },
                    {
                      content:
                        c.instructor_hours?.external != null
                          ? String(c.instructor_hours.external)
                          : '-',
                      align: 'center',
                    },
                    {
                      content:
                        c.instructor_hours?.internal != null
                          ? String(c.instructor_hours.internal)
                          : '-',
                      align: 'center',
                    },
                  ],
                }))}
              />
            ) : (
              <p className="text-sm text-muted-foreground">교과목 행이 아직 입력되지 않았습니다.</p>
            )}
          </div>
        ) : (
          <RegeneratePlaceholder section="Ⅳ-4-다 훈련 교과목 프로파일" />
        )}
      </SectionCard>

      {/* Ⅳ-4-라 시설·장비 (P-21 양식 5 컬럼) */}
      <SectionCard
        title="Ⅳ-4-라. 시설·장비"
        description="시설 · 장비 목록 (LLM 생성)"
        dataSource="ai"
      >
        {hasFacilities ? (
          <FormTable
            caption="시설·장비 목록"
            headerRows={[
              {
                cells: [
                  { content: 'No', header: true, className: 'w-[60px]' },
                  { content: '구분', header: true, className: 'w-[100px]' },
                  { content: '명칭', header: true, className: 'w-[200px]' },
                  { content: '규격', header: true },
                  { content: '위치', header: true, className: 'w-[180px]' },
                ],
              },
            ]}
            bodyRows={(ops?.training_plan.facilities ?? []).map((f) => ({
              cells: [
                { content: String(f.seq ?? '-'), align: 'center' },
                { content: f.category || '-', align: 'center' },
                { content: f.name || '-', align: 'left' },
                { content: f.spec || '-', align: 'left' },
                { content: f.location || '-', align: 'left' },
              ],
            }))}
          />
        ) : (
          <RegeneratePlaceholder section="Ⅳ-4-라 시설·장비" />
        )}
      </SectionCard>

      {/* Ⅳ-4-마 훈련강사 (P-22 양식 5 컬럼) */}
      <SectionCard
        title="Ⅳ-4-마. 훈련강사"
        description="강사별 경력 · 담당 교과 (LLM 생성)"
        dataSource="ai"
      >
        {hasTrainingInstructors ? (
          <FormTable
            caption="훈련강사 명단"
            headerRows={[
              {
                cells: [
                  { content: '성명', header: true, className: 'w-[120px]' },
                  { content: '구분', header: true, className: 'w-[100px]' },
                  { content: '경력(년)', header: true, className: 'w-[100px]' },
                  { content: '담당 업무', header: true, className: 'w-[200px]' },
                  { content: '세부 훈련 내용', header: true },
                ],
              },
            ]}
            bodyRows={trainingInstructors.map((i, idx) => ({
              cells: [
                { content: i.name || '-', align: 'left' },
                { content: i.internal_external || '-', align: 'center' },
                {
                  content: i.career_years != null ? `${i.career_years}년` : '-',
                  align: 'center',
                },
                { content: i.work_name || '-', align: 'left' },
                {
                  content: readOnly ? (
                    <span className="whitespace-pre-wrap text-sm">
                      {bulletize(i.detailed_training_content) || '-'}
                    </span>
                  ) : (
                    <InlineEditField
                      multiline
                      value={bulletize(i.detailed_training_content)}
                      onSave={(next) => saveInstructorDetail(idx, next)}
                      placeholder="• 세부 항목을 줄바꿈으로 구분하여 입력"
                      className="text-sm"
                    />
                  ),
                  align: 'left',
                },
              ],
            }))}
          />
        ) : (
          <RegeneratePlaceholder section="Ⅳ-4-마 훈련강사" />
        )}
      </SectionCard>

      {/* Ⅳ-5-가 과정평가 계획 */}
      <SectionCard
        title="Ⅳ-5-가. 과정평가 계획"
        description="평가방법 · 평가기준 · 수행 수준 체크리스트 (LLM 생성)"
        dataSource="ai"
      >
        {hasCourseEvaluation ? (
          <p className="text-sm">{ops?.evaluation_plan.course_evaluation.course_name}</p>
        ) : (
          <RegeneratePlaceholder section="Ⅳ-5-가 과정평가 계획" />
        )}
      </SectionCard>

      {/*
        Ⅳ-5-나 결과평가 계획
        [고정 양식·결과 화면 제외] — 렌더 금지 (계획서 §1.2)
        만족도 · 성취도 · 외부전문가 · 현업적용도 설문은 양식 고정으로 결과 화면에서
        노출하지 않는다. 본 주석은 의도적 미렌더의 근거를 코드에서 추적 가능하게
        남긴 것이며, 실제 UI 에는 출력되지 않는다.
      */}
    </div>
  );
}

/** P-20 메타 mini-table — 양식 15x10 의 상단 5 행 + 하단 합계 행 1 행. */
function SubjectProfileMetaTable({ profile }: { profile: PBLSubjectProfile }) {
  return (
    <FormTable
      caption="훈련 교과목 프로파일 — 메타"
      bodyRows={[
        {
          cells: [
            { content: '과정명', header: true, className: 'w-[160px]' },
            { content: profile.course_name || '-', align: 'left' },
          ],
        },
        {
          cells: [
            { content: '전체 훈련시간', header: true },
            {
              content: profile.total_hours != null ? `${profile.total_hours} 시간` : '-',
              align: 'left',
            },
          ],
        },
        {
          cells: [
            { content: '훈련 목표', header: true },
            {
              content: (
                <span className="whitespace-pre-wrap text-sm">
                  {bulletize(profile.training_goals) || '-'}
                </span>
              ),
              align: 'left',
            },
          ],
        },
        {
          cells: [
            { content: '활용 AI 도구', header: true },
            {
              content: (
                <span className="whitespace-pre-wrap text-sm">
                  {bulletize(profile.ai_tools) || '-'}
                </span>
              ),
              align: 'left',
            },
          ],
        },
        {
          cells: [
            { content: '활용 데이터', header: true },
            { content: profile.utilized_data || '-', align: 'left' },
          ],
        },
        {
          cells: [
            { content: '분석 방법', header: true },
            { content: profile.analysis_method || '-', align: 'left' },
          ],
        },
        {
          cells: [
            { content: '합계 (자동 산출)', header: true },
            {
              content: profile.total_sum_hours != null ? `${profile.total_sum_hours} 시간` : '-',
              align: 'left',
            },
          ],
        },
      ]}
    />
  );
}

/**
 * P-19 학습그룹 표 행 합성. 양식 6 컬럼 (구분/유형/역할/소속/직위/성명) 정합.
 *
 * 구분 라벨은 Python `_placeholders_pbl.py:471/482` 와 정확히 동일한 문자열을
 * 사용한다 (instructors → "훈련 강사" 공백 포함, trainees → "훈련생").
 * trainees 의 유형 컬럼은 Python 측 default `"내부"` 와 동일.
 */
function buildLearningGroupRows(
  instructors: PBLInstructor[],
  trainees: PBLTrainee[]
): FormTableRow[] {
  const instructorRows: FormTableRow[] = instructors.map((i) => ({
    cells: [
      { content: '훈련 강사', align: 'center' },
      { content: i.type || '-', align: 'center' },
      { content: i.role || '-', align: 'center' },
      { content: i.affiliation || '-', align: 'left' },
      { content: i.position || '-', align: 'left' },
      { content: i.name || '-', align: 'left' },
    ],
  }));
  const traineeRows: FormTableRow[] = trainees.map((t) => ({
    cells: [
      { content: '훈련생', align: 'center' },
      { content: '내부', align: 'center' },
      { content: t.role || '-', align: 'center' },
      { content: t.affiliation || '-', align: 'left' },
      { content: t.position || '-', align: 'left' },
      { content: t.name || '-', align: 'left' },
    ],
  }));
  return [...instructorRows, ...traineeRows];
}

/** P-18 훈련기간 셀 — 양 끝값이 모두 있어야 범위 텍스트, 아니면 '-'. */
function formatTrainingPeriod(period: { start?: string; end?: string } | undefined): string {
  const start = period?.start?.trim();
  const end = period?.end?.trim();
  return start && end ? `${start} ~ ${end}` : '-';
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
