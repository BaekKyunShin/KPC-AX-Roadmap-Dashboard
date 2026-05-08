'use client';

import { Plus } from 'lucide-react';
import { ConfirmRemoveRowButton } from '../ConfirmRemoveRowButton';

import { FormSection } from '@/components/forms/FormSection';
import { LargeTextBox } from '@/components/forms/LargeTextBox';
import { FormCheckbox } from '@/components/forms/FormCheckbox';
import { ExampleAccordion } from '@/components/forms/ExampleAccordion';
import { Button } from '@/components/ui/button';

import type { RoadmapStepProps } from './types';
import type {
  RoadmapCompetency,
  RoadmapInterviewStrict,
} from '@/lib/schemas/interview-roadmap';

/**
 * Ⅲ-1 역량 모델링 — [인터뷰 입력 → 결과 페이지]
 *
 * 양식 기준 블록:
 *  1) 역량 모델링 표: 역량명 · 역량 정의(수행준거) · 지식 · 기술 · 태도 (동적 행)
 *  2) NCS XOR 박스:
 *     - ncsUsed=true  → NCS 활용 방법 (자유 서술)
 *     - ncsUsed=false → 역량별 도출 방법 (자유 서술)
 *
 * LLM 은 이 요약 텍스트를 받아 학습 설계용 배열 (knowledge[]·skills[]·attitudes[])
 * 로 결과 페이지에서 확장한다.
 */

export interface StepCompetencyModelingValue {
  competencies: RoadmapInterviewStrict['competencies'];
  ncsUsed: RoadmapInterviewStrict['ncsUsed'];
  ncsMethodology?: RoadmapInterviewStrict['ncsMethodology'];
  ncsDerivationMethod?: RoadmapInterviewStrict['ncsDerivationMethod'];
}

/** 빈 역량 행 */
function emptyCompetency(): RoadmapCompetency {
  return {
    name: '',
    definition: '',
    knowledge: '',
    skill: '',
    attitude: '',
  };
}

/** 양식 기본 4행 (L362~L366) */
function defaultRows(): RoadmapCompetency[] {
  return Array.from({ length: 4 }, () => emptyCompetency());
}

type NcsToggle = 'YES' | 'NO';
const NCS_OPTIONS: ReadonlyArray<{ value: NcsToggle; label: string }> = [
  { value: 'YES', label: 'NCS 활용' },
  { value: 'NO', label: 'NCS 미활용' },
];

