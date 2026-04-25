'use client';

import { FormSection } from '@/components/forms/FormSection';
import { LargeTextBox } from '@/components/forms/LargeTextBox';
import { FormCheckbox } from '@/components/forms/FormCheckbox';
import { ExampleAccordion } from '@/components/forms/ExampleAccordion';

import type { RoadmapStepProps } from './types';
import type { RoadmapInterviewStrict } from '@/lib/schemas/interview-roadmap';

/**
 * Ⅰ-3 수립 주요 결과 — [인터뷰 입력 → 결과 페이지]
 *
 * 양식 기준 입력 항목:
 *  - 기업 AI 역량 수준 체크 (택1): 초급 (AI기초형) / 중급 (AI탐구형) / 고급 (AI활용형·선도형)
 *  - 선정 과업 (자유 서술)
 *
 * "AI훈련로드맵 수립 주요내용 요약" 은 결과 페이지에서 LLM 자동 생성하므로
 * 본 Step 의 입력 대상이 아니다.
 */
type AiLevel = RoadmapInterviewStrict['aiLevel'];

export interface StepMainResultValue {
  aiLevel: AiLevel;
  selectedTask: string;
}

const AI_LEVEL_OPTIONS: ReadonlyArray<{ value: AiLevel; label: string }> = [
  { value: 'BEGINNER', label: '초급 (AI기초형)' },
  { value: 'INTERMEDIATE', label: '중급 (AI탐구형)' },
  { value: 'ADVANCED', label: '고급 (AI활용형·선도형)' },
];

export function StepMainResult({
  value,
  onChange,
  readOnly = false,
}: RoadmapStepProps<StepMainResultValue>) {
  return (
    <FormSection
      number="Ⅰ-3"
      title="수립 주요 결과"
      label="[인터뷰 입력 → 결과 페이지]"
      description="기업의 AI 역량 수준과 컨설팅을 통해 선정된 과업(또는 워크플로우)을 작성합니다."
    >
      <div className="space-y-2">
        <h3 className="text-sm font-semibold">기업 AI 역량 수준 (택1)</h3>
        <FormCheckbox<AiLevel>
          mode="single"
          options={[...AI_LEVEL_OPTIONS]}
          value={value.aiLevel}
          onChange={(next) => onChange({ ...value, aiLevel: next as AiLevel })}
          readOnly={readOnly}
        />
      </div>

      <div className="space-y-2">
        <h3 className="text-sm font-semibold">선정 과업 (또는 워크플로우)</h3>
        <LargeTextBox
          value={value.selectedTask}
          onChange={(e) => onChange({ ...value, selectedTask: e.target.value })}
          placeholder="컨설팅을 통해 선정된 과업(또는 워크플로우) 명을 작성하세요..."
          disabled={readOnly}
          aria-label="선정 과업"
        />
      </div>

      <ExampleAccordion
        guide={
          <ul className="list-disc space-y-1 pl-4">
            <li>
              AI 역량 수준은 기업의 현재 AI 활용 정도에 맞춰 1개를 선택합니다 (초급 /
              중급 / 고급).
            </li>
            <li>선정 과업은 양식 Ⅱ-4 훈련대상 과업 선정과 일관되게 작성합니다.</li>
          </ul>
        }
      />
    </FormSection>
  );
}
