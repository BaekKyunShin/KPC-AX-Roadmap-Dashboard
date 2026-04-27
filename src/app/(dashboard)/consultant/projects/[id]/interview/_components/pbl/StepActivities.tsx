'use client';

import { Plus, Trash2 } from 'lucide-react';

import { FormSection } from '@/components/forms/FormSection';
import { LargeTextBox } from '@/components/forms/LargeTextBox';
import { ExampleAccordion } from '@/components/forms/ExampleAccordion';
import { Button } from '@/components/ui/button';

import type { PBLStepProps } from './types';
import type { PBLActivityItem } from '@/lib/schemas/interview-pbl';

/**
 * Ⅲ-1 훈련과제 도출 수행활동 — [인터뷰 입력]
 *
 * 양식 기준: 차수별로 "차수/일자/수행 내용/수행 방법/참석자" 5컬럼의 행을 작성.
 * 데이터 슬라이스: `PBLTasks.activities` (PBLActivityItem[]).
 */

function emptyActivity(round: number): PBLActivityItem {
  return {
    round,
    date: '',
    content: '',
    method: '',
    participants: {
      pm: '',
      external_expert: '',
      internal_expert: '',
      jurisdiction_manager: '',
    },
  };
}

function defaultRows(): PBLActivityItem[] {
  // 양식 기본 3차수 프리필 — 사용자가 3차 이상 입력하는 경우가 다수.
  return [emptyActivity(1), emptyActivity(2), emptyActivity(3)];
}

