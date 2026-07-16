'use client';

import { useState } from 'react';
import { Plus } from 'lucide-react';
import { ConfirmRemoveRowButton } from '../ConfirmRemoveRowButton';

import { FormSection } from '@/components/forms/FormSection';
import { LargeTextBox } from '@/components/forms/LargeTextBox';
import { PdfUploadField } from '@/components/forms/PdfUploadField';
import { ExampleAccordion } from '@/components/forms/ExampleAccordion';
import { Button } from '@/components/ui/button';
import { showErrorToast } from '@/lib/utils';

import { uploadInterviewAttachment } from '../../actions';
import type { RoadmapStepProps } from './types';
import type {
  RoadmapInterviewStrict,
  RoadmapTaskAnalysisItem,
  RoadmapTaskAnalysisAttachment,
} from '@/lib/schemas/interview-roadmap';

/**
 * Ⅱ-3 과업·워크플로우 분석 — [인터뷰 입력]
 *
 * 양식 v2 개정: 표가 6열 → 4열로 축소됐다.
 *  - 동적 행 표 (직무 · 과업(Task) · 현행 방식(As-Is) · 개선점 및 AI 적용 가능성)
 *    → v1 의 문제점·데이터 발생시점·AI 필요도(1~5) 3열이 "개선점 및 AI 적용 가능성"
 *      1열로 통합됐다 (데이터 발생 여부/보유현황도 이 칸에 함께 기술).
 *  - "분석내용"(taskAnalysisNote) 입력란은 양식에서 삭제됨.
 *  - 선택: 추가 내부 자료 첨부 (PDF) — 유지.
 *
 * 데이터 슬라이스 2개(taskAnalysis · taskAnalysisAttachment)를 함께 편집한다.
 */

export interface StepTaskAnalysisValue {
  taskAnalysis: RoadmapInterviewStrict['taskAnalysis'];
  taskAnalysisAttachment?: RoadmapInterviewStrict['taskAnalysisAttachment'];
}

interface StepTaskAnalysisProps extends RoadmapStepProps<StepTaskAnalysisValue> {
  /** 업로드 대상 프로젝트 ID — 추가 자료 PDF 첨부 시 uploadInterviewAttachment 호출에 사용 */
  projectId: string;
}

/** 빈 과업 행 (v2 4필드) */
function emptyItem(): RoadmapTaskAnalysisItem {
  return {
    domain: '',
    task: '',
    asIs: '',
    improvement: '',
  };
}

/** 초기 5행 기본 (양식 준수 — 핵심 과업 5개 내외) */
function defaultRows(): RoadmapTaskAnalysisItem[] {
  return Array.from({ length: 5 }, () => emptyItem());
}

