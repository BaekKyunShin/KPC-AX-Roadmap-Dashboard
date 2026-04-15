'use client';

import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Plus, Trash2 } from 'lucide-react';
import {
  createEmptyTaskWorkflowItem,
  type TaskWorkflowItem,
} from '@/lib/schemas/interview-roadmap';

interface StepTaskWorkflowAnalysisProps {
  items: TaskWorkflowItem[];
  onChange: (next: TaskWorkflowItem[]) => void;
}

const AI_NECESSITY_OPTIONS = [1, 2, 3, 4, 5] as const;
const AI_NECESSITY_LABELS: Record<number, string> = {
  1: '불필요',
  2: '선택',
  3: '중립',
  4: '권장',
  5: '필수',
};

export default function StepTaskWorkflowAnalysis({
  items,
  onChange,
}: StepTaskWorkflowAnalysisProps) {
  const updateItem = <K extends keyof TaskWorkflowItem>(
    index: number,
    key: K,
    value: TaskWorkflowItem[K],
  ) => {
    const next = items.map((item, i) => (i === index ? { ...item, [key]: value } : item));
    onChange(next);
  };

  const addItem = () => {
    onChange([...items, createEmptyTaskWorkflowItem()]);
  };

  const removeItem = (index: number) => {
    if (items.length <= 1) return;
    onChange(items.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-foreground">과업·워크플로우 분석</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            산업인력공단 AI 훈련로드맵 양식 Ⅱ-3. 직무별 과업의 현행 방식과 문제점, 데이터 보유 현황,
            AI 필요도를 분석해주세요.
          </p>
        </div>
        <Button type="button" variant="outline" size="sm" onClick={addItem}>
          <Plus className="w-4 h-4 mr-1" />
          과업 추가
        </Button>
      </div>

      <div className="space-y-4">
        {items.map((item, index) => (
          <div key={item.id} className="border border-border rounded-lg p-4 bg-muted/30">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-medium text-foreground flex items-center">
                <span className="w-6 h-6 rounded-full bg-primary/10 text-primary text-xs flex items-center justify-center mr-2">
                  {index + 1}
                </span>
                과업 {index + 1}
              </h3>
              {items.length > 1 && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  aria-label={`행 삭제: 과업 ${index + 1}`}
                  onClick={() => removeItem(index)}
                  className="text-destructive hover:text-destructive"
                >
                  <Trash2 className="w-4 h-4 mr-1" />
                  삭제
                </Button>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor={`twf-job-${item.id}`}>
                  직무 <span className="text-destructive">*</span>
                </Label>
                <Input
                  id={`twf-job-${item.id}`}
                  value={item.job}
                  onChange={(e) => updateItem(index, 'job', e.target.value)}
                  placeholder="예: 생산 / 품질 / 설비"
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor={`twf-task-${item.id}`}>
                  과업명 <span className="text-destructive">*</span>
                </Label>
                <Input
                  id={`twf-task-${item.id}`}
                  value={item.task_name}
                  onChange={(e) => updateItem(index, 'task_name', e.target.value)}
                  placeholder="예: 완제품 외관 검사"
                  className="mt-1"
                />
              </div>
            </div>

            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor={`twf-asis-${item.id}`}>
                  현행 방식 (As-Is) <span className="text-destructive">*</span>
                </Label>
                <Textarea
                  id={`twf-asis-${item.id}`}
                  rows={3}
                  value={item.as_is}
                  onChange={(e) => updateItem(index, 'as_is', e.target.value)}
                  placeholder="예) 검사원 2명이 라인에서 육안으로 외관 검사"
                  className="mt-1 break-keep"
                />
              </div>
              <div>
                <Label htmlFor={`twf-problems-${item.id}`}>
                  문제점 <span className="text-destructive">*</span>
                </Label>
                <Textarea
                  id={`twf-problems-${item.id}`}
                  rows={3}
                  value={item.problems}
                  onChange={(e) => updateItem(index, 'problems', e.target.value)}
                  placeholder="예) 검사원 피로도에 따라 품질 편차 발생, 재검사 필요"
                  className="mt-1 break-keep"
                />
              </div>
            </div>

            <div className="mt-4">
              <Label htmlFor={`twf-data-${item.id}`}>
                데이터 발생시점 / 보유 현황 <span className="text-destructive">*</span>
              </Label>
              <Textarea
                id={`twf-data-${item.id}`}
                rows={2}
                value={item.data_availability}
                onChange={(e) => updateItem(index, 'data_availability', e.target.value)}
                placeholder="예) 검사 이미지 2년치(DB 저장), 불량 판정 로그 1년치"
                className="mt-1 break-keep"
              />
            </div>

            <div className="mt-4">
              <fieldset>
                <legend className="text-sm font-medium text-foreground mb-2">
                  AI 도입 필요도 <span className="text-destructive">*</span>
                </legend>
                <div
                  role="radiogroup"
                  aria-label="AI 도입 필요도"
                  className="flex flex-wrap gap-2"
                >
                  {AI_NECESSITY_OPTIONS.map((score) => {
                    const checked = item.ai_necessity === score;
                    const radioId = `twf-ai-${item.id}-${score}`;
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
                          name={`twf-ai-${item.id}`}
                          value={String(score)}
                          checked={checked}
                          onChange={() => updateItem(index, 'ai_necessity', score)}
                          className="sr-only"
                          aria-label={`${score} - ${AI_NECESSITY_LABELS[score]}`}
                        />
                        <span>
                          {score}
                          <span className="ml-1 text-xs text-muted-foreground">
                            {AI_NECESSITY_LABELS[score]}
                          </span>
                        </span>
                      </label>
                    );
                  })}
                </div>
              </fieldset>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
