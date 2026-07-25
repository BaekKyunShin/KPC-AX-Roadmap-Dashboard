'use client';

import { ExternalLink, FileText } from 'lucide-react';

import { FormTable } from '@/components/forms/FormTable';
import { InlineEditField } from '@/components/result/InlineEditField';
import { InlineSelectField } from '@/components/result/InlineSelectField';
import { SectionCard } from '@/components/result/SectionCard';
import {
  AI_COMPETENCY_LEVEL_LABEL,
  AI_COMPETENCY_LEVEL_SUBTITLE,
  INTERVIEW_METHOD_LABEL,
  type AiCompetencyLevel,
  type InterviewMethod,
  type RoadmapInterviewStrict,
  type RoadmapTaskAnalysisItem,
} from '@/lib/schemas/interview-roadmap';
import type { PBLRoadmapOverrides } from '@/lib/schemas/interview-pbl';

import type { PBLResultEditPayload, TabPBLCommonProps } from './types';

/**
 * Ⅱ. 훈련 요구 분석 탭 — PBL 결과 V2.
 *
 * 구성:
 *  - 선행 로드맵 연동 (불러옴 · 수정 가능) — 수립 배경·주요 활동·수립 결과(AI역량 3단계)·
 *    기업 요구분석·과업분석표·훈련대상 과업. 미연계 시 안내 배너.
 *  - Ⅱ-1 기업 경영 이슈 (박스) — 인터뷰 입력. DRAFT 인라인 편집.
 *  - Ⅱ-3-a 기업 훈련환경 분석 — 인터뷰 입력 요약/자유서술. DRAFT 인라인 편집.
 *  - Ⅱ-1-가 HRD이음 결과 PDF — iframe 미리보기 (로드맵 결과 V2 Ⅱ-1 과 동일 UX).
 *  - Ⅱ-1-다 AI훈련과정 개발 필요성 — 인터뷰 입력. DRAFT 인라인 편집.
 *
 * Phase E: Ⅱ-1-나 조직 및 주요 업무 — 로드맵과 동일하게 인터뷰/결과/HWPX
 * 3 계층에서 제거. 양식의 P-04 표는 한컴오피스 사용자가 직접 작성.
 *
 * 제외:
 *  - [결과보고서] 섹션 (P-27~P-29) — 렌더 금지
 */