export function StepCompetencyModeling({
  value,
  onChange,
  readOnly = false,
}: RoadmapStepProps<StepCompetencyModelingValue>) {
  const rows: RoadmapCompetency[] =
    value.competencies && value.competencies.length > 0
      ? value.competencies
      : defaultRows();

  function emit(patch: Partial<StepCompetencyModelingValue>) {
    onChange({
      competencies: rows,
      ncsUsed: value.ncsUsed,
      ncsMethodology: value.ncsMethodology,
      ncsDerivationMethod: value.ncsDerivationMethod,
      ...patch,
    });
  }

  function updateRow(idx: number, patch: Partial<RoadmapCompetency>) {
    const next = rows.map((r, i) => (i === idx ? { ...r, ...patch } : r));
    emit({ competencies: next });
  }

  function addRow() {
    emit({ competencies: [...rows, emptyCompetency()] });
  }

  function removeRow(idx: number) {
    if (rows.length <= 1) return;
    emit({ competencies: rows.filter((_, i) => i !== idx) });
  }

  function toggleNcs(next: NcsToggle) {
    if (next === 'YES') {
      // NCS 활용으로 전환 — 미활용 측 값은 초기화 (XOR 보존)
      emit({
        ncsUsed: true,
        ncsDerivationMethod: undefined,
      });
    } else {
      emit({
        ncsUsed: false,
        ncsMethodology: undefined,
      });
    }
  }

  const ncsToggleValue: NcsToggle = value.ncsUsed ? 'YES' : 'NO';

  return (
    <FormSection
      number="Ⅲ-1"
      title="역량 모델링"
      label="[인터뷰 입력 → 결과 페이지]"
      description="선정된 과업에 AI 도입·활용을 위해 요구되는 역량을 정의하고, 지식·기술·태도를 작성합니다."
    >
      {/* 역량 모델링 표 --------------------------------------------------- */}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse border border-border text-sm">
          <caption className="sr-only">역량 모델링 표</caption>
          <thead>
            <tr>
              <th
                scope="col"
                rowSpan={2}
                className="w-[140px] border border-border bg-muted px-2 py-2 text-center font-semibold"
              >
                역량명
              </th>
              <th
                scope="col"
                rowSpan={2}
                className="border border-border bg-muted px-2 py-2 text-center font-semibold"
              >
                역량 정의 (수행준거)
              </th>
              <th
                scope="col"
                colSpan={3}
                className="border border-border bg-muted px-2 py-2 text-center font-semibold"
              >
                필요 지식·기술·태도
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
                className="border border-border bg-muted px-2 py-2 text-center font-semibold"
              >
                지식
                <span className="block text-xs font-normal text-muted-foreground">
                  (학술·업무지식)
                </span>
              </th>
              <th
                scope="col"
                className="border border-border bg-muted px-2 py-2 text-center font-semibold"
              >
                기술
                <span className="block text-xs font-normal text-muted-foreground">
                  (기능)
                </span>
              </th>
              <th
                scope="col"
                className="border border-border bg-muted px-2 py-2 text-center font-semibold"
              >
                태도
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, idx) => (
              <tr key={idx}>
                <td className="border border-border p-1 align-top">
                  <LargeTextBox
                    value={row.name}
                    onChange={(e) => updateRow(idx, { name: e.target.value })}
                    placeholder="역량명"
                    disabled={readOnly}
                    aria-label={`역량명 ${idx + 1}`}
                    minHeightClassName="min-h-[60px]"
                  />
                </td>
                <td className="border border-border p-1 align-top">
                  <LargeTextBox
                    value={row.definition}
                    onChange={(e) =>
                      updateRow(idx, { definition: e.target.value })
                    }
                    placeholder="역량 정의 (수행준거)"
                    disabled={readOnly}
                    aria-label={`역량 정의 ${idx + 1}`}
                    minHeightClassName="min-h-[60px]"
                  />
                </td>
                <td className="border border-border p-1 align-top">
                  <LargeTextBox
                    value={row.knowledge}
                    onChange={(e) =>
                      updateRow(idx, { knowledge: e.target.value })
                    }
                    placeholder="필요 지식"
                    disabled={readOnly}
                    aria-label={`지식 ${idx + 1}`}
                    minHeightClassName="min-h-[60px]"
                  />
                </td>
                <td className="border border-border p-1 align-top">
                  <LargeTextBox
                    value={row.skill}
                    onChange={(e) => updateRow(idx, { skill: e.target.value })}
                    placeholder="필요 기술"
                    disabled={readOnly}
                    aria-label={`기술 ${idx + 1}`}
                    minHeightClassName="min-h-[60px]"
                  />
                </td>
                <td className="border border-border p-1 align-top">
                  <LargeTextBox
                    value={row.attitude}
                    onChange={(e) =>
                      updateRow(idx, { attitude: e.target.value })
                    }
                    placeholder="필요 태도"
                    disabled={readOnly}
                    aria-label={`태도 ${idx + 1}`}
                    minHeightClassName="min-h-[60px]"
                  />
                </td>
                <td className="border border-border p-1 text-center align-top">
                  <ConfirmRemoveRowButton
                    title={`역량 행을 삭제하시겠습니까?`}
                    ariaLabel={`역량 삭제 ${idx + 1}`}
                    disabled={readOnly || rows.length <= 1}
                    onConfirm={() => removeRow(idx)}
                  />
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
          aria-label="역량 추가"
        >
          <Plus className="mr-1 size-4" />
          역량 추가
        </Button>
      </div>

      {/* NCS XOR 박스 ----------------------------------------------------- */}
      <div className="space-y-2">
        <h3 className="text-sm font-semibold">NCS 활용 여부 (택1)</h3>
        <FormCheckbox<NcsToggle>
          mode="single"
          options={[...NCS_OPTIONS]}
          value={ncsToggleValue}
          onChange={(next) => toggleNcs(next as NcsToggle)}
          readOnly={readOnly}
        />
      </div>

      {value.ncsUsed ? (
        <div className="space-y-2">
          <h3 className="text-sm font-semibold">NCS 활용 방법</h3>
          <LargeTextBox
            value={value.ncsMethodology ?? ''}
            onChange={(e) => emit({ ncsMethodology: e.target.value })}
            placeholder="NCS 능력단위를 어떻게 참고·수정했는지 서술하세요..."
            disabled={readOnly}
            aria-label="NCS 활용 방법"
          />
        </div>
      ) : (
        <div className="space-y-2">
          <h3 className="text-sm font-semibold">역량별 도출 방법</h3>
          <LargeTextBox
            value={value.ncsDerivationMethod ?? ''}
            onChange={(e) => emit({ ncsDerivationMethod: e.target.value })}
            placeholder="NCS 없이 역량을 어떻게 도출했는지 서술하세요..."
            disabled={readOnly}
            aria-label="역량별 도출 방법"
          />
        </div>
      )}

      <ExampleAccordion
        guide={
          <ul className="list-disc space-y-1 pl-4">
            <li>
              선정된 과업에 AI 도입·활용을 위해 요구되는 역량을 구분하여 정의하고,
              해당 역량을 위해 필요한 지식·기술·태도를 파악합니다.
            </li>
            <li>
              국가직무능력표준(NCS) 에 해당 자료가 있는 경우 참고하여 활용하되,
              대상 과업의 특성에 부합하는지 검토한 방법과 기업 특성에 맞게 수정한
              내용을 기술합니다.
            </li>
            <li>
              NCS 가 없는 경우 역량 분류·지식·기술·태도 도출에 검토한 내용을
              기술합니다.
            </li>
          </ul>
        }
      />
    </FormSection>
  );
}
