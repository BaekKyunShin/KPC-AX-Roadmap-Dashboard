'use client';

import { Plus, Trash2 } from 'lucide-react';

import { FormSection } from '@/components/forms/FormSection';
import { LargeTextBox } from '@/components/forms/LargeTextBox';
import { ExampleAccordion } from '@/components/forms/ExampleAccordion';
import { Button } from '@/components/ui/button';

import type { RoadmapV2StepProps } from './types';
import type { RoadmapPerformanceActivity } from '@/lib/schemas/interview-roadmap';
import {
  INTERVIEW_METHOD_OPTIONS,
  type InterviewMethod,
} from '@/lib/schemas/interview-roadmap';

/**
 * Ⅰ-2 주요 활동 — [인터뷰 입력]
 *
 * 양식 기준 rowspan 표 구조:
 *  - 각 차수 1개 = 2 <tr> 행 (PM 성명 1 행 + 내부전문가 성명 1 행)
 *  - 차수·일시·내용·방법 4개 셀은 rowSpan=2 로 병합
 *  - 기본 3차수 프리필 (양식 L85 기준). 스키마 max(3) 로 상한 제한.
 *
 * 데이터 슬라이스: `RoadmapOverview.performanceActivities[]`.
 */

/** 양식 상 최대 차수 (Zod: RoadmapOverviewSchema.performanceActivities.max(3)) */
const MAX_ROUNDS = 3;

/** 빈 차수 객체 */
function emptyActivity(round: number): RoadmapPerformanceActivity {
  return {
    round,
    date: '',
    timeRange: '',
    content: '',
    method: 'ONSITE',
    pmName: '',
    expertName: '',
  };
}

/** 양식 기본 프리필 = 3차수 (1·2·3차) */
function defaultRows(): RoadmapPerformanceActivity[] {
  return Array.from({ length: MAX_ROUNDS }, (_, i) => emptyActivity(i + 1));
}

export function StepPerformanceActivities({
  value,
  onChange,
  readOnly = false,
}: RoadmapV2StepProps<RoadmapPerformanceActivity[]>) {
  const rows: RoadmapPerformanceActivity[] =
    value && value.length > 0 ? value : defaultRows();

  function emit(next: RoadmapPerformanceActivity[]) {
    onChange(next);
  }

  function updateRow(
    idx: number,
    patch: Partial<RoadmapPerformanceActivity>,
  ) {
    const next = rows.map((r, i) => (i === idx ? { ...r, ...patch } : r));
    emit(next);
  }

  function addRound() {
    if (rows.length >= MAX_ROUNDS) return;
    emit([...rows, emptyActivity(rows.length + 1)]);
  }

  function removeRound(idx: number) {
    if (rows.length <= 1) return;
    const next = rows.filter((_, i) => i !== idx);
    emit(next);
  }

  return (
    <FormSection
      number="Ⅰ-2"
      title="주요 활동"
      label="[인터뷰 입력]"
      description="컨설팅 수행 차수별 일시·내용·방법과 참석자(PM · 기업 내부전문가)를 입력합니다."
    >
      <div className="overflow-x-auto">
        <table className="w-full border-collapse border border-border text-sm">
          <caption className="sr-only">주요 활동 표</caption>
          <thead>
            <tr>
              <th
                scope="col"
                rowSpan={2}
                className="w-[70px] border border-border bg-muted px-2 py-2 text-center font-semibold"
              >
                수행 차수
              </th>
              <th
                scope="col"
                rowSpan={2}
                className="w-[130px] border border-border bg-muted px-2 py-2 text-center font-semibold"
              >
                수행 일시
              </th>
              <th
                scope="col"
                rowSpan={2}
                className="border border-border bg-muted px-2 py-2 text-center font-semibold"
              >
                수행 내용
              </th>
              <th
                scope="col"
                rowSpan={2}
                className="w-[140px] border border-border bg-muted px-2 py-2 text-center font-semibold"
              >
                수행 방법
              </th>
              <th
                scope="col"
                colSpan={2}
                className="border border-border bg-muted px-2 py-2 text-center font-semibold"
              >
                참석자
              </th>
              <th
                scope="col"
                rowSpan={2}
                className="w-[56px] border border-border bg-muted px-2 py-2 text-center font-semibold"
              >
                <span className="sr-only">삭제</span>
              </th>
            </tr>
            <tr>
              <th
                scope="col"
                className="w-[130px] border border-border bg-muted px-2 py-2 text-center font-semibold"
              >
                구분
              </th>
              <th
                scope="col"
                className="w-[140px] border border-border bg-muted px-2 py-2 text-center font-semibold"
              >
                성명
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, idx) => {
              const label = `${row.round}차`;
              return (
                // 각 차수는 2행으로 렌더. React key 는 차수 index 로 안정화.
                // 두 행은 같은 key prefix 를 쓰되 rowType 으로 구분.
                <RoundRows
                  key={`round-${idx}`}
                  row={row}
                  label={label}
                  idx={idx}
                  readOnly={readOnly}
                  disableRemove={rows.length <= 1}
                  onUpdate={(patch) => updateRow(idx, patch)}
                  onRemove={() => removeRound(idx)}
                />
              );
            })}
          </tbody>
        </table>
      </div>

      <div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={addRound}
          disabled={readOnly || rows.length >= MAX_ROUNDS}
          aria-label="차수 추가"
        >
          <Plus className="mr-1 size-4" />
          차수 추가
        </Button>
      </div>

      <ExampleAccordion
        guide={
          <ul className="list-disc space-y-1 pl-4">
            <li>
              컨설팅 수행 차수별(최대 3차)로 수행 일시·내용·방법과 참석자
              (컨설팅책임자 PM · 기업 내부전문가) 성명을 입력합니다.
            </li>
            <li>
              수행 방법은 대면(인터뷰·워크숍) / 비대면(화상회의) / 기타 중에서
              선택합니다.
            </li>
            <li>
              수립 필요성·주요내용 요약은 본 차수별 활동 결과를 반영하여 결과
              페이지에서 자동 요약됩니다.
            </li>
          </ul>
        }
      />
    </FormSection>
  );
}

