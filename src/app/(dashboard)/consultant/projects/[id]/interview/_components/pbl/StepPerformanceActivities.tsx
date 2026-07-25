'use client';

import { Plus } from 'lucide-react';

import { FormSection } from '@/components/forms/FormSection';
import { LargeTextBox } from '@/components/forms/LargeTextBox';
import { ExampleAccordion } from '@/components/forms/ExampleAccordion';
import { Button } from '@/components/ui/button';
import { INTERVIEW_METHOD_OPTIONS, type InterviewMethod } from '@/lib/schemas/interview-roadmap';
import type { PBLPerformanceActivity } from '@/lib/schemas/interview-pbl';

import { ConfirmRemoveRowButton } from '../ConfirmRemoveRowButton';
import type { PBLStepProps } from './types';

/**
 * Ⅲ-1 훈련과제 도출 수행활동 — [인터뷰 입력]
 *
 * 양식(정본 T19) 기준 rowspan 표 구조:
 *  - 각 차수 1개 = 4 <tr> 행 (참석자 4역할 성명 각 1행)
 *  - 차수·일자·내용·방법 4개 셀은 rowSpan=4 로 병합
 *  - 기본 3차수 프리필. 스키마 max(15) 로 상한 제한.
 *
 * ⚠️ 로드맵 Ⅰ-2 "주요 활동"(`shared/StepPerformanceActivities`)과 **다른 표**다.
 *  - 참석자: 로드맵 2역할 / 본 표 4역할(외부전문가·능력개발전담주치의 추가)
 *  - 일시  : 로드맵 날짜+시간대 2줄 / 본 표 **날짜만** (정본에 시간 칸 없음)
 * PBL 인터뷰는 로드맵 인터뷰와 별도 일정이므로 로드맵 활동을 재사용하지 않는다.
 *
 * 데이터 슬라이스: `PBLTasks.performanceActivities[]`.
 */

// 차수 상한. 로드맵 Ⅰ-2·PBL Ⅱ-1-나 와 동일 (Zod `.max(15)` 및 HWPX 동적 행 확장 상한).
const MAX_ROUNDS = 15;

// 양식 prefill 차수. MAX_ROUNDS 와 분리해야 '차수 추가' 가 즉시 disabled 되지 않는다.
const DEFAULT_ROUNDS = 3;

/** 정본 T19 참석자 4역할 — 라벨(양식 그대로) · 데이터 키 · aria-label 접미사 */
const PARTICIPANT_ROLES = [
  { key: 'pm', label: '컨설팅책임자(PM)', aria: 'PM' },
  { key: 'external_expert', label: '외부전문가(직무,HRD)', aria: '외부전문가' },
  { key: 'internal_expert', label: '기업내부전문가', aria: '기업내부전문가' },
  { key: 'jurisdiction_manager', label: '능력개발전담주치의', aria: '능력개발전담주치의' },
] as const satisfies ReadonlyArray<{
  key: keyof PBLPerformanceActivity['participants'];
  label: string;
  aria: string;
}>;

/** 빈 차수 객체 */
function emptyActivity(round: number): PBLPerformanceActivity {
  return {
    round,
    date: '',
    content: '',
    method: 'ONSITE',
    participants: {
      pm: '',
      external_expert: '',
      internal_expert: '',
      jurisdiction_manager: '',
    },
  };
}

/** 양식 기본 프리필 = 3차수 (1·2·3차) */
function defaultRows(): PBLPerformanceActivity[] {
  return Array.from({ length: DEFAULT_ROUNDS }, (_, i) => emptyActivity(i + 1));
}

export function StepPerformanceActivities({
  value,
  onChange,
  readOnly = false,
}: PBLStepProps<PBLPerformanceActivity[]>) {
  const rows: PBLPerformanceActivity[] = value && value.length > 0 ? value : defaultRows();

  function updateRow(idx: number, patch: Partial<PBLPerformanceActivity>) {
    onChange(rows.map((r, i) => (i === idx ? { ...r, ...patch } : r)));
  }

  function addRound() {
    if (rows.length >= MAX_ROUNDS) return;
    onChange([...rows, emptyActivity(rows.length + 1)]);
  }

  function removeRound(idx: number) {
    if (rows.length <= 1) return;
    onChange(rows.filter((_, i) => i !== idx));
  }

  return (
    <FormSection
      number="Ⅲ-1"
      title="훈련과제 도출 수행활동"
      label="[인터뷰 입력]"
      description="PBL 과정 개발을 위한 수행 차수별 일자·내용·방법과 참석자 4역할 성명을 입력합니다."
    >
      <div className="overflow-x-auto">
        <table className="w-full border-collapse border border-border text-sm">
          <caption className="sr-only">훈련과제 도출 수행활동 표</caption>
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
                수행 일자
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
                className="w-[170px] border border-border bg-muted px-2 py-2 text-center font-semibold"
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
            {rows.map((row, idx) => (
              <RoundRows
                key={`round-${idx}`}
                row={row}
                label={`${row.round}차`}
                idx={idx}
                readOnly={readOnly}
                disableRemove={rows.length <= 1}
                onUpdate={(patch) => updateRow(idx, patch)}
                onRemove={() => removeRound(idx)}
              />
            ))}
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
        guideLabel="작성 가이드"
        example={
          <div className="space-y-1 text-xs text-muted-foreground">
            <p className="font-medium text-foreground">(양식 예시) 차수별 prefill</p>
            <p>1차 — 수행 일자 25/00/00, 참석자 4역할</p>
            <p>2차 — 수행 일자 25/00/00, 참석자 4역할</p>
            <p>3차 — 수행 일자 25/00/00, 참석자 4역할</p>
          </div>
        }
        guide={
          <ul className="list-none space-y-1">
            <li>
              1. 문제도출 및 훈련대상 업무 선정 등을 위한 중요한 활동으로, 기업이 지닌 본질적인
              핵심문제 파악 및 문제정의에 경영진과 기업 핵심인력이 다수 참여하여 토론, 워크숍, 회의
              등 다양한 방법으로 논의(경영진을 포함한 실무자 등 3명 이상 참여 권장)
            </li>
            <li>2. 기 작성한 &lsquo;컨설팅 수행일지&rsquo;의 주요 내용을 기준으로 작성</li>
            <li className="pl-4">
              ☞ 본 과정이 어떠한 활동을 통해 개발되었는지 한눈에 볼 수 있도록 도식화 하여 기업의
              이해를 도움
            </li>
            <li>
              수행 차수별(최대 15차)로 수행 일자·내용·방법과 참석자 (컨설팅책임자 PM · 외부전문가 ·
              기업내부전문가 · 능력개발전담주치의) 성명을 입력합니다.
            </li>
            <li>
              Ⅱ-1-나 &lsquo;주요 활동&rsquo;은 선행 로드맵 컨설팅 활동이므로 본 표와 별개입니다.
            </li>
          </ul>
        }
      />
    </FormSection>
  );
}

