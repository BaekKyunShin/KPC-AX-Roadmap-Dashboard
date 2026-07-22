'use client';

import { FormSection } from '@/components/forms/FormSection';
import { LargeTextBox } from '@/components/forms/LargeTextBox';
import { ExampleAccordion } from '@/components/forms/ExampleAccordion';

import type { PBLStepProps } from './types';

/**
 * Ⅱ-1-가 기업 경영 이슈 — [인터뷰 입력]
 *
 * 양식 기준: bullet 서술 (3~5줄). 기업의 사업 환경·시장 변화·전략 과제 중심.
 * 데이터 슬라이스: `PBLAnalysis.companyIssues` (string).
 */
export function StepCompanyIssues({ value, onChange, readOnly = false }: PBLStepProps<string>) {
  return (
    <FormSection
      number="Ⅱ-1"
      title="기업 경영 이슈"
      label="[인터뷰 입력]"
      description="훈련과정을 둘러싼 기업의 최근 경영 이슈를 인터뷰 청취한 그대로 서술합니다."
    >
      <LargeTextBox
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="예: 글로벌 원자재 가격 상승으로 제조 원가 관리 부담 증가, AI 기반 품질 검사 도입 필요성 대두..."
        disabled={readOnly}
        aria-label="기업 경영 이슈"
      />
      <ExampleAccordion
        guideLabel="작성 가이드"
        guide={
          <ul className="list-disc space-y-1 pl-4">
            <li>
              기업담당자와의 인터뷰를 통해 기업의 내·외부 환경에 대해 파악하고 기업이 마주한
              어려움이 무엇인지를 작성
            </li>
            <li>
              경영진 또는 담당자(내부전문가) 인터뷰로 확인한 사업 환경·시장 변화·전략 과제를
              정리합니다.
            </li>
            <li>3~5줄의 bullet 또는 문단 서술 모두 허용합니다.</li>
            <li>
              Ⅱ-1-다 &ldquo;AI훈련과정 개발 필요성&rdquo; 과 중복되지 않게 경영 전반의 이슈에 초점을
              맞춥니다.
            </li>
          </ul>
        }
      />
    </FormSection>
  );
}
