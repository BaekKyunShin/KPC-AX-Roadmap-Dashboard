'use client';

import type { PainPoint } from '@/lib/schemas/interview';
import { createEmptyPainPoint } from '@/lib/schemas/interview';
import FillExampleButton from './FillExampleButton';

const SEVERITY_OPTIONS = [
  { value: 'HIGH', label: '높음' },
  { value: 'MEDIUM', label: '보통' },
  { value: 'LOW', label: '낮음' },
];

// 일반 사무/서비스 기업 페인포인트 예시 (중소 유통 기업 시나리오)
const EXAMPLE_PAIN_POINTS: Omit<PainPoint, 'id'>[] = [
  {
    description: '고객 문의를 수작업으로 분류하고 응답하는데 하루 3시간 이상 소요. 반복되는 문의(배송 조회, 교환 절차 등)도 매번 직접 답변해야 하고, 바쁠 때는 응답이 하루 넘게 지연됨.',
    severity: 'HIGH',
    related_task_ids: [],
  },
  {
    description: '월간 매출 보고서 작성에 매달 2~3일 소요. 쇼핑몰/쿠팡/네이버 등 채널별 데이터를 각각 다운받아 Excel로 합치고, 차트 만들고, PPT로 옮기는 동일한 작업을 매달 반복.',
    severity: 'HIGH',
    related_task_ids: [],
  },
  {
    description: 'SNS 콘텐츠 아이디어 고갈과 제작 시간 부담. 카드뉴스 1장 만드는 데 2시간, 블로그 글 1편에 3시간 소요. 주 3-4회 발행 유지가 어렵고, 성과 분석까지 할 여력이 없음.',
    severity: 'HIGH',
    related_task_ids: [],
  },
  {
    description: 'Excel 기반 재고 관리로 실시간 재고 파악이 어려움. 입출고 때마다 수동 업데이트해야 하고, 실사와 데이터가 안 맞는 경우가 월 5-10건 발생. 긴급 발주 누락으로 품절이 생기기도 함.',
    severity: 'MEDIUM',
    related_task_ids: [],
  },
  {
    description: '회의록 작성이 수작업이라 공유가 늦고 누락이 잦음. 회의 중 메모한 내용을 다시 정리하는 데 30분-1시간 걸리고, 결정사항 후속 조치 추적도 안 됨.',
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
            페인포인트 추가
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
                <FillExampleButton onClick={() => fillExample(index)} />
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
