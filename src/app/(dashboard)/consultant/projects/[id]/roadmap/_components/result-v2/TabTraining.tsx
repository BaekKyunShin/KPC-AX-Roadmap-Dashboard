'use client';

import { Sparkles } from 'lucide-react';

import { SectionCard } from '@/components/result/SectionCard';
import { InlineEditField } from '@/components/result/InlineEditField';
import { EditableTable, type EditableTableColumn } from '@/components/result/EditableTable';
import { FormTable } from '@/components/forms/FormTable';
import type {
  RoadmapAnnualPlanItem,
  RoadmapCompetency as LLMCompetency,
  RoadmapCourseSubject,
  RoadmapTrainingStructureItem,
} from '@/lib/services/roadmap';
import { TRAINING_LEVEL_LABEL } from '@/lib/services/roadmap/roadmap-types';
import type { RoadmapCompetency as InterviewCompetency } from '@/lib/schemas/interview-roadmap';

import type { TabCommonProps } from './types';

/** 공용 뷰 형태 — Ⅲ-1 표 렌더용 (지식/기술/태도 모두 string[]) */
interface ViewCompetency {
  name: string;
  definition: string;
  knowledge: string[];
  skills: string[];
  attitudes: string[];
}

function normalizeInterviewCompetency(c: InterviewCompetency): ViewCompetency {
  return {
    name: c.name,
    definition: c.definition,
    knowledge: c.knowledge ? [c.knowledge] : [],
    skills: c.skill ? [c.skill] : [],
    attitudes: c.attitude ? [c.attitude] : [],
  };
}

function normalizeLLMCompetency(c: LLMCompetency): ViewCompetency {
  return {
    name: c.name,
    definition: c.definition,
    knowledge: c.knowledge ?? [],
    skills: c.skills ?? [],
    attitudes: c.attitudes ?? [],
  };
}

/**
 * Ⅲ. 훈련체계 탭 — 로드맵 결과 V2.
 *
 * 섹션:
 *  - Ⅲ-1 역량 모델링 (인터뷰 입력값 + NCS 조건부 박스, DRAFT 편집 가능)
 *    ↳ LLM 확장 없음 (사용자 결정, Task 2.5 계획서 §1.2).
 *  - Ⅲ-2 훈련체계도 — [LLM 생성 placeholder] Task 2.9 담당
 *  - Ⅲ-3 연간 훈련계획 — [LLM 생성 placeholder] Task 2.9 담당
 *  - Ⅲ-4 훈련과정 상세 — [LLM 생성 placeholder] Task 2.9 담당
 *
 * 제외:
 *  - [고정 참고자료] "NCS 능력단위요소별 지식·기술·태도 예시" — 렌더 금지
 *  - 별첨 수행일지 / 참고자료 진단모형 — 렌더 금지 (양식·결과 화면 제외)
 */
