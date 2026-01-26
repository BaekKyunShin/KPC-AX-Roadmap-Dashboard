'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { createSelfAssessment } from '@/app/(dashboard)/ops/projects/actions';

interface Question {
  id: string;
  order: number;
  dimension: string;
  question_text: string;
  question_type: 'SCALE_5' | 'SCALE_10' | 'MULTIPLE_CHOICE' | 'TEXT';
  options?: string[];
  weight: number;
}

interface Template {
  id: string;
  version: number;
  name: string;
  questions: Question[];
}

interface SelfAssessmentFormProps {
  projectId: string;
  template: Template;
}

// 상수 정의
const CIRCLED_NUMBERS = [
  '①','②','③','④','⑤','⑥','⑦','⑧','⑨','⑩',
  '⑪','⑫','⑬','⑭','⑮','⑯','⑰','⑱','⑲','⑳',
  '㉑','㉒','㉓','㉔','㉕','㉖','㉗','㉘','㉙','㉚'
];

const SCALE_5_LABELS = ['매우 그렇지 않다', '그렇지 않다', '보통이다', '그렇다', '매우 그렇다'];
const SCALE_5_VALUES = [1, 2, 3, 4, 5] as const;
const SCALE_10_VALUES = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] as const;

// 유틸리티 함수
const toCircledNumber = (n: number): string => CIRCLED_NUMBERS[n - 1] || n.toString();

const groupQuestionsByDimension = (questions: Question[]): Record<string, Question[]> => {
  return questions.reduce((acc, q) => {
    if (!acc[q.dimension]) {
      acc[q.dimension] = [];
    }
    acc[q.dimension].push(q);
    return acc;
  }, {} as Record<string, Question[]>);
};

