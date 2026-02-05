'use client';

import { useState, useMemo, useCallback } from 'react';
import type { RoadmapCell, CurriculumModule } from '@/lib/services/roadmap';

// =============================================================================
// 타입 정의
// =============================================================================

interface CourseEditModalProps {
  isOpen: boolean;
  course: RoadmapCell | null;
  onClose: () => void;
  onSave: (course: RoadmapCell) => void;
}

interface ModuleEditorProps {
  module: CurriculumModule;
  moduleIndex: number;
  onModuleChange: (index: number, field: keyof CurriculumModule, value: unknown) => void;
  onModuleDetailsChange: (index: number, value: string) => void;
  onRemoveModule: (index: number) => void;
}

interface ToolEditorProps {
  tool: { name: string; free_tier_info: string };
  index: number;
  onToolChange: (index: number, field: 'name' | 'free_tier_info', value: string) => void;
  onRemoveTool: (index: number) => void;
}

// =============================================================================
// 상수
// =============================================================================

/** 새 모듈의 기본 시간 (시간) */
const DEFAULT_MODULE_HOURS = 4;

/** 최대 권장 교육 시간 (시간) */
const MAX_RECOMMENDED_HOURS = 40;

/** 공통 입력 필드 스타일 */
const INPUT_BASE_STYLES = 'px-3 py-2 border border-gray-300 rounded-md text-sm';
const INPUT_FULL_STYLES = `w-full ${INPUT_BASE_STYLES}`;
const INPUT_FLEX_STYLES = `flex-1 ${INPUT_BASE_STYLES}`;
const INPUT_READONLY_STYLES = 'mt-1 block w-full px-3 py-2 border border-gray-200 rounded-md text-sm bg-gray-50';
const INPUT_WITH_MARGIN_STYLES = `mt-1 block w-full ${INPUT_BASE_STYLES}`;

// =============================================================================
// 유틸리티 함수
// =============================================================================

/** 줄바꿈으로 구분된 문자열을 배열로 변환 */
function splitLines(value: string): string[] {
  return value.split('\n').filter((item) => item.trim() !== '');
}

/** 커리큘럼 모듈 시간 합계 계산 */
function sumModuleHours(curriculum: CurriculumModule[]): number {
  return curriculum.reduce((sum, m) => sum + (m.hours || 0), 0);
}

/** 빈 모듈 생성 */
function createEmptyModule(): CurriculumModule {
  return { module_name: '', hours: DEFAULT_MODULE_HOURS, details: [], practice: '' };
}

/** 커리큘럼 업데이트와 함께 recommended_hours 재계산 */
function buildCurriculumUpdate(newCurriculum: CurriculumModule[]): Partial<RoadmapCell> {
  return {
    curriculum: newCurriculum,
    recommended_hours: sumModuleHours(newCurriculum),
  };
}

// =============================================================================
// 아이콘 컴포넌트
// =============================================================================

function CloseIcon({ className = 'w-6 h-6' }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}

// =============================================================================
// 하위 컴포넌트: 모듈 편집기
// =============================================================================

function ModuleEditor({
  module,
  moduleIndex,
  onModuleChange,
  onModuleDetailsChange,
  onRemoveModule,
}: ModuleEditorProps) {
  return (
    <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-medium text-gray-600">모듈 {moduleIndex + 1}</span>
        <button
          type="button"
          onClick={() => onRemoveModule(moduleIndex)}
          className="text-red-400 hover:text-red-600"
        >
          <CloseIcon className="w-5 h-5" />
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-3">
        <div className="md:col-span-3">
          <label className="block text-xs text-gray-500 mb-1">모듈명</label>
          <input
            type="text"
            value={module.module_name}
            onChange={(e) => onModuleChange(moduleIndex, 'module_name', e.target.value)}
            placeholder="예: 데이터 전처리 기초"
            className={INPUT_FULL_STYLES}
          />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">시간</label>
          <input
            type="number"
            min="1"
            value={module.hours}
            onChange={(e) => onModuleChange(moduleIndex, 'hours', parseInt(e.target.value) || 0)}
            className={INPUT_FULL_STYLES}
          />
        </div>
      </div>

      <div className="mb-3">
        <label className="block text-xs text-gray-500 mb-1">세부 커리큘럼 (줄바꿈으로 구분)</label>
        <textarea
          value={(module.details || []).join('\n')}
          onChange={(e) => onModuleDetailsChange(moduleIndex, e.target.value)}
          rows={3}
          placeholder="- 세부 항목 1&#10;- 세부 항목 2&#10;- 세부 항목 3"
          className={INPUT_FULL_STYLES}
        />
      </div>

      <div>
        <label className="block text-xs text-gray-500 mb-1">실습/과제</label>
        <input
          type="text"
          value={module.practice || ''}
          onChange={(e) => onModuleChange(moduleIndex, 'practice', e.target.value)}
          placeholder="예: 샘플 데이터로 전처리 실습"
          className={INPUT_FULL_STYLES}
        />
      </div>
    </div>
  );
}