export function TabTraining({
  version,
  interview,
  readOnly,
  onEdit,
}: TabCommonProps) {
  // Ⅲ-1 역량 모델링: 인터뷰 값 우선 → version.competencies fallback.
  //   인터뷰 스키마는 knowledge/skill/attitude (단수 string), LLM 서비스는 knowledge/skills/attitudes (배열).
  //   아래 normalizeCompetency 가 두 형태를 동일한 뷰 형태(string[]) 로 맞춘다.
  const interviewCompetencies = interview?.competencies ?? [];
  const competencies =
    interviewCompetencies.length > 0
      ? interviewCompetencies.map(normalizeInterviewCompetency)
      : (version?.competencies ?? []).map(normalizeLLMCompetency);

  const ncsUsed = interview?.ncsUsed ?? version?.ncs_used ?? false;
  const ncsMethodology =
    interview?.ncsMethodology ?? version?.ncs_methodology ?? '';
  const ncsDerivationMethod =
    interview?.ncsDerivationMethod ?? version?.ncs_derivation_method ?? '';

  const trainingStructure = version?.training_structure ?? [];
  const trainingStructureMethod = version?.training_structure_method ?? '';
  const annualPlan = version?.annual_plan ?? null;
  const courseSpecs = version?.course_specs ?? [];

  return (
    <div className="space-y-6">
      {/* Ⅲ-1 역량 모델링 (인터뷰 입력값, DRAFT 편집 가능) */}
      <SectionCard
        title="Ⅲ-1. 역량 모델링"
        description="인터뷰에서 정의된 역량(수행준거 + 지식·기술·태도). LLM 확장 없이 사용자 입력값을 그대로 사용합니다."
      >
        {competencies.length > 0 ? (
          <div className="overflow-x-auto">
            <FormTable
              caption="역량 모델링 표"
              headerRows={[
                {
                  cells: [
                    { content: '역량명', header: true, className: 'w-[140px]' },
                    { content: '역량 정의', header: true },
                    { content: '지식 (K)', header: true },
                    { content: '기술 (S)', header: true },
                    { content: '태도 (A)', header: true },
                  ],
                },
              ]}
              bodyRows={competencies.map((c) => ({
                cells: [
                  { content: c.name || '-', align: 'left' },
                  {
                    content: (
                      <span className="whitespace-pre-wrap text-sm">
                        {c.definition || '-'}
                      </span>
                    ),
                    align: 'left',
                  },
                  {
                    content: (
                      <span className="whitespace-pre-wrap text-sm">
                        {renderList(c.knowledge)}
                      </span>
                    ),
                    align: 'left',
                  },
                  {
                    content: (
                      <span className="whitespace-pre-wrap text-sm">
                        {renderList(c.skills)}
                      </span>
                    ),
                    align: 'left',
                  },
                  {
                    content: (
                      <span className="whitespace-pre-wrap text-sm">
                        {renderList(c.attitudes)}
                      </span>
                    ),
                    align: 'left',
                  },
                ],
              }))}
            />
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            인터뷰에 입력된 역량이 없습니다. 인터뷰 Ⅲ-1 에서 역량을 먼저 정의하세요.
          </p>
        )}

        {/* NCS 조건부 박스 — XOR 표시 (ncsUsed=true → methodology, false → derivation) */}
        <div className="mt-4 rounded border bg-muted/30 p-4">
          <p className="mb-2 text-sm font-medium">
            NCS 활용 여부:{' '}
            <span className="font-semibold">{ncsUsed ? '사용' : '미사용'}</span>
          </p>
          {ncsUsed ? (
            <>
              <p className="mb-1 text-xs text-muted-foreground">
                NCS 능력단위 활용 방법
              </p>
              <InlineEditField
                value={ncsMethodology}
                onSave={async (next) => {
                  await onEdit({ ncs_used: true, ncs_methodology: next });
                }}
                readOnly={readOnly}
                multiline
                placeholder="NCS 능력단위를 어떻게 참고·수정했는지 서술"
              />
            </>
          ) : (
            <>
              <p className="mb-1 text-xs text-muted-foreground">
                역량별 도출 방법
              </p>
              <InlineEditField
                value={ncsDerivationMethod}
                onSave={async (next) => {
                  await onEdit({ ncs_used: false, ncs_derivation_method: next });
                }}
                readOnly={readOnly}
                multiline
                placeholder="NCS 없이 어떻게 도출했는지 서술"
              />
            </>
          )}
        </div>
      </SectionCard>

      {/* Ⅲ-2 훈련체계도 — LLM 생성 + DRAFT/FINAL 편집 (PR5 R6) */}
      <SectionCard
        title="Ⅲ-2. 훈련체계도"
        description="역량 × 초·중·고급 수준별 훈련 내용 (LLM 생성 결과, 직접 수정 가능)"
      >
        {trainingStructure.length > 0 || !readOnly ? (
          <>
            <EditableTable<TrainingStructureRow>
              testIdPrefix="training-structure"
              rows={trainingStructure.map(toTrainingRow)}
              columns={TRAINING_STRUCTURE_COLUMNS}
              onChange={async (rows) => {
                await onEdit({
                  training_structure: rows.map(fromTrainingRow),
                });
              }}
              emptyRow={() => ({
                competency_name: '',
                level: 'BEGINNER',
                content: '',
                target_audience: '',
                method: '',
                goal: '',
              })}
              readOnly={readOnly}
              addLabel="행 추가"
            />
            <div>
              <p className="mb-2 text-sm font-medium text-muted-foreground">
                훈련체계도 수립 방법
              </p>
              <InlineEditField
                value={trainingStructureMethod}
                onSave={async (next) => {
                  await onEdit({ training_structure_method: next });
                }}
                readOnly={readOnly}
                multiline
                placeholder="훈련체계도 수립 방법을 서술"
              />
            </div>
          </>
        ) : (
          <RegeneratePlaceholder section="Ⅲ-2 훈련체계도" />
        )}
      </SectionCard>

      {/* Ⅲ-3 연간 훈련계획 — LLM 생성 + DRAFT/FINAL 편집 (PR5 R6) */}
      <SectionCard
        title="Ⅲ-3. 연간 훈련계획"
        description="역량별 훈련과정 · 훈련형태 · 시간 · 활용방안 (LLM 생성 결과, 직접 수정 가능)"
      >
        {(annualPlan && annualPlan.items && annualPlan.items.length > 0) || !readOnly ? (
          <>
            <EditableTable<RoadmapAnnualPlanItem & Record<string, unknown>>
              testIdPrefix="annual-plan"
              rows={(annualPlan?.items ?? []) as Array<RoadmapAnnualPlanItem & Record<string, unknown>>}
              columns={ANNUAL_PLAN_COLUMNS}
              onChange={async (items) => {
                await onEdit({
                  annual_plan: {
                    items,
                    usage_plan: annualPlan?.usage_plan ?? '',
                  },
                });
              }}
              emptyRow={() => ({
                competency_name: '',
                course_name: '',
                format: '집체',
                hours: 0,
                notes: '',
              })}
              readOnly={readOnly}
              addLabel="행 추가"
            />
            <div className="rounded border bg-muted/30 p-3">
              <p className="mb-1 text-xs font-medium text-muted-foreground">활용방안</p>
              <InlineEditField
                value={annualPlan?.usage_plan ?? ''}
                onSave={async (next) => {
                  await onEdit({
                    annual_plan: {
                      items: annualPlan?.items ?? [],
                      usage_plan: next,
                    },
                  });
                }}
                readOnly={readOnly}
                multiline
                placeholder="활용방안 (직접 수정 가능)"
              />
            </div>
          </>
        ) : (
          <RegeneratePlaceholder section="Ⅲ-3 연간 훈련계획" />
        )}
      </SectionCard>

      {/* Ⅲ-4 훈련과정 상세 — LLM 생성 + DRAFT/FINAL 편집 (PR5 R6) */}
      <SectionCard
        title="Ⅲ-4. 훈련과정 명세서"
        description="주요 훈련과정(3개 이상) 상세 — 과정명·목표·주요내용·훈련대상·교과목 (LLM 생성 결과, 직접 수정 가능)"
      >
        {courseSpecs.length > 0 || !readOnly ? (
          <div className="space-y-4">
            {courseSpecs.map((spec, idx) => (
              <div
                key={`${spec.course_name}-${idx}`}
                className="rounded border bg-muted/30 p-4"
              >
                <h4 className="mb-2 text-base font-semibold">
                  {idx + 1}.{' '}
                  <InlineEditField
                    value={spec.course_name}
                    onSave={async (next) => {
                      const newSpecs = courseSpecs.map((s, i) =>
                        i === idx ? { ...s, course_name: next } : s,
                      );
                      await onEdit({ course_specs: newSpecs });
                    }}
                    readOnly={readOnly}
                    placeholder="훈련과정명"
                  />
                </h4>
                <dl className="grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
                  <EditableDlRow
                    label="훈련형태"
                    value={spec.format}
                    onSave={async (next) => {
                      const newSpecs = courseSpecs.map((s, i) =>
                        i === idx ? { ...s, format: next } : s,
                      );
                      await onEdit({ course_specs: newSpecs });
                    }}
                    readOnly={readOnly}
                  />
                  <EditableDlRow
                    label="추천 훈련사업"
                    value={spec.recommended_program}
                    onSave={async (next) => {
                      const newSpecs = courseSpecs.map((s, i) =>
                        i === idx ? { ...s, recommended_program: next } : s,
                      );
                      await onEdit({ course_specs: newSpecs });
                    }}
                    readOnly={readOnly}
                  />
                  <EditableDlRow
                    label="훈련목표"
                    value={spec.goal}
                    onSave={async (next) => {
                      const newSpecs = courseSpecs.map((s, i) =>
                        i === idx ? { ...s, goal: next } : s,
                      );
                      await onEdit({ course_specs: newSpecs });
                    }}
                    readOnly={readOnly}
                    wide
                    multiline
                  />
                  <EditableDlRow
                    label="주요 훈련내용"
                    value={spec.main_content}
                    onSave={async (next) => {
                      const newSpecs = courseSpecs.map((s, i) =>
                        i === idx ? { ...s, main_content: next } : s,
                      );
                      await onEdit({ course_specs: newSpecs });
                    }}
                    readOnly={readOnly}
                    wide
                    multiline
                  />
                  <EditableDlRow
                    label="훈련대상"
                    value={spec.target_audience}
                    onSave={async (next) => {
                      const newSpecs = courseSpecs.map((s, i) =>
                        i === idx ? { ...s, target_audience: next } : s,
                      );
                      await onEdit({ course_specs: newSpecs });
                    }}
                    readOnly={readOnly}
                    wide
                  />
                </dl>
                <div className="mt-3">
                  <p className="mb-2 text-xs font-medium text-muted-foreground">교과목</p>
                  <EditableTable<RoadmapCourseSubject & Record<string, unknown>>
                    testIdPrefix={`course-${idx}-subjects`}
                    rows={(spec.subjects ?? []) as Array<RoadmapCourseSubject & Record<string, unknown>>}
                    columns={COURSE_SUBJECT_COLUMNS}
                    onChange={async (subjects) => {
                      const newSpecs = courseSpecs.map((s, i) =>
                        i === idx ? { ...s, subjects } : s,
                      );
                      await onEdit({ course_specs: newSpecs });
                    }}
                    emptyRow={() => ({ name: '', details: '', hours: 0 })}
                    readOnly={readOnly}
                    addLabel="교과목 추가"
                    minRows={0}
                  />
                </div>
              </div>
            ))}
            {!readOnly && (
              <button
                type="button"
                onClick={async () => {
                  await onEdit({
                    course_specs: [
                      ...courseSpecs,
                      {
                        course_name: '',
                        format: '집체',
                        recommended_program: '',
                        goal: '',
                        main_content: '',
                        target_audience: '',
                        subjects: [],
                      },
                    ],
                  });
                }}
                className="rounded border border-dashed bg-muted/30 px-4 py-3 text-sm text-muted-foreground hover:bg-muted"
                data-testid="course-specs-add"
              >
                + 훈련과정 추가
              </button>
            )}
          </div>
        ) : (
          <RegeneratePlaceholder section="Ⅲ-4 훈련과정 상세" />
        )}
      </SectionCard>
    </div>
  );
}

