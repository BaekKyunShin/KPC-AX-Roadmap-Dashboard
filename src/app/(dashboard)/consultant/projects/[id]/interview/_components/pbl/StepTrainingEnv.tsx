'use client';

import { Plus, Trash2 } from 'lucide-react';

import { FormSection } from '@/components/forms/FormSection';
import { LargeTextBox } from '@/components/forms/LargeTextBox';
import { ExampleAccordion } from '@/components/forms/ExampleAccordion';
import { Button } from '@/components/ui/button';

import type { PBLStepProps } from './types';
import type { PBLTrainingEnv, PBLInstructorRow } from '@/lib/schemas/interview-pbl';

/**
 * Ⅱ-2 기업 훈련환경 분석 — [인터뷰 입력] (R8 PBL-자체-02)
 *
 * 양식 12×7 표를 6 영역으로 그룹핑한 정형 입력:
 *  1. 적정 훈련시간 (텍스트)
 *  2. 훈련장소 — 사내 (텍스트)
 *  3. 훈련장소 — 사외 (텍스트)
 *  4. 사내강사 표 (직위/이름/경력/인적특성 행 — 추가/삭제 가능, max 5)
 *  5. 외부강사 표 (동일 구조)
 *  6. AI 인프라 (텍스트)
 *
 * HWPX P-05 6 셀 매핑은 hwpx-payload-pbl 에서 처리.
 */

const MAX_INSTRUCTOR_ROWS = 5;

function emptyInstructor(): PBLInstructorRow {
  return { position: '', name: '', career: '', personalTraits: '' };
}

function ensureValue(value: PBLTrainingEnv | undefined): PBLTrainingEnv {
  return {
    properTrainingHours: value?.properTrainingHours ?? '',
    internalPlace: value?.internalPlace ?? '',
    externalPlace: value?.externalPlace ?? '',
    internalInstructors: value?.internalInstructors ?? [],
    externalInstructors: value?.externalInstructors ?? [],
    aiInfrastructure: value?.aiInfrastructure ?? '',
    // Phase E (Step 4b) — 5 신규 필드 default fallback
    targetCharacteristics: value?.targetCharacteristics ?? { career: '', level: '' },
    aiInfraDetail: value?.aiInfraDetail ?? {
      toolCapacity: 'AVAILABLE' as const,
      networkStatus: 'GOOD' as const,
      pcCount: 0,
    },
    trainingNeedsAnalysis: value?.trainingNeedsAnalysis ?? '',
    expectationAsIs: value?.expectationAsIs ?? '',
    expectationToBe: value?.expectationToBe ?? '',
    // 양식 P-05 누락 3행 보강 — 사용자 보고 (대상 인원·사내강사 활용·기타 장비)
    targetTraineeCount: value?.targetTraineeCount ?? 0,
    internalInstructorUsage: value?.internalInstructorUsage ?? 'NO',
    internalInstructorPrimary: value?.internalInstructorPrimary ?? { name: '', position: '' },
    otherEquipment: value?.otherEquipment ?? '',
  };
}