export function TabPBLAnalysis({ interview, linkedRoadmap, readOnly, onEdit }: TabPBLCommonProps) {
  const analysis = interview?.analysis;
  const hrdPdf = analysis?.hrdReportPdf ?? null;

  return (
    <div className="space-y-6">
      {/* 선행 로드맵 연동 — Ⅱ장 로드맵 수립·요구분석 (불러옴 + PBL 수정 가능) */}
      <LinkedRoadmapReadonly linkedRoadmap={linkedRoadmap} readOnly={readOnly} onEdit={onEdit} />

      {/* Ⅱ-1 기업 경영 이슈 */}
      <SectionCard
        title="Ⅱ-1. 기업 경영 이슈"
        description="bullet 서술 (인터뷰 입력)"
        dataSource="user"
      >
        <InlineEditField
          value={analysis?.companyIssues ?? ''}
          onSave={async (next) => {
            await onEdit({ companyIssues: next });
          }}
          readOnly={readOnly}
          multiline
          placeholder="기업 경영 이슈가 입력되지 않았습니다."
        />
      </SectionCard>

      {/* Ⅱ-1-나 조직 및 주요 업무 — Phase E: 로드맵과 동일하게 인터뷰/결과/HWPX
          3 계층에서 제거. 양식의 P-04 표는 한컴오피스 사용자가 직접 작성. */}

      {/* Ⅱ-3-a 기업 훈련환경 분석 (R8 PBL-자체-02 — 12×7 정형 6 영역) */}
      <SectionCard
        title="Ⅱ-3-a. 기업 훈련환경 분석"
        description="양식 12×7 정형 표 — 적정 훈련시간 · 훈련장소(사내/사외) · 사내·외부 강사 · AI 인프라"
        dataSource="user"
      >
        {(() => {
          const env = analysis?.trainingEnv;
          if (!env || typeof env === 'string') {
            return (
              <p className="text-sm text-muted-foreground">훈련환경 분석이 입력되지 않았습니다.</p>
            );
          }
          return (
            <div className="space-y-4">
              <FormTable
                caption="훈련환경 — 시간·장소·인프라"
                bodyRows={[
                  {
                    cells: [
                      {
                        content: '적정 훈련시간',
                        header: true,
                        className: 'w-[160px]',
                        align: 'center',
                      },
                      { content: env.properTrainingHours || '-', align: 'left' },
                    ],
                  },
                  {
                    cells: [
                      { content: '훈련장소 (사내)', header: true, align: 'center' },
                      { content: env.internalPlace || '-', align: 'left' },
                    ],
                  },
                  {
                    cells: [
                      { content: '훈련장소 (사외)', header: true, align: 'center' },
                      { content: env.externalPlace || '-', align: 'left' },
                    ],
                  },
                  {
                    cells: [
                      { content: 'AI활용 가능 인프라', header: true, align: 'center' },
                      { content: env.aiInfrastructure || '-', align: 'left' },
                    ],
                  },
                ]}
              />
              {(['internal', 'external'] as const).map((side) => {
                const list =
                  side === 'internal' ? env.internalInstructors : env.externalInstructors;
                const heading = side === 'internal' ? '사내강사' : '외부강사';
                return (
                  <div key={side} className="space-y-2">
                    <h4 className="text-sm font-semibold">{heading}</h4>
                    {list.length === 0 ? (
                      <p className="text-xs text-muted-foreground">등록된 {heading}가 없습니다.</p>
                    ) : (
                      <FormTable
                        caption={`${heading} 표`}
                        headerRows={[
                          {
                            cells: [
                              { content: '직위', header: true, className: 'w-[120px]' },
                              { content: '이름', header: true, className: 'w-[120px]' },
                              { content: '직무경력', header: true },
                              { content: '인적특성', header: true },
                            ],
                          },
                        ]}
                        bodyRows={list.map((row) => ({
                          cells: [
                            { content: row.position || '-', align: 'center' },
                            { content: row.name || '-', align: 'center' },
                            { content: row.career || '-', align: 'left' },
                            { content: row.personalTraits || '-', align: 'left' },
                          ],
                        }))}
                      />
                    )}
                  </div>
                );
              })}

              {/* Phase E (Step 4b) — 양식 P-05 row 6~11 정합 5 신규 필드 */}
              {(() => {
                const target = env.targetCharacteristics ?? { career: '', level: '' };
                const infra = env.aiInfraDetail ?? {
                  toolCapacity: 'AVAILABLE' as const,
                  networkStatus: 'GOOD' as const,
                  pcCount: 0,
                };
                const toolLabel = {
                  AVAILABLE: '가능',
                  LIMITED: '제한적',
                  UNAVAILABLE: '불가능',
                }[infra.toolCapacity];
                const networkLabel = {
                  GOOD: '양호',
                  NORMAL: '보통',
                  IMPROVEMENT_NEEDED: '개선필요',
                }[infra.networkStatus];
                const infraSummary = `AI 도구: ${toolLabel} · 네트워크: ${networkLabel} · PC ${infra.pcCount}대`;
                return (
                  <FormTable
                    caption="훈련환경 — 대상자·인프라 세부·요구분석·기대효과"
                    bodyRows={[
                      {
                        cells: [
                          {
                            content: '대상자 특성',
                            header: true,
                            className: 'w-[160px]',
                            align: 'center',
                          },
                          {
                            content: (
                              <div className="space-y-1">
                                <div>
                                  <span className="font-medium text-muted-foreground">
                                    업무 경력{' '}
                                  </span>
                                  {target.career || '-'}
                                </div>
                                <div>
                                  <span className="font-medium text-muted-foreground">수준 </span>
                                  {target.level || '-'}
                                </div>
                              </div>
                            ),
                            align: 'left',
                          },
                        ],
                      },
                      {
                        cells: [
                          { content: 'AI 인프라 세부', header: true, align: 'center' },
                          { content: infraSummary, align: 'left' },
                        ],
                      },
                      {
                        cells: [
                          { content: 'AI훈련 요구분석 결과', header: true, align: 'center' },
                          {
                            content: (
                              <InlineEditField
                                value={env.trainingNeedsAnalysis ?? ''}
                                onSave={async (next) =>
                                  onEdit({ trainingEnv: { trainingNeedsAnalysis: next } })
                                }
                                readOnly={readOnly}
                                multiline
                                placeholder="AI훈련 요구분석이 입력되지 않았습니다."
                              />
                            ),
                            align: 'left',
                          },
                        ],
                      },
                      {
                        cells: [
                          { content: '기대효과 As-is', header: true, align: 'center' },
                          {
                            content: (
                              <InlineEditField
                                value={env.expectationAsIs ?? ''}
                                onSave={async (next) =>
                                  onEdit({ trainingEnv: { expectationAsIs: next } })
                                }
                                readOnly={readOnly}
                                multiline
                                placeholder="As-is 가 입력되지 않았습니다."
                              />
                            ),
                            align: 'left',
                          },
                        ],
                      },
                      {
                        cells: [
                          { content: '기대효과 To-be', header: true, align: 'center' },
                          {
                            content: (
                              <InlineEditField
                                value={env.expectationToBe ?? ''}
                                onSave={async (next) =>
                                  onEdit({ trainingEnv: { expectationToBe: next } })
                                }
                                readOnly={readOnly}
                                multiline
                                placeholder="To-be 가 입력되지 않았습니다."
                              />
                            ),
                            align: 'left',
                          },
                        ],
                      },
                    ]}
                  />
                );
              })()}
            </div>
          );
        })()}
      </SectionCard>

      {/* Ⅱ-1-가 HRD이음 PDF */}
      <SectionCard
        title="Ⅱ-1-가. HRD이음 컨설팅 결과 보고서"
        description="HRD이음 컨설팅 결과 PDF 첨부 (인터뷰에서 업로드, LLM 내부 분석용)"
        dataSource="user"
      >
        {hrdPdf ? (
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-3 rounded border bg-muted/30 p-3">
              <div className="flex min-w-0 items-center gap-2">
                <FileText className="size-4 shrink-0 text-muted-foreground" aria-hidden />
                <span className="truncate text-sm font-medium">{hrdPdf.fileName}</span>
                {hrdPdf.size ? (
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {formatBytes(hrdPdf.size)}
                  </span>
                ) : null}
              </div>
              {hrdPdf.url?.startsWith('http') && (
                <a
                  href={hrdPdf.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex shrink-0 items-center gap-1 text-xs text-primary hover:underline"
                >
                  열기 <ExternalLink className="size-3" aria-hidden />
                </a>
              )}
            </div>
            {hrdPdf.url?.startsWith('http') && (
              <iframe
                title={`HRD이음 컨설팅 결과 미리보기 - ${hrdPdf.fileName}`}
                src={hrdPdf.url}
                className="h-[560px] w-full rounded border"
              />
            )}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            HRD이음 컨설팅 결과 PDF 가 첨부되지 않았습니다.
          </p>
        )}
      </SectionCard>

      {/* Ⅱ-1-다 AI훈련과정 개발 필요성 */}
      <SectionCard
        title="Ⅱ-1-다. AI훈련과정 개발 필요성"
        description="인터뷰 입력 (HRD이음 PDF 미첨부 시 필수)"
        dataSource="user"
      >
        <InlineEditField
          value={analysis?.courseNecessity ?? ''}
          onSave={async (next) => {
            await onEdit({ courseNecessity: next });
          }}
          readOnly={readOnly}
          multiline
          placeholder="AI훈련과정 개발 필요성이 입력되지 않았습니다."
        />
      </SectionCard>
    </div>
  );
}

// 선행 로드맵 기업 요구분석 4행 (구분 라벨 ↔ camelCase 키).
const COMPANY_REQ_ROWS: ReadonlyArray<{
  key: 'status' | 'problem' | 'will' | 'outcomes';
  label: string;
}> = [
  { key: 'status', label: '기업 현황' },
  { key: 'problem', label: '주요 문제' },
  { key: 'will', label: '추진 의지' },
  { key: 'outcomes', label: '기대 성과' },
];

// 선행 로드맵 과업분석표 4열 (직무·과업은 짧은 값이라 단일행 입력).
const TASK_ANALYSIS_COLUMNS: ReadonlyArray<{
  key: keyof RoadmapTaskAnalysisItem;
  label: string;
  multiline: boolean;
}> = [
  { key: 'domain', label: '직무', multiline: false },
  { key: 'task', label: '과업', multiline: false },
  { key: 'asIs', label: '현행 방식', multiline: true },
  { key: 'improvement', label: '개선점', multiline: true },
];

// 선행 로드맵 훈련대상 과업 4행 (정본 Ⅱ-4 라벨 ↔ camelCase 키).
const TARGET_TASK_ROWS: ReadonlyArray<{
  key: 'name' | 'reason' | 'expectedAsIs' | 'expectedToBe';
  label: string;
}> = [
  { key: 'name', label: '훈련대상 과업명' },
  { key: 'reason', label: '선정 사유' },
  { key: 'expectedAsIs', label: '기대효과 (현행)' },
  { key: 'expectedToBe', label: '기대효과 (개선)' },
];

// 기업 AI 역량 수준 3단계 — 정본 Ⅰ-3 체크박스와 동일 (라벨은 부제까지 노출).
const AI_LEVEL_OPTIONS: ReadonlyArray<{ value: AiCompetencyLevel; label: string }> = (
  ['BEGINNER', 'INTERMEDIATE', 'ADVANCED'] as const
).map((value) => ({ value, label: aiLevelLabel(value) }));

/** 수행 방법 enum → 한글 라벨 (미상 값은 원문 그대로). */
function methodLabel(method: string | undefined): string {
  if (!method) return '-';
  return INTERVIEW_METHOD_LABEL[method as InterviewMethod] ?? method;
}

/** AI 역량 수준 enum → "초급 (AI기초형)" 형태 라벨. */
function aiLevelLabel(level: AiCompetencyLevel | undefined): string {
  if (!level) return '-';
  const label = AI_COMPETENCY_LEVEL_LABEL[level];
  return label ? `${label} (${AI_COMPETENCY_LEVEL_SUBTITLE[level]})` : '-';
}

/**
 * 선행 로드맵 연동 블록 — **불러오기 + PBL 수정 가능**.
 *
 * `hydrateRoadmapInterview` + `mergeRoadmapOverrides` 를 통과한 값(= 로드맵 값 위에 PBL
 * 수정값을 얹은 결과)을 6개 섹션(수립 배경·주요 활동·수립 결과·기업 요구분석·과업분석표·
 * 훈련대상 과업)으로 표출한다. 미연계(null/undefined) 시 안내 배너만 노출한다.
 *
 * 편집은 `roadmapOverrides` patch 로만 저장되므로 **로드맵 보고서 원본은 바뀌지 않는다**.
 *
 * ⚠️ "주요 활동" 표는 편집 대상이 아니다 — 로드맵 컨설팅을 어떻게 수행했는지의 이력이라
 * PBL 이 고칠 성질이 아니고, 로드맵 결과 화면에서도 읽기 전용이다(정책 일관).
 * PBL 자체 수행활동은 Ⅲ장 탭의 Ⅲ-1 에 따로 있다.
 */
function LinkedRoadmapReadonly({
  linkedRoadmap,
  readOnly,
  onEdit,
}: {
  linkedRoadmap?: Partial<RoadmapInterviewStrict> | null;
  readOnly: boolean;
  onEdit: (patch: PBLResultEditPayload) => Promise<void>;
}) {
  if (!linkedRoadmap) {
    return (
      <div
        role="status"
        data-testid="linked-roadmap-missing-banner"
        className="rounded-md border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900"
      >
        선행 로드맵 프로젝트가 연결되지 않아 Ⅱ장이 비어 있습니다. 운영관리자에게 연결을 요청하세요.
      </div>
    );
  }

  const performanceActivities = linkedRoadmap.performanceActivities ?? [];
  const cr = linkedRoadmap.companyRequirements;
  const taskAnalysis = linkedRoadmap.taskAnalysis ?? [];
  const target = linkedRoadmap.targetTask;

  /** 로드맵 연계 항목 수정 — 지정한 필드만 override 로 저장된다. */
  async function patchOverride(patch: PBLRoadmapOverrides): Promise<void> {
    await onEdit({ roadmapOverrides: patch });
  }

  return (
    <div className="space-y-6">
      <div className="rounded-md border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
        <span className="font-semibold text-slate-800">선행 로드맵 연동</span> — 아래 항목은 선행
        AI훈련로드맵 보고서에서 불러온 것이며, 이 보고서에서 수정할 수 있습니다. 수정해도 로드맵
        보고서는 바뀌지 않습니다.
      </div>

      {/* 수립 배경 (로드맵 Ⅰ-1) */}
      <SectionCard
        title="수립 배경"
        description="선행 로드맵 Ⅰ-1 수립 필요성 (불러옴 · 수정 가능)"
        dataSource="user"
      >
        <InlineEditField
          value={linkedRoadmap.establishmentNecessity ?? ''}
          onSave={(next) => patchOverride({ establishmentNecessity: next })}
          readOnly={readOnly}
          multiline
          ariaLabel="수립 배경 편집"
          placeholder="수립 배경이 입력되지 않았습니다."
        />
      </SectionCard>

      {/* 주요 활동 (로드맵 Ⅰ-2) */}
      <SectionCard
        title="주요 활동"
        description="선행 로드맵 Ⅰ-2 컨설팅 수행 차수별 활동 (자동 연계)"
        dataSource="user"
      >
        {performanceActivities.length > 0 ? (
          <div className="overflow-x-auto">
            <FormTable
              caption="선행 로드맵 주요 활동"
              headerRows={[
                {
                  cells: [
                    { content: '차수', header: true, className: 'w-[60px]' },
                    { content: '수행 일시', header: true, className: 'w-[140px]' },
                    { content: '수행 내용', header: true },
                    { content: '수행 방법', header: true, className: 'w-[130px]' },
                    { content: '컨설팅책임자(PM)', header: true, className: 'w-[130px]' },
                    { content: '기업 내부전문가', header: true, className: 'w-[130px]' },
                  ],
                },
              ]}
              bodyRows={performanceActivities.map((a) => ({
                cells: [
                  { content: `${a.round}차`, align: 'center' },
                  {
                    content: (
                      <span className="whitespace-pre-wrap text-sm">
                        {[a.date, a.timeRange].filter(Boolean).join('\n') || '-'}
                      </span>
                    ),
                    align: 'left',
                  },
                  {
                    content: (
                      <span className="whitespace-pre-wrap text-sm">{a.content || '-'}</span>
                    ),
                    align: 'left',
                  },
                  { content: methodLabel(a.method), align: 'center' },
                  { content: a.pmName || '-', align: 'center' },
                  { content: a.expertName || '-', align: 'center' },
                ],
              }))}
            />
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">등록된 주요 활동이 없습니다.</p>
        )}
      </SectionCard>

      {/* 수립 결과 (로드맵 Ⅰ-3 — AI 역량 3단계 + 선정 과업) */}
      <SectionCard
        title="수립 결과"
        description="선행 로드맵 Ⅰ-3 기업 AI 역량 수준 · 선정 과업 (불러옴 · 수정 가능)"
        dataSource="user"
      >
        <FormTable
          caption="선행 로드맵 수립 결과"
          bodyRows={[
            {
              cells: [
                {
                  content: '기업 AI 역량 수준',
                  header: true,
                  className: 'w-[160px]',
                  align: 'center',
                },
                {
                  // 로드맵 스키마상 aiLevel 은 필수지만, 레거시 인터뷰에 키가 없을 수
                  // 있다. 그때 특정 등급을 기본값으로 보이게 하면 사실을 왜곡하므로
                  // 미설정은 '-' 로 남기고 선택 위젯을 띄우지 않는다.
                  content: linkedRoadmap.aiLevel ? (
                    <InlineSelectField
                      value={linkedRoadmap.aiLevel}
                      options={[...AI_LEVEL_OPTIONS]}
                      onSave={(next) => patchOverride({ aiLevel: next })}
                      readOnly={readOnly}
                      ariaLabel="기업 AI 역량 수준 편집"
                    />
                  ) : (
                    <span className="text-sm text-muted-foreground">-</span>
                  ),
                  align: 'left',
                },
              ],
            },
            {
              cells: [
                { content: '선정 과업', header: true, align: 'center' },
                {
                  content: (
                    <InlineEditField
                      value={linkedRoadmap.selectedTask ?? ''}
                      onSave={(next) => patchOverride({ selectedTask: next })}
                      readOnly={readOnly}
                      multiline
                      ariaLabel="선정 과업 편집"
                      placeholder="선정 과업이 입력되지 않았습니다."
                    />
                  ),
                  align: 'left',
                },
              ],
            },
          ]}
        />
      </SectionCard>

      {/* 기업 요구분석 (로드맵 Ⅱ-2) */}
      <SectionCard
        title="기업 요구분석"
        description="선행 로드맵 Ⅱ-2 기업 현황·주요 문제·추진 의지·기대 성과 (불러옴 · 수정 가능)"
        dataSource="user"
      >
        <FormTable
          caption="선행 로드맵 기업 요구분석"
          headerRows={[
            {
              cells: [
                { content: '구분', header: true, className: 'w-[120px]' },
                { content: '확인 내용', header: true },
                { content: '비고', header: true, className: 'w-[200px]' },
              ],
            },
          ]}
          bodyRows={COMPANY_REQ_ROWS.map(({ key, label }) => ({
            cells: [
              { content: label, header: true, align: 'center' },
              {
                content: (
                  <InlineEditField
                    value={cr?.[key] ?? ''}
                    onSave={(next) => patchOverride({ companyRequirements: { [key]: next } })}
                    readOnly={readOnly}
                    multiline
                    ariaLabel={`${label} 편집`}
                    placeholder={`${label}이 입력되지 않았습니다.`}
                  />
                ),
                align: 'left',
              },
              {
                content: (
                  <span className="whitespace-pre-wrap text-sm">
                    {cr?.remarks?.[key]?.trim() || '-'}
                  </span>
                ),
                align: 'left',
              },
            ],
          }))}
        />
      </SectionCard>

      {/* 과업분석표 (로드맵 Ⅱ-3) */}
      <SectionCard
        title="과업분석표"
        description="선행 로드맵 Ⅱ-3 직무·과업·현행·개선점 및 AI 적용 가능성 (불러옴 · 수정 가능)"
        dataSource="user"
      >
        {taskAnalysis.length > 0 ? (
          <div className="overflow-x-auto">
            <FormTable
              caption="선행 로드맵 과업분석표"
              headerRows={[
                {
                  cells: [
                    { content: '직무', header: true, className: 'w-[120px]' },
                    { content: '과업(Task)', header: true, className: 'w-[150px]' },
                    { content: '현행 방식 (As-Is)', header: true },
                    { content: '개선점 및 AI 적용 가능성', header: true },
                  ],
                },
              ]}
              bodyRows={taskAnalysis.map((t, rowIdx) => ({
                cells: TASK_ANALYSIS_COLUMNS.map(({ key, label, multiline }) => ({
                  content: (
                    <InlineEditField
                      value={t[key] ?? ''}
                      onSave={(next) =>
                        patchOverride({ taskAnalysis: buildRowPatch(rowIdx, key, next) })
                      }
                      readOnly={readOnly}
                      multiline={multiline}
                      ariaLabel={`${rowIdx + 1}행 ${label} 편집`}
                      placeholder="-"
                    />
                  ),
                  align: 'left' as const,
                })),
              }))}
            />
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">등록된 과업 분석이 없습니다.</p>
        )}
      </SectionCard>

      {/* 훈련대상 과업 (로드맵 Ⅱ-4) */}
      <SectionCard
        title="훈련대상 과업"
        description="선행 로드맵 Ⅱ-4 선정 과업명·사유·기대효과 (불러옴 · 수정 가능)"
        dataSource="user"
      >
        <FormTable
          caption="선행 로드맵 훈련대상 과업"
          bodyRows={TARGET_TASK_ROWS.map(({ key, label }, idx) => ({
            cells: [
              {
                content: label,
                header: true,
                ...(idx === 0 ? { className: 'w-[160px]' } : {}),
                align: 'center' as const,
              },
              {
                content: (
                  <InlineEditField
                    value={target?.[key] ?? ''}
                    onSave={(next) => patchOverride({ targetTask: { [key]: next } })}
                    readOnly={readOnly}
                    multiline
                    ariaLabel={`${label} 편집`}
                    placeholder={`${label}이 입력되지 않았습니다.`}
                  />
                ),
                align: 'left' as const,
              },
            ],
          }))}
        />
      </SectionCard>
    </div>
  );
}

/**
 * 과업분석표(로드맵 Ⅱ-3) 셀 하나만 담은 override 배열을 만든다.
 *
 * `roadmapOverrides.taskAnalysis` 는 로드맵 표의 **행 index 와 1:1** 이므로, 앞선 행은
 * 빈 객체로 채워 자리를 맞춘다(빈 객체 = 해당 행은 로드맵 값 유지 — `mergeRoadmapOverrides`
 * 의 `stripUndefined` 가 아무 필드도 덮지 않는다).
 */
function buildRowPatch(
  rowIdx: number,
  key: keyof RoadmapTaskAnalysisItem,
  value: string
): NonNullable<PBLRoadmapOverrides['taskAnalysis']> {
  const rows: NonNullable<PBLRoadmapOverrides['taskAnalysis']> = Array.from(
    { length: rowIdx + 1 },
    () => ({})
  );
  rows[rowIdx] = { [key]: value };
  return rows;
}

/** 1024 단위 바이트 변환 (읽기 전용 메타 표시용). */
function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}
