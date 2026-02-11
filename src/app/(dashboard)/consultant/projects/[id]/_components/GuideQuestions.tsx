'use client';

import { useState, useCallback } from 'react';
import { Plus, Trash2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { showSuccessToast, showErrorToast } from '@/lib/utils/toast';
import type { GuideQuestion, GuideKeyPointStatus } from '@/lib/schemas/interview-guide';
import { updateInterviewGuideQuestions } from '../actions';

interface GuideQuestionsProps {
  projectId: string;
  questions: GuideQuestion[];
  onQuestionsChange: (questions: GuideQuestion[]) => void;
}

const DIMENSION_STATUS_MAP: Record<string, GuideKeyPointStatus> = {};

function getDimensionBadgeClass(dimension: string, statusMap: Record<string, GuideKeyPointStatus>): string {
  const status = statusMap[dimension];
  if (status === 'critical') return 'bg-red-100 text-red-700';
  if (status === 'warning') return 'bg-amber-100 text-amber-700';
  return 'bg-gray-100 text-gray-600';
}

export function GuideQuestions({
  projectId,
  questions,
  onQuestionsChange,
}: GuideQuestionsProps) {
  const [isSaving, setIsSaving] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newQuestion, setNewQuestion] = useState('');
  const [newIntent, setNewIntent] = useState('');
  const [newDimension, setNewDimension] = useState('');

  // 영역별로 그룹핑
  const dimensionGroups = new Map<string, GuideQuestion[]>();
  for (const q of questions) {
    const group = dimensionGroups.get(q.dimension) ?? [];
    group.push(q);
    dimensionGroups.set(q.dimension, group);
  }

  const saveQuestions = useCallback(async (updated: GuideQuestion[]) => {
    setIsSaving(true);
    const result = await updateInterviewGuideQuestions(projectId, updated);
    setIsSaving(false);

    if (!result.success) {
      showErrorToast('저장 실패', result.error);
    }
  }, [projectId]);

  function handleToggleCheck(questionId: string) {
    const updated = questions.map((q) =>
      q.id === questionId ? { ...q, checked: !q.checked } : q,
    );
    onQuestionsChange(updated);
    saveQuestions(updated);
  }

  function handleDelete(questionId: string) {
    const updated = questions.filter((q) => q.id !== questionId);
    onQuestionsChange(updated);
    saveQuestions(updated);
  }

  function handleAddQuestion() {
    if (!newQuestion.trim()) return;

    const newId = `custom_${Date.now()}`;
    const added: GuideQuestion = {
      id: newId,
      dimension: newDimension.trim() || '기타',
      question: newQuestion.trim(),
      intent: newIntent.trim() || '추가 질문',
      checked: true,
      is_custom: true,
    };

    const updated = [...questions, added];
    onQuestionsChange(updated);
    saveQuestions(updated);

    setNewQuestion('');
    setNewIntent('');
    setNewDimension('');
    setShowAddForm(false);
    showSuccessToast('질문이 추가되었습니다.');
  }

  const checkedCount = questions.filter((q) => q.checked).length;

  return (
    <div className="space-y-4">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <span className="text-xs text-gray-500">
          {checkedCount}/{questions.length}개 선택됨
        </span>
        {isSaving && (
          <span className="flex items-center gap-1 text-xs text-gray-400">
            <Loader2 className="h-3 w-3 animate-spin" />
            저장 중
          </span>
        )}
      </div>

      {/* 영역별 질문 리스트 */}
      {Array.from(dimensionGroups.entries()).map(([dimension, groupQuestions]) => (
        <div key={dimension}>
          <div className="mb-2 flex items-center gap-2">
            <span className={cn(
              'rounded-md px-2 py-0.5 text-xs font-medium',
              getDimensionBadgeClass(dimension, DIMENSION_STATUS_MAP),
            )}>
              {dimension}
            </span>
          </div>

          <div className="space-y-1">
            {groupQuestions.map((q) => (
              <div
                key={q.id}
                className={cn(
                  'group flex items-start gap-3 rounded-lg px-3 py-2.5 transition-colors',
                  q.checked ? 'bg-white' : 'bg-gray-50 opacity-60',
                )}
              >
                {/* 체크박스 */}
                <input
                  type="checkbox"
                  checked={q.checked}
                  onChange={() => handleToggleCheck(q.id)}
                  className="mt-1 h-4 w-4 shrink-0 rounded border-gray-300 text-primary focus:ring-primary/50"
                />

                {/* 질문 내용 */}
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-gray-800">{q.question}</p>
                  <p className="mt-0.5 text-xs text-gray-400">{q.intent}</p>
                </div>

                {/* 삭제 (커스텀 질문만) */}
                {q.is_custom && (
                  <button
                    type="button"
                    onClick={() => handleDelete(q.id)}
                    className="shrink-0 rounded p-1 text-gray-300 opacity-0 transition-opacity hover:text-red-500 group-hover:opacity-100"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}

      {/* 질문 추가 */}
      {showAddForm ? (
        <div className="space-y-2 rounded-lg border bg-gray-50/50 p-3">
          <Input
            placeholder="질문을 입력하세요"
            value={newQuestion}
            onChange={(e) => setNewQuestion(e.target.value)}
            className="text-sm"
          />
          <div className="flex gap-2">
            <Input
              placeholder="영역 (예: 데이터 준비도)"
              value={newDimension}
              onChange={(e) => setNewDimension(e.target.value)}
              className="text-sm"
            />
            <Input
              placeholder="질문 의도"
              value={newIntent}
              onChange={(e) => setNewIntent(e.target.value)}
              className="text-sm"
            />
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" onClick={handleAddQuestion} disabled={!newQuestion.trim()}>
              추가
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                setShowAddForm(false);
                setNewQuestion('');
                setNewIntent('');
                setNewDimension('');
              }}
            >
              취소
            </Button>
          </div>
        </div>
      ) : (
        <Button
          variant="outline"
          size="sm"
          className="w-full border-dashed text-gray-500"
          onClick={() => setShowAddForm(true)}
        >
          <Plus className="mr-1.5 h-4 w-4" />
          질문 추가
        </Button>
      )}
    </div>
  );
}
