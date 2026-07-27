'use client';

import { FormTable } from '@/components/forms/FormTable';
import { InlineEditField } from '@/components/result/InlineEditField';
import { SectionCard } from '@/components/result/SectionCard';
import { Badge } from '@/components/ui/badge';
import { INTERVIEW_METHOD_LABEL, type InterviewMethod } from '@/lib/schemas/interview-roadmap';
import type { PBLPerformanceActivity } from '@/lib/schemas/interview-pbl';

import type { TabPBLCommonProps } from './types';

/** 정본 Ⅲ-1(T19) 참석자 4역할 — 라벨은 양식 그대로 */
const PARTICIPANT_ROLES = [
  { key: 'pm', label: '컨설팅책임자(PM)' },
  { key: 'external_expert', label: '외부전문가(직무,HRD)' },
  { key: 'internal_expert', label: '기업내부전문가' },
  { key: 'jurisdiction_manager', label: '능력개발전담주치의' },
] as const satisfies ReadonlyArray<{
  key: keyof PBLPerformanceActivity['participants'];
  label: string;
}>;

/** 수행 방법 코드(ONSITE 등) → 양식 한글 라벨. 이미 한글이면 그대로. */
function formatMethod(method: string): string {
  if (!method) return '-';
  return INTERVIEW_METHOD_LABEL[method as InterviewMethod] ?? method;
}

/**
 * Ⅲ. AI기반 훈련과제 도출 탭 — PBL 결과 V2.
 *
 * 섹션:
 *  - Ⅲ-1 훈련과제 도출 수행활동 — **PBL 자체 입력**(정본 4역할·수행 일자). 읽기 전용
 *    표출(편집은 인터뷰 페이지). ⚠️ 로드맵 Ⅰ-2 주요 활동과 **다른 표** — 연계 금지.
 *  - Ⅲ-2-가 문제 정의서 (4 정형 항목 단일 세트) — 인터뷰 입력. DRAFT 인라인 편집.
 *  - Ⅲ-3-가 훈련대상 업무 선정 — 선행 로드맵 과업 4열(읽기 전용) + PBL 2열
 *    (AI 도입·활용 필요도 · 훈련 선정)을 로드맵 과업 순서와 1:1 로 zip 하여 표출.
 *  - Ⅲ-3-나 AI기반 문제해결의 필요성 (선정 사유) — 인터뷰 입력. DRAFT 인라인 편집.
 *  - Ⅲ-3-다 훈련대상 업무 세부내용 (5 컬럼) — 인터뷰 입력. DRAFT 인라인 편집.
 *
 * V2 제거:
 *  - Ⅲ-2-나 문제 우선순위 · Ⅲ-4 AI역량 수준 진단 — 양식에서 삭제
 *    (AI역량은 로드맵 연동으로만 표출).
 */
