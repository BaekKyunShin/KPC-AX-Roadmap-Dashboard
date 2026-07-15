'use client';

import { useState } from 'react';
import { ChevronDown, ChevronRight, ChevronsDown, ChevronsUp } from 'lucide-react';

import { PageContainer } from '@/components/layout/PageContainer';
import { PageHeader } from '@/components/ui/page-header';
import { InlineEditField } from '@/components/result/InlineEditField';
import { Button } from '@/components/ui/button';
import { showErrorToast, showSuccessToast } from '@/lib/utils';

import type { RoadmapInterviewStrict } from '@/lib/schemas/interview-roadmap';
import type { PBLInterviewStrict } from '@/lib/schemas/interview-pbl';

import { editInterviewFieldRoadmap, editInterviewFieldPbl } from './actions';
import { StaleResultBanner } from './_components/StaleResultBanner';
import { ReviewActions } from './_components/ReviewActions';
import { SttInsightsCards, hasAnyStt } from '@/components/interview/SttInsightsCards';

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
  // #3 — 모든 CollapsibleSection 의 일괄 펼침/접기 신호.
  // counter 증가가 useEffect 트리거 → 자식이 internal open state 갱신.
  const [expandSignal, setExpandSignal] = useState(0);
  const [collapseSignal, setCollapseSignal] = useState(0);

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

      <div className="mb-3 mt-2 flex justify-end gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setExpandSignal((s) => s + 1)}
          data-testid="review-expand-all"
        >
          <ChevronsDown className="mr-1 size-4" aria-hidden />
          전체 펼치기
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setCollapseSignal((s) => s + 1)}
          data-testid="review-collapse-all"
        >
          <ChevronsUp className="mr-1 size-4" aria-hidden />
          전체 접기
        </Button>
      </div>

      {track === 'ROADMAP' ? (
        <ReviewSectionRoadmap
          projectId={projectId}
          data={interviewData as Partial<RoadmapInterviewStrict>}
          expandSignal={expandSignal}
          collapseSignal={collapseSignal}
        />
      ) : (
        <ReviewSectionPbl
          projectId={projectId}
          data={interviewData as Partial<PBLInterviewStrict>}
          expandSignal={expandSignal}
          collapseSignal={collapseSignal}
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
  expandSignal,
  collapseSignal,
}: {
  projectId: string;
  data: Partial<RoadmapInterviewStrict>;
  expandSignal: number;
  collapseSignal: number;
}) {
  const sigProps = { expandSignal, collapseSignal };
  return (
    <div className="space-y-4">
      <CollapsibleSection title="Ⅰ-1. 수립 필요성" {...sigProps}>
        <RoadmapInlineText
          projectId={projectId}
          fieldKey="establishmentNecessity"
          value={data.establishmentNecessity ?? ''}
          multiline
          placeholder="수립 필요성을 입력하세요"
        />
      </CollapsibleSection>

      <CollapsibleSection
        title={`Ⅰ-2. 주요 활동 (${(data.performanceActivities ?? []).length}차수)`}
        {...sigProps}
      >
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

      <CollapsibleSection title="Ⅰ-3. 수립 주요 결과 (AI 수준 · 선정 과업)" {...sigProps}>
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

      <CollapsibleSection title="Ⅱ-1. HRD이음 PDF" {...sigProps}>
        <p className="text-sm">
          {data.hrdReportPdf?.fileName
            ? `첨부 파일: ${data.hrdReportPdf.fileName}`
            : '첨부된 파일이 없습니다.'}
        </p>
      </CollapsibleSection>

      <CollapsibleSection title="Ⅱ-2. 기업 요구분석" {...sigProps}>
        <div className="space-y-3">
          <CompanyReqRow
            label="현재 상태"
            projectId={projectId}
            field="status"
            value={data.companyRequirements?.status ?? ''}
          />
          <CompanyReqRow
            label="문제점"
            projectId={projectId}
            field="problem"
            value={data.companyRequirements?.problem ?? ''}
          />
          <CompanyReqRow
            label="기업 의지"
            projectId={projectId}
            field="will"
            value={data.companyRequirements?.will ?? ''}
          />
          <CompanyReqRow
            label="기대 성과"
            projectId={projectId}
            field="outcomes"
            value={data.companyRequirements?.outcomes ?? ''}
          />
        </div>
      </CollapsibleSection>

      <CollapsibleSection
        title={`Ⅱ-3. 과업·워크플로우 분석 (${(data.taskAnalysis ?? []).length}건)`}
        {...sigProps}
      >
        {(data.taskAnalysis ?? []).length > 0 ? (
          <ul className="list-decimal space-y-2 pl-5 text-sm">
            {(data.taskAnalysis ?? []).map((t, i) => (
              <li key={i}>
                <strong>{t.domain || '직무 미입력'}</strong> · {t.task || '과업 미입력'} · As-Is:{' '}
                {t.asIs || '-'} · 개선점: {t.improvement || '-'}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">과업 분석이 입력되지 않았습니다.</p>
        )}
      </CollapsibleSection>

      <CollapsibleSection title="Ⅱ-4. AI 적용 대상 과업·워크플로우 선정" {...sigProps}>
        <div className="space-y-3">
          <TargetTaskRow
            label="과업명"
            projectId={projectId}
            field="name"
            value={data.targetTask?.name ?? ''}
          />
          <TargetTaskRow
            label="선정 사유"
            projectId={projectId}
            field="reason"
            value={data.targetTask?.reason ?? ''}
            multiline
          />
          <TargetTaskRow
            label="기대 효과 As-Is"
            projectId={projectId}
            field="expectedAsIs"
            value={data.targetTask?.expectedAsIs ?? ''}
            multiline
          />
          <TargetTaskRow
            label="기대 효과 To-Be"
            projectId={projectId}
            field="expectedToBe"
            value={data.targetTask?.expectedToBe ?? ''}
            multiline
          />
        </div>
      </CollapsibleSection>

      {/* 양식 v2: Ⅲ-1 역량 모델링·NCS 스텝은 삭제됨 (Ⅲ장이 훈련과정 명세서로 축소) */}

      {/* 선택 항목 — STT 인사이트가 추출되어 있을 때만 노출 */}
      {hasAnyStt(data.sttInsights) && (
        <CollapsibleSection title="STT 인사이트 (선택)" {...sigProps}>
          <SttInsightsCards stt={data.sttInsights} />
        </CollapsibleSection>
      )}
    </div>
  );
}

// ============================================================================
// PBL 9 Step 검토 영역
// ============================================================================

function ReviewSectionPbl({
  projectId,
  data,
  expandSignal,
  collapseSignal,
}: {
  projectId: string;
  data: Partial<PBLInterviewStrict>;
  expandSignal: number;
  collapseSignal: number;
}) {
  const sigProps = { expandSignal, collapseSignal };
  return (
    <div className="space-y-4">
      <CollapsibleSection title="Ⅰ-1. 훈련과정 개요" {...sigProps}>
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

      <CollapsibleSection title="Ⅱ-1. 기업 이슈" {...sigProps}>
        <PblOverviewRow
          label="기업 이슈"
          projectId={projectId}
          field="companyIssues"
          value={data.companyIssues ?? ''}
          multiline
        />
      </CollapsibleSection>

      <CollapsibleSection title="Ⅱ-2. 훈련 환경" {...sigProps}>
        {/* R8 PBL-자체-02 — 정형 객체. 인라인 편집은 인터뷰 페이지에서 (검토는 read-only 요약). */}
        {(() => {
          const env = data.trainingEnv;
          if (!env) {
            return (
              <p className="text-sm text-muted-foreground">훈련 환경이 입력되지 않았습니다.</p>
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

      <CollapsibleSection title="Ⅱ-3. 교과목 필요성" {...sigProps}>
        <PblOverviewRow
          label="교과목 필요성"
          projectId={projectId}
          field="courseNecessity"
          value={data.courseNecessity ?? ''}
          multiline
        />
      </CollapsibleSection>

      <CollapsibleSection
        title={`Ⅲ-1. 수행 활동 (${(data.activities ?? []).length}건)`}
        {...sigProps}
      >
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

      <CollapsibleSection title="Ⅲ-2-가. 문제 정의서" {...sigProps}>
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
              <p className="text-sm text-muted-foreground">문제 정의서가 입력되지 않았습니다.</p>
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

      <CollapsibleSection title="Ⅲ-3·Ⅲ-4. 훈련대상 업무 · AI 수준" {...sigProps}>
        <p className="text-sm text-muted-foreground">
          상세 내용은 인터뷰 페이지에서 확인·수정하세요.
        </p>
      </CollapsibleSection>

      {/* 선택 항목 — STT 인사이트가 추출되어 있을 때만 노출 */}
      {hasAnyStt(data.sttInsights) && (
        <CollapsibleSection title="STT 인사이트 (선택)" {...sigProps}>
          <SttInsightsCards stt={data.sttInsights} />
        </CollapsibleSection>
      )}
    </div>
  );
}

// ============================================================================
// 보조 컴포넌트
// ============================================================================

function CollapsibleSection({
  title,
  expandSignal = 0,
  collapseSignal = 0,
  children,
}: {
  title: string;
  /** 부모가 counter 증가시 모든 섹션을 펼친다 (전체 펼치기 토글). */
  expandSignal?: number;
  /** 부모가 counter 증가시 모든 섹션을 접는다 (전체 접기 토글). */
  collapseSignal?: number;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  // React 19 권장 — 렌더 중 prev-prop 비교 후 state 동기화 (useEffect 안 setState
  // 의 'react-hooks/set-state-in-effect' 룰 위반 회피).
  // 부모의 토글 버튼이 expandSignal/collapseSignal counter 를 증가시키면 다음 렌더에
  // 이전 카운터와 비교하여 한 번 setOpen 후 prev 도 갱신.
  const [prevExpand, setPrevExpand] = useState(0);
  const [prevCollapse, setPrevCollapse] = useState(0);
  if (expandSignal !== prevExpand) {
    setPrevExpand(expandSignal);
    if (expandSignal > 0) setOpen(true);
  }
  if (collapseSignal !== prevCollapse) {
    setPrevCollapse(collapseSignal);
    if (collapseSignal > 0) setOpen(false);
  }

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
    showSuccessToast('수정되었습니다', "결과 탭에서 '다시 생성' 버튼을 눌러야 반영됩니다");
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
}: {
  label: string;
  projectId: string;
  field: 'status' | 'problem' | 'will' | 'outcomes';
  value: string;
}) {
  const handleSave = async (next: string) => {
    // (#4) 변경된 키만 부분 patch 로 전송. 서버는 deepMerge 로 다른 필드를 보존하므로
    // 두 탭 동시 편집 시에도 lost update 가 발생하지 않는다 (이전엔 stale base 를
    // 사용해 다른 키들의 최신 변경분을 덮어썼음).
    const result = await editInterviewFieldRoadmap(projectId, {
      companyRequirements: { [field]: next },
    });
    if (!result.success) {
      const msg = result.error ?? '저장 실패';
      showErrorToast('인터뷰 수정 실패', msg);
      throw new Error(msg);
    }
    showSuccessToast('수정되었습니다', "결과 탭에서 '다시 생성' 버튼을 눌러야 반영됩니다");
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
  multiline = false,
}: {
  label: string;
  projectId: string;
  field: 'name' | 'reason' | 'expectedAsIs' | 'expectedToBe';
  value: string;
  multiline?: boolean;
}) {
  const handleSave = async (next: string) => {
    // (#4) 부분 patch 만 전송 — 서버 deepMerge 로 다른 필드 보존.
    const result = await editInterviewFieldRoadmap(projectId, {
      targetTask: { [field]: next },
    });
    if (!result.success) {
      const msg = result.error ?? '저장 실패';
      showErrorToast('인터뷰 수정 실패', msg);
      throw new Error(msg);
    }
    showSuccessToast('수정되었습니다', "결과 탭에서 '다시 생성' 버튼을 눌러야 반영됩니다");
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
