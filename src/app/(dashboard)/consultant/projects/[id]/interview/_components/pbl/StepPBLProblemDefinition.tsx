'use client';

import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Plus, Trash2 } from 'lucide-react';
import {
  createEmptyProblemPriority,
  type PBLProblemDefinition,
} from '@/lib/schemas/interview-pbl';

interface StepPBLProblemDefinitionProps {
  value: PBLProblemDefinition;
  onChange: (next: PBLProblemDefinition) => void;
}

type ProblemPriorityItem = PBLProblemDefinition['problem_priorities'][number];
type ProblemDefinitionDetail = PBLProblemDefinition['problem_definition'];

const PRIORITY_OPTIONS = [1, 2, 3, 4, 5] as const;
const PRIORITY_LABELS: Record<number, string> = {
  1: '낮음',
  2: '미흡',
  3: '보통',
  4: '중요',
  5: '매우중요',
};

export default function StepPBLProblemDefinition({
  value,
  onChange,
}: StepPBLProblemDefinitionProps) {
  const { problem_definition, problem_priorities } = value;

  const updateDefinition = (
    key: keyof ProblemDefinitionDetail,
    next: string,
  ) => {
    onChange({
      ...value,
      problem_definition: { ...problem_definition, [key]: next },
    });
  };

  const updatePriority = <K extends keyof ProblemPriorityItem>(
    index: number,
    key: K,
    next: ProblemPriorityItem[K],
  ) => {
    const nextList = problem_priorities.map((item, i) =>
      i === index ? { ...item, [key]: next } : item,
    );
    onChange({ ...value, problem_priorities: nextList });
  };

  const addPriority = () => {
    onChange({
      ...value,
      problem_priorities: [...problem_priorities, createEmptyProblemPriority()],
    });
  };

  const removePriority = (index: number) => {
    if (problem_priorities.length <= 1) return;
    onChange({
      ...value,
      problem_priorities: problem_priorities.filter((_, i) => i !== index),
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-foreground">
          Ⅲ-2. 문제 도출·우선순위
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          산인공 양식 Ⅲ-2. 기업이 당면한 문제를 정의하고, 훈련과제 도출을 위해
          우선순위를 평가하세요.
        </p>
      </div>

      {/* 섹션 A — 문제정의서 */}
      <section className="space-y-4">
        <h3 className="text-sm font-semibold text-foreground">문제정의서</h3>

        <div>
          <Label htmlFor="pd-background">
            배경 <span className="text-destructive">*</span>
          </Label>
          <Textarea
            id="pd-background"
            rows={3}
            value={problem_definition.background}
            onChange={(e) => updateDefinition('background', e.target.value)}
            placeholder="예) 산업 환경 변화·경쟁 심화 등 문제 발생 맥락"
            className="mt-1 break-keep"
          />
        </div>

        <div>
          <Label htmlFor="pd-core-problem">
            핵심문제 <span className="text-destructive">*</span>
          </Label>
          <Textarea
            id="pd-core-problem"
            rows={3}
            value={problem_definition.core_problem}
            onChange={(e) => updateDefinition('core_problem', e.target.value)}
            placeholder="예) 훈련 대상·업무에서 관찰되는 핵심 문제 서술"
            className="mt-1 break-keep"
          />
        </div>

        <div>
          <Label htmlFor="pd-scope">
            문제범위 <span className="text-destructive">*</span>
          </Label>
          <Textarea
            id="pd-scope"
            rows={3}
            value={problem_definition.scope}
            onChange={(e) => updateDefinition('scope', e.target.value)}
            placeholder="예) 적용 부서·공정 범위, 영향 대상"
            className="mt-1 break-keep"
          />
        </div>

        <div>
          <Label htmlFor="pd-constraints">
            제약조건 <span className="text-destructive">*</span>
          </Label>
          <Textarea
            id="pd-constraints"
            rows={3}
            value={problem_definition.constraints}
            onChange={(e) => updateDefinition('constraints', e.target.value)}
            placeholder="예) 예산·인력·일정·기술 제약"
            className="mt-1 break-keep"
          />
        </div>
      </section>

      {/* 섹션 B — 문제 우선순위 */}
      <section className="space-y-4 border-t border-border pt-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-foreground">
              문제 우선순위
            </h3>
            <p className="mt-1 text-xs text-muted-foreground">
              후보 문제별 중요도(1~5점)를 평가하고, 훈련대상 선정 여부를
              체크하세요.
            </p>
          </div>
          <Button type="button" variant="outline" size="sm" onClick={addPriority}>
            <Plus className="w-4 h-4 mr-1" />
            문제 추가
          </Button>
        </div>

        {problem_priorities.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            아직 등록된 문제가 없습니다. 문제를 추가하여 우선순위를 평가하세요.
          </p>
        ) : (
          <div className="space-y-4">
            {problem_priorities.map((item, index) => (
              <div
                key={item.id}
                className="border border-border rounded-lg p-4 bg-muted/30"
              >
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-sm font-medium text-foreground flex items-center">
                    <span className="w-6 h-6 rounded-full bg-primary/10 text-primary text-xs flex items-center justify-center mr-2">
                      {index + 1}
                    </span>
                    문제 {index + 1}
                  </h4>
                  {problem_priorities.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      aria-label={`문제 ${index + 1} 삭제`}
                      onClick={() => removePriority(index)}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="w-4 h-4 mr-1" />
                      삭제
                    </Button>
                  )}
                </div>

                <div>
                  <Label htmlFor={`pp-name-${item.id}`}>
                    문제명 <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id={`pp-name-${item.id}`}
                    value={item.problem_name}
                    onChange={(e) =>
                      updatePriority(index, 'problem_name', e.target.value)
                    }
                    placeholder="예) 불량률 증가로 인한 납기 지연"
                    className="mt-1"
                  />
                </div>

                <div className="mt-4">
                  <fieldset>
                    <legend className="text-sm font-medium text-foreground mb-2">
                      우선순위 <span className="text-destructive">*</span>
                    </legend>
                    <div
                      role="radiogroup"
                      aria-label="우선순위"
                      className="flex flex-wrap gap-2"
                    >
                      {PRIORITY_OPTIONS.map((score) => {
                        const checked = item.priority === score;
                        const radioId = `pp-priority-${item.id}-${score}`;
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
                              name={`pp-priority-${item.id}`}
                              value={String(score)}
                              checked={checked}
                              onChange={() =>
                                updatePriority(index, 'priority', score)
                              }
                              className="sr-only"
                              aria-label={`${score} - ${PRIORITY_LABELS[score]}`}
                            />
                            <span>
                              {score}
                              <span className="ml-1 text-xs text-muted-foreground">
                                {PRIORITY_LABELS[score]}
                              </span>
                            </span>
                          </label>
                        );
                      })}
                    </div>
                  </fieldset>
                </div>

                <div className="mt-4">
                  <label
                    htmlFor={`pp-selected-${item.id}`}
                    className="flex items-center gap-2 cursor-pointer"
                  >
                    <Checkbox
                      id={`pp-selected-${item.id}`}
                      checked={item.selected}
                      onCheckedChange={(checked) =>
                        updatePriority(index, 'selected', checked === true)
                      }
                      aria-label={`문제 ${index + 1} 선정`}
                    />
                    <span className="text-sm text-foreground">
                      훈련과제로 선정
                    </span>
                  </label>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