// ─── EditableTable 컬럼 정의 ─────────────────────────────────────────────

type TrainingStructureRow = {
  competency_name: string;
  /** UI 표시용 한글 라벨 또는 영문 enum 직접 입력. 저장 시 fromTrainingRow 가 enum 으로 변환. */
  level: string;
  content: string;
  target_audience: string;
  method: string;
  goal: string;
  [key: string]: unknown;
};

function toTrainingRow(t: RoadmapTrainingStructureItem): TrainingStructureRow {
  return {
    competency_name: t.competency_name,
    level: TRAINING_LEVEL_LABEL[t.level] ?? t.level,
    content: t.content,
    target_audience: t.target_audience,
    method: t.method,
    goal: t.goal,
  };
}

function fromTrainingRow(row: TrainingStructureRow): RoadmapTrainingStructureItem {
  // 한글 라벨을 enum 으로 역변환. 잘못된 입력은 BEGINNER 로 fallback.
  const labelToEnum: Record<string, RoadmapTrainingStructureItem['level']> = {
    초급: 'BEGINNER',
    중급: 'INTERMEDIATE',
    고급: 'ADVANCED',
    BEGINNER: 'BEGINNER',
    INTERMEDIATE: 'INTERMEDIATE',
    ADVANCED: 'ADVANCED',
  };
  return {
    competency_name: row.competency_name,
    level: labelToEnum[row.level] ?? 'BEGINNER',
    content: row.content,
    target_audience: row.target_audience,
    method: row.method,
    goal: row.goal,
  };
}

