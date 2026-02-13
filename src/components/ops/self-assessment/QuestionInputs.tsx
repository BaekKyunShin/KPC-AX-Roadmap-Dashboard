import type { Question } from './types';
import { SCALE_5_LABELS, SCALE_5_VALUES, SCALE_10_VALUES } from './constants';

interface QuestionInputProps {
  question: Question;
  value: number | string | undefined;
  onChange: (questionId: string, value: number | string) => void;
}

function Scale5Input({ question, value, onChange }: QuestionInputProps) {
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

function Scale10Input({ question, value, onChange }: QuestionInputProps) {
  return (
    <div>
      <div className="flex flex-wrap gap-2">
        {SCALE_10_VALUES.map((v) => {
          const isSelected = value === v;
          return (
            <button
              key={v}
              type="button"
              onClick={() => onChange(question.id, v)}
              className={`w-9 h-9 rounded-lg border text-sm font-medium transition-colors ${
                isSelected
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-white text-gray-700 border-gray-300 hover:border-blue-400'
              }`}
            >
              {v}
            </button>
          );
        })}
      </div>
      <div className="flex justify-between text-xs text-gray-400 mt-1 px-1">
        <span>매우 낮음</span>
        <span>보통</span>
        <span>매우 높음</span>
      </div>
    </div>
  );
}

function MultipleChoiceInput({ question, value, onChange }: QuestionInputProps) {
  return (
    <div className="space-y-2">
      {question.options?.map((option, index) => {
        const optionValue = index + 1;
        const isSelected = value === optionValue;
        return (
          <label
            key={index}
            className={`flex items-center p-3 border rounded-lg cursor-pointer transition-colors ${
              isSelected ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <input
              type="radio"
              name={`question-${question.id}`}
              value={optionValue}
              checked={isSelected}
              onChange={() => onChange(question.id, optionValue)}
              className="h-4 w-4 text-blue-600 border-gray-300"
            />
            <span className="ml-3 text-sm text-gray-700">{option}</span>
          </label>
        );
      })}
    </div>
  );
}

function TextInput({ question, value, onChange }: QuestionInputProps) {
  const textValue = (value as string) || '';
  return (
    <div>
      <textarea
        value={textValue}
        onChange={(e) => onChange(question.id, e.target.value)}
        rows={3}
        placeholder="답변을 입력하세요..."
        className="block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-sm break-keep"
      />
      <p className="mt-1 text-xs text-gray-400">
        {textValue.length}자
      </p>
    </div>
  );
}

export function QuestionInput({ question, value, onChange }: QuestionInputProps) {
  switch (question.question_type) {
    case 'SCALE_5':
      return <Scale5Input question={question} value={value} onChange={onChange} />;
    case 'SCALE_10':
      return <Scale10Input question={question} value={value} onChange={onChange} />;
    case 'MULTIPLE_CHOICE':
      return <MultipleChoiceInput question={question} value={value} onChange={onChange} />;
    case 'TEXT':
      return <TextInput question={question} value={value} onChange={onChange} />;
    default:
      return <Scale5Input question={question} value={value} onChange={onChange} />;
  }
}
