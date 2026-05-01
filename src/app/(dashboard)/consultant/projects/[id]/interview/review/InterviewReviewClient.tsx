'use client';

import { useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';

import { PageContainer } from '@/components/layout/PageContainer';
import { PageHeader } from '@/components/ui/page-header';
import { InlineEditField } from '@/components/result/InlineEditField';
import { showErrorToast, showSuccessToast } from '@/lib/utils';

import type { RoadmapInterviewStrict } from '@/lib/schemas/interview-roadmap';
import type { PBLInterviewStrict } from '@/lib/schemas/interview-pbl';

import { editInterviewFieldRoadmap, editInterviewFieldPbl } from './actions';
import { StaleResultBanner } from './_components/StaleResultBanner';
import { ReviewActions } from './_components/ReviewActions';

/**
 * PR5 (R6 spec) §5.3 — 인터뷰 검토 페이지 Client.
 *
 * 모든 Step 데이터를 한 페이지에서 보여주고, 단일 텍스트 필드는 인라인 편집을
 * 허용한다 (`saveRoadmapInterviewV2(autoSave: true)` 위임 + `INTERVIEW_FIELD_EDITED`
 * 감사로그). 표 영역(performanceActivities / taskAnalysis / activities / problems)은
 * read-only 로 표시하고, 행 추가·삭제는 인터뷰 페이지에서 진행하도록 CTA 안내.
 */

interface ResultMeta {
  createdAt: string | null;
  status: 'DRAFT' | 'FINAL' | 'ARCHIVED' | null;
  versionId: string | null;
}

export interface InterviewReviewClientProps {
  projectId: string;
  track: 'ROADMAP' | 'PBL';
  /** track 별 camelCase Partial — fetchRoadmapInterviewV2 / fetchPBLInterviewV2 결과. */
  interviewData: Partial<RoadmapInterviewStrict> | Partial<PBLInterviewStrict>;
  /** interviews.updated_at — stale 배너 비교용. */
  interviewUpdatedAt: string | null;
  /** 최신 결과(version) 메타 — stale 배너 비교용. */
  latestResult: ResultMeta;
}

export function InterviewReviewClient({
  projectId,
  track,
  interviewData,
  interviewUpdatedAt,
  latestResult,
}: InterviewReviewClientProps) {
  return (
    <PageContainer>
      <PageHeader
        title={track === 'PBL' ? 'AI PBL 인터뷰 검토' : 'AI훈련로드맵 인터뷰 검토'}
        description="제출된 인터뷰 항목을 한 페이지에서 검토할 수 있습니다. 단일 텍스트 필드는 직접 수정 가능합니다."
      />

      <StaleResultBanner
        projectId={projectId}
        track={track}
        interviewUpdatedAt={interviewUpdatedAt}
        resultCreatedAt={latestResult.createdAt}
      />

      {track === 'ROADMAP' ? (
        <ReviewSectionRoadmap
          projectId={projectId}
          data={interviewData as Partial<RoadmapInterviewStrict>}
        />
      ) : (
        <ReviewSectionPbl
          projectId={projectId}
          data={interviewData as Partial<PBLInterviewStrict>}
        />
      )}

      <ReviewActions projectId={projectId} track={track} />
    </PageContainer>
  );
}

// ============================================================================
// 로드맵 8 Step 검토 영역
// ============================================================================

function ReviewSectionRoadmap({
  projectId,
  data,
}: {
  projectId: string;
  data: Partial<RoadmapInterviewStrict>;
}) {
  return (
    <div className="space-y-4">
      <CollapsibleSection title="Ⅰ-1. 수립 필요성">
        <RoadmapInlineText
          projectId={projectId}
          fieldKey="establishmentNecessity"
          value={data.establishmentNecessity ?? ''}
          multiline
          placeholder="수립 필요성을 입력하세요"
        />
      </CollapsibleSection>

      <CollapsibleSection title={`Ⅰ-2. 주요 활동 (${(data.performanceActivities ?? []).length}차수)`}>
        {(data.performanceActivities ?? []).length > 0 ? (
          <ul className="list-decimal space-y-2 pl-5 text-sm">
            {(data.performanceActivities ?? []).map((act, i) => (
              <li key={i}>
                <strong>{act.round}차</strong> — {act.date || '일자 미입력'} ·{' '}
                {act.timeRange || '시간 미입력'} · {act.content || '내용 미입력'} · 방법:{' '}
                {act.method || '-'} · PM: {act.pmName || '-'} · 전문가: {act.expertName || '-'}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">
            주요 활동이 입력되지 않았습니다. 인터뷰 페이지에서 차수를 추가해주세요.
          </p>
        )}
      </CollapsibleSection>

      <CollapsibleSection title="Ⅰ-3. 수립 주요 결과 (AI 수준 · 선정 과업)">
        <p className="text-sm">
          AI 수준: <strong>{data.aiLevel ?? '미정'}</strong>
        </p>
        <div className="mt-2">
          <p className="mb-1 text-xs text-muted-foreground">선정 과업</p>
          <RoadmapInlineText
            projectId={projectId}
            fieldKey="selectedTask"
            value={data.selectedTask ?? ''}
            multiline
            placeholder="선정 과업을 입력하세요"
          />
        </div>
      </CollapsibleSection>

      <CollapsibleSection title="Ⅱ-1. HRD이음 PDF">
        <p className="text-sm">
          {data.hrdReportPdf?.fileName
            ? `첨부 파일: ${data.hrdReportPdf.fileName}`
            : '첨부된 파일이 없습니다.'}
        </p>
      </CollapsibleSection>

      <CollapsibleSection title="Ⅱ-2. 기업 요구분석" defaultOpen>
        <div className="space-y-3">
          <CompanyReqRow
            label="현재 상태"
            projectId={projectId}
            field="status"
            value={data.companyRequirements?.status ?? ''}
            base={data.companyRequirements ?? { status: '', problem: '', will: '', outcomes: '' }}
          />
          <CompanyReqRow
            label="문제점"
            projectId={projectId}
            field="problem"
            value={data.companyRequirements?.problem ?? ''}
            base={data.companyRequirements ?? { status: '', problem: '', will: '', outcomes: '' }}
          />
          <CompanyReqRow
            label="기업 의지"
            projectId={projectId}
            field="will"
            value={data.companyRequirements?.will ?? ''}
            base={data.companyRequirements ?? { status: '', problem: '', will: '', outcomes: '' }}
          />
          <CompanyReqRow
            label="기대 성과"
            projectId={projectId}
            field="outcomes"
            value={data.companyRequirements?.outcomes ?? ''}
            base={data.companyRequirements ?? { status: '', problem: '', will: '', outcomes: '' }}
          />
        </div>
      </CollapsibleSection>

      <CollapsibleSection title={`Ⅱ-3. 과업·워크플로우 분석 (${(data.taskAnalysis ?? []).length}건)`}>
        {(data.taskAnalysis ?? []).length > 0 ? (
          <ul className="list-decimal space-y-2 pl-5 text-sm">
            {(data.taskAnalysis ?? []).map((t, i) => (
              <li key={i}>
                <strong>{t.domain || '직무 미입력'}</strong> · {t.task || '과업 미입력'} ·
                As-Is: {t.asIs || '-'} · 문제점: {t.problem || '-'} · 데이터 발생:{' '}
                {t.dataTiming || '-'}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">과업 분석이 입력되지 않았습니다.</p>
        )}
        <div className="mt-3">
          <p className="mb-1 text-xs text-muted-foreground">분석 메모</p>
          <RoadmapInlineText
            projectId={projectId}
            fieldKey="taskAnalysisNote"
            value={data.taskAnalysisNote ?? ''}
            multiline
            placeholder="분석 메모를 입력하세요"
          />
        </div>
      </CollapsibleSection>

      <CollapsibleSection title="Ⅱ-4. 훈련대상 과업·워크플로우 선정">
        <div className="space-y-3">
          <TargetTaskRow
            label="과업명"
            projectId={projectId}
            field="name"
            value={data.targetTask?.name ?? ''}
            base={data.targetTask ?? { name: '', reason: '', expectedAsIs: '', expectedToBe: '' }}
          />
          <TargetTaskRow
            label="선정 사유"
            projectId={projectId}
            field="reason"
            value={data.targetTask?.reason ?? ''}
            base={data.targetTask ?? { name: '', reason: '', expectedAsIs: '', expectedToBe: '' }}
            multiline
          />
          <TargetTaskRow
            label="기대 효과 As-Is"
            projectId={projectId}
            field="expectedAsIs"
            value={data.targetTask?.expectedAsIs ?? ''}
            base={data.targetTask ?? { name: '', reason: '', expectedAsIs: '', expectedToBe: '' }}
            multiline
          />
          <TargetTaskRow
            label="기대 효과 To-Be"
            projectId={projectId}
            field="expectedToBe"
            value={data.targetTask?.expectedToBe ?? ''}
            base={data.targetTask ?? { name: '', reason: '', expectedAsIs: '', expectedToBe: '' }}
            multiline
          />
        </div>
      </CollapsibleSection>

      <CollapsibleSection title={`Ⅲ-1. 역량 모델링 (${(data.competencies ?? []).length}건)`}>
        {(data.competencies ?? []).length > 0 ? (
          <ul className="list-decimal space-y-2 pl-5 text-sm">
            {(data.competencies ?? []).map((c, i) => (
              <li key={i}>
                <strong>{c.name || '역량명 미입력'}</strong> — {c.definition || '정의 미입력'}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">역량이 입력되지 않았습니다.</p>
        )}
        <p className="mt-2 text-xs text-muted-foreground">
          NCS 활용: <strong>{data.ncsUsed ? '사용' : '미사용'}</strong>
        </p>
      </CollapsibleSection>
    </div>
  );
}

// ============================================================================
// PBL 9 Step 검토 영역
// ============================================================================

function ReviewSectionPbl({
  projectId,
  data,
}: {
  projectId: string;
  data: Partial<PBLInterviewStrict>;
}) {
  return (
    <div className="space-y-4">
      <CollapsibleSection title="Ⅰ-1. 훈련과정 개요" defaultOpen>
        <div className="space-y-3">
          <PblOverviewRow
            label="훈련과정명"
            projectId={projectId}
            field="courseName"
            value={data.courseName ?? ''}
          />
          <PblOverviewRow
            label="기업명"
            projectId={projectId}
            field="companyName"
            value={data.companyName ?? ''}
          />
          <PblOverviewRow
            label="훈련대상"
            projectId={projectId}
            field="trainingTarget"
            value={data.trainingTarget ?? ''}
          />
          <PblOverviewRow
            label="사업 쟁점"
            projectId={projectId}
            field="businessIssues"
            value={data.businessIssues ?? ''}
            multiline
          />
        </div>
      </CollapsibleSection>

      <CollapsibleSection title="Ⅱ-1. 기업 이슈">
        <PblOverviewRow
          label="기업 이슈"
          projectId={projectId}
          field="companyIssues"
          value={data.companyIssues ?? ''}
          multiline
        />
      </CollapsibleSection>

      <CollapsibleSection title="Ⅱ-2. 훈련 환경">
        {/* R8 PBL-자체-02 — 정형 객체. 인라인 편집은 인터뷰 페이지에서 (검토는 read-only 요약). */}
        {(() => {
          const env = data.trainingEnv;
          if (!env) {
            return (
              <p className="text-sm text-muted-foreground">
                훈련 환경이 입력되지 않았습니다.
              </p>
            );
          }
          return (
            <dl className="grid grid-cols-[120px_1fr] gap-2 text-sm">
              <dt className="font-medium">적정 훈련시간</dt>
              <dd className="whitespace-pre-wrap">{env.properTrainingHours || '-'}</dd>
              <dt className="font-medium">훈련장소 (사내)</dt>
              <dd className="whitespace-pre-wrap">{env.internalPlace || '-'}</dd>
              <dt className="font-medium">훈련장소 (사외)</dt>
              <dd className="whitespace-pre-wrap">{env.externalPlace || '-'}</dd>
              <dt className="font-medium">AI 인프라</dt>
              <dd className="whitespace-pre-wrap">{env.aiInfrastructure || '-'}</dd>
              <dt className="font-medium">사내강사</dt>
              <dd>
                {env.internalInstructors.length === 0
                  ? '-'
                  : env.internalInstructors
                      .map((i) => `${i.position} ${i.name}`.trim() || '(미입력)')
                      .join(' / ')}
              </dd>
              <dt className="font-medium">외부강사</dt>
              <dd>
                {env.externalInstructors.length === 0
                  ? '-'
                  : env.externalInstructors
                      .map((i) => `${i.position} ${i.name}`.trim() || '(미입력)')
                      .join(' / ')}
              </dd>
            </dl>
          );
        })()}
        <p className="mt-2 text-xs text-muted-foreground">
          📝 6 영역 (시간·장소·강사·인프라) 의 세부 내용은 인터뷰 페이지에서 수정하세요.
        </p>
      </CollapsibleSection>

      <CollapsibleSection title="Ⅱ-3. 교과목 필요성">
        <PblOverviewRow
          label="교과목 필요성"
          projectId={projectId}
          field="courseNecessity"
          value={data.courseNecessity ?? ''}
          multiline
        />
      </CollapsibleSection>

      <CollapsibleSection title={`Ⅲ-1. 수행 활동 (${(data.activities ?? []).length}건)`}>
        {(data.activities ?? []).length > 0 ? (
          <ul className="list-decimal space-y-2 pl-5 text-sm">
            {(data.activities ?? []).map((a, i) => (
              <li key={i}>
                {a.round}차 · {a.date || '-'} · {a.content || '-'} · 방법: {a.method || '-'}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">수행 활동이 입력되지 않았습니다.</p>
        )}
      </CollapsibleSection>

      <CollapsibleSection title="Ⅲ-2-가. 문제 정의서">
        {/* R8 PBL-자체-04 — 양식 5×2 표 4 정형 항목 (배경/핵심/범위/제약) 단일 세트.
            모든 필드가 빈 문자열이면 안내문 표시, 한 항목이라도 채워지면 4 라벨 노출. */}
        {(() => {
          const sheet = data.problemDefinitionSheet;
          const allEmpty =
            !sheet ||
            ((sheet.background ?? '').trim() === '' &&
              (sheet.core ?? '').trim() === '' &&
              (sheet.scope ?? '').trim() === '' &&
              (sheet.constraints ?? '').trim() === '');
          if (allEmpty) {
            return (
              <p className="text-sm text-muted-foreground">
                문제 정의서가 입력되지 않았습니다.
              </p>
            );
          }
          return (
            <dl className="grid grid-cols-[120px_1fr] gap-2 text-sm">
              <dt className="font-medium">문제 배경</dt>
              <dd className="whitespace-pre-wrap">{sheet.background || '-'}</dd>
              <dt className="font-medium">핵심 문제</dt>
              <dd className="whitespace-pre-wrap">{sheet.core || '-'}</dd>
              <dt className="font-medium">문제 범위</dt>
              <dd className="whitespace-pre-wrap">{sheet.scope || '-'}</dd>
              <dt className="font-medium">제약 조건</dt>
              <dd className="whitespace-pre-wrap">{sheet.constraints || '-'}</dd>
            </dl>
          );
        })()}
      </CollapsibleSection>

      <CollapsibleSection title="Ⅲ-3·Ⅲ-4. 훈련대상 업무 · AI 수준">
        <p className="text-sm text-muted-foreground">
          상세 내용은 인터뷰 페이지에서 확인·수정하세요.
        </p>
      </CollapsibleSection>
    </div>
  );
}

// ============================================================================
// 보조 컴포넌트
// ============================================================================

function CollapsibleSection({
  title,
  defaultOpen = false,
  children,
}: {
  title: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="rounded-lg border bg-card p-4" data-testid={`review-section-${title}`}>
      <button
        type="button"
        onClick={() => setOpen((p) => !p)}
        className="flex w-full items-center gap-2 text-left text-base font-semibold"
        aria-expanded={open}
      >
        {open ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}
        {title}
      </button>
      {open && <div className="mt-4 space-y-3">{children}</div>}
    </div>
  );
}

function RoadmapInlineText({
  projectId,
  fieldKey,
  value,
  multiline = false,
  placeholder,
}: {
  projectId: string;
  fieldKey: string;
  value: string;
  multiline?: boolean;
  placeholder?: string;
}) {
  const handleSave = async (next: string) => {
    const result = await editInterviewFieldRoadmap(projectId, { [fieldKey]: next });
    if (!result.success) {
      const msg = result.error ?? '저장 실패';
      showErrorToast('인터뷰 수정 실패', msg);
      throw new Error(msg);
    }
    showSuccessToast(
      '수정되었습니다',
      "결과 탭에서 '다시 생성' 버튼을 눌러야 반영됩니다",
    );
  };
  return (
    <InlineEditField
      value={value}
      onSave={handleSave}
      multiline={multiline}
      placeholder={placeholder}
    />
  );
}

function CompanyReqRow({
  label,
  projectId,
  field,
  value,
  base,
}: {
  label: string;
  projectId: string;
  field: 'status' | 'problem' | 'will' | 'outcomes';
  value: string;
  base: { status: string; problem: string; will: string; outcomes: string };
}) {
  const handleSave = async (next: string) => {
    const result = await editInterviewFieldRoadmap(projectId, {
      companyRequirements: { ...base, [field]: next },
    });
    if (!result.success) {
      const msg = result.error ?? '저장 실패';
      showErrorToast('인터뷰 수정 실패', msg);
      throw new Error(msg);
    }
    showSuccessToast(
      '수정되었습니다',
      "결과 탭에서 '다시 생성' 버튼을 눌러야 반영됩니다",
    );
  };
  return (
    <div>
      <p className="mb-1 text-xs font-medium text-muted-foreground">{label}</p>
      <InlineEditField value={value} onSave={handleSave} multiline placeholder={`${label} 입력`} />
    </div>
  );
}

function TargetTaskRow({
  label,
  projectId,
  field,
  value,
  base,
  multiline = false,
}: {
  label: string;
  projectId: string;
  field: 'name' | 'reason' | 'expectedAsIs' | 'expectedToBe';
  value: string;
  base: { name: string; reason: string; expectedAsIs: string; expectedToBe: string };
  multiline?: boolean;
}) {
  const handleSave = async (next: string) => {
    const result = await editInterviewFieldRoadmap(projectId, {
      targetTask: { ...base, [field]: next },
    });
    if (!result.success) {
      const msg = result.error ?? '저장 실패';
      showErrorToast('인터뷰 수정 실패', msg);
      throw new Error(msg);
    }
    showSuccessToast(
      '수정되었습니다',
      "결과 탭에서 '다시 생성' 버튼을 눌러야 반영됩니다",
    );
  };
  return (
    <div>
      <p className="mb-1 text-xs font-medium text-muted-foreground">{label}</p>
      <InlineEditField
        value={value}
        onSave={handleSave}
        multiline={multiline}
        placeholder={`${label} 입력`}
      />
    </div>
  );
}

function PblOverviewRow({
  label,
  projectId,
  field,
  value,
  multiline = false,
}: {
  label: string;
  projectId: string;
  field: string;
  value: string;
  multiline?: boolean;
}) {
  const handleSave = async (next: string) => {
    const result = await editInterviewFieldPbl(projectId, { [field]: next });
    if (!result.success) {
      const msg = result.error ?? '저장 실패';
      showErrorToast('PBL 인터뷰 수정 실패', msg);
      throw new Error(msg);
    }
  };
  return (
    <div>
      <p className="mb-1 text-xs font-medium text-muted-foreground">{label}</p>
      <InlineEditField
        value={value}
        onSave={handleSave}
        multiline={multiline}
        placeholder={`${label} 입력`}
      />
    </div>
  );
}

