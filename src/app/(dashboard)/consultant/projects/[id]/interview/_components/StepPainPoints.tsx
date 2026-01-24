'use client';

import type { PainPoint } from '@/lib/schemas/interview';
import { createEmptyPainPoint } from '@/lib/schemas/interview';

const SEVERITY_OPTIONS = [
  { value: 'HIGH', label: '높음', color: 'bg-red-100 text-red-800' },
  { value: 'MEDIUM', label: '보통', color: 'bg-yellow-100 text-yellow-800' },
  { value: 'LOW', label: '낮음', color: 'bg-green-100 text-green-800' },
];

interface StepPainPointsProps {
  painPoints: PainPoint[];
  onPainPointsChange: (points: PainPoint[]) => void;
}

export default function StepPainPoints({
  painPoints,
  onPainPointsChange,
}: StepPainPointsProps) {
  const updatePoint = (index: number, field: keyof PainPoint, value: string | number) => {
    const updated = [...painPoints];
    updated[index] = { ...updated[index], [field]: value };
    onPainPointsChange(updated);
  };

  const addPoint = () => {
    onPainPointsChange([...painPoints, createEmptyPainPoint()]);
  };

  const removePoint = (index: number) => {
    if (painPoints.length > 1) {
      onPainPointsChange(painPoints.filter((_, i) => i !== index));
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">페인포인트</h2>
            <p className="text-sm text-gray-600 mt-1">
              업무 수행 시 겪는 어려움과 불편 사항을 입력해주세요.
            </p>
          </div>
          <button
            type="button"
            onClick={addPoint}
            className="inline-flex items-center px-3 py-2 border border-blue-600 text-sm font-medium rounded-md text-blue-600 bg-white hover:bg-blue-50 transition-colors"
          >
            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            추가
          </button>
        </div>
      </div>

      <div className="space-y-4">
        {painPoints.map((point, index) => (
          <div key={point.id} className="border border-gray-200 rounded-lg p-4 bg-gray-50">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-sm font-medium text-gray-900 flex items-center">
                <span className="w-6 h-6 rounded-full bg-red-100 text-red-600 text-xs flex items-center justify-center mr-2">
                  {index + 1}
                </span>
                페인포인트 {index + 1}
              </h3>
              {painPoints.length > 1 && (
                <button
                  type="button"
                  onClick={() => removePoint(index)}
                  className="text-sm text-red-600 hover:text-red-800 flex items-center"
                >
                  <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                  삭제
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-2">
                <label className="block text-xs font-medium text-gray-700">
                  설명 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={point.description}
                  onChange={(e) => updatePoint(index, 'description', e.target.value)}
                  required
                  placeholder="예: 데이터 수집에 많은 시간 소요"
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700">심각도</label>
                <select
                  value={point.severity}
                  onChange={(e) => updatePoint(index, 'severity', e.target.value)}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  {SEVERITY_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700">우선순위</label>
                <div className="mt-1 flex items-center space-x-2">
                  <input
                    type="range"
                    min="1"
                    max="10"
                    value={point.priority}
                    onChange={(e) => updatePoint(index, 'priority', parseInt(e.target.value))}
                    className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                  />
                  <span className="text-sm font-medium text-blue-600 w-6 text-center">
                    {point.priority}
                  </span>
                </div>
              </div>
              <div className="md:col-span-2">
                <label className="block text-xs font-medium text-gray-700">영향도</label>
                <input
                  type="text"
                  value={point.impact || ''}
                  onChange={(e) => updatePoint(index, 'impact', e.target.value)}
                  placeholder="예: 월 10시간 추가 소요"
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
