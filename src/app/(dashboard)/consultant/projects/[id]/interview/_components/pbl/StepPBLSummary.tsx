'use client';

import { Button } from '@/components/ui/button';
import { Pencil } from 'lucide-react';
import type {
  PBLCourseOverview,
  PBLCompanyStatus,
  PBLTrainingEnvironment,
  PBLHrdNecessity,
  PBLPerformanceActivities,
  PBLProblemDefinition,
  PBLTargetTasks,
  PBLAILevelDiagnosis,
} from '@/lib/schemas/interview-pbl';

interface StepPBLSummaryProps {
  courseOverview: PBLCourseOverview;
  companyStatus: PBLCompanyStatus;
  trainingEnvironment: PBLTrainingEnvironment;
  hrdNecessity: PBLHrdNecessity;
  performanceActivities: PBLPerformanceActivities;
  problemDefinition: PBLProblemDefinition;
  targetTasks: PBLTargetTasks;
  aiLevelDiagnosis: PBLAILevelDiagnosis;
  onEditStep: (stepId: number) => void;
}

function SectionHeader({
  title,
  stepId,
  onEdit,
}: {
  title: string;
  stepId: number;
  onEdit: (id: number) => void;
}) {
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

function KeyValue({ label, value }: { label: string; value: string | number | undefined | null }) {
  return (
    <div>
      <dt className="text-muted-foreground text-xs">{label}</dt>
      <dd className="text-foreground text-sm whitespace-pre-wrap break-keep">
        {value === '' || value === undefined || value === null ? '—' : String(value)}
      </dd>
    </div>
  );
}

export default function StepPBLSummary({
  courseOverview,
  companyStatus,
  trainingEnvironment,
  hrdNecessity,
  performanceActivities,
  problemDefinition,
  targetTasks,
  aiLevelDiagnosis,
  onEditStep,
}: StepPBLSummaryProps) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-foreground">확인 · 제출</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          작성한 내용을 확인한 뒤 하단의 <strong>저장</strong>을 누르면 인터뷰가 확정됩니다.
        </p>
      </div>

      {/* Ⅰ */}
      <section className="border border-border rounded-lg p-4">
        <SectionHeader title="1. 훈련과정 개요 (Ⅰ)" stepId={1} onEdit={onEditStep} />
        <dl className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
          <KeyValue label="기업명" value={courseOverview.company_name} />
          <KeyValue label="사업장관리번호" value={courseOverview.business_registration_no} />
          <KeyValue label="훈련과정명" value={courseOverview.course_name} />
          <KeyValue label="NCS 분류" value={courseOverview.ncs_code} />
          <KeyValue label="훈련시간(H)" value={courseOverview.training_hours} />
          <KeyValue label="훈련생(명)" value={courseOverview.trainee_count} />
          <KeyValue label="훈련 직무" value={courseOverview.training_job} />
          <KeyValue label="AI역량 수준" value={courseOverview.ai_level} />
          <div className="md:col-span-2">
            <dt className="text-muted-foreground text-xs">훈련 목표</dt>
            <dd className="text-foreground text-sm">
              {courseOverview.training_goals.length > 0
                ? courseOverview.training_goals.join(', ')
                : '—'}
            </dd>
          </div>
        </dl>
      </section>

      {/* Ⅱ-1 */}
      <section className="border border-border rounded-lg p-4">
        <SectionHeader title="2. 기업 현황 분석 (Ⅱ-1)" stepId={2} onEdit={onEditStep} />
        <dl className="mt-3 space-y-3">
          <div>
            <dt className="text-muted-foreground text-xs">경영 이슈</dt>
            <dd className="text-foreground text-sm whitespace-pre-wrap break-keep">
              {companyStatus.business_issues || '—'}
            </dd>
          </div>
          <div>
            <dt className="text-muted-foreground text-xs">조직도 및 주요 업무</dt>
            <dd className="text-foreground text-sm">
              {companyStatus.organization.length === 0
                ? '—'
                : (
                  <ul className="list-disc pl-5 space-y-1">
                    {companyStatus.organization.map((u) => (
                      <li key={u.id}>
                        <span className="font-medium">{u.department_name || '(미입력)'}</span>
                        {u.tasks.length > 0 && (
                          <span className="text-muted-foreground"> — {u.tasks.filter(Boolean).join(', ')}</span>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
            </dd>
          </div>
        </dl>
      </section>

      {/* Ⅱ-2 */}
      <section className="border border-border rounded-lg p-4">
        <SectionHeader title="3. 기업 훈련환경 분석 (Ⅱ-2)" stepId={3} onEdit={onEditStep} />
        <dl className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
          <KeyValue label="적정 훈련시간(H)" value={trainingEnvironment.proper_training_hours} />
          <KeyValue label="훈련장소" value={trainingEnvironment.training_place.type} />
          <KeyValue
            label="사내강사 활용"
            value={trainingEnvironment.internal_instructor.used ? '사용' : '미사용'}
          />
          <KeyValue label="대상 인원" value={trainingEnvironment.target_count} />
          <KeyValue label="대상자 경력" value={trainingEnvironment.target_characteristics.career} />
          <KeyValue label="대상자 수준" value={trainingEnvironment.target_characteristics.level} />
          <KeyValue label="AI도구 활용" value={trainingEnvironment.ai_infrastructure.ai_tools} />
          <KeyValue label="네트워크" value={trainingEnvironment.ai_infrastructure.network} />
          <KeyValue label="PC 수량" value={trainingEnvironment.ai_infrastructure.pc_count} />
          <div className="md:col-span-2">
            <KeyValue label="AI훈련 요구분석 결과" value={trainingEnvironment.training_needs_analysis} />
          </div>
          <KeyValue label="현재(As-Is)" value={trainingEnvironment.expectation.as_is} />
          <KeyValue label="향후(To-Be)" value={trainingEnvironment.expectation.to_be} />
        </dl>
      </section>

      {/* Ⅱ-3 */}
      <section className="border border-border rounded-lg p-4">
        <SectionHeader title="4. AI 과정개발의 필요성 (Ⅱ-3)" stepId={4} onEdit={onEditStep} />
        <dl className="mt-3 space-y-3">
          <KeyValue label="훈련 실시 이력" value={`${hrdNecessity.training_history.length}건`} />
          <KeyValue label="훈련 지원 이력" value={`${hrdNecessity.support_history.length}건`} />
          <KeyValue label="추천 훈련사업" value={`${hrdNecessity.recommendations.length}건`} />
          <div>
            <dt className="text-muted-foreground text-xs">AI훈련과정 개발 필요성</dt>
            <dd className="text-foreground text-sm whitespace-pre-wrap break-keep">
              {hrdNecessity.course_development_necessity || '—'}
            </dd>
          </div>
        </dl>
      </section>

      {/* Ⅲ-1 */}
      <section className="border border-border rounded-lg p-4">
        <SectionHeader title="5. 훈련과제 도출 수행활동 (Ⅲ-1)" stepId={5} onEdit={onEditStep} />
        <dl className="mt-3">
          <KeyValue
            label="수행 차수"
            value={`${performanceActivities.performance_activities.length}차`}
          />
          {performanceActivities.performance_activities.length > 0 && (
            <ul className="mt-2 list-disc pl-5 space-y-1 text-sm text-foreground">
              {performanceActivities.performance_activities.map((a) => (
                <li key={a.id}>
                  {a.round}차 · {a.date || '일자 미입력'} · {a.content || '내용 미입력'}
                </li>
              ))}
            </ul>
          )}
        </dl>
      </section>

      {/* Ⅲ-2 */}
      <section className="border border-border rounded-lg p-4">
        <SectionHeader title="6. 문제 도출·우선순위 (Ⅲ-2)" stepId={6} onEdit={onEditStep} />
        <dl className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
          <KeyValue label="배경" value={problemDefinition.problem_definition.background} />
          <KeyValue label="핵심문제" value={problemDefinition.problem_definition.core_problem} />
          <KeyValue label="문제범위" value={problemDefinition.problem_definition.scope} />
          <KeyValue label="제약조건" value={problemDefinition.problem_definition.constraints} />
          <div className="md:col-span-2">
            <KeyValue
              label="문제 우선순위"
              value={`${problemDefinition.problem_priorities.length}건 (선정 ${problemDefinition.problem_priorities.filter((p) => p.selected).length}건)`}
            />
          </div>
        </dl>
      </section>

      {/* Ⅲ-3 */}
      <section className="border border-border rounded-lg p-4">
        <SectionHeader title="7. 훈련대상 업무 (Ⅲ-3)" stepId={7} onEdit={onEditStep} />
        <dl className="mt-3 space-y-3">
          <KeyValue
            label="업무 선정"
            value={`${targetTasks.target_tasks.length}건 (선정 ${targetTasks.target_tasks.filter((t) => t.selected).length}건)`}
          />
          <div>
            <dt className="text-muted-foreground text-xs">선정 사유</dt>
            <dd className="text-foreground text-sm whitespace-pre-wrap break-keep">
              {targetTasks.selection_reason || '—'}
            </dd>
          </div>
          <KeyValue label="업무 세부내용" value={`${targetTasks.target_task_details.length}건`} />
        </dl>
      </section>

      {/* Ⅲ-4 */}
      <section className="border border-border rounded-lg p-4">
        <SectionHeader title="8. AI 수준 진단 (Ⅲ-4)" stepId={8} onEdit={onEditStep} />
        <dl className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
          <KeyValue label="현재 AI역량 수준" value={aiLevelDiagnosis.current_ai_level} />
          <KeyValue label="향후 AI역량 수준" value={aiLevelDiagnosis.expected_ai_level} />
          <div className="md:col-span-2">
            <KeyValue label="향상 사유" value={aiLevelDiagnosis.improvement_reason} />
          </div>
        </dl>
      </section>
    </div>
  );
}
