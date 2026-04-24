'use client';

import { FormSection } from '@/components/forms/FormSection';
import { LargeTextBox } from '@/components/forms/LargeTextBox';
import { ExampleAccordion } from '@/components/forms/ExampleAccordion';

import type { RoadmapV2StepProps } from './types';
import type { RoadmapTargetTask } from '@/lib/schemas/interview-roadmap';

/**
 * Ⅱ-4 훈련대상 과업 선정 — [인터뷰 입력]
 *
 * 양식 기준 블록 구조 표:
 *  - 훈련대상 과업 (1행)
 *  - 선정 사유 (1행)
 *  - 기대 효과 (rowspan=2)
 *     ├─ 현행 (As-Is) (1행)
 *     └─ 개선 (To-Be) (1행)
 *
 * 데이터 슬라이스: `RoadmapRequirements.targetTask.{name, reason, expectedAsIs, expectedToBe}`.
 */

type TargetTask = RoadmapTargetTask;

export function StepTargetTask({
  value,
  onChange,
  readOnly = false,
}: RoadmapV2StepProps<TargetTask>) {
  const v: TargetTask =
    value ?? { name: '', reason: '', expectedAsIs: '', expectedToBe: '' };

  function update<K extends keyof TargetTask>(key: K, val: TargetTask[K]) {
    onChange({ ...v, [key]: val });
  }

  return (
    <FormSection
      number="Ⅱ-4"
      title="훈련대상 과업 선정"
      label="[인터뷰 입력]"
      description="Ⅱ-3 분석표에서 식별한 과업 중 AI훈련로드맵 수립 대상 과업을 선정하고, 선정 사유와 기대 효과를 기술합니다."
    >
      <div className="overflow-x-auto">
        <table className="w-full border-collapse border border-border text-sm">
          <caption className="sr-only">훈련대상 과업 선정 표</caption>
          <tbody>
            <tr>
              <th
                scope="row"
                className="w-[180px] border border-border bg-muted px-3 py-2 text-left align-top font-medium"
              >
                훈련대상 과업
              </th>
              <td className="border border-border p-2 align-top" colSpan={2}>
                <LargeTextBox
                  value={v.name}
                  onChange={(e) => update('name', e.target.value)}
                  placeholder="훈련대상 과업명"
                  disabled={readOnly}
                  aria-label="훈련대상 과업"
                  minHeightClassName="min-h-[60px]"
                />
              </td>
            </tr>
            <tr>
              <th
                scope="row"
                className="border border-border bg-muted px-3 py-2 text-left align-top font-medium"
              >
                선정 사유
              </th>
              <td className="border border-border p-2 align-top" colSpan={2}>
                <LargeTextBox
                  value={v.reason}
                  onChange={(e) => update('reason', e.target.value)}
                  placeholder="Ⅱ-3 과업 분석을 기반으로 한 선정 사유"
                  disabled={readOnly}
                  aria-label="선정 사유"
                  minHeightClassName="min-h-[100px]"
                />
              </td>
            </tr>
            <tr>
              <th
                scope="rowgroup"
                rowSpan={2}
                className="w-[120px] border border-border bg-muted px-3 py-2 text-left align-top font-medium"
              >
                기대 효과
              </th>
              <th
                scope="row"
                className="w-[120px] border border-border bg-muted/30 px-3 py-2 text-left align-top font-medium"
              >
                현행 (As-Is)
              </th>
              <td className="border border-border p-2 align-top">
                <LargeTextBox
                  value={v.expectedAsIs}
                  onChange={(e) => update('expectedAsIs', e.target.value)}
                  placeholder="현행 수행방식 (As-Is)"
                  disabled={readOnly}
                  aria-label="기대 효과 현행"
                  minHeightClassName="min-h-[80px]"
                />
              </td>
            </tr>
            <tr>
              <th
                scope="row"
                className="border border-border bg-muted/30 px-3 py-2 text-left align-top font-medium"
              >
                개선 (To-Be)
              </th>
              <td className="border border-border p-2 align-top">
                <LargeTextBox
                  value={v.expectedToBe}
                  onChange={(e) => update('expectedToBe', e.target.value)}
                  placeholder="AI 도입·활용 훈련 후 개선 (To-Be)"
                  disabled={readOnly}
                  aria-label="기대 효과 개선"
                  minHeightClassName="min-h-[80px]"
                />
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <ExampleAccordion
        guide={
          <ul className="list-disc space-y-1 pl-4">
            <li>
              위 분석표에서 제시한 과업 중 AI훈련로드맵을 수립하기 위한 훈련대상 과업을 선정하고 선정사유를 작성합니다.
            </li>
            <li>
              해당 과업의 현행 수행방식(As-Is)과 AI 도입·활용을 위한 훈련 실시 후 개선(To-Be)되는 사항을 제시합니다.
            </li>
          </ul>
        }
      />
    </FormSection>
  );
}