export default function SelfAssessmentForm({ projectId, template }: SelfAssessmentFormProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [answers, setAnswers] = useState<Record<string, number | string>>({});

  // 질문을 차원별로 그룹화 (메모이제이션)
  const questionsByDimension = useMemo(
    () => groupQuestionsByDimension(template.questions),
    [template.questions]
  );

  const handleAnswerChange = (questionId: string, value: number | string) => {
    setAnswers((prev) => ({
      ...prev,
      [questionId]: value,
    }));
  };

  // 질문 타입에 따른 검증
  const isQuestionAnswered = (question: Question): boolean => {
    const answer = answers[question.id];
    if (answer === undefined) return false;
    if (question.question_type === 'TEXT') {
      return typeof answer === 'string' && answer.trim().length > 0;
    }
    return true;
  };

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    // 모든 질문에 응답했는지 확인
    const unansweredQuestions = template.questions.filter((q) => !isQuestionAnswered(q));
    if (unansweredQuestions.length > 0) {
      setError(`${unansweredQuestions.length}개의 미응답 질문이 있습니다.`);
      // 첫 번째 미응답 질문으로 스크롤
      const firstUnanswered = document.getElementById(`question-${unansweredQuestions[0].id}`);
      firstUnanswered?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }

    setIsLoading(true);

    const formData = new FormData();
    formData.set('project_id', projectId);
    formData.set('template_id', template.id);
    formData.set(
      'answers',
      JSON.stringify(
        Object.entries(answers).map(([question_id, answer_value]) => ({
          question_id,
          answer_value,
        }))
      )
    );

    const summaryText = (e.currentTarget.elements.namedItem('summary_text') as HTMLTextAreaElement)
      ?.value;
    if (summaryText) {
      formData.set('summary_text', summaryText);
    }

    const result = await createSelfAssessment(formData);

    if (result.success) {
      router.refresh();
    } else {
      setError(result.error || '자가진단 저장에 실패했습니다.');
    }

    setIsLoading(false);
  }

  // SCALE_5 렌더링
  const renderScale5 = (question: Question) => (
    <div className="w-full">
      <div className="grid grid-cols-5 gap-2">
        {SCALE_5_VALUES.map((value) => {
          const isSelected = answers[question.id] === value;
          return (
            <button
              key={value}
              type="button"
              onClick={() => handleAnswerChange(question.id, value)}
              className={`flex items-center justify-center gap-2 px-3 py-2 rounded-lg border-2 transition-all ${
                isSelected
                  ? 'bg-blue-50 border-blue-500 text-blue-700'
                  : 'bg-white border-gray-200 text-gray-600 hover:border-blue-300 hover:bg-gray-50'
              }`}
            >
              <span className={`text-sm font-semibold ${isSelected ? 'text-blue-600' : 'text-gray-700'}`}>
                {value}
              </span>
              <span className="text-xs">{SCALE_5_LABELS[value - 1]}</span>
            </button>
          );
        })}
      </div>
    </div>
  );

  // SCALE_10 렌더링
  const renderScale10 = (question: Question) => (
    <div>
      <div className="flex flex-wrap gap-2">
        {SCALE_10_VALUES.map((value) => {
          const isSelected = answers[question.id] === value;
          return (
            <button
              key={value}
              type="button"
              onClick={() => handleAnswerChange(question.id, value)}
              className={`w-9 h-9 rounded-lg border text-sm font-medium transition-colors ${
                isSelected
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-white text-gray-700 border-gray-300 hover:border-blue-400'
              }`}
            >
              {value}
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

  // MULTIPLE_CHOICE 렌더링
  const renderMultipleChoice = (question: Question) => (
    <div className="space-y-2">
      {question.options?.map((option, index) => {
        const value = index + 1;
        const isSelected = answers[question.id] === value;
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
              value={value}
              checked={isSelected}
              onChange={() => handleAnswerChange(question.id, value)}
              className="h-4 w-4 text-blue-600 border-gray-300"
            />
            <span className="ml-3 text-sm text-gray-700">{option}</span>
          </label>
        );
      })}
    </div>
  );

  // TEXT 렌더링
  const renderText = (question: Question) => (
    <div>
      <textarea
        value={(answers[question.id] as string) || ''}
        onChange={(e) => handleAnswerChange(question.id, e.target.value)}
        rows={3}
        placeholder="답변을 입력하세요..."
        className="block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-sm"
      />
      <p className="mt-1 text-xs text-gray-400">
        {((answers[question.id] as string) || '').length}자
      </p>
    </div>
  );

  // 질문 타입별 렌더링
  const renderQuestionInput = (question: Question) => {
    switch (question.question_type) {
      case 'SCALE_5':
        return renderScale5(question);
      case 'SCALE_10':
        return renderScale10(question);
      case 'MULTIPLE_CHOICE':
        return renderMultipleChoice(question);
      case 'TEXT':
        return renderText(question);
      default:
        return renderScale5(question);
    }
  };

  // 진행률 계산
  const answeredCount = template.questions.filter((q) => isQuestionAnswered(q)).length;
  const progressPercent = Math.round((answeredCount / template.questions.length) * 100);

  return (
    <form onSubmit={handleSubmit}>
      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded flex items-center">
          <svg className="w-5 h-5 mr-2 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
          </svg>
          {error}
        </div>
      )}

      {/* 진행률 표시 */}
      <div className="mb-6 bg-gray-50 rounded-lg p-4">
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm font-medium text-gray-700">
            {template.name} (버전 {template.version})
          </span>
          <span className="text-sm text-gray-500">
            {answeredCount} / {template.questions.length} 문항 ({progressPercent}%)
          </span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {Object.entries(questionsByDimension).map(([dimension, questions]) => (
        <div key={dimension} className="mb-8">
          <h3 className="text-md font-semibold text-gray-900 mb-4 pb-2 border-b flex items-center">
            <span className="flex-1">{dimension}</span>
            <span className="text-xs font-normal text-gray-500">
              {questions.filter((q) => isQuestionAnswered(q)).length} / {questions.length}
            </span>
          </h3>
          <div className="space-y-6">
            {questions
              .sort((a, b) => a.order - b.order)
              .map((question) => (
                <div
                  key={question.id}
                  id={`question-${question.id}`}
                  className={`p-4 rounded-lg transition-colors ${
                    isQuestionAnswered(question)
                      ? 'bg-green-50 border border-green-200'
                      : 'bg-white border border-gray-200'
                  }`}
                >
                  <div className="flex gap-3 mb-3">
                    <span className="text-xl text-blue-600 flex-shrink-0 mt-[-2px]">{toCircledNumber(question.order)}</span>
                    <span className="text-sm text-gray-700 font-medium leading-6">{question.question_text}</span>
                  </div>
                  {renderQuestionInput(question)}
                </div>
              ))}
          </div>
        </div>
      ))}

      <div className="mt-8">
        <label htmlFor="summary_text" className="block text-sm font-medium text-gray-700 mb-2">
          요약 (선택)
        </label>
        <textarea
          id="summary_text"
          name="summary_text"
          rows={3}
          className="block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          placeholder="추가 코멘트나 요약을 입력하세요."
        />
      </div>

      <div className="mt-6 flex items-center justify-between">
        <p className="text-sm text-gray-500">
          {answeredCount === template.questions.length ? (
            <span className="text-green-600 flex items-center">
              <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              모든 문항 응답 완료
            </span>
          ) : (
            <span className="text-orange-600">
              {template.questions.length - answeredCount}개 문항 미응답
            </span>
          )}
        </p>
        <button
          type="submit"
          disabled={isLoading}
          className="px-4 py-2 border border-transparent rounded-md text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 flex items-center"
        >
          {isLoading ? (
            <>
              <svg className="animate-spin h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              저장 중...
            </>
          ) : (
            '자가진단 저장'
          )}
        </button>
      </div>
    </form>
  );
}
