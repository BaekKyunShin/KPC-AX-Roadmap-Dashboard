'use client';

import type { PainPoint } from '@/lib/schemas/interview';
import { createEmptyPainPoint } from '@/lib/schemas/interview';

const SEVERITY_OPTIONS = [
  { value: 'HIGH', label: '높음' },
  { value: 'MEDIUM', label: '보통' },
  { value: 'LOW', label: '낮음' },
];

// 자동차 부품 품질관리 페인포인트 예시 (1차 협력사 품질팀 시나리오)
const EXAMPLE_PAIN_POINTS: Omit<PainPoint, 'id'>[] = [
  {
    description: '입고 검사 결과를 Excel에 수기로 입력하는데 일 평균 2시간 소요. 2차 협력사마다 성적서 양식이 달라서 데이터 정리에 추가 시간 필요. 단순 입력 실수로 인한 데이터 오류도 빈번함.',
    severity: 'HIGH',
    related_task_ids: [],
  },
  {
    description: 'MES에서 SPC 데이터를 추출해서 Excel로 옮긴 후 Cpk 계산 및 관리도를 수동으로 작성. 분석 관점이 바뀌면 수식을 처음부터 다시 설정해야 하고, 담당자(김OO 과장) 외에는 분석 방법을 모름.',
    severity: 'HIGH',
    related_task_ids: [],
  },
  {
    description: 'OEM 클레임 대응 시 8D 보고서 작성에 평균 4시간 소요. 과거 유사 불량 사례를 찾으려면 수백 개의 Excel 파일을 뒤져야 함. 기한 내 회신 못하면 품질 등급 감점 받음.',
    severity: 'HIGH',
    related_task_ids: [],
  },
  {
    description: '주간 품질 현황 보고서 작성에 매주 금요일 오후 전체를 투입. MES 데이터 추출 → Excel 정리 → 피벗테이블 분석 → PPT 작성까지 동일한 작업을 매주 반복.',
    severity: 'MEDIUM',
    related_task_ids: [],
  },
  {
    description: '부적합 보고서(NCR) 작성 시 불량 사진, 측정값, 규격 정보를 각각 다른 폴더/시스템에서 찾아와야 함. 동일 유형 불량이라도 매번 처음부터 새로 작성해야 함.',
    severity: 'MEDIUM',
    related_task_ids: [],
  },
];

interface StepPainPointsProps {
  painPoints: PainPoint[];
  onPainPointsChange: (points: PainPoint[]) => void;
}

export default function StepPainPoints({
  painPoints,
  onPainPointsChange,
}: StepPainPointsProps) {
  const updatePoint = (index: number, field: keyof PainPoint, value: string) => {
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

  const fillExample = (index: number) => {
    const example = EXAMPLE_PAIN_POINTS[index % EXAMPLE_PAIN_POINTS.length];
    const updated = [...painPoints];
    updated[index] = {
      ...updated[index],
      description: example.description,
      severity: example.severity,
    };
    onPainPointsChange(updated);
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
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => fillExample(index)}
                  className="text-xs text-blue-600 hover:text-blue-800 flex items-center"
                  title="예시 채우기"
                >
                  <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                  </svg>
                  예시
                </button>
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
            </div>

            <div>
              {/* 레이블 행 */}
              <div className="flex gap-3 mb-1">
                <label className="flex-1 text-xs font-medium text-gray-700">
                  설명 <span className="text-red-500">*</span>
                </label>
                <label className="w-16 text-xs font-medium text-gray-700 text-center flex-shrink-0">심각도</label>
              </div>

              {/* 입력 영역 (높이 동기화) */}
              <div className="flex gap-3">
                <textarea
                  rows={3}
                  value={point.description}
                  onChange={(e) => updatePoint(index, 'description', e.target.value)}
                  required
                  placeholder="어떤 어려움이 있는지, 얼마나 자주 발생하는지, 어떤 영향이 있는지 구체적으로 설명해주세요."
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-y min-h-[84px] break-keep"
                />

                {/* 심각도 버튼 (textarea와 동일 높이) */}
                <div className="w-16 flex-shrink-0 flex flex-col justify-between">
                  {SEVERITY_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => updatePoint(index, 'severity', opt.value)}
                      className={`w-full py-1.5 text-xs font-medium rounded-md border transition-colors ${
                        point.severity === opt.value
                          ? opt.value === 'HIGH'
                            ? 'bg-red-100 border-red-300 text-red-700'
                            : opt.value === 'MEDIUM'
                            ? 'bg-yellow-100 border-yellow-300 text-yellow-700'
                            : 'bg-green-100 border-green-300 text-green-700'
                          : 'bg-white border-gray-200 text-gray-500 hover:bg-gray-50 hover:border-gray-300'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