// =============================================================================
// 하위 컴포넌트: 도구 편집기
// =============================================================================

function ToolEditor({ tool, index, onToolChange, onRemoveTool }: ToolEditorProps) {
  return (
    <div className="flex gap-2 items-start">
      <input
        type="text"
        value={tool.name}
        onChange={(e) => onToolChange(index, 'name', e.target.value)}
        placeholder="도구명"
        className={INPUT_FLEX_STYLES}
      />
      <input
        type="text"
        value={tool.free_tier_info}
        onChange={(e) => onToolChange(index, 'free_tier_info', e.target.value)}
        placeholder="무료 범위 설명 (필수)"
        className={INPUT_FLEX_STYLES}
      />
      <button
        type="button"
        onClick={() => onRemoveTool(index)}
        className="p-2 text-red-400 hover:text-red-600"
      >
        <CloseIcon className="w-5 h-5" />
      </button>
    </div>
  );
}

// =============================================================================
// 메인 컴포넌트
// =============================================================================

export default function CourseEditModal({
  isOpen,
  course,
  onClose,
  onSave,
}: CourseEditModalProps) {
  const [formData, setFormData] = useState<RoadmapCell | null>(null);

  // formData가 없으면 course를 기본값으로 사용
  const currentFormData = useMemo(() => formData || course, [formData, course]);

  // ---------------------------------------------------------------------------
  // 모달 제어 핸들러
  // ---------------------------------------------------------------------------

  /** 모달 닫기 - formData 리셋 */
  const handleClose = useCallback(() => {
    setFormData(null);
    onClose();
  }, [onClose]);

  /** 폼 제출 */
  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (currentFormData) onSave(currentFormData);
    },
    [currentFormData, onSave]
  );

  // ---------------------------------------------------------------------------
  // 공통 상태 업데이트 헬퍼
  // ---------------------------------------------------------------------------

  const updateFormData = useCallback(
    (updater: (current: RoadmapCell) => Partial<RoadmapCell>) => {
      setFormData((prev) => {
        const current = prev || course;
        if (!current) return prev;
        return { ...current, ...updater(current) };
      });
    },
    [course]
  );

  // ---------------------------------------------------------------------------
  // 기본 필드 핸들러
  // ---------------------------------------------------------------------------

  const handleChange = useCallback(
    (field: keyof RoadmapCell, value: unknown) => {
      updateFormData(() => ({ [field]: value }));
    },
    [updateFormData]
  );

  const handlePrerequisitesChange = useCallback(
    (value: string) => {
      updateFormData(() => ({ prerequisites: splitLines(value) }));
    },
    [updateFormData]
  );

  // ---------------------------------------------------------------------------
  // 커리큘럼 모듈 핸들러
  // ---------------------------------------------------------------------------

  const handleModuleChange = useCallback(
    (moduleIndex: number, field: keyof CurriculumModule, value: unknown) => {
      updateFormData((current) => {
        const newCurriculum = [...(current.curriculum || [])];
        newCurriculum[moduleIndex] = { ...newCurriculum[moduleIndex], [field]: value };
        return buildCurriculumUpdate(newCurriculum);
      });
    },
    [updateFormData]
  );

  const handleModuleDetailsChange = useCallback(
    (moduleIndex: number, value: string) => {
      handleModuleChange(moduleIndex, 'details', splitLines(value));
    },
    [handleModuleChange]
  );

  const handleAddModule = useCallback(() => {
    updateFormData((current) => {
      const newCurriculum = [...(current.curriculum || []), createEmptyModule()];
      return buildCurriculumUpdate(newCurriculum);
    });
  }, [updateFormData]);

  const handleRemoveModule = useCallback(
    (index: number) => {
      updateFormData((current) => {
        const newCurriculum = (current.curriculum || []).filter((_, i) => i !== index);
        return buildCurriculumUpdate(newCurriculum);
      });
    },
    [updateFormData]
  );

  // ---------------------------------------------------------------------------
  // 도구 핸들러
  // ---------------------------------------------------------------------------

  const handleToolChange = useCallback(
    (index: number, field: 'name' | 'free_tier_info', value: string) => {
      updateFormData((current) => {
        const newTools = [...(current.tools || [])];
        newTools[index] = { ...newTools[index], [field]: value };
        return { tools: newTools };
      });
    },
    [updateFormData]
  );

  const handleAddTool = useCallback(() => {
    updateFormData((current) => ({
      tools: [...(current.tools || []), { name: '', free_tier_info: '' }],
    }));
  }, [updateFormData]);

  const handleRemoveTool = useCallback(
    (index: number) => {
      updateFormData((current) => ({
        tools: (current.tools || []).filter((_, i) => i !== index),
      }));
    },
    [updateFormData]
  );

  // ---------------------------------------------------------------------------
  // 렌더링
  // ---------------------------------------------------------------------------

  // Early return after all hooks
  if (!isOpen || !course || !currentFormData) return null;

  const curriculum = currentFormData.curriculum || [];
  const tools = currentFormData.tools || [];
  const isOverMaxHours = currentFormData.recommended_hours > MAX_RECOMMENDED_HOURS;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:p-0">
        {/* 배경 오버레이 */}
        <div
          className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75"
          onClick={handleClose}
        />

        {/* 모달 */}
        <div className="relative inline-block w-full max-w-4xl p-6 overflow-hidden text-left align-middle transition-all transform bg-white shadow-xl rounded-lg">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">과정 편집</h3>
            <button onClick={handleClose} className="text-gray-400 hover:text-gray-500">
              <CloseIcon />
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
                  className={INPUT_WITH_MARGIN_STYLES}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  총 교육 시간 (모듈 시간 합계로 자동 계산)
                </label>
                <input
                  type="number"
                  value={currentFormData.recommended_hours}
                  readOnly
                  className={INPUT_READONLY_STYLES}
                />
                {isOverMaxHours && (
                  <p className="mt-1 text-xs text-red-600">{MAX_RECOMMENDED_HOURS}시간을 초과했습니다.</p>
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
                  className={INPUT_WITH_MARGIN_STYLES}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">교육 대상</label>
                <input
                  type="text"
                  value={currentFormData.target_audience || ''}
                  onChange={(e) => handleChange('target_audience', e.target.value)}
                  className={INPUT_WITH_MARGIN_STYLES}
                />
              </div>
            </div>

            {/* 커리큘럼 모듈 */}
            <div className="border-t pt-4">
              <div className="flex items-center justify-between mb-3">
                <label className="block text-sm font-medium text-gray-700">커리큘럼 모듈</label>
                <button
                  type="button"
                  onClick={handleAddModule}
                  className="text-sm text-blue-600 hover:text-blue-800"
                >
                  + 모듈 추가
                </button>
              </div>

              <div className="space-y-4">
                {curriculum.map((module, moduleIdx) => (
                  <ModuleEditor
                    key={moduleIdx}
                    module={module}
                    moduleIndex={moduleIdx}
                    onModuleChange={handleModuleChange}
                    onModuleDetailsChange={handleModuleDetailsChange}
                    onRemoveModule={handleRemoveModule}
                  />
                ))}
                {curriculum.length === 0 && (
                  <p className="text-sm text-gray-500 text-center py-4">모듈을 추가하세요.</p>
                )}
              </div>
            </div>

            {/* 사용 도구 */}
            <div className="border-t pt-4">
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
                {tools.map((tool, index) => (
                  <ToolEditor
                    key={index}
                    tool={tool}
                    index={index}
                    onToolChange={handleToolChange}
                    onRemoveTool={handleRemoveTool}
                  />
                ))}
                {tools.length === 0 && (
                  <p className="text-sm text-gray-500">도구를 추가하세요.</p>
                )}
              </div>
            </div>

            {/* 기대효과 & 측정방법 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t pt-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">기대 효과</label>
                <textarea
                  value={currentFormData.expected_outcome || ''}
                  onChange={(e) => handleChange('expected_outcome', e.target.value)}
                  rows={2}
                  className={`${INPUT_WITH_MARGIN_STYLES} break-keep`}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">측정 방법</label>
                <textarea
                  value={currentFormData.measurement_method || ''}
                  onChange={(e) => handleChange('measurement_method', e.target.value)}
                  rows={2}
                  className={`${INPUT_WITH_MARGIN_STYLES} break-keep`}
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
                onChange={(e) => handlePrerequisitesChange(e.target.value)}
                rows={2}
                className={`${INPUT_WITH_MARGIN_STYLES} break-keep`}
              />
            </div>

            {/* 버튼 */}
            <div className="flex justify-end space-x-3 pt-4 border-t">
              <button
                type="button"
                onClick={handleClose}
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
