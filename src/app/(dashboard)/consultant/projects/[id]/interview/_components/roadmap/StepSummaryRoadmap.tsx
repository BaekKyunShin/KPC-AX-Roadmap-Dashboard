'use client';

import { Button } from '@/components/ui/button';
import { Pencil } from 'lucide-react';
import type {
  RoadmapInterview,
  RoadmapParticipant,
  CompanyRequirements,
  TaskWorkflowItem,
  TrainingTarget,
  AnalysisNotes,
  InterviewMethod,
  Overview,
  CompetencyModel,
  NcsUsage,
  SttInsights,
} from '@/lib/schemas/interview-roadmap';
import {
  AI_COMPETENCY_LEVEL_LABEL,
  AI_COMPETENCY_LEVEL_SUBTITLE,
  INTERVIEW_METHOD_LABEL,
} from '@/lib/schemas/interview-roadmap';
import { formatTimeRange } from '@/lib/utils/time';
import { StepSttUpload } from '@/components/interview/StepSttUpload';

interface StepSummaryRoadmapProps {
  overview: Overview;
  interviewDate: string;
  interviewRound: number;
  // ISSUE-10 Step C-2: 시작/종료 두 필드
  interviewStartTime: string;
  interviewEndTime: string;
  interviewMethod: InterviewMethod;
  participants: RoadmapParticipant[];
  companyRequirements: CompanyRequirements;
  taskWorkflowItems: TaskWorkflowItem[];
  analysisNotes: AnalysisNotes;
  trainingTargets: TrainingTarget[];
  competencyModels: CompetencyModel[];
  ncsUsage: NcsUsage;
  notes: string;
  onEditStep: (stepId: number) => void;
  onNotesChange: (notes: string) => void;
  // ISSUE-16 STT 업로드 복원
  sttInsights?: RoadmapInterview['stt_insights'];
  onSttInsightsChange: (insights: RoadmapInterview['stt_insights']) => void;
  onExtractSttInsights: (
    sttText: string,
  ) => Promise<{ success: true; data: SttInsights } | { success: false; error: string }>;
}

function SectionHeader({ title, stepId, onEdit }: { title: string; stepId: number; onEdit: (id: number) => void }) {
  return (
    <div className="flex items-center justify-between">
      <h3 className="text-sm font-semibold text-foreground">{title}</h3>
      <Button type="button" variant="ghost" size="sm" onClick={() => onEdit(stepId)}>
        <Pencil className="w-3.5 h-3.5 mr-1" />
        수정
      </Button>
    </div>
  );
}

