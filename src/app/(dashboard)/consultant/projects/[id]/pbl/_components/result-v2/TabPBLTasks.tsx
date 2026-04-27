'use client';

import { AiLevel4Check } from '@/components/charts/AiLevel4Check';
import { FormTable } from '@/components/forms/FormTable';
import { InlineEditField } from '@/components/result/InlineEditField';
import { SectionCard } from '@/components/result/SectionCard';

import type { TabPBLCommonProps } from './types';

/**
 * Ⅲ. AI기반 훈련과제 도출 탭 — PBL 결과 V2.
 *
 * 섹션:
 *  - P-08 Ⅲ-1 훈련과제 도출 수행활동 (표, 동적 행) — 인터뷰 입력.
 *  - P-09 Ⅲ-2-가 문제 도출 (표) — 인터뷰 입력.
 *  - P-10 Ⅲ-2-나 문제 우선순위 (표 + method 박스) — 인터뷰 입력.
 *  - P-11 Ⅲ-3-가 훈련대상 업무 선정 (표) — 인터뷰 입력.
 *  - P-12 Ⅲ-3-나 필요성 (박스) — 인터뷰 입력. DRAFT 인라인 편집.
 *  - P-13 Ⅲ-3-다 세부내용 (동적 행 표) — 인터뷰 입력.
 *  - P-14 Ⅲ-4-가 현재 AI 역량 — AiLevel4Check readOnly.
 *  - P-15 Ⅲ-4-나 예상 AI 역량 — AiLevel4Check readOnly.
 */