const TRAINING_STRUCTURE_COLUMNS: EditableTableColumn<TrainingStructureRow>[] = [
  { key: 'competency_name', label: '역량명' },
  { key: 'level', label: '수준 (초급/중급/고급)' },
  { key: 'content', label: '훈련 내용', multiline: true },
  { key: 'target_audience', label: '훈련 대상' },
  { key: 'method', label: '훈련 방법' },
  { key: 'goal', label: '훈련 목표', multiline: true },
];

const ANNUAL_PLAN_COLUMNS: EditableTableColumn<RoadmapAnnualPlanItem & Record<string, unknown>>[] = [
  { key: 'competency_name', label: '역량명' },
  { key: 'course_name', label: '훈련과정명' },
  { key: 'format', label: '훈련형태' },
  { key: 'hours', label: '훈련시간', type: 'number' },
  { key: 'notes', label: '비고', multiline: true },
];

const COURSE_SUBJECT_COLUMNS: EditableTableColumn<RoadmapCourseSubject & Record<string, unknown>>[] = [
  { key: 'name', label: '교과목명' },
  { key: 'details', label: '세부 내용 (2~5개 항목, 줄바꿈 구분)', multiline: true },
  { key: 'hours', label: '훈련시간', type: 'number' },
];

// ─── EditableDlRow ─────────────────────────────────────────────────────