export default function StepSummaryRoadmap({
  overview,
  interviewDate,
  interviewRound,
  interviewStartTime,
  interviewEndTime,
  interviewMethod,
  participants,
  companyRequirements,
  taskWorkflowItems,
  analysisNotes,
  trainingTargets,
  competencyModels,
  ncsUsage,
  notes,
  onEditStep,
  onNotesChange,
  sttInsights,
  onSttInsightsChange,
  onExtractSttInsights,
}: StepSummaryRoadmapProps) {
  const interviewTimeRange = formatTimeRange(interviewStartTime, interviewEndTime);
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-foreground">확인 · 제출</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          작성한 내용을 확인한 뒤 하단의 <strong>저장</strong>을 누르면 인터뷰가 확정됩니다.
        </p>
      </div>

      <section className="border border-border rounded-lg p-4">
        <SectionHeader title="1. 개요 (Ⅰ-1 · Ⅰ-3)" stepId={1} onEdit={onEditStep} />
        <dl className="mt-3 space-y-2 text-sm">
          <div>
            <dt className="text-muted-foreground">수립 필요성</dt>
            <dd className="text-foreground whitespace-pre-wrap break-keep">
              {overview.establishment_necessity || '-'}
            </dd>
          </div>
          <div>
            <dt className="text-muted-foreground">기업 AI 역량 수준</dt>
            <dd className="text-foreground">
              {AI_COMPETENCY_LEVEL_LABEL[overview.ai_competency_level]}
              <span className="ml-1 text-xs text-muted-foreground">
                ({AI_COMPETENCY_LEVEL_SUBTITLE[overview.ai_competency_level]})
              </span>
            </dd>
          </div>
          <div>
            <dt className="text-muted-foreground">선정 과업</dt>
            <dd className="text-foreground whitespace-pre-wrap break-keep">
              {overview.selected_tasks_summary || '-'}
            </dd>
          </div>
          <div>
            <dt className="text-muted-foreground flex items-center gap-2">
              <span>AI훈련로드맵 수립 주요내용 (요약)</span>
              <span className="inline-flex items-center rounded-full bg-primary/10 text-primary text-[10px] font-semibold px-2 py-0.5">
                자동 생성 예정
              </span>
            </dt>
            <dd className="text-muted-foreground text-xs leading-relaxed">
              로드맵 생성 단계에서 AI 가 훈련요구 분석·역량 모델링·훈련계획을 종합해 1장 이내
              요약을 자동 작성합니다. 로드맵 편집 단계에서 직접 수정할 수 있습니다.
            </dd>
          </div>
          {overview.hrd_report_attachment && (
            <div>
              <dt className="text-muted-foreground">기업HRD이음컨설팅 보고서</dt>
              <dd className="text-foreground">
                {overview.hrd_report_attachment.file_name}
                {overview.hrd_report_attachment.size
                  ? ` (${Math.round(overview.hrd_report_attachment.size / 1024)} KB)`
                  : ''}
              </dd>
            </div>
          )}
        </dl>
      </section>

      <section className="border border-border rounded-lg p-4">
        <SectionHeader title="2. 기본 정보 · 참석자 (Ⅰ-2 주요 활동)" stepId={2} onEdit={onEditStep} />
        <dl className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
          <div>
            <dt className="text-muted-foreground">수행 차수 / 일시</dt>
            <dd className="text-foreground">
              {interviewRound}차 · {interviewDate || '-'} · {interviewTimeRange || '-'}
            </dd>
          </div>
          <div>
            <dt className="text-muted-foreground">수행 방법</dt>
            <dd className="text-foreground">{INTERVIEW_METHOD_LABEL[interviewMethod] ?? '-'}</dd>
          </div>
          <div className="md:col-span-2">
            <dt className="text-muted-foreground">참석자</dt>
            <dd className="text-foreground">
              {(() => {
                const named = participants.filter((p) => p.name.trim() !== '');
                return named.length > 0
                  ? named.map((p) => `${p.name}${p.position ? ` (${p.position})` : ''}`).join(', ')
                  : '-';
              })()}
            </dd>
          </div>
        </dl>
      </section>

      <section className="border border-border rounded-lg p-4">
        <SectionHeader title="3. 기업 요구분석" stepId={3} onEdit={onEditStep} />
        <dl className="mt-3 space-y-2 text-sm">
          <div>
            <dt className="text-muted-foreground">기업 현황</dt>
            <dd className="text-foreground whitespace-pre-wrap break-keep">{companyRequirements.company_status || '-'}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">주요 문제</dt>
            <dd className="text-foreground whitespace-pre-wrap break-keep">{companyRequirements.main_problems || '-'}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">추진 의지</dt>
            <dd className="text-foreground whitespace-pre-wrap break-keep">{companyRequirements.push_willingness || '-'}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">기대 성과</dt>
            <dd className="text-foreground whitespace-pre-wrap break-keep">{companyRequirements.expected_outcomes || '-'}</dd>
          </div>
        </dl>
      </section>

      <section className="border border-border rounded-lg p-4">
        <SectionHeader title="4. 과업(Task)·워크플로우 분석" stepId={4} onEdit={onEditStep} />
        {taskWorkflowItems.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">작성된 과업이 없습니다.</p>
        ) : (
          <ul className="mt-3 space-y-2 text-sm">
            {taskWorkflowItems.map((item, i) => (
              <li key={item.id} className="border-l-2 border-primary/30 pl-3">
                <p className="font-medium text-foreground">
                  #{i + 1} [{item.job || '-'}] {item.task_name || '(과업 미입력)'}{' '}
                  <span className="text-xs text-muted-foreground">
                    · AI도입·활용 필요도 {item.ai_necessity}
                  </span>
                </p>
                <p className="text-muted-foreground whitespace-pre-wrap break-keep">
                  As-Is: {item.as_is || '-'} / 문제점: {item.problems || '-'} / 데이터: {item.data_availability || '-'}
                </p>
              </li>
            ))}
          </ul>
        )}
        {(analysisNotes.text || analysisNotes.attachment_files.length > 0) && (
          <div className="mt-4 pt-3 border-t border-border/60 space-y-2 text-sm">
            <p className="text-muted-foreground">
              <span className="font-medium text-foreground">분석 내용:</span>{' '}
              {analysisNotes.text ? (
                <span className="whitespace-pre-wrap break-keep">{analysisNotes.text}</span>
              ) : (
                '-'
              )}
            </p>
            {analysisNotes.attachment_files.length > 0 && (
              <div>
                <span className="font-medium text-foreground">참고 파일: </span>
                <ul className="list-disc ml-5 text-xs">
                  {analysisNotes.attachment_files.map((file, i) => (
                    <li key={`${file.storage_path}-${i}`} className="truncate">
                      {file.file_name}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </section>

      <section className="border border-border rounded-lg p-4">
        <SectionHeader title="5. 훈련대상 과업(Task)·워크플로우 선정" stepId={5} onEdit={onEditStep} />
        {trainingTargets.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">작성된 훈련대상이 없습니다.</p>
        ) : (
          <ul className="mt-3 space-y-3 text-sm">
            {trainingTargets.map((item, i) => (
              <li key={item.id} className="border-l-2 border-primary/30 pl-3">
                <p className="font-medium text-foreground">
                  #{i + 1} {item.task_name || '(훈련대상 과업 미입력)'}
                </p>
                <p className="text-muted-foreground whitespace-pre-wrap break-keep">
                  <span className="font-medium text-foreground">선정사유:</span> {item.selection_reason || '-'}
                </p>
                <p className="text-muted-foreground whitespace-pre-wrap break-keep">
                  <span className="font-medium text-foreground">기대효과</span> ·{' '}
                  As-Is: {item.as_is || '-'} → To-Be: {item.to_be || '-'}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="border border-border rounded-lg p-4">
        <SectionHeader title="6. 역량 모델링 (Ⅲ-1)" stepId={6} onEdit={onEditStep} />
        {competencyModels.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">작성된 역량이 없습니다.</p>
        ) : (
          <ul className="mt-3 space-y-3 text-sm">
            {competencyModels.map((item, i) => (
              <li key={item.id} className="border-l-2 border-primary/30 pl-3">
                <p className="font-medium text-foreground">
                  #{i + 1} {item.competency_name || '(역량명 미입력)'}
                </p>
                <p className="text-muted-foreground whitespace-pre-wrap break-keep">
                  <span className="font-medium text-foreground">정의:</span> {item.competency_definition || '-'}
                </p>
                <p className="text-muted-foreground whitespace-pre-wrap break-keep">
                  <span className="font-medium text-foreground">K(지식):</span> {item.knowledge || '-'}
                </p>
                <p className="text-muted-foreground whitespace-pre-wrap break-keep">
                  <span className="font-medium text-foreground">S(기술):</span> {item.skill || '-'}
                </p>
                <p className="text-muted-foreground whitespace-pre-wrap break-keep">
                  <span className="font-medium text-foreground">A(태도):</span> {item.attitude || '-'}
                </p>
              </li>
            ))}
          </ul>
        )}
        <div className="mt-4 pt-3 border-t border-border/60 text-sm">
          <p className="text-muted-foreground">
            <span className="font-medium text-foreground">NCS 활용:</span>{' '}
            {ncsUsage.uses_ncs ? (
              <>
                예 ·{' '}
                <span className="whitespace-pre-wrap break-keep">
                  {ncsUsage.ncs_usage_method?.trim() || '(활용 방법 미입력)'}
                </span>
              </>
            ) : (
              <>
                아니오 ·{' '}
                <span className="whitespace-pre-wrap break-keep">
                  {ncsUsage.competency_derivation_method?.trim() || '(도출 방법 미입력)'}
                </span>
              </>
            )}
          </p>
        </div>
      </section>

      <section className="border border-border rounded-lg p-4">
        <h3 className="text-sm font-semibold text-foreground">메모</h3>
        <p className="mt-1 text-xs text-muted-foreground">인터뷰에서 확인된 기타 사항 (선택)</p>
        <textarea
          rows={3}
          value={notes}
          onChange={(e) => onNotesChange(e.target.value)}
          placeholder="예) 차기 인터뷰 확인 사항, 레퍼런스 자료 등"
          className="mt-2 block w-full px-3 py-2 border border-input rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-ring break-keep"
        />
      </section>

      <StepSttUpload
        insights={sttInsights}
        onChange={onSttInsightsChange}
        onExtract={onExtractSttInsights}
      />
    </div>
  );
}
