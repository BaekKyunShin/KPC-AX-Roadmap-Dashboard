'use client';

import { FormSection } from '@/components/forms/FormSection';
import { LargeTextBox } from '@/components/forms/LargeTextBox';
import { ExampleAccordion } from '@/components/forms/ExampleAccordion';

import type { PBLStepProps } from './types';
import type { PBLProblemDefinitionSheet } from '@/lib/schemas/interview-pbl';

/**
 * Ⅲ-2 문제 정의서 — [인터뷰 입력]
 *
 * Ⅲ-2-가 문제 정의서 (R8 PBL-자체-04): 양식 5×2 표의 정형 4 항목 단일 세트
 * (문제 배경 / 핵심 문제 / 문제 범위 / 제약 조건). 행 추가/삭제 불가.
 *
 * V2 에서 Ⅲ-2-나 문제 우선순위 매트릭스는 양식에서 제거됐다.
 */

export interface StepProblemsValue {
  problemDefinitionSheet: PBLProblemDefinitionSheet;
}

function emptyProblemDefinition(): PBLProblemDefinitionSheet {
  return { background: '', core: '', scope: '', constraints: '' };
}

export function StepProblems({
  value,
  onChange,
  readOnly = false,
}: PBLStepProps<StepProblemsValue>) {
  const problemDefinitionSheet: PBLProblemDefinitionSheet =
    value.problemDefinitionSheet ?? emptyProblemDefinition();

  function updateDefinition(patch: Partial<PBLProblemDefinitionSheet>) {
    onChange({ problemDefinitionSheet: { ...problemDefinitionSheet, ...patch } });
  }

  return (
    <FormSection
      number="Ⅲ-2"
      title="문제 정의서"
      label="[인터뷰 입력]"
      description="Ⅲ-2-가 문제 정의서(배경·핵심·범위·제약)의 4 정형 항목을 모두 작성합니다."
    >
      {/* 문제 정의서 (R8 PBL-자체-04 — 양식 5×2 표의 4 정형 항목 단일 세트) */}
      <div className="space-y-2">
        <h3 className="text-sm font-semibold">Ⅲ-2-가 문제 정의서</h3>
        <p className="text-xs text-muted-foreground">
          양식상 단일 세트 — 4 정형 항목(배경/핵심/범위/제약)을 모두 작성합니다.
        </p>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse border border-border text-sm">
            <caption className="sr-only">문제 정의서</caption>
            <thead>
              <tr>
                <th className="w-[160px] border border-border bg-muted px-2 py-2 text-center font-semibold">
                  구분
                </th>
                <th className="border border-border bg-muted px-2 py-2 text-center font-semibold">
                  내용
                </th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="border border-border bg-muted/40 px-2 py-2 text-center font-medium">
                  문제 배경
                </td>
                <td className="border border-border p-1 align-top">
                  <LargeTextBox
                    value={problemDefinitionSheet.background}
                    onChange={(e) => updateDefinition({ background: e.target.value })}
                    placeholder="문제가 발생하게 된 외·내부 환경, 시점, 트리거 사건 등"
                    disabled={readOnly}
                    aria-label="문제 배경"
                    minHeightClassName="min-h-[80px]"
                  />
                </td>
              </tr>
              <tr>
                <td className="border border-border bg-muted/40 px-2 py-2 text-center font-medium">
                  핵심 문제
                </td>
                <td className="border border-border p-1 align-top">
                  <LargeTextBox
                    value={problemDefinitionSheet.core}
                    onChange={(e) => updateDefinition({ core: e.target.value })}
                    placeholder="핵심 문제를 한 문장으로 명확히 정의"
                    disabled={readOnly}
                    aria-label="핵심 문제"
                    minHeightClassName="min-h-[80px]"
                  />
                </td>
              </tr>
              <tr>
                <td className="border border-border bg-muted/40 px-2 py-2 text-center font-medium">
                  문제 범위
                </td>
                <td className="border border-border p-1 align-top">
                  <LargeTextBox
                    value={problemDefinitionSheet.scope}
                    onChange={(e) => updateDefinition({ scope: e.target.value })}
                    placeholder="문제가 발생하는 부서·공정·제품군 등 범위"
                    disabled={readOnly}
                    aria-label="문제 범위"
                    minHeightClassName="min-h-[80px]"
                  />
                </td>
              </tr>
              <tr>
                <td className="border border-border bg-muted/40 px-2 py-2 text-center font-medium">
                  제약 조건
                </td>
                <td className="border border-border p-1 align-top">
                  <LargeTextBox
                    value={problemDefinitionSheet.constraints}
                    onChange={(e) => updateDefinition({ constraints: e.target.value })}
                    placeholder="해결을 어렵게 하는 자원·기술·법적·시간적 제약"
                    disabled={readOnly}
                    aria-label="제약 조건"
                    minHeightClassName="min-h-[80px]"
                  />
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <ExampleAccordion
        guide={
          <ul className="list-disc space-y-1 pl-4">
            <li>
              <strong>양식 √ 작성안내:</strong> 실제로 직무에 해결해야 할 문제를 선정하기 위한 문제
              범위 도출하고 핵심 개념, 문제를 명확히 정의합니다. 외부 전문가, 기업 내·외부 인력의
              의견을 종합해 작성합니다.
            </li>
            <li>
              4 정형 항목 모두 작성: 배경(맥락) → 핵심 문제(한 문장 정의) → 범위(영향 부서·공정) →
              제약(자원·기술·법적 한계).
            </li>
          </ul>
        }
      />
    </FormSection>
  );
}