interface RoundRowsProps {
  row: PBLPerformanceActivity;
  /** "1차" / "2차" 표기 */
  label: string;
  idx: number;
  readOnly: boolean;
  disableRemove: boolean;
  onUpdate: (patch: Partial<PBLPerformanceActivity>) => void;
  onRemove: () => void;
}

/** 한 차수 = 4 <tr> (참석자 4역할 성명 행) */
function RoundRows({
  row,
  label,
  idx,
  readOnly,
  disableRemove,
  onUpdate,
  onRemove,
}: RoundRowsProps) {
  const [firstRole, ...restRoles] = PARTICIPANT_ROLES;

  function updateParticipant(
    key: keyof PBLPerformanceActivity['participants'],
    next: string
  ): void {
    onUpdate({ participants: { ...row.participants, [key]: next } });
  }

  return (
    <>
      <tr>
        <th
          scope="rowgroup"
          rowSpan={4}
          className="border border-border bg-muted/30 px-2 py-2 text-center align-middle font-medium"
        >
          {label}
        </th>
        <td rowSpan={4} className="border border-border p-1 align-top">
          <input
            type="text"
            value={row.date}
            onChange={(e) => onUpdate({ date: e.target.value })}
            placeholder="예) 25/00/00"
            disabled={readOnly}
            aria-label={`${label} 수행 일자`}
            className="h-10 w-full rounded-md border border-input bg-background px-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
          />
        </td>
        <td rowSpan={4} className="border border-border p-1 align-top">
          <LargeTextBox
            value={row.content}
            onChange={(e) => onUpdate({ content: e.target.value })}
            placeholder="수행 내용"
            disabled={readOnly}
            aria-label={`${label} 수행 내용`}
            minHeightClassName="min-h-[180px]"
          />
        </td>
        <td rowSpan={4} className="border border-border p-1 align-top">
          <select
            value={(row.method as InterviewMethod) ?? 'ONSITE'}
            onChange={(e) => onUpdate({ method: e.target.value as InterviewMethod })}
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
          {firstRole.label}
        </th>
        <td className="border border-border p-1 align-top">
          <ParticipantInput
            value={row.participants[firstRole.key]}
            onChange={(next) => updateParticipant(firstRole.key, next)}
            ariaLabel={`${label} ${firstRole.aria} 성명`}
            disabled={readOnly}
          />
        </td>
        <td rowSpan={4} className="border border-border p-1 text-center align-middle">
          <ConfirmRemoveRowButton
            title={`${label} 행을 삭제하시겠습니까?`}
            ariaLabel={`차수 삭제 ${idx + 1}`}
            disabled={readOnly || disableRemove}
            onConfirm={onRemove}
          />
        </td>
      </tr>
      {restRoles.map((role) => (
        <tr key={role.key}>
          <th
            scope="row"
            className="border border-border bg-muted/30 px-2 py-2 text-left font-medium"
          >
            {role.label}
          </th>
          <td className="border border-border p-1 align-top">
            <ParticipantInput
              value={row.participants[role.key]}
              onChange={(next) => updateParticipant(role.key, next)}
              ariaLabel={`${label} ${role.aria} 성명`}
              disabled={readOnly}
            />
          </td>
        </tr>
      ))}
    </>
  );
}

interface ParticipantInputProps {
  value: string;
  onChange: (next: string) => void;
  ariaLabel: string;
  disabled: boolean;
}

function ParticipantInput({ value, onChange, ariaLabel, disabled }: ParticipantInputProps) {
  return (
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder="성명"
      disabled={disabled}
      aria-label={ariaLabel}
      className="h-10 w-full rounded-md border border-input bg-background px-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
    />
  );
}
