'use client';

import { Plus, Trash2 } from 'lucide-react';

import { FormSection } from '@/components/forms/FormSection';
import { LargeTextBox } from '@/components/forms/LargeTextBox';
import { ExampleAccordion } from '@/components/forms/ExampleAccordion';
import { Button } from '@/components/ui/button';
import { AiLevel4Check } from '@/components/charts/AiLevel4Check';

import type { PBLStepProps } from './types';
import type {
  PBLTarget,
  PBLTargetDetail,
  PBLAiLevelAssessment,
} from '@/lib/schemas/interview-pbl';

/**
 * Ⅲ-3 훈련대상 업무 + Ⅲ-4 AI수준 진단 — [인터뷰 입력]
 *
 * - 상단: Ⅲ-3 가·나·다 통합 — name/code/scope/necessity + details[] 행.
 * - 하단: Ⅲ-4 가 현재 AI역량 수준 + Ⅲ-4 나 예상 AI역량 수준 각각 AiLevel4Check 위젯.
 */

export interface StepTargetAndLevelValue {
  target: PBLTarget;
  currentAiLevel: PBLAiLevelAssessment;
  expectedAiLevel: PBLAiLevelAssessment;
}

function emptyTarget(): PBLTarget {
  return {
    name: '',
    code: '',
    scope: '',
    necessity: '',
    details: [emptyTargetDetail()],
  };
}

function emptyTargetDetail(): PBLTargetDetail {
  return { title: '', description: '' };
}

