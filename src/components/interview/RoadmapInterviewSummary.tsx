/**
 * 산인공 로드맵 인터뷰(ROADMAP) 전용 요약 컴포넌트.
 *
 * Step D-1 (ISSUE-17): 기존 InterviewSummary 는 7개 레거시 필드(systems_and_tools,
 * ai_experience, jobTasks, painPoints, improvementGoals, constraints, notes) 만
 * 노출했다. Batch 1 신규 필드(roadmap_overview·task_workflow_items·training_targets·
 * competency_models·ncs_usage·hrd_report_attachment·attachment_files·
 * interview_start_time/end_time·stt_insights) 를 모두 노출해 컨설턴트가 입력한
 * 데이터가 프로젝트 상세 인터뷰 기록 탭에서 누락 없이 보이도록 한다.
 *
 * 데이터 입력 형식: `mapInterviewRowToRoadmapInterview()` 결과(Partial)
 *   - 인터뷰 row 가 없거나 일부 필드가 비어 있을 수 있어 모두 optional 로 처리.
 *   - 비어 있으면 해당 섹션은 "(미입력)" 또는 섹션 자체를 숨긴다.
 */

import {
  AI_COMPETENCY_LEVEL_LABEL,
  AI_COMPETENCY_LEVEL_SUBTITLE,
  INTERVIEW_METHOD_LABEL,
  type RoadmapInterview,
  type HrdReportAttachment,
} from '@/lib/schemas/interview-roadmap';
import { formatTimeRange } from '@/lib/utils/time';
import { AI_NECESSITY_LABELS } from '@/lib/constants/interview';
import { SttInsightsCards } from './SttInsightsCards';

export interface RoadmapInterviewSummaryProps {
  /** mapInterviewRowToRoadmapInterview() 결과 (Partial) */
  interview: Partial<RoadmapInterview>;
}

// =============================================================================
// 내부 헬퍼
// =============================================================================

function isNonEmpty(value?: string | null): value is string {
  return typeof value === 'string' && value.trim() !== '';
}

