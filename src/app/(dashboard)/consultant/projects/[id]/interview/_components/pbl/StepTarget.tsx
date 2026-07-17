'use client';

import { Plus, Trash2 } from 'lucide-react';

import { FormSection } from '@/components/forms/FormSection';
import { LargeTextBox } from '@/components/forms/LargeTextBox';
import { ExampleAccordion } from '@/components/forms/ExampleAccordion';
import { Button } from '@/components/ui/button';

import type { PBLStepProps } from './types';
import type { PBLTarget, PBLTargetDetail, PBLTaskSelection } from '@/lib/schemas/interview-pbl';
import type { RoadmapTaskAnalysisItem } from '@/lib/schemas/interview-roadmap';

/**
 * Ⅲ-3 훈련대상 업무 — [인터뷰 입력 + 로드맵 연동]
 *
 * 양식 Ⅲ-3 은 세 블록으로 구성된다:
 *  - 가) 훈련대상 과업 선정 (6열 표) = 선행 로드맵 과업 4열(직무·과업·현행·개선점, 읽기 전용)
 *        + PBL 입력 2열(AI도입·활용 필요도 서술·훈련 선정 여부). 로드맵 과업 순서와
 *        `target.taskSelections[]` 가 index 1:1 로 대응한다.
 *  - 나) AI기반 문제해결 필요성 (선정 사유) = `target.necessity`
 *  - 다) 훈련대상 업무 세부내용 (양식 4×5) = `target.details[]`
 *
 * V2 에서 Ⅲ-4 AI역량 수준 진단은 PBL 자체 입력에서 제거됐다(로드맵 연동으로만 표출).
 */

export interface StepTargetProps extends PBLStepProps<PBLTarget> {
  /**
   * 선행 로드맵 과업 목록 (읽기 전용 4열). `target.taskSelections` 와 index 1:1.
   * 미연계 시 빈 배열 → "선행 로드맵 과업이 연결되지 않았습니다" 안내.
   */
  roadmapTasks?: RoadmapTaskAnalysisItem[];
}

function emptyTarget(): PBLTarget {
  return { taskSelections: [], necessity: '', details: [emptyTargetDetail()] };
}

function emptyTargetDetail(): PBLTargetDetail {
  return {
    title: '',
    as_is: '',
    to_be: '',
    required_knowledge: '',
    required_skill: '',
  };
}

function emptySelection(): PBLTaskSelection {
  return { ai_necessity: '', training_selected: false };
}

