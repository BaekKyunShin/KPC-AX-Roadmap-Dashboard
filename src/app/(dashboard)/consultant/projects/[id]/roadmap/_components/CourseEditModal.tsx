'use client';

import { useState, useMemo, useCallback } from 'react';
import type { RoadmapCell } from '@/lib/services/roadmap';

interface CourseEditModalProps {
  isOpen: boolean;
  course: RoadmapCell | null;
  onClose: () => void;
  onSave: (course: RoadmapCell) => void;
}

export default function CourseEditModal({
  isOpen,
  course,
  onClose,
  onSave,
}: CourseEditModalProps) {
  // 초기 폼 데이터를 course가 변경될 때만 재계산
  const initialFormData = useMemo(() => (course ? { ...course } : null), [course]);
  const [formData, setFormData] = useState<RoadmapCell | null>(initialFormData);

  // formData가 null이면 course로 초기화 (controlled fallback)
  const currentFormData = useMemo(() => formData || course, [formData, course]);

  const handleChange = useCallback((field: keyof RoadmapCell, value: unknown) => {
    setFormData((prev) => {
      const current = prev || course;
      if (!current) return prev;
      return { ...current, [field]: value };
    });
  }, [course]);

  const handleToolChange = useCallback((index: number, field: 'name' | 'free_tier_info', value: string) => {
    setFormData((prev) => {
      const current = prev || course;
      if (!current) return prev;
      const newTools = [...(current.tools || [])];
      newTools[index] = { ...newTools[index], [field]: value };
      return { ...current, tools: newTools };
    });
  }, [course]);

  const handleAddTool = useCallback(() => {
    setFormData((prev) => {
      const current = prev || course;
      if (!current) return prev;
      return {
        ...current,
        tools: [...(current.tools || []), { name: '', free_tier_info: '' }],
      };
    });
  }, [course]);

  const handleRemoveTool = useCallback((index: number) => {
    setFormData((prev) => {
      const current = prev || course;
      if (!current) return prev;
      const newTools = (current.tools || []).filter((_, i) => i !== index);
      return { ...current, tools: newTools };
    });
  }, [course]);

  const handleArrayChange = useCallback((
    field: 'curriculum' | 'practice_assignments' | 'prerequisites',
    value: string
  ) => {
    const items = value.split('\n').filter((item) => item.trim() !== '');
    setFormData((prev) => {
      const current = prev || course;
      if (!current) return prev;
      return { ...current, [field]: items };
    });
  }, [course]);

  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    if (currentFormData) {
      onSave(currentFormData);
    }
  }, [currentFormData, onSave]);

  // Early return after all hooks
  if (!isOpen || !course || !currentFormData) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:p-0">
        {/* 배경 오버레이 */}
        <div
          className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75"
          onClick={onClose}
        />

        {/* 모달 */}
        <div className="relative inline-block w-full max-w-3xl p-6 overflow-hidden text-left align-middle transition-all transform bg-white shadow-xl rounded-lg">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">과정 편집</h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-500"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4 max-h-[70vh] overflow-y-auto pr-2">
            {/* 기본 정보 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">과정명 *</label>
                <input
                  type="text"
                  value={currentFormData.course_name}
                  onChange={(e) => handleChange('course_name', e.target.value)}
                  required
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">권장 시간 (≤40) *</label>
                <input
                  type="number"
                  min="1"
                  max="40"
                  value={currentFormData.recommended_hours}
                  onChange={(e) => handleChange('recommended_hours', parseInt(e.target.value) || 0)}
                  required
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                />
                {currentFormData.recommended_hours > 40 && (
                  <p className="mt-1 text-xs text-red-600">40시간을 초과했습니다.</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">대상 업무</label>
                <input
                  type="text"
                  value={currentFormData.target_task || ''}
                  onChange={(e) => handleChange('target_task', e.target.value)}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">교육 대상</label>
                <input
                  type="text"
                  value={currentFormData.target_audience || ''}
                  onChange={(e) => handleChange('target_audience', e.target.value)}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                />
              </div>
            </div>

            {/* 커리큘럼 */}
            <div>
              <label className="block text-sm font-medium text-gray-700">
                커리큘럼 (줄바꿈으로 구분)
              </label>
              <textarea
                value={(currentFormData.curriculum || []).join('\n')}
                onChange={(e) => handleArrayChange('curriculum', e.target.value)}
                rows={4}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md text-sm break-keep"
                placeholder="모듈 1: 개요&#10;모듈 2: 실습"
              />
            </div>

            {/* 실습/과제 */}
            <div>
              <label className="block text-sm font-medium text-gray-700">
                실습/과제 (줄바꿈으로 구분)
              </label>
              <textarea
                value={(currentFormData.practice_assignments || []).join('\n')}
                onChange={(e) => handleArrayChange('practice_assignments', e.target.value)}
                rows={3}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md text-sm break-keep"
                placeholder="실습 1: 데이터 분석&#10;과제 1: 보고서 작성"
              />
            </div>

            {/* 사용 도구 */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-gray-700">
                  사용 도구 (무료 범위 필수)
                </label>
                <button
                  type="button"
                  onClick={handleAddTool}
                  className="text-sm text-blue-600 hover:text-blue-800"
                >
                  + 도구 추가
                </button>
              </div>
              <div className="space-y-2">
                {(currentFormData.tools || []).map((tool, index) => (
                  <div key={index} className="flex gap-2 items-start">
                    <input
                      type="text"
                      value={tool.name}
                      onChange={(e) => handleToolChange(index, 'name', e.target.value)}
                      placeholder="도구명"
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm"
                    />
                    <input
                      type="text"
                      value={tool.free_tier_info}
                      onChange={(e) => handleToolChange(index, 'free_tier_info', e.target.value)}
                      placeholder="무료 범위 설명 (필수)"
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm"
                    />
                    <button
                      type="button"
                      onClick={() => handleRemoveTool(index)}
                      className="p-2 text-red-400 hover:text-red-600"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                ))}
                {(currentFormData.tools || []).length === 0 && (
                  <p className="text-sm text-gray-500">도구를 추가하세요.</p>
                )}
              </div>
            </div>

            {/* 기대효과 & 측정방법 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">기대 효과</label>
                <textarea
                  value={currentFormData.expected_outcome || ''}
                  onChange={(e) => handleChange('expected_outcome', e.target.value)}
                  rows={2}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md text-sm break-keep"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">측정 방법</label>
                <textarea
                  value={currentFormData.measurement_method || ''}
                  onChange={(e) => handleChange('measurement_method', e.target.value)}
                  rows={2}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md text-sm break-keep"
                />
              </div>
            </div>

            {/* 준비물 */}
            <div>
              <label className="block text-sm font-medium text-gray-700">
                준비물/데이터/권한 (줄바꿈으로 구분)
              </label>
              <textarea
                value={(currentFormData.prerequisites || []).join('\n')}
                onChange={(e) => handleArrayChange('prerequisites', e.target.value)}
                rows={2}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md text-sm break-keep"
              />
            </div>

            {/* 버튼 */}
            <div className="flex justify-end space-x-3 pt-4 border-t">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
              >
                취소
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700"
              >
                저장
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