export function StepActivities({
  value,
  onChange,
  readOnly = false,
}: PBLStepProps<PBLActivityItem[]>) {
  const rows: PBLActivityItem[] =
    value && value.length > 0 ? value : defaultRows();

  function updateRow(idx: number, patch: Partial<PBLActivityItem>) {
    onChange(rows.map((r, i) => (i === idx ? { ...r, ...patch } : r)));
  }

  function addRow() {
    const nextRound = rows.length === 0 ? 1 : rows[rows.length - 1].round + 1;
    onChange([...rows, emptyActivity(nextRound)]);
  }

  function removeRow(idx: number) {
    if (rows.length <= 1) return;
    onChange(rows.filter((_, i) => i !== idx));
  }

  return (
    <FormSection
      number="Ⅲ-1"
      title="훈련과제 도출 수행활동"
      label="[인터뷰 입력]"
      description="PM·외부전문가·기업내부전문가·능력개발전담주치의가 참여한 훈련과제 도출 과정을 차수별로 정리합니다."
    >
      <div className="overflow-x-auto">
        <table className="w-full border-collapse border border-border text-sm">
          <caption className="sr-only">훈련과제 도출 수행활동 표</caption>
          <thead>
            <tr>
              <th className="w-[70px] border border-border bg-muted px-2 py-2 text-center font-semibold">
                차수
              </th>
              <th className="w-[120px] border border-border bg-muted px-2 py-2 text-center font-semibold">
                수행 일자
              </th>
              <th className="border border-border bg-muted px-2 py-2 text-center font-semibold">
                수행 내용
              </th>
              <th className="border border-border bg-muted px-2 py-2 text-center font-semibold">
                수행 방법
              </th>
              <th className="border border-border bg-muted px-2 py-2 text-center font-semibold">
                참석자 (PM/외부/내부/주치의)
              </th>
              <th className="w-[56px] border border-border bg-muted px-2 py-2 text-center font-semibold">
                <span className="sr-only">삭제</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, idx) => (
              <tr key={idx}>
                <td className="border border-border p-1 align-top">
                  <input
                    type="number"
                    min={1}
                    value={row.round}
                    onChange={(e) => {
                      const n = Number(e.target.value);
                      updateRow(idx, {
                        round: Number.isFinite(n) && n >= 1 ? Math.trunc(n) : 1,
                      });
                    }}
                    disabled={readOnly}
                    aria-label={`${idx + 1}행 차수`}
                    className="w-full rounded border border-border bg-background px-2 py-1 text-center text-sm focus:outline-none focus:ring-2 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                  />
                </td>
                <td className="border border-border p-1 align-top">
                  <input
                    type="text"
                    value={row.date}
                    onChange={(e) => updateRow(idx, { date: e.target.value })}
                    placeholder="YYYY.MM.DD"
                    disabled={readOnly}
                    aria-label={`${idx + 1}행 수행 일자`}
                    className="w-full rounded border border-border bg-background px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                  />
                </td>
                <td className="border border-border p-1 align-top">
                  <LargeTextBox
                    value={row.content}
                    onChange={(e) =>
                      updateRow(idx, { content: e.target.value })
                    }
                    placeholder="수행 내용"
                    disabled={readOnly}
                    aria-label={`${idx + 1}행 수행 내용`}
                    minHeightClassName="min-h-[60px]"
                  />
                </td>
                <td className="border border-border p-1 align-top">
                  <LargeTextBox
                    value={row.method}
                    onChange={(e) =>
                      updateRow(idx, { method: e.target.value })
                    }
                    placeholder="수행 방법"
                    disabled={readOnly}
                    aria-label={`${idx + 1}행 수행 방법`}
                    minHeightClassName="min-h-[60px]"
                  />
                </td>
                <td className="border border-border p-1 align-top">
                  <div className="grid grid-cols-1 gap-1 sm:grid-cols-2">
                    <input
                      type="text"
                      value={row.participants.pm}
                      onChange={(e) =>
                        updateRow(idx, {
                          participants: { ...row.participants, pm: e.target.value },
                        })
                      }
                      placeholder="컨설팅책임자(PM) 성명"
                      disabled={readOnly}
                      aria-label={`${idx + 1}행 PM 성명`}
                      className="rounded border border-border bg-background px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                    />
                    <input
                      type="text"
                      value={row.participants.external_expert}
                      onChange={(e) =>
                        updateRow(idx, {
                          participants: {
                            ...row.participants,
                            external_expert: e.target.value,
                          },
                        })
                      }
                      placeholder="외부전문가(직무·HRD) 성명"
                      disabled={readOnly}
                      aria-label={`${idx + 1}행 외부전문가 성명`}
                      className="rounded border border-border bg-background px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                    />
                    <input
                      type="text"
                      value={row.participants.internal_expert}
                      onChange={(e) =>
                        updateRow(idx, {
                          participants: {
                            ...row.participants,
                            internal_expert: e.target.value,
                          },
                        })
                      }
                      placeholder="기업내부전문가 성명"
                      disabled={readOnly}
                      aria-label={`${idx + 1}행 내부전문가 성명`}
                      className="rounded border border-border bg-background px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                    />
                    <input
                      type="text"
                      value={row.participants.jurisdiction_manager}
                      onChange={(e) =>
                        updateRow(idx, {
                          participants: {
                            ...row.participants,
                            jurisdiction_manager: e.target.value,
                          },
                        })
                      }
                      placeholder="능력개발전담주치의 성명"
                      disabled={readOnly}
                      aria-label={`${idx + 1}행 주치의 성명`}
                      className="rounded border border-border bg-background px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                    />
                  </div>
                </td>
                <td className="border border-border p-1 text-center align-top">
                  <button
                    type="button"
                    onClick={() => removeRow(idx)}
                    disabled={readOnly || rows.length <= 1}
                    aria-label={`${idx + 1}행 삭제`}
                    className="inline-flex h-8 w-8 items-center justify-center rounded text-muted-foreground hover:bg-muted disabled:opacity-30"
                  >
                    <Trash2 className="size-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={addRow}
          disabled={readOnly}
          aria-label="차수 추가"
        >
          <Plus className="mr-1 size-4" />
          차수 추가
        </Button>
      </div>

      <ExampleAccordion
        guide={
          <ul className="list-disc space-y-1 pl-4">
            <li>1차 (기업 현황·문제 도출), 2차 (해결 방향 설정), 3차 (훈련과제 확정) 순으로 통상 3~4차수 진행합니다.</li>
            <li>참석자는 4역할 (PM·외부전문가·기업내부전문가·능력개발전담주치의) 의 성명을 모두 기재합니다.</li>
            <li>수행 방법은 대면/비대면/혼합 여부와 사용 도구 (예: 현장 인터뷰·Miro 워크숍) 를 함께 기재합니다.</li>
          </ul>
        }
      />
    </FormSection>
  );
}
