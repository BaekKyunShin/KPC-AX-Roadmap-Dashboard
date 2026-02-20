import { cn } from '@/lib/utils';
import type { Question } from './types';
import { SCALE_5_LABELS, SCALE_5_VALUES } from './constants';

interface QuestionInputProps {
  question: Question;
  value: number | undefined;
  onChange: (questionId: string, value: number) => void;
}

export function QuestionInput({ question, value, onChange }: QuestionInputProps) {
  return (
    <div className="w-full">
      <div className="grid grid-cols-5 gap-1 sm:gap-2">
        {SCALE_5_VALUES.map((v) => {
          const isSelected = value === v;
          return (
            <button
              key={v}
              type="button"
              onClick={() => onChange(question.id, v)}
              className={cn(
                'flex flex-col sm:flex-row items-center justify-center gap-0.5 sm:gap-2 px-1.5 sm:px-3 py-2 rounded-lg border-2 transition-all',
                isSelected
                  ? 'bg-blue-50 border-blue-500 text-blue-700'
                  : 'bg-white border-gray-200 text-gray-600 hover:border-blue-300 hover:bg-gray-50'
              )}
            >
              <span className={cn('text-sm font-semibold', isSelected ? 'text-blue-600' : 'text-gray-700')}>
                {v}
              </span>
              <span className="hidden sm:inline text-xs">{SCALE_5_LABELS[v - 1]}</span>
            </button>
          );
        })}
      </div>
      <div className="flex justify-between text-[10px] text-gray-400 mt-1 sm:hidden">
        <span>{SCALE_5_LABELS[0]}</span>
        <span>{SCALE_5_LABELS[SCALE_5_LABELS.length - 1]}</span>
      </div>
    </div>
  );
}