interface RoundRowsProps {
  row: RoadmapPerformanceActivity;
  /** "1차" / "2차" 표기 */
  label: string;
  idx: number;
  readOnly: boolean;
  disableRemove: boolean;
  onUpdate: (patch: Partial<RoadmapPerformanceActivity>) => void;
  onRemove: () => void;
}

/** 한 차수 = 2 <tr> (PM 성명 행 + 내부전문가 성명 행) */
function RoundRows({
  row,
  label,
  idx,
  readOnly,
  disableRemove,
  onUpdate,
  onRemove,
}: RoundRowsProps) {
  return (
    <>
      <tr>
        <th
          scope="rowgroup"
          rowSpan={2}
          className="border border-border bg-muted/30 px-2 py-2 text-center align-middle font-medium"
        >
          {label}
        </th>
        <td rowSpan={2} className="border border-border p-1 align-top">
          <LargeTextBox
            value={[row.date, row.timeRange].filter(Boolean).join('\n')}
            onChange={(e) => {
              const raw = e.target.value;
              const lines = raw.split('\n');
              onUpdate({
                date: lines[0] ?? '',
                timeRange: lines.slice(1).join('\n'),
              });
            }}
            placeholder={'예) 26.00.00\n00:00~00:00'}
            disabled={readOnly}
            aria-label={`${label} 수행 일시`}
            minHeightClassName="min-h-[70px]"
          />
        </td>
        <td rowSpan={2} className="border border-border p-1 align-top">
          <LargeTextBox
            value={row.content}
            onChange={(e) => onUpdate({ content: e.target.value })}
            placeholder="수행 내용"
            disabled={readOnly}
            aria-label={`${label} 수행 내용`}
            minHeightClassName="min-h-[70px]"
          />
        </td>
        <td rowSpan={2} className="border border-border p-1 align-top">
          <select
            value={(row.method as InterviewMethod) ?? 'ONSITE'}
            onChange={(e) =>
              onUpdate({ method: e.target.value as InterviewMethod })
            }
            disabled={readOnly}
            aria-label={`${label} 수행 방법`}
            className="h-10 w-full rounded-md border border-input bg-background px-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
          >
            {INTERVIEW_METHOD_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </td>
        <th
          scope="row"
          className="border border-border bg-muted/30 px-2 py-2 text-left font-medium"
        >
          컨설팅책임자(PM)
        </th>
        <td className="border border-border p-1 align-top">
          <input
            type="text"
            value={row.pmName}
            onChange={(e) => onUpdate({ pmName: e.target.value })}
            placeholder="성명"
            disabled={readOnly}
            aria-label={`${label} PM 성명`}
            className="h-10 w-full rounded-md border border-input bg-background px-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
          />
        </td>
        <td
          rowSpan={2}
          className="border border-border p-1 text-center align-middle"
        >
          <button
            type="button"
            onClick={onRemove}
            disabled={readOnly || disableRemove}
            aria-label={`차수 삭제 ${idx + 1}`}
            className="inline-flex h-9 w-9 items-center justify-center rounded text-muted-foreground hover:bg-muted disabled:opacity-30"
          >
            <Trash2 className="size-4" />
          </button>
        </td>
      </tr>
      <tr>
        <th
          scope="row"
          className="border border-border bg-muted/30 px-2 py-2 text-left font-medium"
        >
          기업 내부전문가
        </th>
        <td className="border border-border p-1 align-top">
          <input
            type="text"
            value={row.expertName}
            onChange={(e) => onUpdate({ expertName: e.target.value })}
            placeholder="성명"
            disabled={readOnly}
            aria-label={`${label} 내부전문가 성명`}
            className="h-10 w-full rounded-md border border-input bg-background px-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
          />
        </td>
      </tr>
    </>
  );
}
