'use client';

import { ExternalLink, FileText } from 'lucide-react';

import { SectionCard } from '@/components/result/SectionCard';
import { InlineEditField } from '@/components/result/InlineEditField';
import { FormTable } from '@/components/forms/FormTable';

import type { TabCommonProps } from './types';

/**
 * Ⅱ. 요구분석 탭 — 로드맵 결과 V2.
 *
 * 섹션:
 *  - Ⅱ-1 HRD이음 진단 보고서 PDF (첨부 파일 메타 + 다운로드 링크, iframe 미리보기는 url이 http 이면만 활성)
 *  - Ⅱ-2 기업 요구분석 (4필드 — 기업 현황/주요 문제/추진 의지/기대 성과, DRAFT 인라인 편집)
 *  - Ⅱ-3 과업·워크플로우 분석표 (표 readonly + 분석 메모 + 첨부 파일 링크)
 *  - Ⅱ-4 훈련대상 과업 선정 (4필드 블록, DRAFT 인라인 편집)
 *
 * 제외 없음 — Ⅱ장 전체가 [인터뷰 입력] 또는 [PDF 첨부] 섹션으로만 구성.
 */
export function TabRequirements({ interview, readOnly, onEdit }: TabCommonProps) {
  const hrdPdf = interview?.hrdReportPdf ?? null;
  const cr = interview?.companyRequirements;
  const tasks = interview?.taskAnalysis ?? [];
  const taskAttachment = interview?.taskAnalysisAttachment ?? null;
  const target = interview?.targetTask;

  return (
    <div className="space-y-6">
      {/* Ⅱ-1 HRD이음 PDF */}
      <SectionCard
        title="Ⅱ-1. 기업 AI 역량 수준 진단"
        description="훈련수요 진단 보고서 PDF 첨부 (인터뷰에서 업로드, LLM 내부 분석용)"
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
                title={`HRD이음 진단 보고서 미리보기 - ${hrdPdf.fileName}`}
                src={hrdPdf.url}
                className="h-[560px] w-full rounded border"
              />
            )}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            HRD이음 진단 보고서 PDF 가 첨부되지 않았습니다.
          </p>
        )}
      </SectionCard>

      {/* Ⅱ-2 기업 요구분석 */}
      <SectionCard
        title="Ⅱ-2. 기업 요구분석"
        description="기업 현황 · 주요 문제 · 추진 의지 · 기대 성과"
        dataSource="user"
      >
        <FormTable
          caption="기업 요구분석 4항목"
          headerRows={[
            {
              cells: [
                { content: '구분', header: true, className: 'w-[120px]' },
                { content: '확인 내용', header: true },
                { content: '비고', header: true, className: 'w-[240px]' },
              ],
            },
          ]}
          bodyRows={(['status', 'problem', 'will', 'outcomes'] as const).map((key) => {
            const labelByKey = {
              status: '기업 현황',
              problem: '주요 문제',
              will: '추진 의지',
              outcomes: '기대 성과',
            } as const;
            return {
              cells: [
                { content: labelByKey[key], header: true },
                {
                  content: (
                    <InlineEditField
                      value={cr?.[key] ?? ''}
                      onSave={async (next) => {
                        await onEdit({
                          company_requirements: { ...cr, [key]: next },
                        });
                      }}
                      readOnly={readOnly}
                      multiline
                      placeholder={`${labelByKey[key]}이(가) 입력되지 않았습니다.`}
                    />
                  ),
                  align: 'left',
                },
                {
                  content: (
                    <InlineEditField
                      value={cr?.remarks?.[key] ?? ''}
                      onSave={async (next) => {
                        await onEdit({
                          company_requirements: {
                            ...cr,
                            remarks: { ...(cr?.remarks ?? {}), [key]: next },
                          },
                        });
                      }}
                      readOnly={readOnly}
                      multiline
                      placeholder="비고 없음"
                    />
                  ),
                  align: 'left',
                },
              ],
            };
          })}
        />
      </SectionCard>

      {/* Ⅱ-3 과업·워크플로우 분석표 (양식 v2: 6열 → 4열) */}
      <SectionCard
        title="Ⅱ-3. 과업(Task)·워크플로우 분석표"
        description="직무별 과업 현행(As-Is) / 개선점 및 AI 적용 가능성"
        dataSource="user"
      >
        {tasks.length > 0 ? (
          <div className="overflow-x-auto">
            <FormTable
              caption="과업(Task)·워크플로우 분석표"
              headerRows={[
                {
                  cells: [
                    { content: '직무', header: true },
                    { content: '과업(Task)', header: true },
                    { content: '현행 방식', header: true },
                    {
                      content: (
                        <>
                          <span>개선점 및 AI 적용 가능성</span>
                          <span className="mt-0.5 block text-[11px] font-normal text-muted-foreground/80">
                            (데이터 발생 여부 또는 보유현황)
                          </span>
                        </>
                      ),
                      header: true,
                    },
                  ],
                },
              ]}
              bodyRows={tasks.map((t, idx) => {
                // 행에 stable id 가 없으므로 인덱스 기반 patch — 항상 전체 배열을 보내고
                // 서버는 saveRoadmapInterviewV2 의 deepMerge 에서 taskAnalysis 키를 통째로 교체.
                const patchRow = async (next: Partial<typeof t>) => {
                  const draft = tasks.map((row, i) => (i === idx ? { ...row, ...next } : row));
                  await onEdit({ task_analysis: draft });
                };
                return {
                  cells: [
                    {
                      content: (
                        <InlineEditField
                          value={t.domain ?? ''}
                          onSave={async (next) => {
                            await patchRow({ domain: next });
                          }}
                          readOnly={readOnly}
                          placeholder="직무 미입력"
                        />
                      ),
                      align: 'left',
                    },
                    {
                      content: (
                        <InlineEditField
                          value={t.task ?? ''}
                          onSave={async (next) => {
                            await patchRow({ task: next });
                          }}
                          readOnly={readOnly}
                          placeholder="과업 미입력"
                        />
                      ),
                      align: 'left',
                    },
                    {
                      content: (
                        <InlineEditField
                          value={t.asIs ?? ''}
                          onSave={async (next) => {
                            await patchRow({ asIs: next });
                          }}
                          readOnly={readOnly}
                          multiline
                          placeholder="현행 방식 (As-Is) 미입력"
                        />
                      ),
                      align: 'left',
                    },
                    {
                      content: (
                        <InlineEditField
                          value={t.improvement ?? ''}
                          onSave={async (next) => {
                            await patchRow({ improvement: next });
                          }}
                          readOnly={readOnly}
                          multiline
                          placeholder="개선점 및 AI 적용 가능성 미입력"
                        />
                      ),
                      align: 'left',
                    },
                  ],
                };
              })}
            />
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">등록된 과업 분석이 없습니다.</p>
        )}

        {taskAttachment && (
          <div className="flex items-center justify-between gap-3 rounded border bg-muted/30 p-3">
            <div className="flex min-w-0 items-center gap-2">
              <FileText className="size-4 shrink-0 text-muted-foreground" aria-hidden />
              <span className="truncate text-sm">{taskAttachment.fileName}</span>
            </div>
            {taskAttachment.url?.startsWith('http') && (
              <a
                href={taskAttachment.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex shrink-0 items-center gap-1 text-xs text-primary hover:underline"
              >
                열기 <ExternalLink className="size-3" aria-hidden />
              </a>
            )}
          </div>
        )}
      </SectionCard>

      {/* Ⅱ-4 AI 적용 대상 과업(Task)·워크플로우 선정 */}
      <SectionCard
        title="Ⅱ-4. AI 적용 대상 과업(Task)·워크플로우 선정"
        description="선정 과업명 · 사유 · 기대효과 (현행 → 개선)"
        dataSource="user"
      >
        <FormTable
          caption="AI 적용 대상 과업(Task)·워크플로우 선정"
          bodyRows={[
            {
              cells: [
                { content: 'AI 적용 대상 과업', header: true, className: 'w-[160px]' },
                {
                  content: (
                    <InlineEditField
                      value={target?.name ?? ''}
                      onSave={async (next) => {
                        await onEdit({
                          target_task: { ...target, name: next },
                        });
                      }}
                      readOnly={readOnly}
                      placeholder="AI 적용 대상 과업이 없습니다."
                    />
                  ),
                  align: 'left',
                },
              ],
            },
            {
              cells: [
                { content: '선정사유', header: true },
                {
                  content: (
                    <InlineEditField
                      value={target?.reason ?? ''}
                      onSave={async (next) => {
                        await onEdit({
                          target_task: { ...target, reason: next },
                        });
                      }}
                      readOnly={readOnly}
                      multiline
                      placeholder="선정 사유가 없습니다."
                    />
                  ),
                  align: 'left',
                },
              ],
            },
            {
              cells: [
                { content: '기대효과 (현행)', header: true },
                {
                  content: (
                    <InlineEditField
                      value={target?.expectedAsIs ?? ''}
                      onSave={async (next) => {
                        await onEdit({
                          target_task: { ...target, expectedAsIs: next },
                        });
                      }}
                      readOnly={readOnly}
                      multiline
                      placeholder="현행 기대효과가 없습니다."
                    />
                  ),
                  align: 'left',
                },
              ],
            },
            {
              cells: [
                { content: '기대효과 (개선)', header: true },
                {
                  content: (
                    <InlineEditField
                      value={target?.expectedToBe ?? ''}
                      onSave={async (next) => {
                        await onEdit({
                          target_task: { ...target, expectedToBe: next },
                        });
                      }}
                      readOnly={readOnly}
                      multiline
                      placeholder="개선 기대효과가 없습니다."
                    />
                  ),
                  align: 'left',
                },
              ],
            },
          ]}
        />
      </SectionCard>
    </div>
  );
}

/** 1024 단위 바이트 변환 (읽기 전용 메타 표시용). */
function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}
