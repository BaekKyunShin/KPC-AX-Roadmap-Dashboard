'use client';

import { Plus, Trash2 } from 'lucide-react';

import { FormSection } from '@/components/forms/FormSection';
import { LargeTextBox } from '@/components/forms/LargeTextBox';
import { ExampleAccordion } from '@/components/forms/ExampleAccordion';
import { Button } from '@/components/ui/button';
import { OrganizationTree } from '@/components/charts/OrganizationTree';

import type { PBLStepProps } from './types';
import type {
  PBLOrganization,
  PBLMainWorkItem,
} from '@/lib/schemas/interview-pbl';

/**
 * Ⅱ-1-나 조직 및 주요 업무 — [인터뷰 입력]
 *
 * - 상단 블록: OrganizationTree (재귀 n-depth 트리)
 * - 하단 블록: 주요 업무 표 (dept / role / description) — 동적 행
 *
 * 데이터 슬라이스: `PBLOrganization { orgTree: PBLOrgTreeNode[]; mainWork: PBLMainWorkItem[]; }`
 */
function emptyMainWork(): PBLMainWorkItem {
  return { dept: '', role: '', description: '' };
}

export function StepOrganization({
  value,
  onChange,
  readOnly = false,
}: PBLStepProps<PBLOrganization>) {
  const orgTree = value.orgTree ?? [];
  const mainWork: PBLMainWorkItem[] =
    value.mainWork && value.mainWork.length > 0
      ? value.mainWork
      : [emptyMainWork()];

  function emit(patch: Partial<PBLOrganization>) {
    onChange({
      orgTree,
      mainWork,
      ...patch,
    });
  }

  function updateMainWork(idx: number, patch: Partial<PBLMainWorkItem>) {
    const next = mainWork.map((row, i) =>
      i === idx ? { ...row, ...patch } : row,
    );
    emit({ mainWork: next });
  }

  function addMainWork() {
    emit({ mainWork: [...mainWork, emptyMainWork()] });
  }

  function removeMainWork(idx: number) {
    if (mainWork.length <= 1) return;
    emit({ mainWork: mainWork.filter((_, i) => i !== idx) });
  }

  return (
    <FormSection
      number="Ⅱ-1-나"
      title="조직 및 주요 업무"
      label="[인터뷰 입력]"
      description="기업 조직도를 재귀 트리로 입력하고, 부서별 주요 업무를 표로 풀어 씁니다."
    >
      {/* 조직도 블록 ------------------------------------------------------- */}
      <div className="space-y-2">
        <h3 className="text-sm font-semibold">조직도</h3>
        <OrganizationTree
          value={orgTree}
          onChange={(next) => emit({ orgTree: next })}
          readOnly={readOnly}
        />
      </div>

      {/* 주요 업무 표 ------------------------------------------------------ */}
      <div className="space-y-2">
        <h3 className="text-sm font-semibold">부서별 주요 업무</h3>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse border border-border text-sm">
            <caption className="sr-only">부서별 주요 업무 표</caption>
            <thead>
              <tr>
                <th className="w-[120px] border border-border bg-muted px-2 py-2 text-center font-semibold">
                  부서
                </th>
                <th className="w-[140px] border border-border bg-muted px-2 py-2 text-center font-semibold">
                  역할
                </th>
                <th className="border border-border bg-muted px-2 py-2 text-center font-semibold">
                  주요 업무 설명
                </th>
                <th className="w-[56px] border border-border bg-muted px-2 py-2 text-center font-semibold">
                  <span className="sr-only">삭제</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {mainWork.map((row, idx) => (
                <tr key={idx}>
                  <td className="border border-border p-1 align-top">
                    <input
                      type="text"
                      value={row.dept}
                      onChange={(e) =>
                        updateMainWork(idx, { dept: e.target.value })
                      }
                      placeholder="부서명"
                      disabled={readOnly}
                      aria-label={`주요업무 부서 ${idx + 1}`}
                      className="w-full rounded border border-border bg-background px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                    />
                  </td>
                  <td className="border border-border p-1 align-top">
                    <input
                      type="text"
                      value={row.role}
                      onChange={(e) =>
                        updateMainWork(idx, { role: e.target.value })
                      }
                      placeholder="역할"
                      disabled={readOnly}
                      aria-label={`주요업무 역할 ${idx + 1}`}
                      className="w-full rounded border border-border bg-background px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                    />
                  </td>
                  <td className="border border-border p-1 align-top">
                    <LargeTextBox
                      value={row.description}
                      onChange={(e) =>
                        updateMainWork(idx, { description: e.target.value })
                      }
                      placeholder="주요 업무 설명"
                      disabled={readOnly}
                      aria-label={`주요업무 설명 ${idx + 1}`}
                      minHeightClassName="min-h-[60px]"
                    />
                  </td>
                  <td className="border border-border p-1 text-center align-top">
                    <button
                      type="button"
                      onClick={() => removeMainWork(idx)}
                      disabled={readOnly || mainWork.length <= 1}
                      aria-label={`주요업무 삭제 ${idx + 1}`}
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

        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={addMainWork}
          disabled={readOnly}
          aria-label="주요업무 행 추가"
        >
          <Plus className="mr-1 size-4" />
          행 추가
        </Button>
      </div>

      <ExampleAccordion
        guide={
          <ul className="list-disc space-y-1 pl-4">
            <li>조직도는 상위 부서부터 입력해 하위 자식 노드를 재귀 추가합니다.</li>
            <li>부서별 주요 업무 표는 조직도와 별개로, 어느 부서가 어떤 역할을 담당하는지 풀어 씁니다.</li>
            <li>HWPX 출력 시 조직도와 표는 각각 다른 영역에 배치됩니다.</li>
          </ul>
        }
      />
    </FormSection>
  );
}
