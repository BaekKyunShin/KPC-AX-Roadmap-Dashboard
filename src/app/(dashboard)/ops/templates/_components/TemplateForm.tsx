'use client';

import { useState, useRef, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ChevronUp, ChevronDown, X, GripVertical } from 'lucide-react';
import { Reorder, useDragControls } from 'motion/react';
import type { SelfAssessmentTemplate, SelfAssessmentQuestion } from '@/types/database';
import { showErrorToast, showSuccessToast, scrollToElement } from '@/lib/utils';
import { createTemplate, updateTemplate } from '../actions';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

// =============================================================================
// Types
// =============================================================================

interface TemplateFormProps {
  mode: 'create' | 'edit';
  template?: SelfAssessmentTemplate;
  isInUse?: boolean;
}

interface QuestionItemProps {
  question: SelfAssessmentQuestion;
  index: number;
  totalCount: number;
  onMove: (index: number, direction: 'up' | 'down') => void;
  onRemove: (index: number) => void;
  onChange: (index: number, field: keyof SelfAssessmentQuestion, value: unknown) => void;
}

// =============================================================================
// Constants
// =============================================================================

const DIMENSIONS = [
  'AI 성숙도',
  '데이터 준비도',
  '인력 준비도',
  '인프라 준비도',
  '문제 명확성',
];

const REORDER_TRANSITION = { duration: 0.25, ease: 'easeInOut' } as const;

const RESTING_STYLE = {
  scale: 1,
  boxShadow: '0 0 0 rgba(0,0,0,0)',
} as const;

const WHILE_DRAG_STYLE = {
  scale: 1.02,
  boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
} as const;

// =============================================================================
// QuestionItem (Reorder.Item + 드래그 핸들)
// =============================================================================

function QuestionItem({
  question,
  index,
  totalCount,
  onMove,
  onRemove,
  onChange,
}: QuestionItemProps) {
  const dragControls = useDragControls();

  return (
    <Reorder.Item
      value={question.id}
      dragListener={false}
      dragControls={dragControls}
      animate={RESTING_STYLE}
      transition={REORDER_TRANSITION}
      whileDrag={WHILE_DRAG_STYLE}
      as="div"
      className="border border-gray-200 rounded-lg p-4 space-y-3 bg-white"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="cursor-grab touch-none p-1 text-gray-300 hover:text-gray-500 active:cursor-grabbing"
            title="드래그하여 순서 변경"
            aria-label={`질문 ${index + 1} 드래그하여 순서 변경`}
            onPointerDown={(e) => dragControls.start(e)}
          >
            <GripVertical className="h-4 w-4" />
          </button>
          <span className="text-sm font-medium text-gray-500">
            질문 #{index + 1}
          </span>
        </div>
        <div className="flex items-center space-x-2">
          <button
            type="button"
            onClick={() => onMove(index, 'up')}
            disabled={index === 0}
            className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30"
            title="위로 이동"
          >
            <ChevronUp className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => onMove(index, 'down')}
            disabled={index === totalCount - 1}
            className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30"
            title="아래로 이동"
          >
            <ChevronDown className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => onRemove(index)}
            className="p-1 text-red-400 hover:text-red-600"
            title="삭제"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-gray-500">차원</label>
          <Select
            value={question.dimension}
            onValueChange={(value) => onChange(index, 'dimension', value)}
          >
            <SelectTrigger className="mt-1 w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {DIMENSIONS.map((dim) => (
                <SelectItem key={dim} value={dim}>
                  {dim}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-500">가중치</label>
          <input
            type="number"
            step="any"
            value={question.weight}
            onChange={(e) =>
              onChange(index, 'weight', parseFloat(e.target.value) || 1)
            }
            className="mt-1 block w-full px-2 py-1.5 text-sm border border-gray-300 rounded-md"
          />
        </div>
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-500">질문 내용 *</label>
        <textarea
          value={question.question_text}
          onChange={(e) => onChange(index, 'question_text', e.target.value)}
          rows={2}
          className="mt-1 block w-full px-2 py-1.5 text-sm border border-gray-300 rounded-md break-keep"
          placeholder="질문 내용을 입력하세요"
        />
      </div>
    </Reorder.Item>
  );
}

// =============================================================================
// Helpers
// =============================================================================

function reindexQuestions(qs: SelfAssessmentQuestion[]): SelfAssessmentQuestion[] {
  return qs.map((q, i) => ({ ...q, order: i + 1 }));
}