export function TabPBLTasks({ interview, readOnly, onEdit }: TabPBLCommonProps) {
  const activities = interview?.activities ?? [];
  const problems = interview?.problems ?? [];
  const priority = interview?.priority;
  const target = interview?.target;
  const currentAiLevel = interview?.currentAiLevel ?? { level: 'BASIC' as const, note: '' };
  const expectedAiLevel = interview?.expectedAiLevel ?? { level: 'USER' as const, note: '' };

  return (
    <div className="space-y-6">
      {/* Ⅲ-1 훈련과제 도출 수행활동 */}
      <SectionCard
        title="Ⅲ-1. 훈련과제 도출 수행활동"
        description="차수별 일시·내용·방법·참석자 (인터뷰 입력, 읽기 전용)"
      >
        {activities.length > 0 ? (
          <div className="overflow-x-auto">
            <FormTable
              caption="수행활동"
              headerRows={[
                {
                  cells: [
                    { content: '차수', header: true },
                    { content: '일자', header: true },
                    { content: '수행 내용', header: true },
                    { content: '수행 방법', header: true },
                    { content: '참석자', header: true },
                  ],
                },
              ]}
              bodyRows={activities.map((a) => ({
                cells: [
                  { content: `${a.round}차`, align: 'center' },
                  { content: a.date || '-', align: 'center' },
                  {
                    content: (
                      <span className="whitespace-pre-wrap text-sm">
                        {a.content || '-'}
                      </span>
                    ),
                    align: 'left',
                  },
                  { content: a.method || '-', align: 'left' },
                  {
                    content: (
                      <span className="whitespace-pre-wrap text-sm">
                        {(() => {
                          // PR #5 Phase F-4: participants 는 4 person dict.
                          // 빈 역할은 제외하고 "PM 홍길동 / 외부 김전문" 형태로 표시.
                          const p = a.participants;
                          if (!p) return '-';
                          if (typeof p === 'string') return p || '-';
                          const parts: string[] = [];
                          if (p.pm) parts.push(`PM ${p.pm}`);
                          if (p.external_expert)
                            parts.push(`외부 ${p.external_expert}`);
                          if (p.internal_expert)
                            parts.push(`내부 ${p.internal_expert}`);
                          if (p.jurisdiction_manager)
                            parts.push(`주치의 ${p.jurisdiction_manager}`);
                          return parts.length > 0 ? parts.join(' · ') : '-';
                        })()}
                      </span>
                    ),
                    align: 'left',
                  },
                ],
              }))}
            />
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            등록된 수행활동이 없습니다. 인터뷰에서 입력하세요.
          </p>
        )}
      </SectionCard>

      {/* Ⅲ-2-가 문제 도출 */}
      <SectionCard
        title="Ⅲ-2-가. 문제 도출"
        description="문제명 · 설명 · 영향 (인터뷰 입력)"
      >
        {problems.length > 0 ? (
          <div className="overflow-x-auto">
            <FormTable
              caption="문제 도출"
              headerRows={[
                {
                  cells: [
                    { content: '문제명', header: true, className: 'w-[200px]' },
                    { content: '문제 설명', header: true },
                    { content: '영향(임팩트)', header: true },
                  ],
                },
              ]}
              bodyRows={problems.map((p) => ({
                cells: [
                  { content: p.title || '-', align: 'left' },
                  {
                    content: (
                      <span className="whitespace-pre-wrap text-sm">
                        {p.description || '-'}
                      </span>
                    ),
                    align: 'left',
                  },
                  {
                    content: (
                      <span className="whitespace-pre-wrap text-sm">
                        {p.impact || '-'}
                      </span>
                    ),
                    align: 'left',
                  },
                ],
              }))}
            />
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            등록된 문제가 없습니다.
          </p>
        )}
      </SectionCard>

      {/* Ⅲ-2-나 문제 우선순위 결정 */}
      <SectionCard
        title="Ⅲ-2-나. 문제 우선순위 결정"
        description="문제별 점수·순위 + 우선순위 결정 방법 (AHP · 협의 등)"
      >
        {priority?.items && priority.items.length > 0 ? (
          <div className="overflow-x-auto">
            <FormTable
              caption="문제 우선순위"
              headerRows={[
                {
                  cells: [
                    { content: '문제명', header: true },
                    { content: '점수 (1~5)', header: true },
                    { content: '순위', header: true },
                  ],
                },
              ]}
              bodyRows={priority.items.map((p) => ({
                cells: [
                  { content: p.problem || '-', align: 'left' },
                  { content: String(p.score ?? '-'), align: 'center' },
                  { content: String(p.rank ?? '-'), align: 'center' },
                ],
              }))}
            />
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            등록된 우선순위 항목이 없습니다.
          </p>
        )}

        <div>
          <p className="mb-2 text-sm font-medium text-muted-foreground">
            우선순위 결정 방법
          </p>
          <InlineEditField
            value={priority?.method ?? ''}
            onSave={async (next) => {
              await onEdit({ priority: { method: next } });
            }}
            readOnly={readOnly}
            multiline
            placeholder="우선순위 결정 방법(AHP · 협의 등)이 입력되지 않았습니다."
          />
        </div>
      </SectionCard>

      {/* Ⅲ-3-가 훈련대상 업무 선정 */}
      <SectionCard
        title="Ⅲ-3-가. 훈련대상 업무 선정"
        description="업무명 · NCS 코드 · 업무 범위 (인터뷰 입력)"
      >
        <FormTable
          caption="훈련대상 업무 선정"
          bodyRows={[
            {
              cells: [
                { content: '업무명', header: true, className: 'w-[160px]' },
                {
                  content: (
                    <InlineEditField
                      value={target?.name ?? ''}
                      onSave={async (next) => {
                        await onEdit({ target: { name: next } });
                      }}
                      readOnly={readOnly}
                      placeholder="훈련대상 업무명이 입력되지 않았습니다."
                    />
                  ),
                  align: 'left',
                },
              ],
            },
            {
              cells: [
                { content: 'NCS 코드', header: true },
                {
                  content: (
                    <InlineEditField
                      value={target?.code ?? ''}
                      onSave={async (next) => {
                        await onEdit({ target: { code: next } });
                      }}
                      readOnly={readOnly}
                      placeholder="(선택) NCS 코드"
                    />
                  ),
                  align: 'left',
                },
              ],
            },
            {
              cells: [
                { content: '업무 범위', header: true },
                {
                  content: (
                    <InlineEditField
                      value={target?.scope ?? ''}
                      onSave={async (next) => {
                        await onEdit({ target: { scope: next } });
                      }}
                      readOnly={readOnly}
                      multiline
                      placeholder="부서·인원 등 업무 범위가 입력되지 않았습니다."
                    />
                  ),
                  align: 'left',
                },
              ],
            },
          ]}
        />
      </SectionCard>

      {/* Ⅲ-3-나 필요성 */}
      <SectionCard
        title="Ⅲ-3-나. AI기반 문제해결 필요성 (선정 사유)"
        description="인터뷰 입력 (DRAFT 인라인 편집)"
      >
        <InlineEditField
          value={target?.necessity ?? ''}
          onSave={async (next) => {
            await onEdit({ target: { necessity: next } });
          }}
          readOnly={readOnly}
          multiline
          placeholder="AI기반 문제해결 필요성(선정 사유)이 입력되지 않았습니다."
        />
      </SectionCard>

      {/* Ⅲ-3-다 세부내용 */}
      <SectionCard
        title="Ⅲ-3-다. 훈련대상 업무 세부내용"
        description="제목·설명 동적 행 (인터뷰 입력, 읽기 전용)"
      >
        {target?.details && target.details.length > 0 ? (
          <div className="overflow-x-auto">
            <FormTable
              caption="훈련대상 업무 세부내용"
              headerRows={[
                {
                  cells: [
                    { content: '제목', header: true, className: 'w-[200px]' },
                    { content: '설명', header: true },
                  ],
                },
              ]}
              bodyRows={target.details.map((d) => ({
                cells: [
                  { content: d.title || '-', align: 'left' },
                  {
                    content: (
                      <span className="whitespace-pre-wrap text-sm">
                        {d.description || '-'}
                      </span>
                    ),
                    align: 'left',
                  },
                ],
              }))}
            />
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            등록된 세부내용이 없습니다.
          </p>
        )}
      </SectionCard>

      {/* Ⅲ-4-가 현재 AI 역량 수준 */}
      <SectionCard
        title="Ⅲ-4-가. 현재 AI 역량 수준"
        description="4등급(AI기초형/AI탐구형/AI활용형/AI선도형) 택1 + 선택 근거"
      >
        <AiLevel4Check
          value={currentAiLevel}
          onChange={() => {
            /* 결과 화면은 readOnly — 인터뷰에서만 수정 */
          }}
          ariaLabel="현재 AI 역량 수준"
          readOnly
        />
      </SectionCard>

      {/* Ⅲ-4-나 예상 AI 역량 수준 */}
      <SectionCard
        title="Ⅲ-4-나. 예상 AI 역량 수준"
        description="훈련 후 도달 예상 등급 + 선택 근거"
      >
        <AiLevel4Check
          value={expectedAiLevel}
          onChange={() => {
            /* 결과 화면은 readOnly — 인터뷰에서만 수정 */
          }}
          ariaLabel="예상 AI 역량 수준"
          readOnly
        />
      </SectionCard>
    </div>
  );
}
