/**
 * 산인공 PBL 인터뷰(PBL) 전용 요약 컴포넌트.
 *
 * Step D-1 (ISSUE-17): PBL 트랙 인터뷰의 9스텝 모든 필드를 노출해
 * 컨설턴트가 입력한 데이터가 프로젝트 상세 인터뷰 기록 탭에서 누락 없이
 * 보이도록 한다.
 *
 * 데이터 입력 형식: `interviews.pbl_data` JSONB → Partial<PBLInterview>
 *   - 자동저장 도중에는 일부 필드가 비어 있을 수 있어 모두 optional 로 처리.
 *   - 비어 있으면 해당 섹션은 "(미입력)" 또는 섹션 자체를 숨긴다.
 *
 * 섹션 구성 (양식 페이지 순서):
 *   1. 과정 개요 (courseOverview)
 *   2. 기업 현황 (companyStatus)
 *   3. 훈련 환경 (trainingEnvironment)
 *   4. HRD 필요도 (hrdNecessity)
 *   5. 수행 활동 (performanceActivities — 표)
 *   6. 문제 정의 (problemDefinition)
 *   7. 대상 과업 (targetTasks)
 *   8. AI 수준 진단 (aiLevelDiagnosis)
 *   9. STT 인사이트 (sttInsights)
 */

import type { PBLInterview } from '@/lib/schemas/interview-pbl';
import { SttInsightsCards } from './SttInsightsCards';

export interface PblInterviewSummaryProps {
  /** interviews.pbl_data 를 Partial<PBLInterview> 로 캐스팅한 결과 */
  interview: Partial<PBLInterview>;
}

// =============================================================================
// 내부 헬퍼
// =============================================================================

function isNonEmpty(value?: string | null): value is string {
  return typeof value === 'string' && value.trim() !== '';
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h3 className="text-sm font-semibold text-gray-900 mb-3">{children}</h3>;
}

function FieldRow({ label, value }: { label: string; value?: string | null }) {
  const display = isNonEmpty(value) ? value : '(미입력)';
  return (
    <div>
      <span className="text-xs text-gray-500">{label}</span>
      <p className="mt-1 text-sm text-gray-700 whitespace-pre-line break-keep break-words">
        {display}
      </p>
    </div>
  );
}

function NumberRow({ label, value, unit = '' }: { label: string; value?: number | null; unit?: string }) {
  const display = typeof value === 'number' && value > 0 ? `${value}${unit}` : '(미입력)';
  return (
    <div>
      <span className="text-xs text-gray-500">{label}</span>
      <p className="mt-1 text-sm text-gray-700">{display}</p>
    </div>
  );
}

// =============================================================================
// 컴포넌트
// =============================================================================

