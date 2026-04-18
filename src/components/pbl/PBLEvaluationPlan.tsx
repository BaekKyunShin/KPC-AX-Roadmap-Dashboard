'use client';

import { Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { FormField } from '@/components/ui/form-field';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  CARD_HEADER_CLASS,
  SyncedTableRow,
  TableTextCell,
} from '@/components/roadmap/shared';
import {
  PBL_ACHIEVEMENT_SURVEY_QUESTIONS,
  PBL_COURSE_EVALUATION_METHODS,
  PBL_EVALUATION_SCALE_ITEMS,
  PBL_EXTERNAL_EXPERT_SURVEY_QUESTIONS,
  PBL_PERFORMANCE_LEVELS,
  PBL_PRACTICAL_APPLICATION_SURVEY_QUESTIONS,
  PBL_SATISFACTION_SURVEY_QUESTIONS,
  type PBLCourseEvaluation,
  type PBLCourseEvaluationMethod,
  type PBLEvaluationPlan as PBLEvaluationPlanType,
  type PBLPerformanceLevel,
  type PBLResultEvaluation,
  type SurveyScale,
} from '@/lib/services/pbl';

// ============================================================================
// Ⅳ-4. 평가 계획 (양식 2번 15~17p)
//   가. 과정평가 (evaluation_methods, performance_checklist 1~5, evaluation_scale)
//   나. 결과평가 (고정 설문 4종)
// ============================================================================

interface PBLEvaluationPlanProps {
  canEdit: boolean;
  value: PBLEvaluationPlanType;
  onChange: (next: PBLEvaluationPlanType) => void;
}

export function PBLEvaluationPlan({ canEdit, value, onChange }: PBLEvaluationPlanProps) {
  const update = (patch: Partial<PBLEvaluationPlanType>) => onChange({ ...value, ...patch });

  return (
    <div className="space-y-4">
      <CourseEvaluationSection canEdit={canEdit} value={value.course_evaluation} onChange={(ce) => update({ course_evaluation: ce })} />
      <ResultEvaluationSection canEdit={canEdit} value={value.result_evaluation} onChange={(re) => update({ result_evaluation: re })} />
    </div>
  );
}

// ----------------------------------------------------------------------------
// 가. 과정평가
// ----------------------------------------------------------------------------