function EditableDlRow({
  label,
  value,
  onSave,
  readOnly,
  wide = false,
  multiline = false,
}: {
  label: string;
  value?: string;
  onSave: (next: string) => Promise<void>;
  readOnly?: boolean;
  wide?: boolean;
  multiline?: boolean;
}) {
  return (
    <div className={wide ? 'sm:col-span-2' : ''}>
      <dt className="text-xs font-medium text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 text-sm">
        <InlineEditField
          value={value ?? ''}
          onSave={onSave}
          readOnly={readOnly}
          multiline={multiline}
          placeholder={`${label} 입력`}
        />
      </dd>
    </div>
  );
}

/** Ⅲ-1 역량 모델링 표에서 knowledge/skills/attitudes (string[]) 를 bullet 으로 렌더. */
function renderList(value: string[]): string {
  if (!value || value.length === 0) return '-';
  return value.join(', ');
}

/** Ⅲ-2/Ⅲ-3/Ⅲ-4 LLM 결과가 없을 때 재생성 안내 (Task 2.9 이전 단계). */
function RegeneratePlaceholder({ section }: { section: string }) {
  return (
    <div className="flex flex-col items-center justify-center rounded border border-dashed bg-muted/20 px-6 py-10 text-center">
      <Sparkles className="mb-2 size-8 text-muted-foreground" aria-hidden />
      <p className="text-sm font-medium">
        {section} 가 아직 생성되지 않았습니다
      </p>
      <p className="mt-1 text-xs text-muted-foreground">
        상단 &quot;새 버전 생성&quot; 버튼을 눌러 LLM 이 결과를 생성하도록 요청하세요.
      </p>
    </div>
  );
}