function formatFileSize(size?: number): string {
  if (typeof size !== 'number' || size <= 0) return '';
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / 1024 / 1024).toFixed(1)} MB`;
}

function truncateExcerpt(text?: string, max = 160): string | null {
  if (!isNonEmpty(text)) return null;
  const trimmed = text.trim();
  return trimmed.length <= max ? trimmed : `${trimmed.slice(0, max)}…`;
}

// =============================================================================
// 컴포넌트
// =============================================================================

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

function AttachmentCard({ file }: { file: HrdReportAttachment }) {
  const sizeLabel = formatFileSize(file.size);
  const excerpt = truncateExcerpt(file.extracted_text);
  return (
    <div className="rounded-md border border-gray-200 bg-white p-3 text-sm">
      <div className="flex items-baseline justify-between gap-3">
        <p className="font-medium text-gray-800 break-all">{file.file_name}</p>
        {sizeLabel && <span className="text-xs text-gray-500 flex-shrink-0">{sizeLabel}</span>}
      </div>
      {file.parse_error ? (
        <p className="mt-1 text-xs text-amber-700">본문 추출 실패: {file.parse_error}</p>
      ) : null}
      {excerpt ? (
        <p className="mt-2 text-xs text-gray-600 whitespace-pre-line break-keep break-words">
          {excerpt}
        </p>
      ) : null}
    </div>
  );
}

export function RoadmapInterviewSummary({ interview }: RoadmapInterviewSummaryProps) {
  const overview = interview.overview;
  const cr = interview.company_requirements;
  const tasks = interview.task_workflow_items ?? [];
  const targets = interview.training_targets ?? [];
  const competencies = interview.competency_models ?? [];
  const ncs = interview.ncs_usage;
  const an = interview.analysis_notes;
  const stt = interview.stt_insights;
  const participants = interview.participants ?? [];

  const timeRange = formatTimeRange(
    interview.interview_start_time,
    interview.interview_end_time,
  );
  const methodLabel = interview.interview_method
    ? INTERVIEW_METHOD_LABEL[interview.interview_method]
    : null;

  const hasOverview =
    overview &&
    (isNonEmpty(overview.establishment_necessity) ||
      isNonEmpty(overview.selected_tasks_summary) ||
      !!overview.ai_competency_level ||
      !!overview.hrd_report_attachment);

  const hasMainActivity =
    interview.interview_date ||
    interview.interview_round != null ||
    timeRange ||
    methodLabel ||
    participants.length > 0;

  const hasCompanyRequirements =
    cr &&
    (isNonEmpty(cr.company_status) ||
      isNonEmpty(cr.main_problems) ||
      isNonEmpty(cr.push_willingness) ||
      isNonEmpty(cr.expected_outcomes));

  const hasAnalysisNotes =
    !!an && (isNonEmpty(an.text) || (an.attachment_files?.length ?? 0) > 0);

  const hasNcs =
    !!ncs &&
    (ncs.uses_ncs
      ? isNonEmpty(ncs.ncs_usage_method)
      : isNonEmpty(ncs.competency_derivation_method));

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
      {/* Ⅰ. 개요 */}
      {hasOverview && overview && (
        <section>
          <SectionTitle>Ⅰ. 개요</SectionTitle>
          <div className="space-y-3">
            <FieldRow label="수립 필요성" value={overview.establishment_necessity} />
            <div>
              <span className="text-xs text-gray-500">기업 AI 역량 수준</span>
              <p className="mt-1 text-sm text-gray-700">
                {overview.ai_competency_level ? (
                  <>
                    {AI_COMPETENCY_LEVEL_LABEL[overview.ai_competency_level]}{' '}
                    <span className="text-xs text-gray-500">
                      ({AI_COMPETENCY_LEVEL_SUBTITLE[overview.ai_competency_level]})
                    </span>
                  </>
                ) : (
                  '(미입력)'
                )}
              </p>
            </div>
            <FieldRow label="선정 과업" value={overview.selected_tasks_summary} />
            {isNonEmpty(overview.roadmap_summary) && (
              <FieldRow label="수립 주요내용 요약 (LLM 자동생성)" value={overview.roadmap_summary} />
            )}
            {overview.hrd_report_attachment && (
              <div>
                <span className="text-xs text-gray-500">HRD이음 진단 보고서 첨부</span>
                <div className="mt-1.5">
                  <AttachmentCard file={overview.hrd_report_attachment} />
                </div>
              </div>
            )}
          </div>
        </section>
      )}

      {/* Ⅰ-2. 주요 활동 */}
      {hasMainActivity && (
        <section>
          <SectionTitle>Ⅰ-2. 주요 활동</SectionTitle>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3">
            <FieldRow
              label="인터뷰 차수"
              value={interview.interview_round != null ? `${interview.interview_round}차` : null}
            />
            <FieldRow label="인터뷰 일자" value={interview.interview_date} />
            <FieldRow label="수행 시간" value={timeRange || null} />
            <FieldRow label="수행 방법" value={methodLabel} />
          </div>
          <div className="mt-3">
            <span className="text-xs text-gray-500">참석자</span>
            {participants.length > 0 ? (
              <ul className="mt-1.5 flex flex-wrap gap-1.5">
                {participants.map((p) => (
                  <li
                    key={p.id}
                    className="rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-700"
                  >
                    {p.name}
                    {isNonEmpty(p.position) && (
                      <span className="ml-1 text-gray-500">({p.position})</span>
                    )}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-1 text-sm text-gray-700">(미입력)</p>
            )}
          </div>
        </section>
      )}

      {/* Ⅱ-2. 기업 요구분석 */}
      {hasCompanyRequirements && cr && (
        <section>
          <SectionTitle>Ⅱ-2. 기업 요구분석</SectionTitle>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3">
            <FieldRow label="기업 현황" value={cr.company_status} />
            <FieldRow label="주요 문제" value={cr.main_problems} />
            <FieldRow label="추진 의지" value={cr.push_willingness} />
            <FieldRow label="기대 성과" value={cr.expected_outcomes} />
          </div>
        </section>
      )}

      {/* Ⅱ-3. 과업·워크플로우 분석 */}
      {tasks.length > 0 && (
        <section>
          <SectionTitle>Ⅱ-3. 과업·워크플로우 분석</SectionTitle>
          <div className="overflow-x-auto rounded-md border border-gray-200">
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead className="bg-gray-50 text-xs text-gray-500">
                <tr>
                  <th className="px-3 py-2 text-left font-medium">직무</th>
                  <th className="px-3 py-2 text-left font-medium">과업명</th>
                  <th className="px-3 py-2 text-left font-medium">현행 방식 (As-Is)</th>
                  <th className="px-3 py-2 text-left font-medium">문제점</th>
                  <th className="px-3 py-2 text-left font-medium">데이터</th>
                  <th className="px-3 py-2 text-left font-medium">AI 필요도</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 text-gray-700">
                {tasks.map((t) => (
                  <tr key={t.id} className="align-top">
                    <td className="px-3 py-2 whitespace-pre-line break-keep break-words">{t.job}</td>
                    <td className="px-3 py-2 whitespace-pre-line break-keep break-words">
                      {t.task_name}
                    </td>
                    <td className="px-3 py-2 whitespace-pre-line break-keep break-words">{t.as_is}</td>
                    <td className="px-3 py-2 whitespace-pre-line break-keep break-words">
                      {t.problems}
                    </td>
                    <td className="px-3 py-2 whitespace-pre-line break-keep break-words">
                      {t.data_availability}
                    </td>
                    <td className="px-3 py-2">
                      <span className="rounded bg-blue-50 px-2 py-0.5 text-xs text-blue-700">
                        {t.ai_necessity} · {AI_NECESSITY_LABELS[t.ai_necessity] ?? '-'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* 분석 노트 */}
      {hasAnalysisNotes && an && (
        <section>
          <SectionTitle>분석 노트</SectionTitle>
          {isNonEmpty(an.text) ? (
            <p className="text-sm text-gray-700 whitespace-pre-line break-keep break-words">
              {an.text}
            </p>
          ) : (
            <p className="text-sm text-gray-500">(메모 미입력)</p>
          )}
          {(an.attachment_files?.length ?? 0) > 0 && (
            <div className="mt-3 space-y-2">
              <span className="text-xs text-gray-500">첨부 파일</span>
              {an.attachment_files.map((f) => (
                <AttachmentCard key={f.storage_path} file={f} />
              ))}
            </div>
          )}
        </section>
      )}

      {/* Ⅱ-4. 훈련대상 과업 */}
      {targets.length > 0 && (
        <section>
          <SectionTitle>Ⅱ-4. 훈련대상 과업</SectionTitle>
          <div className="overflow-x-auto rounded-md border border-gray-200">
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead className="bg-gray-50 text-xs text-gray-500">
                <tr>
                  <th className="px-3 py-2 text-left font-medium">과업명</th>
                  <th className="px-3 py-2 text-left font-medium">선정 사유</th>
                  <th className="px-3 py-2 text-left font-medium">As-Is</th>
                  <th className="px-3 py-2 text-left font-medium">To-Be</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 text-gray-700">
                {targets.map((g) => (
                  <tr key={g.id} className="align-top">
                    <td className="px-3 py-2 whitespace-pre-line break-keep break-words">
                      {g.task_name}
                    </td>
                    <td className="px-3 py-2 whitespace-pre-line break-keep break-words">
                      {g.selection_reason}
                    </td>
                    <td className="px-3 py-2 whitespace-pre-line break-keep break-words">
                      {g.as_is}
                    </td>
                    <td className="px-3 py-2 whitespace-pre-line break-keep break-words">
                      {g.to_be}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Ⅲ-1. 역량 모델링 */}
      {(competencies.length > 0 || hasNcs) && (
        <section>
          <SectionTitle>Ⅲ-1. 역량 모델링</SectionTitle>
          {competencies.length > 0 && (
            <div className="overflow-x-auto rounded-md border border-gray-200">
              <table className="min-w-full divide-y divide-gray-200 text-sm">
                <thead className="bg-gray-50 text-xs text-gray-500">
                  <tr>
                    <th className="px-3 py-2 text-left font-medium">역량명</th>
                    <th className="px-3 py-2 text-left font-medium">정의(수행준거)</th>
                    <th className="px-3 py-2 text-left font-medium">지식 (K)</th>
                    <th className="px-3 py-2 text-left font-medium">기술 (S)</th>
                    <th className="px-3 py-2 text-left font-medium">태도 (A)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 text-gray-700">
                  {competencies.map((c) => (
                    <tr key={c.id} className="align-top">
                      <td className="px-3 py-2 whitespace-pre-line break-keep break-words">
                        {c.competency_name}
                      </td>
                      <td className="px-3 py-2 whitespace-pre-line break-keep break-words">
                        {c.competency_definition}
                      </td>
                      <td className="px-3 py-2 whitespace-pre-line break-keep break-words">
                        {c.knowledge}
                      </td>
                      <td className="px-3 py-2 whitespace-pre-line break-keep break-words">
                        {c.skill}
                      </td>
                      <td className="px-3 py-2 whitespace-pre-line break-keep break-words">
                        {c.attitude}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {hasNcs && ncs && (
            <div className="mt-3 rounded-md border border-blue-200 bg-blue-50/60 p-3">
              <p className="text-xs font-medium text-blue-900">
                NCS 활용: {ncs.uses_ncs ? '예' : '아니오'}
              </p>
              <p className="mt-1 text-sm text-gray-700 whitespace-pre-line break-keep break-words">
                {ncs.uses_ncs
                  ? (ncs.ncs_usage_method ?? '')
                  : (ncs.competency_derivation_method ?? '')}
              </p>
            </div>
          )}
        </section>
      )}

      {/* 메모 */}
      {isNonEmpty(interview.notes) && (
        <section>
          <SectionTitle>메모</SectionTitle>
          <div className="rounded-md bg-gray-50 p-3">
            <p className="text-sm text-gray-700 whitespace-pre-line break-keep break-words">
              {interview.notes}
            </p>
          </div>
        </section>
      )}

      {/* STT 인사이트 */}
      {hasStt && stt && (
        <section>
          <SectionTitle>STT 인사이트</SectionTitle>
          <SttInsightsCards stt={stt} />
        </section>
      )}
    </div>
  );
}
