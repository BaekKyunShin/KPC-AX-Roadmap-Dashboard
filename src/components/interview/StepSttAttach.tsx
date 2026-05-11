'use client';

/**
 * StepSttAttach — 인터뷰 폼 마지막 단계 "인터뷰 녹취 STT 첨부 (선택)" 어댑터.
 *
 * 기존 Step 컴포넌트(StepNecessity·StepHrdReportPdf 등)와 시각 일관성을 위해
 * StepSttUpload 를 FormSection 으로 감싸 양식 번호("선택")·제목·라벨·설명을
 * 표준 헤더로 노출한다. StepSttUpload 에는 showHeader={false} 를 전달해 내부
 * h3 헤더가 중복으로 렌더되지 않도록 한다.
 *
 * onExtract 콜백은 부모(Roadmap·PBL InterviewClient)가
 * `(text) => extractSttInsights(projectId, text)` 형태로 closure 를 만들어
 * 전달한다. 어댑터는 projectId 를 알 필요 없이 콜백만 위임한다.
 */

import { FormSection } from '@/components/forms/FormSection';
import { StepSttUpload } from './StepSttUpload';
import type { SttInsights } from '@/lib/schemas/interview-roadmap';

export interface StepSttAttachProps {
  value: SttInsights | undefined;
  onChange: (insights: SttInsights | undefined) => void;
  onExtract: (
    sttText: string,
  ) => Promise<{ success: true; data: SttInsights } | { success: false; error: string }>;
}

export function StepSttAttach({ value, onChange, onExtract }: StepSttAttachProps) {
  return (
    <FormSection
      number="선택"
      title="인터뷰 녹취 STT 첨부"
      label="[인터뷰 입력]"
      description="현장 인터뷰 녹취 STT 텍스트를 붙여넣고 LLM 으로 6개 카테고리(추가 업무·페인포인트·숨은 니즈·조직 맥락·AI 태도·주요 인용)로 자동 정리합니다. 본 단계는 선택 입력이며, 추출 결과는 자동 저장되어 결과 생성 시 LLM 프롬프트에 반영됩니다."
    >
      <StepSttUpload
        insights={value}
        onChange={onChange}
        onExtract={onExtract}
        showHeader={false}
      />
    </FormSection>
  );
}
