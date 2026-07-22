'use client';

import { FormSection } from '@/components/forms/FormSection';
import { LargeTextBox } from '@/components/forms/LargeTextBox';
import { ExampleAccordion } from '@/components/forms/ExampleAccordion';

import type { PBLStepProps } from './types';

/**
 * Ⅱ-3-나 AI훈련과정 개발 필요성 — [인터뷰 입력]
 *
 * 양식 기준: AI 훈련과정 신규 개발의 근거를 서술 (5줄 내외).
 * 데이터 슬라이스: `PBLAnalysis.courseNecessity` (string).
 *
 * 주의: hrdReportPdf 가 null 인 경우 strict 검증에서 비공백 courseNecessity 가
 * 반드시 요구된다. StickyFormNav 제출 경계에서 safeParse 가 실패하면 토스트로 표출.
 */
export function StepCourseNecessity({ value, onChange, readOnly = false }: PBLStepProps<string>) {
  return (
    <FormSection
      number="Ⅱ-1-다"
      title="AI훈련과정 개발 필요성"
      label="[인터뷰 입력]"
      description="AI훈련과정 신규 개발의 근거를 서술합니다. HRD이음 보고서 PDF 가 없을 때는 반드시 작성해야 합니다."
    >
      <LargeTextBox
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="예: 기존 ERP 업무와 AI 도구 활용 경험 간 격차 해소, 현장 엔지니어의 AI 기초 지식 습득 필요..."
        disabled={readOnly}
        aria-label="AI훈련과정 개발 필요성"
      />
      <ExampleAccordion
        guideLabel="작성 가이드"
        guide={
          <ul className="list-none space-y-1">
            <li>1. 기업HRD이음컨설팅 및 AI훈련 로드맵 컨설팅 보고서 내용 자동 연계</li>
            <li>
              Ⅱ-1-가 HRD이음 보고서 PDF 를 첨부하지 않을 때는 본 필드가 제출 필수입니다 (strict 검증
              경계에서 차단).
            </li>
            <li>5줄 내외 서술 권장.</li>
          </ul>
        }
      />
    </FormSection>
  );
}
