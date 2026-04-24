'use client';

import { FormSection } from '@/components/forms/FormSection';
import { LargeTextBox } from '@/components/forms/LargeTextBox';
import { ExampleAccordion } from '@/components/forms/ExampleAccordion';

import type { PBLV2StepProps } from './types';

/**
 * Ⅱ-2 기업 훈련환경 분석 — [인터뷰 입력]
 *
 * 양식 원본은 표(적정 훈련시간·장소·AI인프라 등)와 박스 자유서술이 혼재한다.
 * 신규 camelCase 스키마는 요약/자유서술 string 단일 필드(trainingEnv) 로 단순화해 저장하고,
 * 표 형태 세부 필드는 기존 snake_case trainingEnvironmentSchema 가 병존 유지한다.
 *
 * 데이터 슬라이스: `PBLAnalysis.trainingEnv` (string).
 */
export function StepTrainingEnv({
  value,
  onChange,
  readOnly = false,
}: PBLV2StepProps<string>) {
  return (
    <FormSection
      number="Ⅱ-2"
      title="기업 훈련환경 분석"
      label="[인터뷰 입력]"
      description="훈련시간·장소·AI인프라·참여자 특성 등 훈련환경을 요약 서술합니다."
    >
      <LargeTextBox
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="예: 사내 교육장 활용 가능 · PC 30대 · 네트워크 양호 · 담당자 AI 도구 경험 제한적..."
        disabled={readOnly}
        aria-label="훈련환경 분석"
        minHeightClassName="min-h-[200px]"
      />
      <ExampleAccordion
        guide={
          <ul className="list-disc space-y-1 pl-4">
            <li>적정 훈련시간: 현장 인터뷰에서 파악한 집중 가능 시간·회차 당 시간 등.</li>
            <li>훈련장소: 사내/사외·장소명·특이사항 (추가 훈련장 필요 사유 포함).</li>
            <li>AI인프라: AI 도구 가용성·네트워크 품질·PC 수·특수 장비.</li>
            <li>참여자 특성: 평균 경력·직급 수준·AI 경험도.</li>
            <li>기대 효과 (As-Is / To-Be) 는 Ⅱ-3 에서 별도 다룹니다.</li>
          </ul>
        }
      />
    </FormSection>
  );
}
