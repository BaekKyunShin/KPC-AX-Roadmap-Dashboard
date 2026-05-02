'use client';

import { ExternalLink, FileText } from 'lucide-react';

import { OrganizationTree } from '@/components/charts/OrganizationTree';
import { FormTable } from '@/components/forms/FormTable';
import { InlineEditField } from '@/components/result/InlineEditField';
import { SectionCard } from '@/components/result/SectionCard';

import type { TabPBLCommonProps } from './types';

/**
 * Ⅱ. 훈련 요구 분석 탭 — PBL 결과 V2.
 *
 * 섹션:
 *  - P-03 Ⅱ-1-가 기업 경영 이슈 (박스) — 인터뷰 입력. DRAFT 인라인 편집.
 *  - P-04 Ⅱ-1-나 조직 및 주요 업무 — OrganizationTree readOnly + FormTable (mainWork).
 *  - P-05 Ⅱ-2 기업 훈련환경 분석 — 인터뷰 입력 요약/자유서술. DRAFT 인라인 편집.
 *  - P-06 Ⅱ-3-가 HRD이음 결과 PDF — iframe 미리보기 (로드맵 결과 V2 Ⅱ-1 과 동일 UX).
 *  - P-07 Ⅱ-3-나 AI훈련과정 개발 필요성 — 인터뷰 입력. DRAFT 인라인 편집.
 *
 * 제외:
 *  - [결과보고서] 섹션 (P-27~P-29) — 렌더 금지
 */
export function TabPBLAnalysis({
  interview,
  readOnly,
  onEdit,
}: TabPBLCommonProps) {
  const analysis = interview?.analysis;
  const hrdPdf = analysis?.hrdReportPdf ?? null;
  const orgTree = analysis?.organization?.orgTree ?? [];
  const mainWork = analysis?.organization?.mainWork ?? [];

  return (
    <div className="space-y-6">
      {/* Ⅱ-1-가 기업 경영 이슈 */}
      <SectionCard
        title="Ⅱ-1-가. 기업 경영 이슈"
        description="bullet 서술 (인터뷰 입력)"
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

      {/* Ⅱ-1-나 조직 및 주요 업무 */}
      <SectionCard
        title="Ⅱ-1-나. 조직 및 주요 업무"
        description="조직도(재귀 트리) + 부서별 주요 업무"
      >
        <div className="space-y-4">
          <div>
            <p className="mb-2 text-sm font-medium text-muted-foreground">조직도</p>
            {orgTree.length > 0 ? (
              <OrganizationTree
                value={orgTree}
                onChange={() => {
                  /* 결과 화면은 readOnly — 인터뷰에서만 수정 */
                }}
                readOnly
              />
            ) : (
              <p className="text-sm text-muted-foreground">
                등록된 조직도 노드가 없습니다.
              </p>
            )}
          </div>

          <div>
            <p className="mb-2 text-sm font-medium text-muted-foreground">주요 업무</p>
            {mainWork.length > 0 ? (
              <div className="overflow-x-auto">
                <FormTable
                  caption="부서별 주요 업무"
                  headerRows={[
                    {
                      cells: [
                        { content: '부서', header: true, className: 'w-[160px]' },
                        { content: '역할', header: true, className: 'w-[160px]' },
                        { content: '주요 업무 설명', header: true },
                      ],
                    },
                  ]}
                  bodyRows={mainWork.map((w, idx) => ({
                    cells: [
                      { content: w.dept || '-', align: 'left' },
                      { content: w.role || '-', align: 'left' },
                      {
                        content: (
                          <InlineEditField
                            value={w.description ?? ''}
                            onSave={async (next) => {
                              const draft = mainWork.map((row, i) =>
                                i === idx ? { ...row, description: next } : row,
                              );
                              await onEdit({ organization: { mainWork: draft } });
                            }}
                            readOnly={readOnly}
                            multiline
                            placeholder="주요 업무 설명이 입력되지 않았습니다."
                          />
                        ),
                        align: 'left',
                      },
                    ],
                  }))}
                />
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                등록된 주요 업무 행이 없습니다.
              </p>
            )}
          </div>
        </div>
      </SectionCard>

      {/* Ⅱ-2 기업 훈련환경 분석 (R8 PBL-자체-02 — 12×7 정형 6 영역) */}
      <SectionCard
        title="Ⅱ-2. 기업 훈련환경 분석"
        description="양식 12×7 정형 표 — 적정 훈련시간 · 훈련장소(사내/사외) · 사내·외부 강사 · AI 인프라"
      >
        {(() => {
          const env = analysis?.trainingEnv;
          if (!env || typeof env === 'string') {
            return (
              <p className="text-sm text-muted-foreground">
                훈련환경 분석이 입력되지 않았습니다.
              </p>
            );
          }
          return (
            <div className="space-y-4">
              <FormTable
                caption="훈련환경 — 시간·장소·인프라"
                bodyRows={[
                  {
                    cells: [
                      { content: '적정 훈련시간', header: true, className: 'w-[160px]', align: 'center' },
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
                      { content: 'AI 인프라', header: true, align: 'center' },
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
                      <p className="text-xs text-muted-foreground">
                        등록된 {heading}가 없습니다.
                      </p>
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
            </div>
          );
        })()}
      </SectionCard>

      {/* Ⅱ-3-가 HRD이음 PDF */}
      <SectionCard
        title="Ⅱ-3-가. HRD이음 컨설팅 결과 보고서"
        description="HRD이음 컨설팅 결과 PDF 첨부 (인터뷰에서 업로드, LLM 내부 분석용)"
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

      {/* Ⅱ-3-나 AI훈련과정 개발 필요성 */}
      <SectionCard
        title="Ⅱ-3-나. AI훈련과정 개발 필요성"
        description="인터뷰 입력 (HRD이음 PDF 미첨부 시 필수)"
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

/** 1024 단위 바이트 변환 (읽기 전용 메타 표시용). */
function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}
