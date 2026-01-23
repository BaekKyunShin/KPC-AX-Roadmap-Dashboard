'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createSelfAssessment } from '@/app/(dashboard)/ops/cases/actions';

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
  caseId: string;
  template: Template;
}

export default function SelfAssessmentForm({ caseId, template }: SelfAssessmentFormProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [answers, setAnswers] = useState<Record<string, number>>({});

  // 질문을 차원별로 그룹화
  const questionsByDimension = template.questions.reduce(
    (acc, q) => {
      if (!acc[q.dimension]) {
        acc[q.dimension] = [];
      }
      acc[q.dimension].push(q);
      return acc;
    },
    {} as Record<string, Question[]>
  );

  const handleAnswerChange = (questionId: string, value: number) => {
    setAnswers((prev) => ({
      ...prev,
      [questionId]: value,
    }));
  };

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    // 모든 질문에 응답했는지 확인
    const unansweredCount = template.questions.filter((q) => answers[q.id] === undefined).length;
    if (unansweredCount > 0) {
      setError(`${unansweredCount}개의 미응답 질문이 있습니다.`);
      return;
    }

    setIsLoading(true);

    const formData = new FormData();
    formData.set('case_id', caseId);
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

  return (
    <form onSubmit={handleSubmit}>
      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      <p className="text-sm text-gray-500 mb-6">
        {template.name} (버전 {template.version}) - {template.questions.length}개 문항
      </p>

      {Object.entries(questionsByDimension).map(([dimension, questions]) => (
        <div key={dimension} className="mb-8">
          <h3 className="text-md font-semibold text-gray-900 mb-4 pb-2 border-b">{dimension}</h3>
          <div className="space-y-6">
            {questions
              .sort((a, b) => a.order - b.order)
              .map((question) => (
                <div key={question.id}>
                  <p className="text-sm text-gray-700 mb-2">
                    {question.order}. {question.question_text}
                  </p>
                  <div className="flex space-x-2">
                    {[1, 2, 3, 4, 5].map((value) => (
                      <button
                        key={value}
                        type="button"
                        onClick={() => handleAnswerChange(question.id, value)}
                        className={`w-10 h-10 rounded-full border text-sm font-medium transition-colors ${
                          answers[question.id] === value
                            ? 'bg-blue-600 text-white border-blue-600'
                            : 'bg-white text-gray-700 border-gray-300 hover:border-blue-400'
                        }`}
                      >
                        {value}
                      </button>
                    ))}
                  </div>
                  <div className="flex justify-between text-xs text-gray-400 mt-1 px-1">
                    <span>매우 그렇지 않다</span>
                    <span>매우 그렇다</span>
                  </div>
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

      <div className="mt-6 flex justify-end">
        <button
          type="submit"
          disabled={isLoading}
          className="px-4 py-2 border border-transparent rounded-md text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
        >
          {isLoading ? '저장 중...' : '자가진단 저장'}
        </button>
      </div>
    </form>
  );
}
