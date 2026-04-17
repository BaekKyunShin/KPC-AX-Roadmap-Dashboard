'use client';

import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
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
  1: '낮음',
  2: '미흡',
  3: '보통',
  4: '권장',
  5: '필수',
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
          섹션 A — 훈련대상 업무 선정
          ============================================================ */}
      <section className="space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="text-sm font-semibold text-foreground">훈련대상 업무 선정</h3>
            <p className="mt-1 text-xs text-muted-foreground">
              후보 업무에 대해 AI기반 문제해결 필요도(1~5)와 선정 여부를 표시하세요.
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

                <div>
                  <Label htmlFor={`tt-task-${task.id}`}>업무명</Label>
                  <Input
                    id={`tt-task-${task.id}`}
                    value={task.task_name}
                    onChange={(e) => updateTask(index, { task_name: e.target.value })}
                    placeholder="예: 외관검사 불량 판정"
                    className="mt-1"
                  />
                </div>

                <div className="mt-4">
                  <fieldset>
                    <legend className="text-sm font-medium text-foreground mb-2">
                      AI기반 문제해결 필요도
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
                    훈련대상 업무로 선정
                  </Label>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ============================================================
          섹션 B — 선정 사유
          ============================================================ */}
      <section>
        <Label htmlFor="tt-selection-reason">
          AI기반 문제해결의 필요성 (선정 사유) <span className="text-destructive">*</span>
        </Label>
        <p className="text-xs text-muted-foreground mt-1 mb-2">
          선정한 훈련대상 업무에 AI기반 문제해결이 필요한 이유
        </p>
        <Textarea
          id="tt-selection-reason"
          rows={5}
          value={value.selection_reason}
          onChange={(e) => onChange({ ...value, selection_reason: e.target.value })}
          placeholder="예) 외관검사 공정은 검사원 피로도로 인해 편차 발생. 데이터가 충분하며 AI 자동화 효과가 명확함."
          className="break-keep"
        />
      </section>

      {/* ============================================================
          섹션 C — 선정 업무 세부내용
          ============================================================ */}
      <section className="space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="text-sm font-semibold text-foreground">선정 업무 세부내용</h3>
            <p className="mt-1 text-xs text-muted-foreground">
              선정된 업무별 As-IS / To-Be / 요구지식 / 요구기술을 작성하세요.
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

                <div>
                  <Label htmlFor={`ttd-task-${detail.id}`}>업무명</Label>
                  <Input
                    id={`ttd-task-${detail.id}`}
                    value={detail.task_name}
                    onChange={(e) => updateDetail(index, { task_name: e.target.value })}
                    placeholder="예: 외관검사 불량 판정"
                    className="mt-1"
                  />
                </div>

                <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor={`ttd-asis-${detail.id}`}>As-IS (현행 방식)</Label>
                    <Textarea
                      id={`ttd-asis-${detail.id}`}
                      rows={3}
                      value={detail.as_is}
                      onChange={(e) => updateDetail(index, { as_is: e.target.value })}
                      placeholder="예) 검사원이 육안으로 판정"
                      className="mt-1 break-keep"
                    />
                  </div>
                  <div>
                    <Label htmlFor={`ttd-tobe-${detail.id}`}>To-Be (향후 모습)</Label>
                    <Textarea
                      id={`ttd-tobe-${detail.id}`}
                      rows={3}
                      value={detail.to_be}
                      onChange={(e) => updateDetail(index, { to_be: e.target.value })}
                      placeholder="예) AI 비전 모델이 자동 판정, 검사원은 리뷰만 수행"
                      className="mt-1 break-keep"
                    />
                  </div>
                  <div>
                    <Label htmlFor={`ttd-knowledge-${detail.id}`}>요구지식</Label>
                    <Textarea
                      id={`ttd-knowledge-${detail.id}`}
                      rows={3}
                      value={detail.required_knowledge}
                      onChange={(e) =>
                        updateDetail(index, { required_knowledge: e.target.value })
                      }
                      placeholder="예) 이미지 분류 기본 개념, 불량 유형 분류 기준"
                      className="mt-1 break-keep"
                    />
                  </div>
                  <div>
                    <Label htmlFor={`ttd-skill-${detail.id}`}>요구기술</Label>
                    <Textarea
                      id={`ttd-skill-${detail.id}`}
                      rows={3}
                      value={detail.required_skill}
                      onChange={(e) =>
                        updateDetail(index, { required_skill: e.target.value })
                      }
                      placeholder="예) Python, 이미지 라벨링 도구, 검사 결과 리뷰"
                      className="mt-1 break-keep"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
