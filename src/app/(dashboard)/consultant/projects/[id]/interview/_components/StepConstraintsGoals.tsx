'use client';

import type { Constraint, ImprovementGoal } from '@/lib/schemas/interview';
import { createEmptyConstraint, createEmptyImprovementGoal } from '@/lib/schemas/interview';

const SEVERITY_OPTIONS = [
  { value: 'HIGH', label: '높음' },
  { value: 'MEDIUM', label: '보통' },
  { value: 'LOW', label: '낮음' },
];

const CONSTRAINT_TYPE_OPTIONS = [
  { value: 'DATA', label: '데이터' },
  { value: 'SYSTEM', label: '시스템' },
  { value: 'SECURITY', label: '보안' },
  { value: 'PERMISSION', label: '권한' },
  { value: 'OTHER', label: '기타' },
];

interface StepConstraintsGoalsProps {
  constraints: Constraint[];
  improvementGoals: ImprovementGoal[];
  onConstraintsChange: (constraints: Constraint[]) => void;
  onImprovementGoalsChange: (goals: ImprovementGoal[]) => void;
}

export default function StepConstraintsGoals({
  constraints,
  improvementGoals,
  onConstraintsChange,
  onImprovementGoalsChange,
}: StepConstraintsGoalsProps) {
  // Constraint handlers
  const updateConstraint = (index: number, field: keyof Constraint, value: string) => {
    const updated = [...constraints];
    updated[index] = { ...updated[index], [field]: value };
    onConstraintsChange(updated);
  };

  const addConstraint = () => {
    onConstraintsChange([...constraints, createEmptyConstraint()]);
  };

  const removeConstraint = (index: number) => {
    onConstraintsChange(constraints.filter((_, i) => i !== index));
  };

  // Goal handlers
  const updateGoal = (index: number, field: keyof ImprovementGoal, value: string) => {
    const updated = [...improvementGoals];
    updated[index] = { ...updated[index], [field]: value };
    onImprovementGoalsChange(updated);
  };

  const addGoal = () => {
    onImprovementGoalsChange([...improvementGoals, createEmptyImprovementGoal()]);
  };

  const removeGoal = (index: number) => {
    if (improvementGoals.length > 1) {
      onImprovementGoalsChange(improvementGoals.filter((_, i) => i !== index));
    }
  };

  return (
    <div className="space-y-8">
      {/* 제약사항 섹션 */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">데이터/시스템 제약</h2>
            <p className="text-sm text-gray-600 mt-1">
              AI 도입 시 고려해야 할 제약사항을 입력해주세요. (선택)
            </p>
          </div>
          <button
            type="button"
            onClick={addConstraint}
            className="inline-flex items-center px-3 py-2 border border-gray-400 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 transition-colors"
          >
            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            추가
          </button>
        </div>

        {constraints.length > 0 ? (
          <div className="space-y-4">
            {constraints.map((constraint, index) => (
              <div key={constraint.id} className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-sm font-medium text-gray-900 flex items-center">
                    <span className="w-6 h-6 rounded-full bg-gray-200 text-gray-600 text-xs flex items-center justify-center mr-2">
                      {index + 1}
                    </span>
                    제약사항 {index + 1}
                  </h3>
                  <button
                    type="button"
                    onClick={() => removeConstraint(index)}
                    className="text-sm text-red-600 hover:text-red-800 flex items-center"
                  >
                    <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                    삭제
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-700">유형</label>
                    <select
                      value={constraint.type}
                      onChange={(e) => updateConstraint(index, 'type', e.target.value)}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      {CONSTRAINT_TYPE_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700">심각도</label>
                    <select
                      value={constraint.severity}
                      onChange={(e) => updateConstraint(index, 'severity', e.target.value)}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      {SEVERITY_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                  </div>
                  <div className="md:col-span-3">
                    <label className="block text-xs font-medium text-gray-700">
                      설명 <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={constraint.description}
                      onChange={(e) => updateConstraint(index, 'description', e.target.value)}
                      required
                      placeholder="예: 외부 클라우드 사용 불가"
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 bg-gray-50 rounded-lg border-2 border-dashed border-gray-200">
            <svg className="mx-auto h-10 w-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <p className="mt-2 text-sm text-gray-500">제약사항이 없으면 비워두세요.</p>
          </div>
        )}
      </div>

      {/* 구분선 */}
      <div className="border-t border-gray-200" />

      {/* 개선 목표 섹션 */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">개선 목표</h2>
            <p className="text-sm text-gray-600 mt-1">
              AI 도입을 통해 달성하고자 하는 목표를 입력해주세요.
            </p>
          </div>
          <button
            type="button"
            onClick={addGoal}
            className="inline-flex items-center px-3 py-2 border border-green-600 text-sm font-medium rounded-md text-green-600 bg-white hover:bg-green-50 transition-colors"
          >
            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            추가
          </button>
        </div>

        <div className="space-y-4">
          {improvementGoals.map((goal, index) => (
            <div key={goal.id} className="border border-gray-200 rounded-lg p-4 bg-green-50">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-sm font-medium text-gray-900 flex items-center">
                  <span className="w-6 h-6 rounded-full bg-green-100 text-green-600 text-xs flex items-center justify-center mr-2">
                    {index + 1}
                  </span>
                  목표 {index + 1}
                </h3>
                {improvementGoals.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeGoal(index)}
                    className="text-sm text-red-600 hover:text-red-800 flex items-center"
                  >
                    <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                    삭제
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-xs font-medium text-gray-700">
                    목표 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={goal.goal_description}
                    onChange={(e) => updateGoal(index, 'goal_description', e.target.value)}
                    required
                    placeholder="예: 보고서 작성 시간 50% 단축"
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700">KPI 지표</label>
                  <input
                    type="text"
                    value={goal.kpi || ''}
                    onChange={(e) => updateGoal(index, 'kpi', e.target.value)}
                    placeholder="예: 보고서 작성 시간"
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700">측정 방법</label>
                  <input
                    type="text"
                    value={goal.measurement_method || ''}
                    onChange={(e) => updateGoal(index, 'measurement_method', e.target.value)}
                    placeholder="예: 타임 트래킹"
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700">Before 수치</label>
                  <input
                    type="text"
                    value={goal.before_value || ''}
                    onChange={(e) => updateGoal(index, 'before_value', e.target.value)}
                    placeholder="예: 주 10시간"
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700">목표 수치</label>
                  <input
                    type="text"
                    value={goal.target_value || ''}
                    onChange={(e) => updateGoal(index, 'target_value', e.target.value)}
                    placeholder="예: 주 5시간"
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
