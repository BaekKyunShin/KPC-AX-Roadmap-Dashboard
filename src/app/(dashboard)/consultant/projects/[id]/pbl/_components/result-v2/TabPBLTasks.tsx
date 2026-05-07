'use client';

import { AiLevel4Check } from '@/components/charts/AiLevel4Check';
import { FormTable } from '@/components/forms/FormTable';
import { InlineEditField } from '@/components/result/InlineEditField';
import { SectionCard } from '@/components/result/SectionCard';
import { PBL_ACTIVITY_ROLE_LABEL } from '@/lib/schemas/interview-pbl';

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
  // R8 PBL-자체-04 — 4 정형 항목 단일 세트 (배경/핵심/범위/제약)
  const problemDefinitionSheet = interview?.problemDefinitionSheet ?? {
    background: '',
    core: '',
    scope: '',
    constraints: '',
  };
  const priority = interview?.priority;
  const target = interview?.target;
  const currentAiLevel = interview?.currentAiLevel ?? { level: 'BASIC' as const, note: '' };
  const expectedAiLevel = interview?.expectedAiLevel ?? { level: 'USER' as const, note: '' };

  async function patchProblemDefinition(
    key: keyof typeof problemDefinitionSheet,
    value: string,
  ): Promise<void> {
    await onEdit({ problemDefinitionSheet: { [key]: value } });
  }

  return (
    <div className="space-y-6">
      {/* Ⅲ-1 훈련과제 도출 수행활동 (R8 PBL-자체-03 — 차수×4 역할 평면 4행) */}
      <SectionCard
        title="Ⅲ-1. 훈련과제 도출 수행활동"
        description="양식 13×6 정형 — 차수×4 역할(PM·외부전문가·기업내부전문가·능력개발전담주치의)별 일자·내용·방법 (인터뷰 입력, 읽기 전용)"
        dataSource="user"
      >
        {activities.length > 0 ? (
          <div className="overflow-x-auto">
            <FormTable
              caption="수행활동"
              headerRows={[
                {
                  cells: [
                    { content: '차수', header: true, className: 'w-[60px]' },
                    { content: '역할', header: true, className: 'w-[140px]' },
                    { content: '성명', header: true, className: 'w-[100px]' },
                    { content: '일자', header: true, className: 'w-[110px]' },
                    { content: '수행 내용', header: true },
                    { content: '수행 방법', header: true },
                  ],
                },
              ]}
              bodyRows={activities.map((a, idx) => ({
                cells: [
                  { content: `${a.round}차`, align: 'center' },
                  { content: PBL_ACTIVITY_ROLE_LABEL[a.role], align: 'center' },
                  { content: a.personName || '-', align: 'center' },
                  { content: a.date || '-', align: 'center' },
                  {
                    content: (
                      <InlineEditField
                        value={a.content ?? ''}
                        onSave={async (next) => {
                          const draft = activities.map((row, i) =>
                            i === idx ? { ...row, content: next } : row,
                          );
                          await onEdit({ activities: draft });
                        }}
                        readOnly={readOnly}
                        multiline
                        placeholder="수행 내용이 입력되지 않았습니다."
                      />
                    ),
                    align: 'left',
                  },
                  { content: a.method || '-', align: 'left' },
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

      {/* Ⅲ-2-가 문제 정의서 (R8 PBL-자체-04 — 4 정형 항목 단일 세트) */}
      <SectionCard
        title="Ⅲ-2-가. 문제 정의서"
        description="양식 5×2 표 정합 — 4 정형 항목(문제 배경 / 핵심 문제 / 문제 범위 / 제약 조건)"
        dataSource="user"
      >
        <FormTable
          caption="문제 정의서"
          headerRows={[
            {
              cells: [
                { content: '구분', header: true, className: 'w-[160px]' },
                { content: '내용', header: true },
              ],
            },
          ]}
          bodyRows={[
            {
              cells: [
                { content: '문제 배경', header: true, align: 'center' },
                {
                  content: (
                    <InlineEditField
                      value={problemDefinitionSheet.background}
                      onSave={(next) => patchProblemDefinition('background', next)}
                      readOnly={readOnly}
                      multiline
                      placeholder="문제 배경이 입력되지 않았습니다."
                    />
                  ),
                  align: 'left',
                },
              ],
            },
            {
              cells: [
                { content: '핵심 문제', header: true, align: 'center' },
                {
                  content: (
                    <InlineEditField
                      value={problemDefinitionSheet.core}
                      onSave={(next) => patchProblemDefinition('core', next)}
                      readOnly={readOnly}
                      multiline
                      placeholder="핵심 문제가 입력되지 않았습니다."
                    />
                  ),
                  align: 'left',
                },
              ],
            },
            {
              cells: [
                { content: '문제 범위', header: true, align: 'center' },
                {
                  content: (
                    <InlineEditField
                      value={problemDefinitionSheet.scope}
                      onSave={(next) => patchProblemDefinition('scope', next)}
                      readOnly={readOnly}
                      multiline
                      placeholder="문제 범위가 입력되지 않았습니다."
                    />
                  ),
                  align: 'left',
                },
              ],
            },
            {
              cells: [
                { content: '제약 조건', header: true, align: 'center' },
                {
                  content: (
                    <InlineEditField
                      value={problemDefinitionSheet.constraints}
                      onSave={(next) => patchProblemDefinition('constraints', next)}
                      readOnly={readOnly}
                      multiline
                      placeholder="제약 조건이 입력되지 않았습니다."
                    />
                  ),
                  align: 'left',
                },
              ],
            },
          ]}
        />
      </SectionCard>

      {/* Ⅲ-2-나 문제 우선순위 결정 */}
      <SectionCard
        title="Ⅲ-2-나. 문제 우선순위 결정"
        description="문제별 점수·순위 + 우선순위 결정 방법 (AHP · 협의 등)"
        dataSource="user"
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
        dataSource="user"
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
        dataSource="user"
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

      {/* Ⅲ-3-다 세부내용 (V2 PR #7: 양식 4×5 의 5 컬럼 1:1 정합) */}
      <SectionCard
        title="Ⅲ-3-다. 훈련대상 업무 세부내용"
        description="업무명 / AS-IS / TO-BE / 요구지식 / 기술 5 컬럼 (인터뷰 입력, 읽기 전용)"
        dataSource="user"
      >
        {target?.details && target.details.length > 0 ? (
          <div className="overflow-x-auto">
            <FormTable
              caption="훈련대상 업무 세부내용"
              headerRows={[
                {
                  cells: [
                    { content: '업무명', header: true, className: 'w-[160px]' },
                    { content: '현재 업무방식 (AS-IS)', header: true },
                    { content: 'AI활용방식 (TO-BE)', header: true },
                    { content: '요구지식', header: true },
                    { content: '기술', header: true },
                  ],
                },
              ]}
              bodyRows={target.details.map((d, idx) => {
                const patchDetail = async (next: Partial<typeof d>) => {
                  const draft = target.details.map((row, i) =>
                    i === idx ? { ...row, ...next } : row,
                  );
                  await onEdit({ target: { details: draft } });
                };
                return {
                  cells: [
                    { content: d.title || '-', align: 'left' },
                    {
                      content: (
                        <InlineEditField
                          value={d.as_is ?? ''}
                          onSave={async (next) => {
                            await patchDetail({ as_is: next });
                          }}
                          readOnly={readOnly}
                          multiline
                          placeholder="현재 업무방식 (AS-IS) 미입력"
                        />
                      ),
                      align: 'left',
                    },
                    {
                      content: (
                        <InlineEditField
                          value={d.to_be ?? ''}
                          onSave={async (next) => {
                            await patchDetail({ to_be: next });
                          }}
                          readOnly={readOnly}
                          multiline
                          placeholder="AI활용방식 (TO-BE) 미입력"
                        />
                      ),
                      align: 'left',
                    },
                    {
                      content: (
                        <InlineEditField
                          value={d.required_knowledge ?? ''}
                          onSave={async (next) => {
                            await patchDetail({ required_knowledge: next });
                          }}
                          readOnly={readOnly}
                          multiline
                          placeholder="요구지식 미입력"
                        />
                      ),
                      align: 'left',
                    },
                    {
                      content: (
                        <InlineEditField
                          value={d.required_skill ?? ''}
                          onSave={async (next) => {
                            await patchDetail({ required_skill: next });
                          }}
                          readOnly={readOnly}
                          multiline
                          placeholder="기술 미입력"
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
          <p className="text-sm text-muted-foreground">
            등록된 세부내용이 없습니다.
          </p>
        )}
      </SectionCard>

      {/* Ⅲ-4-가 현재 AI 역량 수준 */}
      <SectionCard
        title="Ⅲ-4-가. 현재 AI 역량 수준"
        description="4등급(AI기초형/AI탐구형/AI활용형/AI선도형) 택1 + 선택 근거"
        dataSource="user"
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
        dataSource="user"
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