export function TabPBLTasks({ interview, linkedRoadmap, readOnly, onEdit }: TabPBLCommonProps) {
  // Ⅲ-1 수행활동 — PBL 자체 입력. 로드맵 활동(linkedRoadmap.performanceActivities)을
  // 폴백으로 쓰지 않는다: 정본 표가 4역할·수행 일자로 로드맵과 다르고, PBL 인터뷰는
  // 로드맵 인터뷰와 별도 일정이라 로드맵 값을 쓰면 날짜가 틀린다.
  const performanceActivities = interview?.performanceActivities ?? [];
  // R8 PBL-자체-04 — 4 정형 항목 단일 세트 (배경/핵심/범위/제약)
  const problemDefinitionSheet = interview?.problemDefinitionSheet ?? {
    background: '',
    core: '',
    scope: '',
    constraints: '',
  };
  const target = interview?.target;
  const taskSelections = target?.taskSelections ?? [];
  // Ⅲ-3-가 4열 — 선행 로드맵 과업 분석표(읽기 전용). 미연계 시 빈 배열.
  const roadmapTasks = linkedRoadmap?.taskAnalysis ?? [];

  async function patchProblemDefinition(
    key: keyof typeof problemDefinitionSheet,
    value: string
  ): Promise<void> {
    await onEdit({ problemDefinitionSheet: { [key]: value } });
  }

  return (
    <div className="space-y-6">
      {/* Ⅲ-1 훈련과제 도출 수행활동 (PBL 자체 입력 — 차수당 참석자 4역할) */}
      <SectionCard
        title="Ⅲ-1. 훈련과제 도출 수행활동"
        description="PBL 과정 개발 수행 차수별 일자·내용·방법과 참석자 4역할 (인터뷰 입력값, 읽기 전용)"
        dataSource="user"
      >
        {performanceActivities.length > 0 ? (
          <div className="overflow-x-auto">
            <FormTable
              caption="훈련과제 도출 수행활동"
              headerRows={[
                {
                  cells: [
                    { content: '수행 차수', header: true },
                    { content: '수행 일자', header: true },
                    { content: '수행 내용', header: true },
                    { content: '수행 방법', header: true },
                    { content: '참석자', header: true },
                    { content: '성명', header: true },
                  ],
                },
              ]}
              bodyRows={performanceActivities.flatMap((activity) =>
                PARTICIPANT_ROLES.map((role, roleIdx) => ({
                  cells: [
                    // 차수·일자·내용·방법은 첫 역할 행에만 표기 (정본 rowspan 표현)
                    {
                      content: roleIdx === 0 ? `${activity.round}차` : '',
                      align: 'center' as const,
                    },
                    {
                      content: roleIdx === 0 ? activity.date || '-' : '',
                      align: 'center' as const,
                    },
                    {
                      content:
                        roleIdx === 0 ? (
                          <span className="whitespace-pre-wrap text-sm">
                            {activity.content || '-'}
                          </span>
                        ) : (
                          ''
                        ),
                      align: 'left' as const,
                    },
                    {
                      content: roleIdx === 0 ? formatMethod(activity.method) : '',
                      align: 'center' as const,
                    },
                    { content: role.label, header: true, align: 'left' as const },
                    {
                      content: activity.participants?.[role.key] || '-',
                      align: 'center' as const,
                    },
                  ],
                }))
              )}
            />
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            등록된 수행활동이 없습니다. 인터뷰 페이지 Ⅲ-1 에서 입력하세요.
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

      {/* Ⅲ-3-가 훈련대상 업무 선정 (양식 6열 = 로드맵 4열 자동 연동 + PBL 2열 입력) */}
      <SectionCard
        title="Ⅲ-3-가. 훈련대상 업무 선정"
        description="선행 로드맵 과업 분석표(직무·과업·현행·개선점, 읽기 전용) + PBL 입력(AI도입·활용 필요도·훈련 선정)"
        dataSource="mixed"
      >
        {roadmapTasks.length > 0 ? (
          <div className="overflow-x-auto">
            <FormTable
              caption="훈련대상 과업 선정 (로드맵 과업 연동)"
              headerRows={[
                {
                  cells: [
                    { content: '직무', header: true, className: 'w-[110px]' },
                    { content: '과업(Task)', header: true, className: 'w-[140px]' },
                    { content: '현행 방식', header: true },
                    { content: '개선점 및 AI 적용 가능성', header: true },
                    { content: 'AI도입·활용 필요도', header: true, className: 'w-[180px]' },
                    { content: '훈련 선정', header: true, className: 'w-[90px]' },
                  ],
                },
              ]}
              bodyRows={roadmapTasks.map((t, idx) => {
                const sel = taskSelections[idx];
                return {
                  cells: [
                    { content: t.domain || '-', align: 'left' },
                    { content: t.task || '-', align: 'left' },
                    {
                      content: <span className="whitespace-pre-wrap text-sm">{t.asIs || '-'}</span>,
                      align: 'left',
                    },
                    {
                      content: (
                        <span className="whitespace-pre-wrap text-sm">{t.improvement || '-'}</span>
                      ),
                      align: 'left',
                    },
                    {
                      content: (
                        <span className="whitespace-pre-wrap text-sm">
                          {sel?.ai_necessity || '-'}
                        </span>
                      ),
                      align: 'left',
                    },
                    {
                      content: (
                        <Badge variant={sel?.training_selected ? 'default' : 'secondary'}>
                          {sel?.training_selected ? '선정' : '미선정'}
                        </Badge>
                      ),
                      align: 'center',
                    },
                  ],
                };
              })}
            />
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            선행 로드맵 과업이 연결되지 않았습니다. Ⅱ장 상단 안내에 따라 운영관리자에게 로드맵
            연결을 요청하세요.
          </p>
        )}
      </SectionCard>

      {/* Ⅲ-3-나 필요성 (선정 사유) */}
      <SectionCard
        title="Ⅲ-3-나. AI기반 문제해결의 필요성 (선정 사유)"
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
          placeholder="AI기반 문제해결의 필요성(선정 사유)이 입력되지 않았습니다."
        />
      </SectionCard>

      {/* Ⅲ-3-다 세부내용 (양식 4×5 의 5 컬럼 1:1 정합) */}
      <SectionCard
        title="Ⅲ-3-다. 훈련대상 업무 세부내용"
        description="업무명 / AS-IS / TO-BE / 요구지식 / 기술 5 컬럼 (인터뷰 입력)"
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
                  const draft = (target.details ?? []).map((row, i) =>
                    i === idx ? { ...row, ...next } : row
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
          <p className="text-sm text-muted-foreground">등록된 세부내용이 없습니다.</p>
        )}
      </SectionCard>
    </div>
  );
}
