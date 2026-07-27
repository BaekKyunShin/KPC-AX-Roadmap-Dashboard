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
/** 빈 값('—' 표시)을 안전하게 그릴 수 있도록 변환. */
function displayOrDash(value: string | undefined | null): string {
  if (value == null) return '—';
  const trimmed = String(value).trim();
  return trimmed.length === 0 ? '—' : trimmed;
}

/** 신청서 자동표출 7필드가 모두 비어있는지 평가. 안내 배너 표출 결정에 사용. */
function isAllAutoFieldsEmpty(meta?: import('./types').PBLProjectMetaSnapshot): boolean {
  if (!meta) return true;
  const fields = [
    meta.businessRegNo,
    meta.industry,
    meta.industryCode,
    meta.companyAddress,
    meta.trainingAddress,
    meta.jurisdictionBranch,
    meta.contactName,
    meta.contactPosition,
    meta.contactPhone,
    meta.contactEmail,
  ];
  return fields.every((v) => !v || String(v).trim().length === 0);
}

export function TabPBLOverview({ interview, projectMeta, readOnly, onEdit }: TabPBLCommonProps) {
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
      {/* PBL 양식 Ⅰ. 신청서 자동표출 영역 — 사용자 수정 불가 (양식 안내) */}
      <SectionCard
        title="신청서 자동표출 정보"
        description="(기업명 · 사업장관리번호 · 업종 · 업종코드 · 주소 · 훈련실시주소 · 관할 지부 · 담당자) 신청서 기준으로 자동 불러옴 처리되며, 본 결과 페이지·HWPX 출력 시 그대로 노출됩니다 — 수정 불가."
        data-testid="pbl-overview-application-meta"
        dataSource="user"
      >
        {isAllAutoFieldsEmpty(projectMeta) ? (
          <p className="text-sm text-gray-500">
            프로젝트 메타에 입력된 신청서 자동표출 정보가 없습니다. 운영관리자에게 업데이트를
            요청하세요.
          </p>
        ) : (
          <FormTable
            caption="신청서 자동표출"
            bodyRows={[
              {
                cells: [
                  { content: '사업장관리번호', header: true, className: 'w-[160px]' },
                  { content: displayOrDash(projectMeta?.businessRegNo), align: 'left' },
                ],
              },
              {
                cells: [
                  { content: '주요 업종', header: true },
                  {
                    content: `${displayOrDash(projectMeta?.industry)}${
                      projectMeta?.industryCode ? ` (코드: ${projectMeta.industryCode})` : ''
                    }`,
                    align: 'left',
                  },
                ],
              },
              {
                cells: [
                  { content: '주소', header: true },
                  { content: displayOrDash(projectMeta?.companyAddress), align: 'left' },
                ],
              },
              {
                cells: [
                  { content: '훈련 실시 주소', header: true },
                  { content: displayOrDash(projectMeta?.trainingAddress), align: 'left' },
                ],
              },
              {
                cells: [
                  { content: '관할 지부·지사', header: true },
                  {
                    content: displayOrDash(projectMeta?.jurisdictionBranch),
                    align: 'left',
                  },
                ],
              },
              {
                cells: [
                  { content: '담당자 연락처', header: true },
                  {
                    content:
                      [
                        displayOrDash(projectMeta?.contactName),
                        projectMeta?.contactPosition ? `· ${projectMeta.contactPosition}` : '',
                        projectMeta?.contactPhone ? `· ${projectMeta.contactPhone}` : '',
                        projectMeta?.contactEmail ? `· ${projectMeta.contactEmail}` : '',
                      ]
                        .filter(
                          (v) => (v && v !== '—') || v === displayOrDash(projectMeta?.contactName)
                        )
                        .join(' ')
                        .trim() || '—',
                    align: 'left',
                  },
                ],
              },
            ]}
          />
        )}
      </SectionCard>

      <SectionCard
        title="Ⅰ. 훈련과정 개요"
        description="기업명 · 훈련과정명 · NCS · 시간 · 대상 · 형태 · 기간 · 경영 이슈 (인터뷰 입력값)"
        dataSource="user"
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
                      value={overview?.trainingHours != null ? String(overview.trainingHours) : ''}
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
                { content: '훈련생', header: true },
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
