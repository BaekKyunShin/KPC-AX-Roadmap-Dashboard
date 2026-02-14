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
      <div className="grid grid-cols-5 gap-2">
        {SCALE_5_VALUES.map((v) => {
          const isSelected = value === v;
          return (
            <button
              key={v}
              type="button"
              onClick={() => onChange(question.id, v)}
              className={`flex items-center justify-center gap-2 px-3 py-2 rounded-lg border-2 transition-all ${
                isSelected
                  ? 'bg-blue-50 border-blue-500 text-blue-700'
                  : 'bg-white border-gray-200 text-gray-600 hover:border-blue-300 hover:bg-gray-50'
              }`}
            >
              <span className={`text-sm font-semibold ${isSelected ? 'text-blue-600' : 'text-gray-700'}`}>
                {v}
              </span>
              <span className="text-xs">{SCALE_5_LABELS[v - 1]}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
