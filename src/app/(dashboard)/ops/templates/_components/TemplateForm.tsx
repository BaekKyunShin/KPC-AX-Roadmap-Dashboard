'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import type { SelfAssessmentTemplate, SelfAssessmentQuestion } from '@/types/database';
import { createTemplate, updateTemplate } from '../actions';

interface TemplateFormProps {
  mode: 'create' | 'edit';
  template?: SelfAssessmentTemplate;
  isInUse?: boolean;
}

const DIMENSIONS = [
  '데이터 활용',
  '업무 프로세스',
  '조직 역량',
  'IT 인프라',
  'AI 활용 현황',
  '기대 효과',
];

const QUESTION_TYPES = [
  { value: 'SCALE_5', label: '5점 척도' },
  { value: 'SCALE_10', label: '10점 척도' },
  { value: 'MULTIPLE_CHOICE', label: '객관식' },
  { value: 'TEXT', label: '서술형' },
];

function createEmptyQuestion(order: number): SelfAssessmentQuestion {
  return {
    id: `q_${Date.now()}_${order}`,
    order,
    dimension: DIMENSIONS[0],
    question_text: '',
    question_type: 'SCALE_5',
    weight: 1,
  };
}

export default function TemplateForm({ mode, template, isInUse }: TemplateFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [name, setName] = useState(template?.name || '');
  const [description, setDescription] = useState(template?.description || '');
  const [questions, setQuestions] = useState<SelfAssessmentQuestion[]>(
    template?.questions || [createEmptyQuestion(1)]
  );

  const handleAddQuestion = () => {
    setQuestions([...questions, createEmptyQuestion(questions.length + 1)]);
  };

  const handleRemoveQuestion = (index: number) => {
    if (questions.length === 1) {
      setError('최소 1개의 질문이 필요합니다.');
      return;
    }
    const newQuestions = questions.filter((_, i) => i !== index);
    // order 재정렬
    setQuestions(newQuestions.map((q, i) => ({ ...q, order: i + 1 })));
  };

  const handleQuestionChange = (
    index: number,
    field: keyof SelfAssessmentQuestion,
    value: unknown
  ) => {
    const newQuestions = [...questions];
    newQuestions[index] = { ...newQuestions[index], [field]: value };
    setQuestions(newQuestions);
  };

  const handleMoveQuestion = (index: number, direction: 'up' | 'down') => {
    if (
      (direction === 'up' && index === 0) ||
      (direction === 'down' && index === questions.length - 1)
    ) {
      return;
    }

    const newQuestions = [...questions];
    const swapIndex = direction === 'up' ? index - 1 : index + 1;
    [newQuestions[index], newQuestions[swapIndex]] = [
      newQuestions[swapIndex],
      newQuestions[index],
    ];
    // order 재정렬
    setQuestions(newQuestions.map((q, i) => ({ ...q, order: i + 1 })));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    const formData = new FormData();
    if (mode === 'edit' && template) {
      formData.append('id', template.id);
    }
    formData.append('name', name);
    formData.append('description', description);
    formData.append('questions', JSON.stringify(questions));

    const result = mode === 'create' ? await createTemplate(formData) : await updateTemplate(formData);

    if (!result.success) {
      setError(result.error || '저장에 실패했습니다.');
      setLoading(false);
      return;
    }

    const data = result.data as { message?: string; id?: string };
    if (data?.message) {
      setSuccess(data.message);
    } else {
      setSuccess('저장되었습니다.');
    }

    setLoading(false);

    if (mode === 'create' && data?.id) {
      router.push(`/ops/templates/${data.id}`);
    } else {
      router.refresh();
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      {success && (
        <div className="bg-green-50 border border-green-200 rounded-md p-4">
          <p className="text-sm text-green-600">{success}</p>
        </div>
      )}

      {isInUse && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
          <p className="text-sm text-yellow-700">
            이 템플릿은 이미 사용 중입니다. 수정하면 새 버전으로 저장됩니다.
          </p>
        </div>
      )}

      <div className="bg-white shadow rounded-lg p-6 space-y-4">
        <h3 className="text-lg font-medium text-gray-900">기본 정보</h3>

        <div>
          <label htmlFor="name" className="block text-sm font-medium text-gray-700">
            템플릿 이름 *
          </label>
          <input
            type="text"
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            placeholder="예: 제조업 AI 성숙도 진단 v2"
          />
          {!name.trim() && (
            <p className="mt-1 text-xs text-amber-600">템플릿 이름을 입력해주세요</p>
          )}
        </div>

        <div>
          <label htmlFor="description" className="block text-sm font-medium text-gray-700">
            설명
          </label>
          <textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 break-keep"
            placeholder="템플릿에 대한 간단한 설명"
          />
        </div>
      </div>

      <div className="bg-white shadow rounded-lg p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-medium text-gray-900">
            질문 목록 ({questions.length}개)
          </h3>
          <button
            type="button"
            onClick={handleAddQuestion}
            className="inline-flex items-center px-3 py-1.5 border border-blue-600 text-sm font-medium rounded-md text-blue-600 bg-white hover:bg-blue-50"
          >
            + 질문 추가
          </button>
        </div>

        <div className="space-y-4">
          {questions.map((question, index) => (
            <div
              key={question.id}
              className="border border-gray-200 rounded-lg p-4 space-y-3"
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-500">
                  질문 #{question.order}
                </span>
                <div className="flex items-center space-x-2">
                  <button
                    type="button"
                    onClick={() => handleMoveQuestion(index, 'up')}
                    disabled={index === 0}
                    className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30"
                    title="위로 이동"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                    </svg>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleMoveQuestion(index, 'down')}
                    disabled={index === questions.length - 1}
                    className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30"
                    title="아래로 이동"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleRemoveQuestion(index)}
                    className="p-1 text-red-400 hover:text-red-600"
                    title="삭제"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-500">차원</label>
                  <select
                    value={question.dimension}
                    onChange={(e) => handleQuestionChange(index, 'dimension', e.target.value)}
                    className="mt-1 block w-full px-2 py-1.5 text-sm border border-gray-300 rounded-md"
                  >
                    {DIMENSIONS.map((dim) => (
                      <option key={dim} value={dim}>
                        {dim}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-500">유형</label>
                  <select
                    value={question.question_type}
                    onChange={(e) =>
                      handleQuestionChange(index, 'question_type', e.target.value)
                    }
                    className="mt-1 block w-full px-2 py-1.5 text-sm border border-gray-300 rounded-md"
                  >
                    {QUESTION_TYPES.map((type) => (
                      <option key={type.value} value={type.value}>
                        {type.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-500">가중치</label>
                  <input
                    type="number"
                    min="0.1"
                    max="10"
                    step="0.1"
                    value={question.weight}
                    onChange={(e) =>
                      handleQuestionChange(index, 'weight', parseFloat(e.target.value) || 1)
                    }
                    className="mt-1 block w-full px-2 py-1.5 text-sm border border-gray-300 rounded-md"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-500">질문 내용 *</label>
                <textarea
                  value={question.question_text}
                  onChange={(e) => handleQuestionChange(index, 'question_text', e.target.value)}
                  required
                  rows={2}
                  className="mt-1 block w-full px-2 py-1.5 text-sm border border-gray-300 rounded-md break-keep"
                  placeholder="질문 내용을 입력하세요"
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="flex justify-end space-x-3">
        <Link
          href="/ops/templates"
          className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
        >
          취소
        </Link>
        <button
          type="submit"
          disabled={loading || !name.trim()}
          className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? '저장 중...' : mode === 'create' ? '생성' : '저장'}
        </button>
      </div>
    </form>
  );
}
