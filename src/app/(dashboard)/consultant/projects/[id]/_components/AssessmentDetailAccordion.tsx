'use client';

import { useMemo, useState } from 'react';
import { ChevronDown, ListChecks } from 'lucide-react';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { getScoreColor } from '@/lib/constants/score-color';
import { cn } from '@/lib/utils';

// =============================================================================
// 타입 정의
// =============================================================================

export interface AssessmentAnswer {
  question_id: string;
  answer_value: number | string;
}

export interface AssessmentQuestion {
  id: string;
  order: number;
  dimension: string;
  question_text: string;
  question_type: string;
  weight: number;
  options?: string[];
}

interface QuestionWithAnswer extends AssessmentQuestion {
  answer: number | string | null;
}

interface DimensionGroup {
  dimension: string;
  questions: QuestionWithAnswer[];
  score: number;
  maxScore: number;
}

interface Props {
  answers: AssessmentAnswer[];
  questions: AssessmentQuestion[];
}

// =============================================================================
// 상수
// =============================================================================

const SCALE_5_LABELS = ['매우 그렇지 않다', '그렇지 않다', '보통이다', '그렇다', '매우 그렇다'];

// =============================================================================
// 컴포넌트
// =============================================================================

function ScaleIndicator({ value, max = 5 }: { value: number; max?: number }) {
  return (
    <div className="flex items-center gap-4">
      {Array.from({ length: max }, (_, i) => {
        const point = i + 1;
        const isSelected = point === value;
        return (
          <div key={point} className="flex flex-col items-center">
            <div
              className={cn(
                'h-7 w-7 rounded-full flex items-center justify-center text-xs font-medium transition-colors',
                isSelected
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-400'
              )}
            >
              {point}
            </div>
            {max === 5 && (
              <span className={cn(
                'mt-1 text-[10px] leading-tight text-center whitespace-nowrap',
                isSelected ? 'text-blue-600 font-medium' : 'text-gray-400'
              )}>
                {SCALE_5_LABELS[i]}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}

function QuestionAnswer({ question }: { question: QuestionWithAnswer }) {
  const { question_type, answer, options } = question;

  if (answer === null) {
    return <p className="text-xs text-gray-400">미응답</p>;
  }

  if (question_type === 'SCALE_5' && typeof answer === 'number') {
    return <ScaleIndicator value={answer} max={5} />;
  }

  if (question_type === 'SCALE_10' && typeof answer === 'number') {
    return <ScaleIndicator value={answer} max={10} />;
  }

  if (question_type === 'TEXT' && typeof answer === 'string') {
    return (
      <p className="text-sm text-gray-600 bg-gray-50 rounded-lg p-3 whitespace-pre-line break-keep break-words">
        {answer}
      </p>
    );
  }

  if (question_type === 'MULTIPLE_CHOICE' && typeof answer === 'number' && options) {
    return (
      <p className="text-sm text-gray-600 bg-gray-50 rounded-lg p-3">
        {options[answer - 1] ?? `선택 ${answer}`}
      </p>
    );
  }

  return null;
}

export function AssessmentDetailAccordion({ answers, questions }: Props) {
  const [isOpen, setIsOpen] = useState(false);

  const answerMap = useMemo(() => {
    const map = new Map<string, number | string>();
    for (const a of answers) {
      map.set(a.question_id, a.answer_value);
    }
    return map;
  }, [answers]);

  const dimensionGroups = useMemo(() => {
    const groups = new Map<string, DimensionGroup>();

    const sorted = [...questions].sort((a, b) => a.order - b.order);
    for (const q of sorted) {
      if (!groups.has(q.dimension)) {
        groups.set(q.dimension, {
          dimension: q.dimension,
          questions: [],
          score: 0,
          maxScore: 0,
        });
      }
      const group = groups.get(q.dimension)!;
      const answer = answerMap.get(q.id) ?? null;
      group.questions.push({ ...q, answer });

      if (q.question_type === 'SCALE_5') {
        const val = typeof answer === 'number' ? answer : 0;
        group.score += val * q.weight;
        group.maxScore += 5 * q.weight;
      }
    }

    return Array.from(groups.values());
  }, [questions, answerMap]);

  if (answers.length === 0 || questions.length === 0) {
    return null;
  }

  const totalDimensions = dimensionGroups.length;
  const totalQuestions = questions.length;

  return (
    <div className="mt-5 border-t border-gray-100 pt-4">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-between w-full rounded-lg bg-gray-50 px-4 py-2.5 transition-colors hover:bg-blue-50 group"
      >
        <div className="flex items-center gap-2">
          <ListChecks className="h-4 w-4 text-blue-600" />
          <span className="text-sm font-medium text-blue-600">
            {isOpen ? '항목별 응답 접기' : '항목별 응답 보기'}
          </span>
          <span className="text-xs text-gray-400">
            {totalDimensions}개 영역 · {totalQuestions}문항
          </span>
        </div>
        <ChevronDown
          className={cn('h-4 w-4 text-gray-400 transition-transform group-hover:text-blue-500', isOpen && 'rotate-180')}
        />
      </button>

      {isOpen && (
        <div className="mt-3">
          <Accordion type="single" collapsible className="space-y-2">
            {dimensionGroups.map((group) => {
              const roundedScore = Math.round(group.score);
              const roundedMax = Math.round(group.maxScore);
              const pct = roundedMax > 0 ? Math.round((roundedScore / roundedMax) * 100) : 0;
              const color = getScoreColor(pct);

              return (
                <AccordionItem
                  key={group.dimension}
                  value={group.dimension}
                  className="border rounded-lg overflow-hidden"
                >
                  <AccordionTrigger className="px-4 py-3 hover:no-underline hover:bg-gray-50 [&[data-state=open]]:bg-gray-50">
                    <div className="flex items-center justify-between w-full pr-2">
                      <span className="text-sm font-medium text-gray-900">
                        {group.dimension}
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-gray-500">
                          {roundedScore}/{roundedMax}
                        </span>
                        <span className={cn('px-2 py-0.5 rounded-full text-xs font-medium', color.light, color.text)}>
                          {pct}%
                        </span>
                      </div>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="px-4 pb-4">
                    <div className="space-y-4 pt-2">
                      {group.questions.map((q, idx) => (
                        <div key={q.id} className="flex flex-col gap-2">
                          <p className="text-sm text-gray-700">
                            <span className="text-gray-400 mr-1.5">{idx + 1}.</span>
                            {q.question_text}
                          </p>
                          <QuestionAnswer question={q} />
                        </div>
                      ))}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              );
            })}
          </Accordion>
        </div>
      )}
    </div>
  );
}
