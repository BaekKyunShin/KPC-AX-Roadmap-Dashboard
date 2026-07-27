'use client';

import { FormSection } from '@/components/forms/FormSection';
import { LargeTextBox } from '@/components/forms/LargeTextBox';
import { ExampleAccordion } from '@/components/forms/ExampleAccordion';

import type { RoadmapStepProps } from './types';

/**
 * Ⅰ-1 수립 필요성 — [인터뷰 입력]
 *
 * 양식 기준: 5줄 내외 자유 서술. AI 훈련로드맵 수립 이유 + AI 적용 필요성.
 * 데이터 슬라이스: `RoadmapOverview.establishmentNecessity` (string).
 */
export function StepNecessity({ value, onChange, readOnly = false }: RoadmapStepProps<string>) {
  return (
    <FormSection
      number="Ⅰ-1"
      title="수립 필요성"
      label="[인터뷰 입력]"
      description="AI 훈련로드맵 수립을 위해 해당 과업(또는 워크플로우) 선정 이유 및 AI 적용의 필요성 작성 (5줄 내외로 간단히 기술)"
    >
      <LargeTextBox
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="수립 필요성을 자유롭게 서술하세요..."
        disabled={readOnly}
        aria-label="수립 필요성"
      />
      <ExampleAccordion
        guide={
          <ul className="list-none space-y-1">
            <li>
              □ 컨설팅 대상 기업의 경영진 또는 담당자(내부전문가)와 인터뷰 등을 통해 파악한
              AI훈련로드맵 수립을 위해 해당 과업(또는 워크플로우) 선정 이유 및 AI 적용의 필요성 등
              작성(5줄 내외로 간단히 기술)
            </li>
          </ul>
        }
      />
    </FormSection>
  );
}