export function PblInterviewSummary({ interview }: PblInterviewSummaryProps) {
  const co = interview.courseOverview;
  const cs = interview.companyStatus;
  const te = interview.trainingEnvironment;
  const hn = interview.hrdNecessity;
  const pa = interview.performanceActivities;
  const pd = interview.problemDefinition;
  const tt = interview.targetTasks;
  const ai = interview.aiLevelDiagnosis;
  const stt = interview.sttInsights;

  const hasCourseOverview =
    !!co &&
    (isNonEmpty(co.company_name) ||
      isNonEmpty(co.course_name) ||
      isNonEmpty(co.training_job) ||
      (co.training_hours ?? 0) > 0 ||
      (co.trainee_count ?? 0) > 0);
  const hasCompanyStatus =
    !!cs && (isNonEmpty(cs.business_issues) || (cs.organization?.length ?? 0) > 0);
  const hasTrainingEnv =
    !!te &&
    ((te.proper_training_hours ?? 0) > 0 ||
      isNonEmpty(te.training_needs_analysis) ||
      isNonEmpty(te.expectation?.as_is) ||
      isNonEmpty(te.expectation?.to_be));
  const hasHrdNecessity =
    !!hn &&
    (isNonEmpty(hn.course_development_necessity) ||
      (hn.training_history?.length ?? 0) > 0 ||
      (hn.support_history?.length ?? 0) > 0 ||
      (hn.recommendations?.length ?? 0) > 0);
  const activities = pa?.performance_activities ?? [];
  const hasProblemDef =
    !!pd &&
    (isNonEmpty(pd.problem_definition?.background) ||
      isNonEmpty(pd.problem_definition?.core_problem) ||
      (pd.problem_priorities?.length ?? 0) > 0);
  const hasTargetTasks =
    !!tt &&
    (isNonEmpty(tt.selection_reason) ||
      (tt.target_tasks?.length ?? 0) > 0 ||
      (tt.target_task_details?.length ?? 0) > 0);
  const hasAiDiagnosis =
    !!ai && (isNonEmpty(ai.improvement_reason) || !!ai.current_ai_level || !!ai.expected_ai_level);
  const hasStt =
    !!stt &&
    ((stt.추가_업무?.length ?? 0) > 0 ||
      (stt.추가_페인포인트?.length ?? 0) > 0 ||
      (stt.숨은_니즈?.length ?? 0) > 0 ||
      isNonEmpty(stt.조직_맥락) ||
      isNonEmpty(stt.AI_태도) ||
      (stt.주요_인용?.length ?? 0) > 0);

  return (
    <div className="space-y-6">
      {/* 1. 과정 개요 */}
      {hasCourseOverview && co && (
        <section>
          <SectionTitle>Ⅰ. 훈련과정 개요</SectionTitle>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3">
            <FieldRow label="기업명" value={co.company_name} />
            <FieldRow label="사업자번호" value={co.business_registration_no} />
            <FieldRow label="업종(코드)" value={co.industry_code} />
            <FieldRow label="업종(주)" value={co.industry_main} />
            <FieldRow label="주소" value={co.address} />
            <FieldRow label="훈련 주소" value={co.training_address} />
            <FieldRow label="관할 지청" value={co.jurisdiction_office} />
            <FieldRow label="과정명" value={co.course_name} />
            <FieldRow label="NCS 코드" value={co.ncs_code} />
            <FieldRow label="훈련 직무" value={co.training_job} />
            <NumberRow label="훈련 시간" value={co.training_hours} unit="시간" />
            <NumberRow label="훈련생 수" value={co.trainee_count} unit="명" />
            <FieldRow label="AI 수준" value={co.ai_level} />
            <FieldRow
              label="훈련 목표"
              value={co.training_goals && co.training_goals.length > 0 ? co.training_goals.join(', ') : ''}
            />
          </div>
          {co.contact && (
            <div className="mt-3 grid grid-cols-1 sm:grid-cols-4 gap-x-6 gap-y-3 rounded-md border border-gray-200 bg-gray-50/60 p-3">
              <FieldRow label="담당자 직위" value={co.contact.position} />
              <FieldRow label="담당자 이름" value={co.contact.name} />
              <FieldRow label="담당자 연락처" value={co.contact.phone} />
              <FieldRow label="담당자 이메일" value={co.contact.email} />
            </div>
          )}
        </section>
      )}

      {/* 2. 기업 현황 */}
      {hasCompanyStatus && cs && (
        <section>
          <SectionTitle>Ⅱ-1. 기업 현황 분석</SectionTitle>
          <FieldRow label="경영 이슈" value={cs.business_issues} />
          {cs.organization.length > 0 && (
            <div className="mt-3">
              <span className="text-xs text-gray-500">조직도</span>
              <ul className="mt-1.5 space-y-2">
                {cs.organization.map((unit) => (
                  <li
                    key={unit.id}
                    className="rounded-md border border-gray-200 bg-white p-3 text-sm text-gray-700"
                  >
                    <p className="font-medium text-gray-800">{unit.department_name}</p>
                    {unit.tasks.length > 0 && (
                      <p className="mt-1 text-xs text-gray-600">담당 업무: {unit.tasks.join(', ')}</p>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>
      )}

      {/* 3. 훈련 환경 */}
      {hasTrainingEnv && te && (
        <section>
          <SectionTitle>Ⅱ-2. 훈련환경 분석</SectionTitle>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3">
            <NumberRow label="적정 훈련시간" value={te.proper_training_hours} unit="시간" />
            <NumberRow label="대상 인원" value={te.target_count} unit="명" />
            <FieldRow
              label="훈련 장소 유형"
              value={
                te.training_place?.types && te.training_place.types.length > 0
                  ? te.training_place.types.join(', ')
                  : ''
              }
            />
            <FieldRow label="훈련 장소" value={te.training_place?.location} />
            <FieldRow label="훈련 장소 특이사항" value={te.training_place?.special_notes} />
            <FieldRow
              label="사내 강사"
              value={
                te.internal_instructor?.used
                  ? `사내강사 활용 — ${te.internal_instructor.name ?? ''} (${te.internal_instructor.position ?? ''})`
                  : '사내강사 미활용'
              }
            />
            <FieldRow label="대상자 경력" value={te.target_characteristics?.career} />
            <FieldRow label="대상자 수준" value={te.target_characteristics?.level} />
            <FieldRow label="AI 도구 활용 가능성" value={te.ai_infrastructure?.ai_tools} />
            <FieldRow label="네트워크 수준" value={te.ai_infrastructure?.network} />
            <NumberRow label="PC 보유 수" value={te.ai_infrastructure?.pc_count} unit="대" />
            <FieldRow label="기타 장비" value={te.ai_infrastructure?.etc_equipment} />
          </div>
          <div className="mt-3 space-y-3">
            <FieldRow label="AI 훈련 요구분석" value={te.training_needs_analysis} />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3">
              <FieldRow label="현재(As-Is)" value={te.expectation?.as_is} />
              <FieldRow label="향후(To-Be)" value={te.expectation?.to_be} />
            </div>
          </div>
        </section>
      )}

      {/* 4. HRD 필요도 */}
      {hasHrdNecessity && hn && (
        <section>
          <SectionTitle>Ⅱ-3. HRD 제안·과정개발 필요성</SectionTitle>
          <FieldRow label="과정개발 필요성" value={hn.course_development_necessity} />
          {hn.training_history.length > 0 && (
            <div className="mt-3">
              <span className="text-xs text-gray-500">훈련 이력</span>
              <ul className="mt-1.5 space-y-1.5">
                {hn.training_history.map((h) => (
                  <li key={h.id} className="rounded bg-gray-50 px-3 py-1.5 text-sm text-gray-700">
                    {h.seq}. {h.program} / {h.course_name} / {h.method} / {h.duration_days}일
                  </li>
                ))}
              </ul>
            </div>
          )}
          {hn.support_history.length > 0 && (
            <div className="mt-3">
              <span className="text-xs text-gray-500">지원 이력</span>
              <ul className="mt-1.5 space-y-1.5">
                {hn.support_history.map((s) => (
                  <li key={s.id} className="rounded bg-gray-50 px-3 py-1.5 text-sm text-gray-700">
                    {s.year}년 — 한도 {s.annual_limit} / 사용 {s.supported} ({s.ratio})
                  </li>
                ))}
              </ul>
            </div>
          )}
          {hn.recommendations.length > 0 && (
            <div className="mt-3">
              <span className="text-xs text-gray-500">우선순위 추천</span>
              <ul className="mt-1.5 space-y-1.5">
                {hn.recommendations.map((r) => (
                  <li
                    key={r.id}
                    className="rounded-md border border-gray-200 bg-white p-3 text-sm text-gray-700"
                  >
                    <p className="font-medium text-gray-800">
                      {r.rank}순위 — {r.program}
                    </p>
                    {isNonEmpty(r.proposal) && (
                      <p className="mt-1 text-xs text-gray-600 whitespace-pre-line break-keep break-words">
                        {r.proposal}
                      </p>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>
      )}

      {/* 5. 수행 활동 */}
      {activities.length > 0 && (
        <section>
          <SectionTitle>Ⅲ-1. 훈련과제 도출 수행활동</SectionTitle>
          <div className="overflow-x-auto rounded-md border border-gray-200">
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead className="bg-gray-50 text-xs text-gray-500">
                <tr>
                  <th className="px-3 py-2 text-left font-medium">차수</th>
                  <th className="px-3 py-2 text-left font-medium">일자</th>
                  <th className="px-3 py-2 text-left font-medium">수행 내용</th>
                  <th className="px-3 py-2 text-left font-medium">방법</th>
                  <th className="px-3 py-2 text-left font-medium">운영</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 text-gray-700">
                {activities.map((a) => (
                  <tr key={a.id} className="align-top">
                    <td className="px-3 py-2">{a.round}차</td>
                    <td className="px-3 py-2">{a.date}</td>
                    <td className="px-3 py-2 whitespace-pre-line break-keep break-words">
                      {a.content}
                    </td>
                    <td className="px-3 py-2 whitespace-pre-line break-keep break-words">{a.method}</td>
                    <td className="px-3 py-2">{a.operation_mode}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* 6. 문제 정의 */}
      {hasProblemDef && pd && (
        <section>
          <SectionTitle>Ⅲ-2. 문제 도출·우선순위</SectionTitle>
          {pd.problem_definition && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3">
              <FieldRow label="배경" value={pd.problem_definition.background} />
              <FieldRow label="핵심 문제" value={pd.problem_definition.core_problem} />
              <FieldRow label="문제 범위" value={pd.problem_definition.scope} />
              <FieldRow label="제약 조건" value={pd.problem_definition.constraints} />
            </div>
          )}
          {pd.problem_priorities.length > 0 && (
            <div className="mt-3">
              <span className="text-xs text-gray-500">문제 우선순위</span>
              <ul className="mt-1.5 space-y-1.5">
                {pd.problem_priorities.map((p) => (
                  <li
                    key={p.id}
                    className={`rounded-md border p-3 text-sm ${
                      p.selected
                        ? 'border-blue-300 bg-blue-50/60 text-blue-900'
                        : 'border-gray-200 bg-white text-gray-700'
                    }`}
                  >
                    <span className="font-medium">{p.problem_name}</span>
                    <span className="ml-2 text-xs">우선순위 {p.priority} {p.selected ? '· 선정' : ''}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>
      )}

      {/* 7. 대상 과업 */}
      {hasTargetTasks && tt && (
        <section>
          <SectionTitle>Ⅲ-3. 훈련대상 업무 선정</SectionTitle>
          <FieldRow label="선정 사유" value={tt.selection_reason} />
          {tt.target_tasks.length > 0 && (
            <div className="mt-3">
              <span className="text-xs text-gray-500">대상 업무 후보</span>
              <ul className="mt-1.5 space-y-1.5">
                {tt.target_tasks.map((t) => (
                  <li
                    key={t.id}
                    className={`rounded-md border p-3 text-sm ${
                      t.selected
                        ? 'border-blue-300 bg-blue-50/60 text-blue-900'
                        : 'border-gray-200 bg-white text-gray-700'
                    }`}
                  >
                    <span className="font-medium">{t.task_name}</span>
                    <span className="ml-2 text-xs">필요도 {t.necessity} {t.selected ? '· 선정' : ''}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {tt.target_task_details.length > 0 && (
            <div className="mt-3 overflow-x-auto rounded-md border border-gray-200">
              <table className="min-w-full divide-y divide-gray-200 text-sm">
                <thead className="bg-gray-50 text-xs text-gray-500">
                  <tr>
                    <th className="px-3 py-2 text-left font-medium">업무명</th>
                    <th className="px-3 py-2 text-left font-medium">As-Is</th>
                    <th className="px-3 py-2 text-left font-medium">To-Be</th>
                    <th className="px-3 py-2 text-left font-medium">요구 지식</th>
                    <th className="px-3 py-2 text-left font-medium">요구 기술</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 text-gray-700">
                  {tt.target_task_details.map((d) => (
                    <tr key={d.id} className="align-top">
                      <td className="px-3 py-2 whitespace-pre-line break-keep break-words">
                        {d.task_name}
                      </td>
                      <td className="px-3 py-2 whitespace-pre-line break-keep break-words">{d.as_is}</td>
                      <td className="px-3 py-2 whitespace-pre-line break-keep break-words">{d.to_be}</td>
                      <td className="px-3 py-2 whitespace-pre-line break-keep break-words">
                        {d.required_knowledge}
                      </td>
                      <td className="px-3 py-2 whitespace-pre-line break-keep break-words">
                        {d.required_skill}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}

      {/* 8. AI 수준 진단 */}
      {hasAiDiagnosis && ai && (
        <section>
          <SectionTitle>Ⅲ-4. AI 수준 진단</SectionTitle>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3">
            <FieldRow label="현재 AI 수준" value={ai.current_ai_level} />
            <FieldRow label="향후 기대 AI 수준" value={ai.expected_ai_level} />
          </div>
          <div className="mt-3">
            <FieldRow label="향상 사유" value={ai.improvement_reason} />
          </div>
        </section>
      )}

      {/* 9. STT 인사이트 */}
      {hasStt && stt && (
        <section>
          <SectionTitle>STT 인사이트</SectionTitle>
          <SttInsightsCards stt={stt} />
        </section>
      )}
    </div>
  );
}

