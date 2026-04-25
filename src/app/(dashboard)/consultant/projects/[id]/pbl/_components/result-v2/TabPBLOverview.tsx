'use client';

import { FormTable } from '@/components/forms/FormTable';
import { InlineEditField } from '@/components/result/InlineEditField';
import { SectionCard } from '@/components/result/SectionCard';

import type { TabPBLCommonProps } from './types';

/**
 * Ⅰ. 개요 탭 — PBL 결과 V2.
 *
 * 섹션:
 *  - P-02 훈련과정 개요 (기업명 · 훈련과정명 · NCS · 시간 · 대상 · 형태 · 기간 · 사업 이슈)
 *    → 인터뷰 입력값. 읽기 전용 + DRAFT 인라인 편집.
 *
 * 제외:
 *  - [결과물 표지] 양식 첫 페이지 표지 — 렌더 금지
 *  - [고정 참고자료] — 렌더 금지
 */
export function TabPBLOverview({
  interview,
  readOnly,
  onEdit,
}: TabPBLCommonProps) {
  const overview = interview?.overview;

  async function patchOverview(key: string, value: string): Promise<void> {
    await onEdit({ overview: { [key]: value } });
  }

  async function patchTrainingHours(value: string): Promise<void> {
    const parsed = Number.parseInt(value, 10);
    if (!Number.isFinite(parsed) || parsed <= 0) return;
    await onEdit({ overview: { trainingHours: parsed } });
  }

  return (
    <div className="space-y-6">
      <SectionCard
        title="Ⅰ. 훈련과정 개요"
        description="기업명 · 훈련과정명 · NCS · 시간 · 대상 · 형태 · 기간 · 경영 이슈 (인터뷰 입력값)"
      >
        <FormTable
          caption="훈련과정 개요"
          bodyRows={[
            {
              cells: [
                { content: '기업명', header: true, className: 'w-[160px]' },
                {
                  content: (
                    <InlineEditField
                      value={overview?.companyName ?? ''}
                      onSave={(next) => patchOverview('companyName', next)}
                      readOnly={readOnly}
                      placeholder="기업명이 입력되지 않았습니다."
                    />
                  ),
                  align: 'left',
                },
              ],
            },
            {
              cells: [
                { content: '훈련과정명', header: true },
                {
                  content: (
                    <InlineEditField
                      value={overview?.courseName ?? ''}
                      onSave={(next) => patchOverview('courseName', next)}
                      readOnly={readOnly}
                      placeholder="훈련과정명이 입력되지 않았습니다."
                    />
                  ),
                  align: 'left',
                },
              ],
            },
            {
              cells: [
                { content: 'NCS 분류', header: true },
                {
                  content: (
                    <InlineEditField
                      value={overview?.ncsCode ?? ''}
                      onSave={(next) => patchOverview('ncsCode', next)}
                      readOnly={readOnly}
                      placeholder="예: 200107 인공지능"
                    />
                  ),
                  align: 'left',
                },
              ],
            },
            {
              cells: [
                { content: '훈련시간', header: true },
                {
                  content: (
                    <InlineEditField
                      value={
                        overview?.trainingHours != null
                          ? String(overview.trainingHours)
                          : ''
                      }
                      onSave={patchTrainingHours}
                      readOnly={readOnly}
                      placeholder="시간(정수)"
                    />
                  ),
                  align: 'left',
                },
              ],
            },
            {
              cells: [
                { content: '훈련대상', header: true },
                {
                  content: (
                    <InlineEditField
                      value={overview?.trainingTarget ?? ''}
                      onSave={(next) => patchOverview('trainingTarget', next)}
                      readOnly={readOnly}
                      placeholder="훈련대상이 입력되지 않았습니다."
                    />
                  ),
                  align: 'left',
                },
              ],
            },
            {
              cells: [
                { content: '훈련형태', header: true },
                {
                  content: (
                    <InlineEditField
                      value={overview?.trainingForm ?? ''}
                      onSave={(next) => patchOverview('trainingForm', next)}
                      readOnly={readOnly}
                      placeholder="훈련형태가 입력되지 않았습니다."
                    />
                  ),
                  align: 'left',
                },
              ],
            },
            {
              cells: [
                { content: '훈련기간', header: true },
                {
                  content: (
                    <InlineEditField
                      value={overview?.trainingPeriod ?? ''}
                      onSave={(next) => patchOverview('trainingPeriod', next)}
                      readOnly={readOnly}
                      placeholder="훈련기간이 입력되지 않았습니다."
                    />
                  ),
                  align: 'left',
                },
              ],
            },
            {
              cells: [
                { content: '사업 쟁점 (경영 이슈)', header: true },
                {
                  content: (
                    <InlineEditField
                      value={overview?.businessIssues ?? ''}
                      onSave={(next) => patchOverview('businessIssues', next)}
                      readOnly={readOnly}
                      multiline
                      placeholder="사업 쟁점(경영 이슈 요약)이 입력되지 않았습니다."
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