function CourseEvaluationSection({
  canEdit,
  value,
  onChange,
}: {
  canEdit: boolean;
  value: PBLCourseEvaluation;
  onChange: (next: PBLCourseEvaluation) => void;
}) {
  const update = (patch: Partial<PBLCourseEvaluation>) => onChange({ ...value, ...patch });

  const toggleMethod = (method: PBLCourseEvaluationMethod, checked: boolean) => {
    if (!canEdit) return;
    const next = checked
      ? Array.from(new Set([...value.evaluation_methods, method]))
      : value.evaluation_methods.filter((m) => m !== method);
    update({ evaluation_methods: next });
  };

  const addChecklist = () => {
    update({
      performance_checklist: [
        ...value.performance_checklist,
        { unit_name: '', evaluation_criteria: '', performance_level: 3 },
      ],
    });
  };

  const removeChecklist = (index: number) => {
    update({
      performance_checklist: value.performance_checklist.filter((_, i) => i !== index),
    });
  };

  const updateChecklist = (
    index: number,
    patch: Partial<PBLCourseEvaluation['performance_checklist'][number]>,
  ) => {
    update({
      performance_checklist: value.performance_checklist.map((row, i) =>
        i === index ? { ...row, ...patch } : row,
      ),
    });
  };

  return (
    <Card>
      <CardHeader className={CARD_HEADER_CLASS}>
        <CardTitle className="text-base">Ⅳ-4. 평가 계획 &mdash; 가. 과정평가</CardTitle>
      </CardHeader>
      <CardContent className="space-y-5 pt-5">
        <fieldset className="space-y-2">
          <legend className="text-sm font-medium text-foreground">평가 방법 (복수 선택)</legend>
          <div className="flex flex-wrap gap-4">
            {PBL_COURSE_EVALUATION_METHODS.map((method) => {
              const id = `pbl-eval-method-${method}`;
              const checked = value.evaluation_methods.includes(method);
              return (
                <div key={method} className="flex items-center gap-2">
                  <Checkbox
                    id={id}
                    checked={checked}
                    disabled={!canEdit}
                    onCheckedChange={(v) => toggleMethod(method, v === true)}
                  />
                  <Label htmlFor={id} className="text-sm cursor-pointer">
                    {method}
                  </Label>
                </div>
              );
            })}
          </div>
        </fieldset>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField label="평가 과정명" htmlFor="pbl-eval-course-name">
            <Input
              id="pbl-eval-course-name"
              value={value.course_name}
              disabled={!canEdit}
              onChange={(e) => update({ course_name: e.target.value })}
            />
          </FormField>
          <FormField label="평가 대상" htmlFor="pbl-eval-target">
            <Input
              id="pbl-eval-target"
              value={value.evaluation_target}
              disabled={!canEdit}
              onChange={(e) => update({ evaluation_target: e.target.value })}
            />
          </FormField>
          <FormField label="평가 일자" htmlFor="pbl-eval-date">
            <Input
              id="pbl-eval-date"
              type="date"
              value={value.evaluation_date}
              disabled={!canEdit}
              onChange={(e) => update({ evaluation_date: e.target.value })}
            />
          </FormField>
          <FormField label="평가 결과" htmlFor="pbl-eval-result">
            <select
              id="pbl-eval-result"
              className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
              value={value.evaluation_result}
              disabled={!canEdit}
              onChange={(e) =>
                update({ evaluation_result: e.target.value as PBLCourseEvaluation['evaluation_result'] })
              }
            >
              <option value="예정">예정</option>
              <option value="Pass">Pass</option>
              <option value="Fail">Fail</option>
            </select>
          </FormField>
        </div>
        <FormField label="평가 기준" htmlFor="pbl-eval-criteria" hint="예: 14개 중 수행수준 4 이상 8개(60%) 이상 시 PASS">
          <textarea
            id="pbl-eval-criteria"
            rows={3}
            className="min-h-[72px] w-full resize-y rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
            value={value.evaluation_criteria}
            disabled={!canEdit}
            onChange={(e) => update({ evaluation_criteria: e.target.value })}
          />
        </FormField>

        <section>
          <h3 className="text-sm font-medium text-foreground mb-2">수행수준 체크리스트 (1~5)</h3>
          <div className="overflow-x-auto rounded border border-border">
            <Table className="min-w-[720px]">
              <TableHeader className="bg-muted/40">
                <TableRow>
                  <TableHead className="w-[24%] text-center">업무(단원)명</TableHead>
                  <TableHead className="w-[42%] text-center">평가 기준</TableHead>
                  <TableHead className="w-[28%] text-center">수행 수준</TableHead>
                  {canEdit && <TableHead className="w-[6%] text-center">작업</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {value.performance_checklist.length === 0 ? (
                  <TableRow>
                    <td
                      colSpan={canEdit ? 4 : 3}
                      className="px-3 py-6 text-center text-sm text-muted-foreground"
                    >
                      수행수준 체크리스트를 추가하세요.
                    </td>
                  </TableRow>
                ) : (
                  value.performance_checklist.map((row, idx) => (
                    <SyncedTableRow
                      key={idx}
                      deps={[row.unit_name, row.evaluation_criteria, row.performance_level]}
                    >
                      <TableTextCell
                        canEdit={canEdit}
                        value={row.unit_name}
                        onChange={(v) => updateChecklist(idx, { unit_name: v })}
                        ariaLabel="업무(단원)명"
                      />
                      <TableTextCell
                        canEdit={canEdit}
                        value={row.evaluation_criteria}
                        onChange={(v) => updateChecklist(idx, { evaluation_criteria: v })}
                        ariaLabel="평가 기준"
                      />
                      <td className="px-3 py-3 align-top">
                        <div
                          className="flex justify-center gap-1.5"
                          role="radiogroup"
                          aria-label={`수행수준 선택 (1~5) — ${row.unit_name || `행 ${idx + 1}`}`}
                        >
                          {PBL_PERFORMANCE_LEVELS.map((lv) => {
                            const id = `pbl-perf-${idx}-${lv}`;
                            const checked = row.performance_level === lv;
                            return (
                              <label
                                key={lv}
                                htmlFor={id}
                                className={
                                  checked
                                    ? 'inline-flex h-7 w-7 items-center justify-center rounded-full border-2 border-primary bg-primary text-primary-foreground text-xs font-semibold cursor-pointer transition-colors'
                                    : 'inline-flex h-7 w-7 items-center justify-center rounded-full border border-border bg-background text-xs text-muted-foreground hover:border-primary/40 hover:text-primary cursor-pointer transition-colors'
                                }
                                title={`수행수준 ${lv}`}
                              >
                                <input
                                  id={id}
                                  type="radio"
                                  disabled={!canEdit}
                                  name={`pbl-perf-${idx}`}
                                  checked={checked}
                                  onChange={() =>
                                    updateChecklist(idx, { performance_level: lv as PBLPerformanceLevel })
                                  }
                                  className="sr-only"
                                />
                                {lv}
                              </label>
                            );
                          })}
                        </div>
                      </td>
                      {canEdit && (
                        <td className="px-2 py-3 align-top text-center">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            aria-label={`체크리스트 ${row.unit_name || idx + 1} 삭제`}
                            onClick={() => removeChecklist(idx)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </td>
                      )}
                    </SyncedTableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
          {canEdit && (
            <div className="flex justify-end mt-2">
              <Button type="button" variant="outline" size="sm" onClick={addChecklist}>
                <Plus className="h-4 w-4 mr-1" /> 항목 추가
              </Button>
            </div>
          )}
        </section>

        <FormField label="총평" htmlFor="pbl-eval-overall">
          <textarea
            id="pbl-eval-overall"
            rows={3}
            className="min-h-[72px] w-full resize-y rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
            value={value.overall_comment}
            disabled={!canEdit}
            onChange={(e) => update({ overall_comment: e.target.value })}
          />
        </FormField>

        <section>
          <h3 className="text-sm font-medium text-foreground mb-2">
            평가척도 설명 <span className="text-xs text-muted-foreground font-normal">(5단계 고정)</span>
          </h3>
          <dl className="grid grid-cols-1 sm:grid-cols-5 gap-2 rounded-lg border border-border/60 bg-muted/30 p-4">
            {PBL_EVALUATION_SCALE_ITEMS.map((item) => (
              <div
                key={item.level}
                className="flex flex-col gap-1 rounded-md border border-border/40 bg-background px-3 py-2.5"
              >
                <dt className="flex items-baseline gap-1.5">
                  <span className="text-base font-semibold text-primary tabular-nums">
                    {item.level}
                  </span>
                  <span className="text-xs font-medium text-foreground">{item.label}</span>
                </dt>
                <dd className="text-xs text-muted-foreground leading-relaxed break-keep">
                  {item.description}
                </dd>
              </div>
            ))}
          </dl>
        </section>
      </CardContent>
    </Card>
  );
}

// ----------------------------------------------------------------------------
// 나. 결과평가 (고정 설문)
// ----------------------------------------------------------------------------

function ResultEvaluationSection({
  canEdit,
  value,
  onChange,
}: {
  canEdit: boolean;
  value: PBLResultEvaluation;
  onChange: (next: PBLResultEvaluation) => void;
}) {
  const update = (patch: Partial<PBLResultEvaluation>) => onChange({ ...value, ...patch });

  const SCALE_LABELS = ['매우 아니다', '아니다', '보통', '그렇다', '매우 그렇다'] as const;

  const renderSurvey = (
    title: string,
    questions: readonly string[],
    values: SurveyScale[],
    setValues: (next: SurveyScale[]) => void,
  ) => (
    <section className="rounded-lg border border-border/60 bg-muted/20 p-4">
      <header className="flex items-baseline justify-between gap-2 flex-wrap mb-3">
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
        <span className="text-xs text-muted-foreground">{questions.length}문항 · 리커트 1~5</span>
      </header>
      <ol className="space-y-3">
        {questions.map((q, idx) => (
          <li
            key={idx}
            className="rounded-md border border-border/40 bg-background px-3 py-2.5 space-y-2"
          >
            <div className="flex items-start gap-2">
              <span className="text-xs font-semibold text-muted-foreground tabular-nums mt-0.5">
                Q{idx + 1}.
              </span>
              <p className="text-sm text-foreground whitespace-pre-wrap break-words flex-1">
                {q}
              </p>
            </div>
            <div
              className="flex items-center justify-between gap-2 flex-wrap"
              role="radiogroup"
              aria-label={`${title} 문항 ${idx + 1} 응답`}
            >
              <span className="text-[11px] text-muted-foreground shrink-0">매우 아니다</span>
              <div className="flex items-center gap-2">
                {[1, 2, 3, 4, 5].map((scale) => {
                  const id = `pbl-survey-${title}-${idx}-${scale}`;
                  const checked = values[idx] === scale;
                  return (
                    <label
                      key={scale}
                      htmlFor={id}
                      className={
                        checked
                          ? 'inline-flex h-7 w-7 items-center justify-center rounded-full border-2 border-primary bg-primary text-primary-foreground text-xs font-semibold cursor-pointer transition-colors'
                          : 'inline-flex h-7 w-7 items-center justify-center rounded-full border border-border bg-background text-xs text-muted-foreground hover:border-primary/40 hover:text-primary cursor-pointer transition-colors'
                      }
                      title={SCALE_LABELS[scale - 1]}
                    >
                      <input
                        id={id}
                        type="radio"
                        name={`pbl-survey-${title}-${idx}`}
                        disabled={!canEdit}
                        checked={checked}
                        onChange={() => {
                          const next = [...values];
                          next[idx] = scale as SurveyScale;
                          setValues(next);
                        }}
                        className="sr-only"
                      />
                      {scale}
                    </label>
                  );
                })}
              </div>
              <span className="text-[11px] text-muted-foreground shrink-0">매우 그렇다</span>
              {canEdit && values[idx] !== null && (
                <button
                  type="button"
                  className="text-xs text-muted-foreground hover:text-foreground underline-offset-2 hover:underline"
                  onClick={() => {
                    const next = [...values];
                    next[idx] = null;
                    setValues(next);
                  }}
                >
                  초기화
                </button>
              )}
            </div>
          </li>
        ))}
      </ol>
    </section>
  );

  return (
    <Card>
      <CardHeader className={CARD_HEADER_CLASS}>
        <CardTitle className="text-base">Ⅳ-4. 평가 계획 &mdash; 나. 결과평가</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6 pt-5">
        <p className="text-xs text-muted-foreground">
          결과평가 설문은 훈련 종료 후 실시됩니다. 초안 단계에서는 응답 미입력(null) 상태가 기본입니다.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField label="응답자 이름 (선택)" htmlFor="pbl-survey-name">
            <Input
              id="pbl-survey-name"
              value={value.respondent_name ?? ''}
              disabled={!canEdit}
              onChange={(e) => update({ respondent_name: e.target.value })}
            />
          </FormField>
          <FormField label="평가 일자 (선택)" htmlFor="pbl-survey-date">
            <Input
              id="pbl-survey-date"
              type="date"
              value={value.evaluation_date ?? ''}
              disabled={!canEdit}
              onChange={(e) => update({ evaluation_date: e.target.value })}
            />
          </FormField>
        </div>

        {renderSurvey(
          '만족도 조사',
          PBL_SATISFACTION_SURVEY_QUESTIONS,
          value.satisfaction_survey,
          (next) => update({ satisfaction_survey: next }),
        )}
        {renderSurvey(
          '성취도 조사',
          PBL_ACHIEVEMENT_SURVEY_QUESTIONS,
          value.achievement_survey,
          (next) => update({ achievement_survey: next }),
        )}
        {renderSurvey(
          '외부전문가 만족도 조사',
          PBL_EXTERNAL_EXPERT_SURVEY_QUESTIONS,
          value.external_expert_survey,
          (next) => update({ external_expert_survey: next }),
        )}
        {renderSurvey(
          '현업적용도 조사',
          PBL_PRACTICAL_APPLICATION_SURVEY_QUESTIONS,
          value.practical_application_survey,
          (next) => update({ practical_application_survey: next }),
        )}
      </CardContent>
    </Card>
  );
}