function createEmptyQuestion(order: number): SelfAssessmentQuestion {
  return {
    id: `q_${Date.now()}_${order}`,
    order,
    dimension: DIMENSIONS[0],
    question_text: '',
    weight: 1,
  };
}

// =============================================================================
// TemplateForm
// =============================================================================

export default function TemplateForm({ mode, template, isInUse }: TemplateFormProps) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [isPending, startTransition] = useTransition();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [name, setName] = useState(template?.name || '');
  const [description, setDescription] = useState(template?.description || '');
  const [questions, setQuestions] = useState<SelfAssessmentQuestion[]>(
    template?.questions || [createEmptyQuestion(1)]
  );

  // 질문 ID 배열 (Reorder.Group values용 - 문자열이므로 값 비교로 동작)
  const questionIds = questions.map((q) => q.id);

  const handleAddQuestion = () => {
    setQuestions([...questions, createEmptyQuestion(questions.length + 1)]);
  };

  const handleRemoveQuestion = (index: number) => {
    if (questions.length === 1) {
      setError('최소 1개의 질문이 필요합니다.');
      showErrorToast('삭제 불가', '최소 1개의 질문이 필요합니다.');
      return;
    }
    setQuestions(reindexQuestions(questions.filter((_, i) => i !== index)));
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
    setQuestions(reindexQuestions(newQuestions));
  };

  // 드래그로 리오더링 시 호출되는 콜백
  const handleDragReorder = (newIdOrder: string[]) => {
    const reordered: SelfAssessmentQuestion[] = [];
    for (const id of newIdOrder) {
      const q = questions.find((question) => question.id === id);
      if (!q) return; // ID 불일치 시 상태 변경하지 않음 (안전 장치)
      reordered.push(q);
    }
    setQuestions(reindexQuestions(reordered));
  };

  const showValidationError = (msg: string) => {
    setError(msg);
    showErrorToast('입력 오류', msg);
    scrollToElement(formRef);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!name.trim()) {
      showValidationError('템플릿 이름을 입력하세요.');
      return;
    }

    const emptyQuestion = questions.find((q) => !q.question_text.trim());
    if (emptyQuestion) {
      showValidationError(`질문 #${emptyQuestion.order}의 내용을 입력하세요.`);
      return;
    }

    const invalidWeight = questions.find((q) => q.weight < 0.1 || q.weight > 10);
    if (invalidWeight) {
      showValidationError(`질문 #${invalidWeight.order}의 가중치는 0.1~10 사이여야 합니다.`);
      return;
    }

    setLoading(true);

    try {
      const formData = new FormData();
      if (mode === 'edit' && template) {
        formData.append('id', template.id);
      }
      formData.append('name', name);
      formData.append('description', description);
      formData.append('questions', JSON.stringify(questions));

      const result = mode === 'create' ? await createTemplate(formData) : await updateTemplate(formData);

      if (!result.success) {
        const errorMessage = result.error || '저장에 실패했습니다.';
        setError(errorMessage);
        setLoading(false);

        showErrorToast('저장 실패', errorMessage);
        scrollToElement(formRef);
        return;
      }

      const data = result.data as { message?: string; id?: string };
      const successMessage = data?.message || '저장되었습니다.';
      setSuccess(successMessage);

      showSuccessToast(mode === 'create' ? '템플릿 생성 완료' : '템플릿 수정 완료', successMessage);

      if (mode === 'create' && data?.id) {
        router.push(`/ops/templates/${data.id}`);
      } else {
        setLoading(false);
        startTransition(() => {
          router.refresh();
        });
      }
    } catch {
      setError('저장에 실패했습니다.');
      showErrorToast('저장 실패', '서버와 통신 중 오류가 발생했습니다.');
      scrollToElement(formRef);
      setLoading(false);
    }
  };

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="space-y-6">
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
            rows={4}
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

        <Reorder.Group
          axis="y"
          values={questionIds}
          onReorder={handleDragReorder}
          as="div"
          className="space-y-4"
        >
          {questions.map((question, index) => (
            <QuestionItem
              key={question.id}
              question={question}
              index={index}
              totalCount={questions.length}
              onMove={handleMoveQuestion}
              onRemove={handleRemoveQuestion}
              onChange={handleQuestionChange}
            />
          ))}
        </Reorder.Group>
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
          disabled={loading || isPending || !name.trim()}
          className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading || isPending ? '저장 중...' : mode === 'create' ? '생성' : '저장'}
        </button>
      </div>
    </form>
  );
}