export function StepTrainingEnv({
  value,
  onChange,
  readOnly = false,
}: PBLStepProps<PBLTrainingEnv>) {
  const v = ensureValue(value);

  function emit(patch: Partial<PBLTrainingEnv>) {
    onChange({ ...v, ...patch });
  }

  function updateInstructor(
    side: 'internal' | 'external',
    idx: number,
    patch: Partial<PBLInstructorRow>
  ) {
    const list = side === 'internal' ? v.internalInstructors : v.externalInstructors;
    const next = list.map((r, i) => (i === idx ? { ...r, ...patch } : r));
    if (side === 'internal') emit({ internalInstructors: next });
    else emit({ externalInstructors: next });
  }

  function addInstructor(side: 'internal' | 'external') {
    const list = side === 'internal' ? v.internalInstructors : v.externalInstructors;
    if (list.length >= MAX_INSTRUCTOR_ROWS) return;
    if (side === 'internal') emit({ internalInstructors: [...list, emptyInstructor()] });
    else emit({ externalInstructors: [...list, emptyInstructor()] });
  }

  function removeInstructor(side: 'internal' | 'external', idx: number) {
    const list = side === 'internal' ? v.internalInstructors : v.externalInstructors;
    const next = list.filter((_, i) => i !== idx);
    if (side === 'internal') emit({ internalInstructors: next });
    else emit({ externalInstructors: next });
  }

  function renderInstructorTable(side: 'internal' | 'external') {
    const list = side === 'internal' ? v.internalInstructors : v.externalInstructors;
    const heading = side === 'internal' ? '사내강사' : '외부강사';
    return (
      <div className="space-y-2">
        <h3 className="text-sm font-semibold">{heading}</h3>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse border border-border text-sm">
            <caption className="sr-only">{heading} 표</caption>
            <thead>
              <tr>
                <th className="w-[120px] border border-border bg-muted px-2 py-2 text-center font-semibold">
                  직위
                </th>
                <th className="w-[120px] border border-border bg-muted px-2 py-2 text-center font-semibold">
                  이름
                </th>
                <th className="border border-border bg-muted px-2 py-2 text-center font-semibold">
                  직무경력
                </th>
                <th className="border border-border bg-muted px-2 py-2 text-center font-semibold">
                  인적특성
                </th>
                <th className="w-[56px] border border-border bg-muted px-2 py-2 text-center font-semibold">
                  <span className="sr-only">삭제</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {list.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="border border-border px-3 py-3 text-center text-xs text-muted-foreground"
                  >
                    {heading} 행이 없습니다. 아래 &quot;+ {heading} 추가&quot; 버튼으로 행을
                    추가하세요.
                  </td>
                </tr>
              ) : (
                list.map((row, idx) => (
                  <tr key={idx}>
                    <td className="border border-border p-1 align-top">
                      <input
                        type="text"
                        value={row.position}
                        onChange={(e) => updateInstructor(side, idx, { position: e.target.value })}
                        placeholder="예: 팀장"
                        disabled={readOnly}
                        aria-label={`${heading} ${idx + 1} 직위`}
                        className="w-full rounded border border-border bg-background px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                      />
                    </td>
                    <td className="border border-border p-1 align-top">
                      <input
                        type="text"
                        value={row.name}
                        onChange={(e) => updateInstructor(side, idx, { name: e.target.value })}
                        placeholder="예: 홍길동"
                        disabled={readOnly}
                        aria-label={`${heading} ${idx + 1} 이름`}
                        className="w-full rounded border border-border bg-background px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                      />
                    </td>
                    <td className="border border-border p-1 align-top">
                      <LargeTextBox
                        value={row.career}
                        onChange={(e) => updateInstructor(side, idx, { career: e.target.value })}
                        placeholder="예: 제조 공정 15년 경력 / AI 도입 PoC 3건"
                        disabled={readOnly}
                        aria-label={`${heading} ${idx + 1} 직무경력`}
                        minHeightClassName="min-h-[60px]"
                      />
                    </td>
                    <td className="border border-border p-1 align-top">
                      <LargeTextBox
                        value={row.personalTraits}
                        onChange={(e) =>
                          updateInstructor(side, idx, {
                            personalTraits: e.target.value,
                          })
                        }
                        placeholder="예: 데이터 분석 친화 / 문서화 우수"
                        disabled={readOnly}
                        aria-label={`${heading} ${idx + 1} 인적특성`}
                        minHeightClassName="min-h-[60px]"
                      />
                    </td>
                    <td className="border border-border p-1 text-center align-top">
                      <button
                        type="button"
                        onClick={() => removeInstructor(side, idx)}
                        disabled={readOnly}
                        aria-label={`${heading} ${idx + 1} 삭제`}
                        className="inline-flex h-8 w-8 items-center justify-center rounded text-muted-foreground hover:bg-muted disabled:opacity-30"
                      >
                        <Trash2 className="size-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => addInstructor(side)}
          disabled={readOnly || list.length >= MAX_INSTRUCTOR_ROWS}
          aria-label={`${heading} 행 추가`}
        >
          <Plus className="mr-1 size-4" />
          {heading} 추가 ({list.length}/{MAX_INSTRUCTOR_ROWS})
        </Button>
      </div>
    );
  }

  return (
    <FormSection
      number="Ⅱ-3-a"
      title="기업 훈련환경 분석"
      label="[인터뷰 입력]"
      description="양식 12×7 정형 표 — 적정 훈련시간 · 훈련장소(사내/사외) · 사내·외부 강사 · AI 인프라."
    >
      {/* 1. 적정 훈련시간 */}
      <div className="space-y-1">
        <label htmlFor="pbl-training-env-hours" className="text-sm font-medium">
          적정 훈련시간
        </label>
        <LargeTextBox
          id="pbl-training-env-hours"
          value={v.properTrainingHours}
          onChange={(e) => emit({ properTrainingHours: e.target.value })}
          placeholder="예: 회차당 4시간 × 10주 (총 40시간) / 평일 야간 집중 가능"
          disabled={readOnly}
          aria-label="적정 훈련시간"
          minHeightClassName="min-h-[70px]"
        />
      </div>

      {/* 1-b. 대상 인원 (양식 P-05 누락 보강) */}
      <div className="space-y-1">
        <label htmlFor="pbl-training-env-trainee-count" className="text-sm font-medium">
          대상 인원
        </label>
        <div className="flex items-center gap-2">
          <input
            id="pbl-training-env-trainee-count"
            type="number"
            min={0}
            step={1}
            value={v.targetTraineeCount}
            onChange={(e) => {
              const parsed = Number.parseInt(e.target.value, 10);
              emit({ targetTraineeCount: Number.isFinite(parsed) ? Math.max(0, parsed) : 0 });
            }}
            disabled={readOnly}
            aria-label="대상 인원"
            className="w-32 rounded border border-border bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
          />
          <span className="text-sm text-muted-foreground">명</span>
        </div>
      </div>

      {/* 2·3. 훈련장소 사내·사외 (2 컬럼) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="space-y-1">
          <label htmlFor="pbl-training-env-internal-place" className="text-sm font-medium">
            훈련장소 — 사내
          </label>
          <LargeTextBox
            id="pbl-training-env-internal-place"
            value={v.internalPlace}
            onChange={(e) => emit({ internalPlace: e.target.value })}
            placeholder="예: 본사 3층 교육장 (30석) / 회의실 B"
            disabled={readOnly}
            aria-label="훈련장소 사내"
            minHeightClassName="min-h-[70px]"
          />
        </div>
        <div className="space-y-1">
          <label htmlFor="pbl-training-env-external-place" className="text-sm font-medium">
            훈련장소 — 사외
          </label>
          <LargeTextBox
            id="pbl-training-env-external-place"
            value={v.externalPlace}
            onChange={(e) => emit({ externalPlace: e.target.value })}
            placeholder="예: 산학협력관 / 외부 AI 교육센터"
            disabled={readOnly}
            aria-label="훈련장소 사외"
            minHeightClassName="min-h-[70px]"
          />
        </div>
      </div>

      {/* 3-b. 사내강사 활용 여부 (양식 P-05 누락 보강) */}
      <fieldset className="space-y-2" disabled={readOnly}>
        <legend className="text-sm font-medium">사내강사 활용 여부</legend>
        <div className="flex items-center gap-4">
          <label
            htmlFor="pbl-training-env-internal-usage-yes"
            className="flex items-center gap-1.5 text-sm"
          >
            <input
              id="pbl-training-env-internal-usage-yes"
              type="radio"
              name="pbl-training-env-internal-usage"
              value="YES"
              checked={v.internalInstructorUsage === 'YES'}
              onChange={() => emit({ internalInstructorUsage: 'YES' })}
              disabled={readOnly}
              aria-label="사내강사 활용 여부 있음"
              className="size-4 accent-blue-600 disabled:cursor-not-allowed disabled:opacity-50"
            />
            있음
          </label>
          <label
            htmlFor="pbl-training-env-internal-usage-no"
            className="flex items-center gap-1.5 text-sm"
          >
            <input
              id="pbl-training-env-internal-usage-no"
              type="radio"
              name="pbl-training-env-internal-usage"
              value="NO"
              checked={v.internalInstructorUsage === 'NO'}
              onChange={() =>
                emit({
                  internalInstructorUsage: 'NO',
                  internalInstructorPrimary: { name: '', position: '' },
                })
              }
              disabled={readOnly}
              aria-label="사내강사 활용 여부 없음"
              className="size-4 accent-blue-600 disabled:cursor-not-allowed disabled:opacity-50"
            />
            없음
          </label>
        </div>
        {v.internalInstructorUsage === 'YES' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pl-1">
            <div className="space-y-1">
              <label
                htmlFor="pbl-training-env-internal-primary-name"
                className="text-xs font-medium text-muted-foreground"
              >
                대표 강사 이름
              </label>
              <input
                id="pbl-training-env-internal-primary-name"
                type="text"
                value={v.internalInstructorPrimary.name}
                onChange={(e) =>
                  emit({
                    internalInstructorPrimary: {
                      ...v.internalInstructorPrimary,
                      name: e.target.value,
                    },
                  })
                }
                disabled={readOnly}
                aria-label="사내강사 대표 이름"
                placeholder="예: 홍길동"
                className="w-full rounded border border-border bg-background px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
              />
            </div>
            <div className="space-y-1">
              <label
                htmlFor="pbl-training-env-internal-primary-position"
                className="text-xs font-medium text-muted-foreground"
              >
                대표 강사 직책
              </label>
              <input
                id="pbl-training-env-internal-primary-position"
                type="text"
                value={v.internalInstructorPrimary.position}
                onChange={(e) =>
                  emit({
                    internalInstructorPrimary: {
                      ...v.internalInstructorPrimary,
                      position: e.target.value,
                    },
                  })
                }
                disabled={readOnly}
                aria-label="사내강사 대표 직책"
                placeholder="예: 생산팀장"
                className="w-full rounded border border-border bg-background px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
              />
            </div>
          </div>
        ) : null}
      </fieldset>

      {/* 4. 사내강사 표 */}
      {renderInstructorTable('internal')}

      {/* 5. 외부강사 표 */}
      {renderInstructorTable('external')}

      {/* 6. AI 인프라 */}
      <div className="space-y-1">
        <label htmlFor="pbl-training-env-ai-infra" className="text-sm font-medium">
          AI 인프라 (사내)
        </label>
        <LargeTextBox
          id="pbl-training-env-ai-infra"
          value={v.aiInfrastructure}
          onChange={(e) => emit({ aiInfrastructure: e.target.value })}
          placeholder="예: 사내 PC 30대 (i7/16GB) · 네트워크 양호 · ChatGPT/노트북 활용 가능 · 프린터·프로젝터 구비"
          disabled={readOnly}
          aria-label="AI 인프라"
          minHeightClassName="min-h-[80px]"
        />
      </div>

      {/* 6-b. AI인프라 기타 장비 보유 (양식 P-05 누락 보강) */}
      <div className="space-y-1">
        <label htmlFor="pbl-training-env-other-equipment" className="text-sm font-medium">
          AI인프라 기타 장비 보유
        </label>
        <LargeTextBox
          id="pbl-training-env-other-equipment"
          value={v.otherEquipment}
          onChange={(e) => emit({ otherEquipment: e.target.value })}
          placeholder="예: 프로젝터 2대, 디지털 화이트보드 1대, 스마트 TV 1대"
          disabled={readOnly}
          aria-label="AI인프라 기타 장비 보유"
          minHeightClassName="min-h-[60px]"
        />
      </div>

      <ExampleAccordion
        guideLabel="작성 가이드"
        guide={
          <ul className="list-none space-y-1">
            <li>1. ‘훈련 대상자 특성’은 훈련업무를 수행하는 직원들의 특징 기술</li>
            <li>2. ‘훈련 여건’은 훈련과정 개발·운영을 위해 활용 가능한 기업 자원을 파악</li>
            <li>☞ 과정개발 시 기업의 훈련에 대한 요구사항을 반영하기 위함.</li>
            <li>적정 훈련시간: 회차당 시간·총 시간·집중 가능 시간대.</li>
            <li>훈련장소: 사내(본사/공장)·사외(외부 시설)·특이사항.</li>
            <li>사내·외부강사: 직위·이름·직무경력·인적특성. 강사가 없는 경우 비워두세요.</li>
            <li>AI 인프라: 가용 PC 수·네트워크 품질·AI 도구 접근성·특수 장비.</li>
          </ul>
        }
      />
    </FormSection>
  );
}
