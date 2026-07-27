'use client';

import { FormSection } from '@/components/forms/FormSection';
import { LargeTextBox } from '@/components/forms/LargeTextBox';
import { ExampleAccordion } from '@/components/forms/ExampleAccordion';

import type { PBLStepProps } from './types';
import type { PBLTrainingEnv } from '@/lib/schemas/interview-pbl';

/**
 * Ⅱ-2-b 훈련환경 기대효과·요구분석 — [인터뷰 입력] (Phase E Step 4b)
 *
 * 양식 P-05 의 11 행 중 row 6/7 (대상자 특성·대상 인원), row 8 (AI 인프라 세부),
 * row 9 (AI훈련 요구분석), row 11 (기대효과 As-is/To-be) 정합을 위한 5 신규
 * 필드를 한 step 으로 묶었다. Step 4a "훈련환경" 의 기본 6 영역과 분리해 인터뷰
 * 입력 부담을 분산.
 *
 * 데이터 슬라이스: `PBLTrainingEnv` 의 5 필드 부분 — targetCharacteristics,
 * aiInfraDetail, trainingNeedsAnalysis, expectationAsIs, expectationToBe.
 */
export function StepExpectations({
  value,
  onChange,
  readOnly = false,
}: PBLStepProps<PBLTrainingEnv>) {
  const patch = (next: Partial<PBLTrainingEnv>) => onChange({ ...value, ...next });

  const targetCharacteristics = value.targetCharacteristics ?? { career: '', level: '' };
  const aiInfraDetail = value.aiInfraDetail ?? {
    toolCapacity: 'AVAILABLE' as const,
    networkStatus: 'GOOD' as const,
    pcCount: 0,
  };

  return (
    <FormSection
      number="Ⅱ-3-b"
      title="기대효과·요구분석"
      label="[인터뷰 입력]"
      description="양식 Ⅱ-3 의 대상자 특성·AI 인프라 세부·요구분석·기대효과 5 영역을 작성합니다."
    >
      <div className="space-y-6">
        {/* 1. 대상자 특성 */}
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-foreground">대상자 특성</h3>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1 block text-sm text-muted-foreground">업무 경력</span>
              <input
                type="text"
                value={targetCharacteristics.career}
                onChange={(e) =>
                  patch({
                    targetCharacteristics: { ...targetCharacteristics, career: e.target.value },
                  })
                }
                disabled={readOnly}
                placeholder="예: 품질·생산기술 평균 7년 (최소 3년 / 최대 15년)"
                aria-label="대상자 업무 경력"
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary disabled:cursor-not-allowed disabled:opacity-50"
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-sm text-muted-foreground">수준 (직급)</span>
              <input
                type="text"
                value={targetCharacteristics.level}
                onChange={(e) =>
                  patch({
                    targetCharacteristics: { ...targetCharacteristics, level: e.target.value },
                  })
                }
                disabled={readOnly}
                placeholder="예: 대리~과장급 (사원 1, 대리 4, 과장 7, 차장 3)"
                aria-label="대상자 수준 (직급)"
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary disabled:cursor-not-allowed disabled:opacity-50"
              />
            </label>
          </div>
        </div>

        {/* 2. AI 활용 가능 인프라 세부 */}
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-foreground">AI 활용 가능 인프라</h3>
          <div className="grid gap-3 sm:grid-cols-3">
            <fieldset>
              <legend className="mb-1 block text-sm text-muted-foreground">
                AI 도구 사용 가능 환경
              </legend>
              <select
                value={aiInfraDetail.toolCapacity}
                onChange={(e) =>
                  patch({
                    aiInfraDetail: {
                      ...aiInfraDetail,
                      toolCapacity: e.target
                        .value as PBLTrainingEnv['aiInfraDetail']['toolCapacity'],
                    },
                  })
                }
                disabled={readOnly}
                aria-label="AI 도구 사용 가능 환경"
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary disabled:cursor-not-allowed disabled:opacity-50"
              >
                <option value="AVAILABLE">가능</option>
                <option value="LIMITED">제한적</option>
                <option value="UNAVAILABLE">불가능</option>
              </select>
            </fieldset>
            <fieldset>
              <legend className="mb-1 block text-sm text-muted-foreground">네트워크 환경</legend>
              <select
                value={aiInfraDetail.networkStatus}
                onChange={(e) =>
                  patch({
                    aiInfraDetail: {
                      ...aiInfraDetail,
                      networkStatus: e.target
                        .value as PBLTrainingEnv['aiInfraDetail']['networkStatus'],
                    },
                  })
                }
                disabled={readOnly}
                aria-label="네트워크 환경"
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary disabled:cursor-not-allowed disabled:opacity-50"
              >
                <option value="GOOD">양호</option>
                <option value="NORMAL">보통</option>
                <option value="IMPROVEMENT_NEEDED">개선필요</option>
              </select>
            </fieldset>
            <label className="block">
              <span className="mb-1 block text-sm text-muted-foreground">PC 보유 수</span>
              <input
                type="number"
                min={0}
                value={aiInfraDetail.pcCount}
                onChange={(e) =>
                  patch({
                    aiInfraDetail: {
                      ...aiInfraDetail,
                      pcCount: Math.max(0, Number(e.target.value) || 0),
                    },
                  })
                }
                disabled={readOnly}
                placeholder="0"
                aria-label="PC 보유 수"
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary disabled:cursor-not-allowed disabled:opacity-50"
              />
            </label>
          </div>
        </div>

        {/* 3. AI훈련 요구분석 */}
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-foreground">AI훈련 요구분석</h3>
          <LargeTextBox
            value={value.trainingNeedsAnalysis ?? ''}
            onChange={(e) => patch({ trainingNeedsAnalysis: e.target.value })}
            placeholder="예: 품질검사·공정개선 직무가 공통으로 불량 원인 추적·보고에 시간을 과다 투입. AI 도구로 분석·시각화 루틴 도입 시급."
            disabled={readOnly}
            aria-label="AI훈련 요구분석"
          />
        </div>

        {/* 4·5. 기대효과 As-is / To-be */}
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-foreground">훈련을 통한 기대효과</h3>
          <div className="space-y-3">
            <div>
              <span className="mb-1 block text-sm text-muted-foreground">As-is (현재 상황)</span>
              <LargeTextBox
                value={value.expectationAsIs ?? ''}
                onChange={(e) => patch({ expectationAsIs: e.target.value })}
                placeholder="예: 수동 검사 92% 정확도, 보고서 작성 평균 4시간, 숙련 인력 의존."
                disabled={readOnly}
                aria-label="기대효과 As-is"
              />
            </div>
            <div>
              <span className="mb-1 block text-sm text-muted-foreground">To-be (원하는 상황)</span>
              <LargeTextBox
                value={value.expectationToBe ?? ''}
                onChange={(e) => patch({ expectationToBe: e.target.value })}
                placeholder="예: AI 자동검사 정확도 96%+, 보고서 자동 생성 1시간, 신규 인력 동일 수준 분석 가능."
                disabled={readOnly}
                aria-label="기대효과 To-be"
              />
            </div>
          </div>
        </div>
      </div>

      <ExampleAccordion
        guideLabel="작성 가이드"
        guide={
          <ul className="list-none space-y-1">
            <li>
              3. ‘훈련을 통한 기대효과’는 업무수행 시 애로사항(As-is)과 해당 업무를 우수하게
              수행하기 위해 요구되는 수준(To-be)을 작성(gap 분석)하고, 이를 훈련 목표 및 내용에 연계
            </li>
          </ul>
        }
      />
    </FormSection>
  );
}
