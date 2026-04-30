'use client';

import { Sparkles } from 'lucide-react';

import { FormTable, type FormTableRow } from '@/components/forms/FormTable';
import { SectionCard } from '@/components/result/SectionCard';
import { bulletize, splitByUnit } from '@/lib/utils/list-format';
import type {
  PBLInstructor,
  PBLSubjectProfile,
  PBLTrainee,
} from '@/lib/services/pbl/pbl-types';

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

      {/* Ⅳ-3-가 훈련과정 개요 (P-18 양식 2x2 mini-table) */}
      <SectionCard
        title="Ⅳ-3-가. 훈련과정 개요"
        description="과정명 · 훈련기간 (LLM 생성)"
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
                    content: formatTrainingPeriod(
                      ops?.training_plan.overview.training_period,
                    ),
                    align: 'left',
                  },
                ],
              },
            ]}
          />
        ) : (
          <RegeneratePlaceholder section="Ⅳ-3-가 훈련과정 개요" />
        )}
      </SectionCard>

      {/* Ⅳ-3-나 학습그룹 구성 (P-19 양식 6 컬럼 — instructors + trainees 병합) */}
      <SectionCard
        title="Ⅳ-3-나. 학습그룹 구성"
        description="강사(외부/내부) + 훈련생 명단 (LLM 생성)"
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
              ops?.training_plan.learning_group.trainees ?? [],
            )}
          />
        ) : (
          <RegeneratePlaceholder section="Ⅳ-3-나 학습그룹 구성" />
        )}
      </SectionCard>

      {/* Ⅳ-3-다 훈련 교과목 프로파일 (P-20 양식 15x10 — 메타 표 + training_contents 표 분리) */}
      <SectionCard
        title="Ⅳ-3-다. 훈련 교과목 프로파일"
        description="과정명 · 전체 훈련시간 · 훈련목표 · AI 도구 · 교과목 (LLM 생성)"
      >
        {hasSubjectProfile ? (
          <div className="space-y-4">
            <SubjectProfileMetaTable
              profile={ops!.training_plan.subject_profile}
            />
            {(ops?.training_plan.subject_profile.training_contents.length ??
              0) > 0 ? (
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
                bodyRows={(
                  ops?.training_plan.subject_profile.training_contents ?? []
                ).map((c) => ({
                  cells: [
                    { content: c.unit_name || '-', align: 'left' },
                    {
                      content: (
                        <span className="whitespace-pre-wrap text-sm">
                          {splitByUnit(c.detail) || '-'}
                        </span>
                      ),
                      align: 'left',
                    },
                    {
                      content:
                        c.training_hours != null
                          ? String(c.training_hours)
                          : '-',
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
              <p className="text-sm text-muted-foreground">
                교과목 행이 아직 입력되지 않았습니다.
              </p>
            )}
          </div>
        ) : (
          <RegeneratePlaceholder section="Ⅳ-3-다 훈련 교과목 프로파일" />
        )}
      </SectionCard>

      {/* Ⅳ-3-라 시설·장비 (P-21 양식 5 컬럼) */}
      <SectionCard
        title="Ⅳ-3-라. 시설·장비"
        description="시설 · 장비 목록 (LLM 생성)"
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
          <RegeneratePlaceholder section="Ⅳ-3-라 시설·장비" />
        )}
      </SectionCard>

      {/* Ⅳ-3-마 훈련강사 (P-22 양식 5 컬럼) */}
      <SectionCard
        title="Ⅳ-3-마. 훈련강사"
        description="강사별 경력 · 담당 교과 (LLM 생성)"
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
            bodyRows={(ops?.training_plan.training_instructors ?? []).map(
              (i) => ({
                cells: [
                  { content: i.name || '-', align: 'left' },
                  { content: i.internal_external || '-', align: 'center' },
                  {
                    content:
                      i.career_years != null ? `${i.career_years}년` : '-',
                    align: 'center',
                  },
                  { content: i.work_name || '-', align: 'left' },
                  {
                    content: (
                      <span className="whitespace-pre-wrap text-sm">
                        {bulletize(i.detailed_training_content) || '-'}
                      </span>
                    ),
                    align: 'left',
                  },
                ],
              }),
            )}
          />
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
              content:
                profile.total_hours != null
                  ? `${profile.total_hours} 시간`
                  : '-',
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
              content:
                profile.total_sum_hours != null
                  ? `${profile.total_sum_hours} 시간`
                  : '-',
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
  trainees: PBLTrainee[],
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
function formatTrainingPeriod(
  period: { start?: string; end?: string } | undefined,
): string {
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
