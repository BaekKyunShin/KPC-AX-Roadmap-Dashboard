'use client';

import { FormSection } from '@/components/forms/FormSection';
import { LargeTextBox } from '@/components/forms/LargeTextBox';
import { ExampleAccordion } from '@/components/forms/ExampleAccordion';

import type { RoadmapStepProps } from './types';
import type {
  RoadmapCompanyRequirements,
  RoadmapCompanyRequirementsRemarks,
} from '@/lib/schemas/interview-roadmap';

/**
 * Ⅱ-2 기업 요구분석 — [인터뷰 입력]
 *
 * 양식 기준: 4행 × 3열 표 (구분 | 확인 내용 | 비고).
 *  - 기업 현황
 *  - 주요 문제
 *  - 추진 의지
 *  - 기대 성과
 *
 * 비고 칼럼은 사용자 입력란 (#6 fix). 양식 √ 작성 예시는 ExampleAccordion 으로 이동.
 *
 * 데이터 슬라이스: `RoadmapRequirements.companyRequirements.{status, problem, will, outcomes, remarks}`.
 */

type CompanyReq = RoadmapCompanyRequirements;
type RemarksKey = keyof RoadmapCompanyRequirementsRemarks;

interface RowDef {
  key: RemarksKey;
  label: string;
  placeholder: string;
  remarksPlaceholder: string;
  ariaLabel: string;
}

const ROWS: ReadonlyArray<RowDef> = [
  {
    key: 'status',
    label: '기업 현황',
    placeholder: '기업 현황을 서술하세요...',
    remarksPlaceholder: '특이사항·예외 케이스 등 (선택)',
    ariaLabel: '기업 현황',
  },
  {
    key: 'problem',
    label: '주요 문제',
    placeholder: '주요 문제를 서술하세요...',
    remarksPlaceholder: '특이사항·예외 케이스 등 (선택)',
    ariaLabel: '주요 문제',
  },
  {
    key: 'will',
    label: '추진 의지',
    placeholder: '추진 의지를 서술하세요...',
    remarksPlaceholder: '특이사항·예외 케이스 등 (선택)',
    ariaLabel: '추진 의지',
  },
  {
    key: 'outcomes',
    label: '기대 성과',
    placeholder: '기대 성과를 서술하세요...',
    remarksPlaceholder: '특이사항·예외 케이스 등 (선택)',
    ariaLabel: '기대 성과',
  },
];

export function StepCompanyRequirements({
  value,
  onChange,
  readOnly = false,
}: RoadmapStepProps<CompanyReq>) {
  const v: CompanyReq = value ?? { status: '', problem: '', will: '', outcomes: '' };
  const remarks: RoadmapCompanyRequirementsRemarks = v.remarks ?? {};

  function updateField(key: RemarksKey, next: string) {
    onChange({ ...v, [key]: next });
  }
  function updateRemark(key: RemarksKey, next: string) {
    onChange({ ...v, remarks: { ...remarks, [key]: next } });
  }

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
                비고
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
                    onChange={(e) => updateField(row.key, e.target.value)}
                    placeholder={row.placeholder}
                    disabled={readOnly}
                    aria-label={row.ariaLabel}
                    minHeightClassName="min-h-[163px]"
                  />
                </td>
                <td className="border border-border p-2 align-top">
                  <LargeTextBox
                    value={remarks[row.key] ?? ''}
                    onChange={(e) => updateRemark(row.key, e.target.value)}
                    placeholder={row.remarksPlaceholder}
                    disabled={readOnly}
                    aria-label={`${row.ariaLabel} 비고`}
                    minHeightClassName="min-h-[163px]"
                  />
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
              기업의 내부전문가와 면담을 통해 현재 기업의 현황과 AI 도입·활용에 대한 요구를
              구조적으로 도출
            </li>
            <li>
              요구분석에서 우선적으로 AI 도입·활용이 필요한 과업(또는 워크플로우)을 필수로
              파악합니다.
            </li>
            <li>훈련대상 과업 선정의 논리적 근거가 됩니다.</li>
            <li>추가 내용은 별첨의 내부환경 부분에 제시할 수 있습니다.</li>
          </ul>
        }
        example={
          <ul className="list-disc space-y-1 pl-4">
            <li>
              <strong>기업 현황</strong> — 업종, 생산품, AI 도입·활용 현황, 훈련 이력 등
            </li>
            <li>
              <strong>주요 문제</strong> — 현행 공정 프로세스, 설비 관리 등의 문제점 파악
            </li>
            <li>
              <strong>추진 의지</strong> — AI 도입·활용 및 훈련 실시 의지 파악
            </li>
            <li>
              <strong>기대 성과</strong> — AI 도입·활용 훈련으로 인한 개선 목표 등
            </li>
          </ul>
        }
      />
    </FormSection>
  );
}