export function StepTarget({
  value,
  onChange,
  readOnly = false,
  roadmapTasks = [],
}: StepTargetProps) {
  const target: PBLTarget = value ?? emptyTarget();
  const taskSelections: PBLTaskSelection[] = target.taskSelections ?? [];
  const details: PBLTargetDetail[] =
    target.details && target.details.length > 0 ? target.details : [emptyTargetDetail()];

  function updateTarget(patch: Partial<PBLTarget>) {
    onChange({ ...target, taskSelections, details, ...patch });
  }

  /** 로드맵 과업 순서(1:1)에 맞춰 taskSelections 를 재구성하고 idx 원소만 patch. */
  function updateSelection(idx: number, patch: Partial<PBLTaskSelection>) {
    const next = roadmapTasks.map((_, i) => {
      const current = taskSelections[i] ?? emptySelection();
      return i === idx ? { ...current, ...patch } : current;
    });
    updateTarget({ taskSelections: next });
  }

  function selectionAt(idx: number): PBLTaskSelection {
    return taskSelections[idx] ?? emptySelection();
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
      number="Ⅲ-3"
      title="훈련대상 업무"
      label="[인터뷰 입력 · 로드맵 연동]"
      description="선행 로드맵 과업별로 AI 도입·활용 필요도와 훈련 선정 여부를 입력하고, 선정 사유와 훈련대상 업무 세부내용을 작성합니다."
    >
      {/* Ⅲ-3-가 훈련대상 과업 선정 (로드맵 과업 4열 + PBL 입력 2열) ------------ */}
      <div className="space-y-2">
        <h3 className="text-sm font-semibold">Ⅲ-3-가 훈련대상 과업 선정</h3>
        <p className="text-xs text-muted-foreground">
          선행 로드맵의 과업 분석(직무·과업·현행·개선점)은 읽기 전용으로 표시됩니다. 각 과업에 대해
          AI 도입·활용 필요도와 훈련 선정 여부만 입력하세요.
        </p>

        {roadmapTasks.length === 0 ? (
          <div className="rounded-md border border-dashed border-border bg-muted/30 px-4 py-6 text-center">
            <p className="text-sm text-muted-foreground">선행 로드맵 과업이 연결되지 않았습니다.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse border border-border text-sm">
              <caption className="sr-only">훈련대상 과업 선정</caption>
              <thead>
                <tr>
                  <th
                    scope="col"
                    className="w-[110px] border border-border bg-muted px-2 py-2 text-center font-semibold"
                  >
                    직무
                  </th>
                  <th
                    scope="col"
                    className="w-[130px] border border-border bg-muted px-2 py-2 text-center font-semibold"
                  >
                    과업(Task)
                  </th>
                  <th
                    scope="col"
                    className="border border-border bg-muted px-2 py-2 text-center font-semibold"
                  >
                    현행 방식 (As-Is)
                  </th>
                  <th
                    scope="col"
                    className="border border-border bg-muted px-2 py-2 text-center font-semibold"
                  >
                    개선점 및 AI 적용 가능성
                  </th>
                  <th
                    scope="col"
                    className="w-[180px] border border-border bg-muted px-2 py-2 text-center font-semibold"
                  >
                    AI 도입·활용 필요도
                  </th>
                  <th
                    scope="col"
                    className="w-[80px] border border-border bg-muted px-2 py-2 text-center font-semibold"
                  >
                    훈련 선정
                  </th>
                </tr>
              </thead>
              <tbody>
                {roadmapTasks.map((task, idx) => {
                  const selection = selectionAt(idx);
                  return (
                    <tr key={idx}>
                      <td className="border border-border bg-muted/30 px-2 py-2 align-top whitespace-pre-wrap">
                        {task.domain || '-'}
                      </td>
                      <td className="border border-border bg-muted/30 px-2 py-2 align-top whitespace-pre-wrap">
                        {task.task || '-'}
                      </td>
                      <td className="border border-border bg-muted/30 px-2 py-2 align-top whitespace-pre-wrap">
                        {task.asIs || '-'}
                      </td>
                      <td className="border border-border bg-muted/30 px-2 py-2 align-top whitespace-pre-wrap">
                        {task.improvement || '-'}
                      </td>
                      <td className="border border-border p-1 align-top">
                        <LargeTextBox
                          value={selection.ai_necessity}
                          onChange={(e) => updateSelection(idx, { ai_necessity: e.target.value })}
                          placeholder="예: 높음 — 12명 전원 공통 수행, 개선 효과 최대"
                          disabled={readOnly}
                          aria-label={`과업 ${idx + 1} AI 도입·활용 필요도`}
                          minHeightClassName="min-h-[72px]"
                        />
                      </td>
                      <td className="border border-border p-1 text-center align-middle">
                        <input
                          type="checkbox"
                          checked={selection.training_selected}
                          onChange={(e) =>
                            updateSelection(idx, { training_selected: e.target.checked })
                          }
                          disabled={readOnly}
                          aria-label={`과업 ${idx + 1} 훈련 선정`}
                          className="size-4 rounded border-input accent-primary disabled:cursor-not-allowed disabled:opacity-50"
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Ⅲ-3-나 AI기반 문제해결 필요성 (선정 사유) ---------------------------- */}
      <div className="space-y-1">
        <label htmlFor="pbl-target-necessity" className="text-sm font-semibold">
          Ⅲ-3-나 AI기반 문제해결 필요성 (선정 사유)
        </label>
        <LargeTextBox
          id="pbl-target-necessity"
          value={target.necessity}
          onChange={(e) => updateTarget({ necessity: e.target.value })}
          placeholder="예: 불량 원인 분석·보고서 작성은 품질 이슈 해결의 병목. AI 도구로 데이터 정제·시각화·초안 자동화가 가능해 개선 효과가 가장 크고..."
          disabled={readOnly}
          aria-label="훈련대상 업무 선정 사유"
          minHeightClassName="min-h-[100px]"
        />
      </div>

      {/* Ⅲ-3-다 훈련대상 업무 세부내용 (양식 4×5) --------------------------- */}
      <div className="space-y-2">
        <h3 className="text-sm font-semibold">Ⅲ-3-다 훈련대상 업무 세부내용</h3>
        <p className="text-xs text-muted-foreground">
          양식 4×5 표 — 업무명 / AS-IS / TO-BE / 요구지식 / 기술을 작성합니다.
        </p>
        <div className="space-y-3">
          {details.map((row, idx) => (
            <div key={idx} className="space-y-2 rounded-md border border-border bg-card p-3">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-semibold text-muted-foreground">
                  세부내용 {idx + 1}
                </span>
                <button
                  type="button"
                  onClick={() => removeDetail(idx)}
                  disabled={readOnly || details.length <= 1}
                  aria-label={`세부내용 ${idx + 1} 삭제`}
                  className="inline-flex h-7 w-7 items-center justify-center rounded text-muted-foreground hover:bg-muted disabled:opacity-30"
                >
                  <Trash2 className="size-4" />
                </button>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">업무명</label>
                <input
                  type="text"
                  value={row.title}
                  onChange={(e) => updateDetail(idx, { title: e.target.value })}
                  placeholder="예: 데이터 수집·전처리"
                  disabled={readOnly}
                  aria-label={`세부내용 ${idx + 1} 업무명`}
                  className="w-full rounded border border-border bg-background px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">
                  현재 업무방식 (AS-IS)
                </label>
                <LargeTextBox
                  value={row.as_is}
                  onChange={(e) => updateDetail(idx, { as_is: e.target.value })}
                  placeholder="예: 수동 측정 + 엑셀 집계 (작성 평균 2 영업일)"
                  disabled={readOnly}
                  aria-label={`세부내용 ${idx + 1} AS-IS`}
                  minHeightClassName="min-h-[60px]"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">
                  AI활용방식 (TO-BE)
                </label>
                <LargeTextBox
                  value={row.to_be}
                  onChange={(e) => updateDetail(idx, { to_be: e.target.value })}
                  placeholder="예: PLC 자동 수집 + AutoLabel 자동 라벨링 (리드타임 0.5 영업일)"
                  disabled={readOnly}
                  aria-label={`세부내용 ${idx + 1} TO-BE`}
                  minHeightClassName="min-h-[60px]"
                />
              </div>

              <div className="grid gap-2 md:grid-cols-2">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">요구지식</label>
                  <LargeTextBox
                    value={row.required_knowledge}
                    onChange={(e) => updateDetail(idx, { required_knowledge: e.target.value })}
                    placeholder="예: 센서 데이터 구조·라벨링 가이드"
                    disabled={readOnly}
                    aria-label={`세부내용 ${idx + 1} 요구지식`}
                    minHeightClassName="min-h-[50px]"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">기술</label>
                  <LargeTextBox
                    value={row.required_skill}
                    onChange={(e) => updateDetail(idx, { required_skill: e.target.value })}
                    placeholder="예: Python pandas + AutoLabel CLI 운영"
                    disabled={readOnly}
                    aria-label={`세부내용 ${idx + 1} 기술`}
                    minHeightClassName="min-h-[50px]"
                  />
                </div>
              </div>
            </div>
          ))}
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

      <ExampleAccordion
        example={
          <div className="space-y-1 text-xs text-muted-foreground">
            <p className="font-medium text-foreground">(양식 작성 예시)</p>
            <p>
              훈련대상 업무는 영상 데이터 수집, 영상 데이터 분석임. 기업 경영 이슈인 &ldquo;사업
              다각화를 위한 신규 서비스 런칭 필요&rdquo; 과 연계하여 AI 기반 영상 분석 역량 확보가
              시급함.
            </p>
          </div>
        }
        guide={
          <ul className="list-disc space-y-1 pl-4">
            <li>
              (양식 안내) 문제 우선순위에서 도출된 결과를 분석하여 AI를 통해 가장 큰 변화가 예상되는
              핵심업무(Task) 단위로 훈련대상 업무를 선정
            </li>
            <li>
              Ⅲ-3-가 훈련대상 과업 선정은 선행 로드맵 과업 목록을 기준으로 AI 도입·활용 필요도와
              훈련 선정 여부만 입력합니다.
            </li>
            <li>Ⅲ-3-나 선정 사유는 문제 정의서(Ⅲ-2) 결과와 정합되도록 기술합니다.</li>
            <li>Ⅲ-3-다 세부내용은 AS-IS / TO-BE · 요구지식 · 요구기술 최소 1행 이상 작성합니다.</li>
          </ul>
        }
      />
    </FormSection>
  );
}