export function StepTaskAnalysis({
  value,
  onChange,
  readOnly = false,
  projectId,
}: StepTaskAnalysisProps) {
  const [isUploading, setIsUploading] = useState(false);

  const rows: RoadmapTaskAnalysisItem[] =
    value.taskAnalysis && value.taskAnalysis.length > 0 ? value.taskAnalysis : defaultRows();
  const attachment: RoadmapTaskAnalysisAttachment | null = value.taskAnalysisAttachment ?? null;

  function emit(patch: Partial<StepTaskAnalysisValue>) {
    onChange({
      taskAnalysis: rows,
      taskAnalysisAttachment: attachment,
      ...patch,
    });
  }

  function updateRow(idx: number, patch: Partial<RoadmapTaskAnalysisItem>) {
    const next = rows.map((r, i) => (i === idx ? { ...r, ...patch } : r));
    emit({ taskAnalysis: next });
  }

  function addRow() {
    emit({ taskAnalysis: [...rows, emptyItem()] });
  }

  function removeRow(idx: number) {
    const next = rows.filter((_, i) => i !== idx);
    // 최소 1행은 유지 (스키마 min(1) 보호)
    emit({ taskAnalysis: next.length > 0 ? next : [emptyItem()] });
  }

  async function handleFileSelect(file: File) {
    if (readOnly || isUploading) return;
    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const result = await uploadInterviewAttachment(projectId, formData);
      if (!result.success) {
        showErrorToast(result.error);
        return;
      }
      const att = result.data;
      const next: RoadmapTaskAnalysisAttachment = {
        fileName: att.file_name,
        url: att.storage_path,
        ...(att.extracted_text != null ? { extractedText: att.extracted_text } : {}),
        ...(att.parse_error ? { parseError: att.parse_error } : {}),
      };
      emit({ taskAnalysisAttachment: next });
    } catch (error) {
      console.error('[StepTaskAnalysis] upload error', error);
      showErrorToast('파일 업로드 중 오류가 발생했습니다.');
    } finally {
      setIsUploading(false);
    }
  }

  function handleRemoveFile() {
    if (readOnly) return;
    emit({ taskAnalysisAttachment: null });
  }

  return (
    <FormSection
      number="Ⅱ-3"
      title="과업·워크플로우 분석"
      label="[인터뷰 입력]"
      description="직무별 주요 과업을 식별하고 현행 수행방식(As-Is)과 개선점·AI 적용 가능성을 구조적으로 분석합니다."
    >
      {/* 분석 표 (v2 4열) ------------------------------------------------- */}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse border border-border text-sm">
          <caption className="sr-only">과업·워크플로우 분석 표</caption>
          <thead>
            <tr>
              <th
                scope="col"
                className="w-[120px] border border-border bg-muted px-2 py-2 text-center font-semibold"
              >
                직무
              </th>
              <th
                scope="col"
                className="w-[150px] border border-border bg-muted px-2 py-2 text-center font-semibold"
              >
                과업(Task)
              </th>
              <th
                scope="col"
                className="border border-border bg-muted px-2 py-2 text-center font-semibold"
              >
                현행 방식 (As-Is)
              </th>
              <th
                scope="col"
                className="border border-border bg-muted px-2 py-2 text-center font-semibold"
              >
                개선점 및 AI 적용 가능성
                <span className="block text-xs font-normal text-muted-foreground">
                  (데이터 발생 여부/보유현황 포함)
                </span>
              </th>
              <th
                scope="col"
                className="w-[56px] border border-border bg-muted px-2 py-2 text-center font-semibold"
              >
                <span className="sr-only">삭제</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, idx) => (
              <tr key={idx}>
                <td className="border border-border p-1 align-top">
                  <LargeTextBox
                    value={row.domain}
                    onChange={(e) => updateRow(idx, { domain: e.target.value })}
                    placeholder="직무"
                    disabled={readOnly}
                    aria-label={`직무 ${idx + 1}`}
                    minHeightClassName="min-h-[225px]"
                  />
                </td>
                <td className="border border-border p-1 align-top">
                  <LargeTextBox
                    value={row.task}
                    onChange={(e) => updateRow(idx, { task: e.target.value })}
                    placeholder="과업"
                    disabled={readOnly}
                    aria-label={`과업 ${idx + 1}`}
                    minHeightClassName="min-h-[225px]"
                  />
                </td>
                <td className="border border-border p-1 align-top">
                  <LargeTextBox
                    value={row.asIs}
                    onChange={(e) => updateRow(idx, { asIs: e.target.value })}
                    placeholder="현행 수행방식"
                    disabled={readOnly}
                    aria-label={`현행 방식 ${idx + 1}`}
                    minHeightClassName="min-h-[225px]"
                  />
                </td>
                <td className="border border-border p-1 align-top">
                  <LargeTextBox
                    value={row.improvement}
                    onChange={(e) => updateRow(idx, { improvement: e.target.value })}
                    placeholder="개선점 및 AI 적용 가능성 (데이터 발생 여부/보유현황 포함)"
                    disabled={readOnly}
                    aria-label={`개선점 ${idx + 1}`}
                    minHeightClassName="min-h-[225px]"
                  />
                </td>
                <td className="border border-border p-1 text-center align-top">
                  <ConfirmRemoveRowButton
                    title={`선택한 행을 삭제하시겠습니까?`}
                    ariaLabel={`행 삭제 ${idx + 1}`}
                    disabled={readOnly || rows.length <= 1}
                    onConfirm={() => removeRow(idx)}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={addRow}
          disabled={readOnly}
          aria-label="행 추가"
        >
          <Plus className="mr-1 size-4" />행 추가
        </Button>
      </div>

      {/* 선택 첨부 --------------------------------------------------------- */}
      <div className="space-y-2">
        <h3 className="text-sm font-semibold">
          추가 내부 자료
          <span className="ml-2 text-xs font-normal text-muted-foreground">(선택 · PDF)</span>
        </h3>
        <PdfUploadField
          file={
            attachment
              ? {
                  name: attachment.fileName,
                  size: 0,
                  url: attachment.url.startsWith('http') ? attachment.url : undefined,
                }
              : null
          }
          onFileSelect={handleFileSelect}
          onRemove={handleRemoveFile}
          disabled={readOnly || isUploading}
          accept=".pdf"
        />
        {attachment?.parseError && (
          <p role="alert" className="text-xs text-amber-600">
            PDF 본문 자동 추출 실패: {attachment.parseError}. LLM 분석은 제한적으로 수행됩니다.
          </p>
        )}
      </div>

      <ExampleAccordion
        example={<p className="text-xs text-muted-foreground">(추가 업로드 자료 예시) 공정 분석</p>}
        guide={
          <ul className="list-disc space-y-1 pl-4">
            <li>
              기업 내부전문가와의 인터뷰를 통해 AI 도입·활용이 필요하다고 판단되는 과업 분석 (전체
              과업을 모두 분석할 필요 없음 — 핵심 과업 중심)
            </li>
            <li>
              직무별 주요 과업을 5개 내외로 식별하고, 각 과업의 현행 수행방식(As-Is)을 구체적으로
              기술합니다.
            </li>
            <li>
              &lsquo;개선점 및 AI 적용 가능성&rsquo; 칸에는 현행 방식의 개선 방향과 함께, AI
              도입·활용이 가능한 데이터의 발생 여부 또는 보유 현황을 감안한 적용 가능성을
              기술합니다.
            </li>
            <li>분석 과정에서 참고한 내부 자료가 있으면 PDF 로 첨부할 수 있습니다 (선택).</li>
          </ul>
        }
      />
    </FormSection>
  );
}
