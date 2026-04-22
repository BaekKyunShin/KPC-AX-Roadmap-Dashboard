'use client';

import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { FormField } from '@/components/ui/form-field';
import { GuideNote } from '@/components/ui/guide-note';
import { Plus, Trash2 } from 'lucide-react';
import {
  createEmptyTargetTask,
  createEmptyTargetTaskDetail,
  type PBLTargetTasks,
} from '@/lib/schemas/interview-pbl';

interface StepPBLTargetTasksProps {
  value: PBLTargetTasks;
  onChange: (next: PBLTargetTasks) => void;
}

const NECESSITY_OPTIONS = [1, 2, 3, 4, 5] as const;
const NECESSITY_LABELS: Record<number, string> = {
  1: '매우 낮음',
  2: '낮음',
  3: '보통',
  4: '높음',
  5: '매우 높음',
};

export default function StepPBLTargetTasks({ value, onChange }: StepPBLTargetTasksProps) {
  // ----- 섹션 A: target_tasks 동적 배열 -----
  const updateTask = (
    index: number,
    next: Partial<PBLTargetTasks['target_tasks'][number]>,
  ) => {
    const target_tasks = value.target_tasks.map((t, i) =>
      i === index ? { ...t, ...next } : t,
    );
    onChange({ ...value, target_tasks });
  };

  const addTask = () => {
    onChange({ ...value, target_tasks: [...value.target_tasks, createEmptyTargetTask()] });
  };

  const removeTask = (index: number) => {
    onChange({
      ...value,
      target_tasks: value.target_tasks.filter((_, i) => i !== index),
    });
  };

  // ----- 섹션 C: target_task_details 동적 배열 -----
  const updateDetail = (
    index: number,
    next: Partial<PBLTargetTasks['target_task_details'][number]>,
  ) => {
    const target_task_details = value.target_task_details.map((d, i) =>
      i === index ? { ...d, ...next } : d,
    );
    onChange({ ...value, target_task_details });
  };

  const addDetail = () => {
    onChange({
      ...value,
      target_task_details: [...value.target_task_details, createEmptyTargetTaskDetail()],
    });
  };

  const removeDetail = (index: number) => {
    onChange({
      ...value,
      target_task_details: value.target_task_details.filter((_, i) => i !== index),
    });
  };

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-lg font-semibold text-foreground">Ⅲ-3. 훈련대상 업무 선정</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          산인공 AI PBL 양식 Ⅲ-3 (9~10p). 훈련 대상 후보 업무의 필요도를 평가하고, 선정 사유와
          As-IS/To-Be/요구지식/요구기술 세부내용을 입력하세요.
        </p>
      </div>

      {/* ============================================================
          섹션 A — 가. 훈련대상 업무 선정
          ============================================================ */}
      <section className="space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="text-sm font-semibold text-foreground">가. 훈련대상 업무 선정</h3>
            <p className="mt-1 text-xs text-muted-foreground">
              후보 업무에 대해 AI훈련과정 개발 필요성(1~5)과 훈련대상 업무 선정 여부를 표시하세요.
            </p>
          </div>
          <Button type="button" variant="outline" size="sm" onClick={addTask}>
            <Plus className="w-4 h-4 mr-1" />
            업무 추가
          </Button>
        </div>

        {value.target_tasks.length === 0 ? (
          <p className="text-sm text-muted-foreground">아직 등록된 후보 업무가 없습니다.</p>
        ) : (
          <div className="space-y-3">
            {value.target_tasks.map((task, index) => (
              <div key={task.id} className="border border-border rounded-lg p-4 bg-muted/30">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-medium flex items-center">
                    <span className="w-6 h-6 rounded-full bg-primary/10 text-primary text-xs flex items-center justify-center mr-2">
                      {index + 1}
                    </span>
                    업무 {index + 1}
                  </span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    aria-label={`업무 ${index + 1} 삭제`}
                    onClick={() => removeTask(index)}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="w-4 h-4 mr-1" />
                    삭제
                  </Button>
                </div>

                <FormField label="업무명" htmlFor={`tt-task-${task.id}`}>
                  <Input
                    id={`tt-task-${task.id}`}
                    value={task.task_name}
                    onChange={(e) => updateTask(index, { task_name: e.target.value })}
                    placeholder="예: 외관검사 불량 판정"
                  />
                </FormField>

                <div className="mt-4">
                  <fieldset>
                    <legend className="text-sm font-medium text-foreground mb-2">
                      AI훈련과정 개발 필요성
                    </legend>
                    <div
                      role="radiogroup"
                      aria-label={`업무 ${index + 1} 필요도`}
                      className="flex flex-wrap gap-2"
                    >
                      {NECESSITY_OPTIONS.map((score) => {
                        const checked = task.necessity === score;
                        const radioId = `tt-necessity-${task.id}-${score}`;
                        return (
                          <label
                            key={score}
                            htmlFor={radioId}
                            className={`flex items-center gap-2 px-3 py-1.5 rounded-md border text-sm cursor-pointer transition-colors ${
                              checked
                                ? 'border-primary bg-primary/10 text-primary font-medium'
                                : 'border-border hover:bg-muted'
                            }`}
                          >
                            <input
                              id={radioId}
                              type="radio"
                              role="radio"
                              name={`tt-necessity-${task.id}`}
                              value={String(score)}
                              checked={checked}
                              onChange={() => updateTask(index, { necessity: score })}
                              className="sr-only"
                              aria-label={`${score} - ${NECESSITY_LABELS[score]}`}
                            />
                            <span>
                              {score}
                              <span className="ml-1 text-xs text-muted-foreground">
                                {NECESSITY_LABELS[score]}
                              </span>
                            </span>
                          </label>
                        );
                      })}
                    </div>
                  </fieldset>
                </div>

                <div className="mt-4 flex items-center gap-2">
                  <Checkbox
                    id={`tt-selected-${task.id}`}
                    checked={task.selected}
                    onCheckedChange={(next) =>
                      updateTask(index, { selected: Boolean(next) })
                    }
                    aria-label={`업무 ${index + 1} 선정`}
                  />
                  <Label htmlFor={`tt-selected-${task.id}`} className="cursor-pointer">
                    훈련대상 업무 선정 여부
                  </Label>
                </div>
              </div>
            ))}
          </div>
        )}

        <GuideNote
          items={[
            '문제 우선순위에서 도출된 결과를 분석하여 AI를 통해 가장 큰 변화가 예상되는 핵심업무(Task) 단위로 훈련대상 업무를 선정한다.',
            "해당 업무가 왜 AI훈련에 적합한지 '업무변화' 관점에서 기술한다.",
            "'AI훈련과정 개발 필요성'은 업무별로 판단하며, △기업 경영 이슈와 연계되는지, △AI가 업무에 적용될 경우 중장기 또는 단기 성과가 나올 수 있는지 △AI훈련 및 평가가 가능한 업무인지 등을 종합적으로 고려해야 함.",
            "'업무명'은 조직도에서 선택한 부서명을 기반으로 자동 불러옴 처리하며, 내용 수정이 불가함.",
            "'훈련대상 업무 선정 여부'는 최종적으로 기업 담당자와 논의하여 선정함.",
            '(목적) 조직, 개인, 업무, 환경의 요구사항을 반영하여 훈련과정 개발 우선순위를 선정',
          ]}
        />
      </section>

      {/* ============================================================
          섹션 B — 나. AI기반 문제해결의 필요성(훈련대상 업무 선정 사유)
          ============================================================ */}
      <section>
        <FormField
          label="나. AI기반 문제해결의 필요성(훈련대상 업무 선정 사유)"
          htmlFor="tt-selection-reason"
          required
          hint="선정한 훈련대상 업무에 AI기반 문제해결이 필요한 이유"
        >
          <Textarea
            id="tt-selection-reason"
            rows={5}
            value={value.selection_reason}
            onChange={(e) => onChange({ ...value, selection_reason: e.target.value })}
            placeholder="예) 외관검사 공정은 검사원 피로도로 인해 편차 발생. 데이터가 충분하며 AI 자동화 효과가 명확함."
            className="break-keep"
          />
        </FormField>
      </section>

      {/* ============================================================
          섹션 C — 다. 훈련대상 업무 세부내용
          ============================================================ */}
      <section className="space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="text-sm font-semibold text-foreground">다. 훈련대상 업무 세부내용</h3>
            <p className="mt-1 text-xs text-muted-foreground">
              선정된 업무별 현재 업무방식(AS-IS) / AI활용방식(TO-BE) / 요구지식 / 기술을 작성하세요.
            </p>
          </div>
          <Button type="button" variant="outline" size="sm" onClick={addDetail}>
            <Plus className="w-4 h-4 mr-1" />
            업무 세부내용 추가
          </Button>
        </div>

        {value.target_task_details.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            아직 등록된 세부내용이 없습니다.
          </p>
        ) : (
          <div className="space-y-4">
            {value.target_task_details.map((detail, index) => (
              <div
                key={detail.id}
                className="border border-border rounded-lg p-4 bg-muted/30"
              >
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-medium flex items-center">
                    <span className="w-6 h-6 rounded-full bg-primary/10 text-primary text-xs flex items-center justify-center mr-2">
                      {index + 1}
                    </span>
                    세부내용 {index + 1}
                  </span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    aria-label={`세부내용 ${index + 1} 삭제`}
                    onClick={() => removeDetail(index)}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="w-4 h-4 mr-1" />
                    삭제
                  </Button>
                </div>

                <FormField label="업무명" htmlFor={`ttd-task-${detail.id}`}>
                  <Input
                    id={`ttd-task-${detail.id}`}
                    value={detail.task_name}
                    onChange={(e) => updateDetail(index, { task_name: e.target.value })}
                    placeholder="예: 외관검사 불량 판정"
                  />
                </FormField>

                <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    label="현재 업무방식(AS-IS)"
                    htmlFor={`ttd-asis-${detail.id}`}
                  >
                    <Textarea
                      id={`ttd-asis-${detail.id}`}
                      rows={6}
                      value={detail.as_is}
                      onChange={(e) => updateDetail(index, { as_is: e.target.value })}
                      placeholder="예) 검사원이 육안으로 판정"
                      className="break-keep"
                    />
                  </FormField>
                  <FormField
                    label="AI활용방식(TO-BE)"
                    htmlFor={`ttd-tobe-${detail.id}`}
                  >
                    <Textarea
                      id={`ttd-tobe-${detail.id}`}
                      rows={6}
                      value={detail.to_be}
                      onChange={(e) => updateDetail(index, { to_be: e.target.value })}
                      placeholder="예) AI 비전 모델이 자동 판정, 검사원은 리뷰만 수행"
                      className="break-keep"
                    />
                  </FormField>
                  <FormField
                    label="요구지식"
                    htmlFor={`ttd-knowledge-${detail.id}`}
                  >
                    <Textarea
                      id={`ttd-knowledge-${detail.id}`}
                      rows={6}
                      value={detail.required_knowledge}
                      onChange={(e) =>
                        updateDetail(index, { required_knowledge: e.target.value })
                      }
                      placeholder="예) 이미지 분류 기본 개념, 불량 유형 분류 기준"
                      className="break-keep"
                    />
                  </FormField>
                  <FormField
                    label="기술"
                    htmlFor={`ttd-skill-${detail.id}`}
                  >
                    <Textarea
                      id={`ttd-skill-${detail.id}`}
                      rows={6}
                      value={detail.required_skill}
                      onChange={(e) =>
                        updateDetail(index, { required_skill: e.target.value })
                      }
                      placeholder="예) Python, 이미지 라벨링 도구, 검사 결과 리뷰"
                      className="break-keep"
                    />
                  </FormField>
                </div>
              </div>
            ))}
          </div>
        )}

        <GuideNote
          items={[
            '훈련대상 업무가 AI활용·도입 전후로 어떻게 변화하는지, 그에 따른 어떤 역량이 필요한지, 특히 현재 업무방식(AS-IS)에서 AI로 인해 변화된 업무방식(TO-BE)을 기술한다.',
            "'세부내용/지식/기술'은 해당 업무를 수행하기 위해 어떠한 과업(task)을 수행해야 하는지, 어떤 지식과 기술이 요구되는지 인터뷰를 통해 도출함. 2개 이상의 과업으로 이루어지는 경우 행 추가하여 작성 필요",
            "'업무명'은 훈련대상 업무 선정 여부에서 선택된 업무를 자동 불러옴 처리하며, 내용 수정이 불가함.",
          ]}
        />
      </section>
    </div>
  );
}
