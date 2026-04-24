'use client';

import { FormSection } from '@/components/forms/FormSection';
import { LargeTextBox } from '@/components/forms/LargeTextBox';
import { ExampleAccordion } from '@/components/forms/ExampleAccordion';

import type { RoadmapStepProps } from './types';
import type { RoadmapCompanyRequirements } from '@/lib/schemas/interview-roadmap';

/**
 * Ⅱ-2 기업 요구분석 — [인터뷰 입력]
 *
 * 양식 기준: 4행 × 3열 표 (구분 | 확인 내용 | 비고/작성 예시).
 *  - 기업 현황
 *  - 주요 문제
 *  - 추진 의지
 *  - 기대 성과
 *
 * 데이터 슬라이스: `RoadmapRequirements.companyRequirements.{status, problem, will, outcomes}`.
 */

type CompanyReq = RoadmapCompanyRequirements;

interface RowDef {
  key: keyof CompanyReq;
  label: string;
  placeholder: string;
  example: string;
  ariaLabel: string;
}

const ROWS: ReadonlyArray<RowDef> = [
  {
    key: 'status',
    label: '기업 현황',
    placeholder: '기업 현황을 서술하세요...',
    example: '업종, 생산품, AI 도입·활용 현황, 훈련 이력 등',
    ariaLabel: '기업 현황',
  },
  {
    key: 'problem',
    label: '주요 문제',
    placeholder: '주요 문제를 서술하세요...',
    example: '현행 공정 프로세스, 설비 관리 등의 문제점 파악',
    ariaLabel: '주요 문제',
  },
  {
    key: 'will',
    label: '추진 의지',
    placeholder: '추진 의지를 서술하세요...',
    example: 'AI 도입·활용 및 훈련 실시 의지 파악',
    ariaLabel: '추진 의지',
  },
  {
    key: 'outcomes',
    label: '기대 성과',
    placeholder: '기대 성과를 서술하세요...',
    example: 'AI 도입·활용 훈련으로 인한 개선 목표 등',
    ariaLabel: '기대 성과',
  },
];

export function StepCompanyRequirements({
  value,
  onChange,
  readOnly = false,
}: RoadmapStepProps<CompanyReq>) {
  const v: CompanyReq = value ?? { status: '', problem: '', will: '', outcomes: '' };

  return (
    <FormSection
      number="Ⅱ-2"
      title="기업 요구분석"
      label="[인터뷰 입력]"
      description="기업의 내부전문가와 면담을 통해 현재 기업의 현황과 AI 도입·활용에 대한 요구를 구조적으로 도출합니다."
    >
      <div className="overflow-x-auto">
        <table className="w-full border-collapse border border-border text-sm">
          <caption className="sr-only">기업 요구분석 표</caption>
          <thead>
            <tr>
              <th
                scope="col"
                className="w-[120px] border border-border bg-muted px-3 py-2 text-center font-semibold"
              >
                구분
              </th>
              <th
                scope="col"
                className="border border-border bg-muted px-3 py-2 text-center font-semibold"
              >
                확인 내용
              </th>
              <th
                scope="col"
                className="w-[240px] border border-border bg-muted px-3 py-2 text-center font-semibold"
              >
                비고 (작성 예시)
              </th>
            </tr>
          </thead>
          <tbody>
            {ROWS.map((row) => (
              <tr key={row.key}>
                <th
                  scope="row"
                  className="border border-border bg-muted/30 px-3 py-2 text-center align-top font-medium"
                >
                  {row.label}
                </th>
                <td className="border border-border p-2 align-top">
                  <LargeTextBox
                    value={v[row.key] ?? ''}
                    onChange={(e) =>
                      onChange({ ...v, [row.key]: e.target.value })
                    }
                    placeholder={row.placeholder}
                    disabled={readOnly}
                    aria-label={row.ariaLabel}
                    minHeightClassName="min-h-[96px]"
                  />
                </td>
                <td className="border border-border bg-muted/10 px-3 py-2 align-top text-xs text-muted-foreground">
                  {row.example}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <ExampleAccordion
        guide={
          <ul className="list-disc space-y-1 pl-4">
            <li>
              요구분석에서 우선적으로 AI 도입·활용이 필요한 과업(또는 워크플로우)을 필수로 파악합니다.
            </li>
            <li>훈련대상 과업 선정의 논리적 근거가 됩니다.</li>
            <li>추가 내용은 별첨의 내부환경 부분에 제시할 수 있습니다.</li>
          </ul>
        }
      />
    </FormSection>
  );
}
