'use client';

import { SectionCard } from '@/components/result/SectionCard';
import { InlineEditField } from '@/components/result/InlineEditField';
import { FormTable } from '@/components/forms/FormTable';
import { AI_COMPETENCY_LEVEL_LABEL, AI_COMPETENCY_LEVEL_SUBTITLE } from '@/lib/schemas/interview-roadmap';

import type { TabCommonProps } from './types';

/**
 * Ⅰ. 개요 탭 — 로드맵 결과 V2.
 *
 * 섹션:
 *  - Ⅰ-1 수립 필요성 (인터뷰 입력, DRAFT 편집 가능)
 *  - Ⅰ-2 주요 활동 (인터뷰 입력, 표 readonly 렌더 — 활동 편집은 인터뷰 페이지에서만)
 *  - Ⅰ-3 주요 결과 (AI 역량 수준 + 선정 과업 + LLM 요약 main_content, 요약만 DRAFT 편집)
 *
 * 제외:
 *  - [고정 참고자료] "AI역량 수준별 훈련내용 예시" — 렌더 금지 (양식 기준)
 *  - [결과물 표지] 양식 첫 페이지 표지 — 렌더 금지
 *
 * 편집 전략: Ⅰ-1 setup_necessity / Ⅰ-3 main_content 만 인라인 편집.
 *   활동 표·역량수준·선정과업은 인터뷰 페이지에서만 수정 가능 (읽기 전용).
 */
export function TabOverview({
  version,
  interview,
  readOnly,
  onEdit,
}: TabCommonProps) {
  const necessity = version?.setup_necessity ?? interview?.establishmentNecessity ?? '';
  const activities = interview?.performanceActivities ?? [];

  const aiLevel =
    version?.outcome_summary?.ai_competency_level ?? interview?.aiLevel ?? 'BEGINNER';
  const selectedTask =
    version?.outcome_summary?.selected_tasks ?? interview?.selectedTask ?? '';
  const mainContent = version?.outcome_summary?.main_content ?? '';

  return (
    <div className="space-y-6">
      {/* Ⅰ-1 수립 필요성 */}
      <SectionCard
        title="Ⅰ-1. 수립 필요성"
        description="인터뷰 입력값 — 5줄 내외 자유 서술"
      >
        <InlineEditField
          value={necessity}
          onSave={async (next) => {
            await onEdit({ setup_necessity: next });
          }}
          readOnly={readOnly}
          multiline
          placeholder="수립 필요성이 입력되지 않았습니다."
        />
      </SectionCard>

      {/* Ⅰ-2 주요 활동 */}
      <SectionCard
        title="Ⅰ-2. 주요 활동"
        description="컨설팅 수행 차수별 일시·내용·방법과 참석자 (인터뷰 입력값, 읽기 전용)"
      >
        {activities.length > 0 ? (
          <div className="overflow-x-auto">
            <FormTable
              caption="주요 활동"
              headerRows={[
                {
                  cells: [
                    { content: '수행 차수', header: true },
                    { content: '수행 일시', header: true },
                    { content: '수행 내용', header: true },
                    { content: '수행 방법', header: true },
                    { content: 'PM', header: true },
                    { content: '내부전문가', header: true },
                  ],
                },
              ]}
              bodyRows={activities.map((a) => ({
                cells: [
                  { content: `${a.round}차`, align: 'center' },
                  {
                    content: (
                      <span className="whitespace-pre-wrap text-sm">
                        {[a.date, a.timeRange].filter(Boolean).join('\n') || '-'}
                      </span>
                    ),
                  },
                  {
                    content: (
                      <span className="whitespace-pre-wrap text-sm">
                        {a.content || '-'}
                      </span>
                    ),
                    align: 'left',
                  },
                  { content: a.method || '-', align: 'center' },
                  { content: a.pmName || '-', align: 'center' },
                  { content: a.expertName || '-', align: 'center' },
                ],
              }))}
            />
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            등록된 주요 활동이 없습니다. 인터뷰 페이지에서 입력하세요.
          </p>
        )}
      </SectionCard>

      {/* Ⅰ-3 수립 주요 결과 — 양식 정합 (3행 표) */}
      <SectionCard
        title="Ⅰ-3. 수립 주요 결과"
        description="뒤쪽에서 작성된 훈련요구 분석 및 로드맵 수립 결과를 한 번에 확인할 수 있도록 1장 이내로 요약 — LLM 자동 생성, 직접 수정 가능"
      >
        <div className="overflow-x-auto">
          <FormTable
            caption="수립 주요 결과"
            bodyRows={[
              {
                cells: [
                  {
                    content: '기업 AI 역량 수준',
                    header: true,
                    align: 'left',
                    className: 'w-[200px]',
                  },
                  {
                    content: (
                      <span className="inline-flex items-center gap-2 rounded bg-muted px-2 py-1 text-sm">
                        <span className="font-semibold">
                          {AI_COMPETENCY_LEVEL_LABEL[aiLevel]}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          ({AI_COMPETENCY_LEVEL_SUBTITLE[aiLevel]})
                        </span>
                      </span>
                    ),
                    align: 'left',
                  },
                ],
              },
              {
                cells: [
                  {
                    content: '선정 과업',
                    header: true,
                    align: 'left',
                  },
                  {
                    content: (
                      <span className="whitespace-pre-wrap text-sm">
                        {selectedTask || '-'}
                      </span>
                    ),
                    align: 'left',
                  },
                ],
              },
              {
                cells: [
                  {
                    content: 'AI훈련로드맵 수립 주요내용 (요약)',
                    header: true,
                    align: 'left',
                  },
                  {
                    content: (
                      <InlineEditField
                        value={mainContent}
                        onSave={async (next) => {
                          await onEdit({ main_content: next });
                        }}
                        readOnly={readOnly}
                        multiline
                        placeholder="수립 주요내용 요약 (LLM 생성)"
                      />
                    ),
                    align: 'left',
                  },
                ],
              },
            ]}
          />
        </div>
      </SectionCard>
    </div>
  );
}