export function StepTargetAndLevel({
  value,
  onChange,
  readOnly = false,
}: PBLStepProps<StepTargetAndLevelValue>) {
  const target: PBLTarget = value.target ?? emptyTarget();
  const details: PBLTargetDetail[] =
    target.details && target.details.length > 0
      ? target.details
      : [emptyTargetDetail()];
  const currentAiLevel: PBLAiLevelAssessment = value.currentAiLevel ?? {
    level: 'BASIC',
    note: '',
  };
  const expectedAiLevel: PBLAiLevelAssessment = value.expectedAiLevel ?? {
    level: 'USER',
    note: '',
  };

  function emit(patch: Partial<StepTargetAndLevelValue>) {
    onChange({
      target,
      currentAiLevel,
      expectedAiLevel,
      ...patch,
    });
  }

  function updateTarget(patch: Partial<PBLTarget>) {
    emit({ target: { ...target, ...patch } });
  }

  function updateDetail(idx: number, patch: Partial<PBLTargetDetail>) {
    const next = details.map((r, i) => (i === idx ? { ...r, ...patch } : r));
    updateTarget({ details: next });
  }

  function addDetail() {
    updateTarget({ details: [...details, emptyTargetDetail()] });
  }

  function removeDetail(idx: number) {
    if (details.length <= 1) return;
    updateTarget({ details: details.filter((_, i) => i !== idx) });
  }

  return (
    <FormSection
      number="Ⅲ-3·4"
      title="훈련대상 업무 + AI 수준 진단"
      label="[인터뷰 입력]"
      description="Ⅲ-3 훈련대상 업무 (업무명·범위·선정 사유·세부내용) 와 Ⅲ-4 현재·예상 AI역량 수준을 함께 입력합니다."
    >
      {/* Ⅲ-3 훈련대상 업무 ---------------------------------------------- */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold">Ⅲ-3 훈련대상 업무 (가·나·다)</h3>
        <div className="grid gap-3 md:grid-cols-2">
          <div className="space-y-1">
            <label
              htmlFor="pbl-target-name"
              className="text-xs font-medium text-muted-foreground"
            >
              업무명
            </label>
            <input
              id="pbl-target-name"
              type="text"
              value={target.name}
              onChange={(e) => updateTarget({ name: e.target.value })}
              placeholder="예: 품질검사 데이터 전처리"
              disabled={readOnly}
              aria-label="훈련대상 업무명"
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
            />
          </div>
          <div className="space-y-1">
            <label
              htmlFor="pbl-target-code"
              className="text-xs font-medium text-muted-foreground"
            >
              NCS 분류 코드 (선택)
            </label>
            <input
              id="pbl-target-code"
              type="text"
              value={target.code ?? ''}
              onChange={(e) => updateTarget({ code: e.target.value })}
              placeholder="예: 200107 인공지능"
              disabled={readOnly}
              aria-label="훈련대상 업무 코드"
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
            />
          </div>
        </div>

        <div className="space-y-1">
          <label
            htmlFor="pbl-target-scope"
            className="text-xs font-medium text-muted-foreground"
          >
            업무 범위 (부서·인원 등)
          </label>
          <LargeTextBox
            id="pbl-target-scope"
            value={target.scope}
            onChange={(e) => updateTarget({ scope: e.target.value })}
            placeholder="예: 품질관리팀 · 15명 · 생산 전공정 대상"
            disabled={readOnly}
            aria-label="훈련대상 업무 범위"
            minHeightClassName="min-h-[60px]"
          />
        </div>

        <div className="space-y-1">
          <label
            htmlFor="pbl-target-necessity"
            className="text-xs font-medium text-muted-foreground"
          >
            AI 기반 문제해결 필요성 (선정 사유)
          </label>
          <LargeTextBox
            id="pbl-target-necessity"
            value={target.necessity}
            onChange={(e) => updateTarget({ necessity: e.target.value })}
            placeholder="예: 수작업 데이터 정제에 월 200시간 소요, AI 자동화로 60% 단축 기대..."
            disabled={readOnly}
            aria-label="훈련대상 업무 선정 사유"
            minHeightClassName="min-h-[80px]"
          />
        </div>

        <div className="space-y-2">
          <h4 className="text-xs font-medium text-muted-foreground">
            Ⅲ-3-다 세부내용 (AS-IS / TO-BE · 요구지식 · 요구기술 등)
          </h4>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse border border-border text-sm">
              <caption className="sr-only">훈련대상 업무 세부내용 표</caption>
              <thead>
                <tr>
                  <th className="w-[180px] border border-border bg-muted px-2 py-2 text-center font-semibold">
                    제목
                  </th>
                  <th className="border border-border bg-muted px-2 py-2 text-center font-semibold">
                    설명
                  </th>
                  <th className="w-[56px] border border-border bg-muted px-2 py-2 text-center font-semibold">
                    <span className="sr-only">삭제</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {details.map((row, idx) => (
                  <tr key={idx}>
                    <td className="border border-border p-1 align-top">
                      <input
                        type="text"
                        value={row.title}
                        onChange={(e) =>
                          updateDetail(idx, { title: e.target.value })
                        }
                        placeholder="예: AS-IS · TO-BE · 요구지식"
                        disabled={readOnly}
                        aria-label={`세부내용 ${idx + 1} 제목`}
                        className="w-full rounded border border-border bg-background px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                      />
                    </td>
                    <td className="border border-border p-1 align-top">
                      <LargeTextBox
                        value={row.description}
                        onChange={(e) =>
                          updateDetail(idx, { description: e.target.value })
                        }
                        placeholder="세부내용 서술"
                        disabled={readOnly}
                        aria-label={`세부내용 ${idx + 1} 설명`}
                        minHeightClassName="min-h-[60px]"
                      />
                    </td>
                    <td className="border border-border p-1 text-center align-top">
                      <button
                        type="button"
                        onClick={() => removeDetail(idx)}
                        disabled={readOnly || details.length <= 1}
                        aria-label={`세부내용 ${idx + 1} 삭제`}
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
            onClick={addDetail}
            disabled={readOnly}
            aria-label="세부내용 행 추가"
          >
            <Plus className="mr-1 size-4" />
            세부내용 추가
          </Button>
        </div>
      </div>

      {/* Ⅲ-4 AI 수준 진단 -------------------------------------------------- */}
      <div className="space-y-3 border-t border-border pt-4">
        <h3 className="text-sm font-semibold">Ⅲ-4-가 현재 AI역량 수준</h3>
        <AiLevel4Check
          value={currentAiLevel}
          onChange={(next) => emit({ currentAiLevel: next })}
          ariaLabel="현재 AI역량 수준"
          readOnly={readOnly}
        />
      </div>

      <div className="space-y-3">
        <h3 className="text-sm font-semibold">Ⅲ-4-나 예상 AI역량 수준</h3>
        <AiLevel4Check
          value={expectedAiLevel}
          onChange={(next) => emit({ expectedAiLevel: next })}
          ariaLabel="예상 AI역량 수준"
          readOnly={readOnly}
        />
      </div>

      <ExampleAccordion
        guide={
          <ul className="list-disc space-y-1 pl-4">
            <li>Ⅲ-3-가 업무명은 NCS 능력단위 수준으로 구체화해 입력합니다.</li>
            <li>Ⅲ-3-나 선정 사유는 문제 도출 (Ⅲ-2) 결과와 정합되도록 기술합니다.</li>
            <li>Ⅲ-3-다 세부내용은 AS-IS / TO-BE · 요구지식 · 요구기술 최소 4행 권장.</li>
            <li>Ⅲ-4 현재와 예상 간 차이 (예: AI기초형 → AI활용형) 가 훈련 목표로 이어집니다.</li>
          </ul>
        }
      />
    </FormSection>
  );
}
