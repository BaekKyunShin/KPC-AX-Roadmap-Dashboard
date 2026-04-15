'use client';

import { Button } from '@/components/ui/button';
import { Pencil } from 'lucide-react';
import type {
  RoadmapInterview,
  RoadmapParticipant,
  CompanyRequirements,
  TaskWorkflowItem,
  TrainingTarget,
} from '@/lib/schemas/interview-roadmap';

interface StepSummaryRoadmapProps {
  interviewDate: string;
  interviewRound: number;
  interviewTime: string;
  participants: RoadmapParticipant[];
  companyRequirements: CompanyRequirements;
  taskWorkflowItems: TaskWorkflowItem[];
  trainingTargets: TrainingTarget[];
  notes: string;
  onEditStep: (stepId: number) => void;
  onNotesChange: (notes: string) => void;
  sttInsights?: RoadmapInterview['stt_insights'];
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
  interviewDate,
  interviewRound,
  interviewTime,
  participants,
  companyRequirements,
  taskWorkflowItems,
  trainingTargets,
  notes,
  onEditStep,
  onNotesChange,
  sttInsights,
}: StepSummaryRoadmapProps) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-foreground">확인 · 제출</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          작성한 내용을 확인한 뒤 하단의 <strong>저장</strong>을 누르면 인터뷰가 확정됩니다.
        </p>
      </div>

      <section className="border border-border rounded-lg p-4">
        <SectionHeader title="1. 기본 정보 · 참석자" stepId={1} onEdit={onEditStep} />
        <dl className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
          <div>
            <dt className="text-muted-foreground">차수 / 날짜 / 시간</dt>
            <dd className="text-foreground">
              {interviewRound}차 · {interviewDate || '-'} · {interviewTime || '-'}
            </dd>
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
        <SectionHeader title="2. 기업 요구분석" stepId={2} onEdit={onEditStep} />
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
        <SectionHeader title="3. 과업·워크플로우 분석" stepId={3} onEdit={onEditStep} />
        {taskWorkflowItems.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">작성된 과업이 없습니다.</p>
        ) : (
          <ul className="mt-3 space-y-2 text-sm">
            {taskWorkflowItems.map((item, i) => (
              <li key={item.id} className="border-l-2 border-primary/30 pl-3">
                <p className="font-medium text-foreground">
                  #{i + 1} [{item.job || '-'}] {item.task_name || '(과업명 미입력)'}{' '}
                  <span className="text-xs text-muted-foreground">· AI 필요도 {item.ai_necessity}</span>
                </p>
                <p className="text-muted-foreground whitespace-pre-wrap break-keep">
                  As-Is: {item.as_is || '-'} / 문제점: {item.problems || '-'}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="border border-border rounded-lg p-4">
        <SectionHeader title="4. 훈련대상 과업 선정" stepId={4} onEdit={onEditStep} />
        {trainingTargets.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">작성된 훈련대상이 없습니다.</p>
        ) : (
          <ul className="mt-3 space-y-2 text-sm">
            {trainingTargets.map((item, i) => (
              <li key={item.id} className="border-l-2 border-primary/30 pl-3">
                <p className="font-medium text-foreground">
                  #{i + 1} {item.task_name || '(과업명 미입력)'}
                </p>
                <p className="text-muted-foreground whitespace-pre-wrap break-keep">
                  선정 사유: {item.selection_reason || '-'} / As-Is → To-Be: {item.as_is || '-'} → {item.to_be || '-'}
                </p>
              </li>
            ))}
          </ul>
        )}
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

      {sttInsights && (
        <section className="border border-border rounded-lg p-4 bg-muted/20">
          <h3 className="text-sm font-semibold text-foreground">STT 인사이트 (기존 데이터 유지)</h3>
          <p className="mt-2 text-xs text-muted-foreground">
            이전 버전 인터뷰에서 추출된 STT 인사이트가 있습니다. 참고용으로 유지됩니다.
          </p>
        </section>
      )}
    </div>
  );
}
