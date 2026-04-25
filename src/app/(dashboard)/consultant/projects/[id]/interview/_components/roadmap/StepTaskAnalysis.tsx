'use client';

import { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';

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
 * 양식 기준 입력 항목:
 *  - 동적 행 표 (직무·과업·As-Is·문제점·데이터 발생시점·AI 도입·활용 필요도 1~5)
 *  - 분석내용 (자유 서술)
 *  - 선택: 분석 노트 추가 첨부 (PDF)
 *
 * 데이터 슬라이스 3개를 composite value 로 함께 편집한다.
 */

export interface StepTaskAnalysisValue {
  taskAnalysis: RoadmapInterviewStrict['taskAnalysis'];
  taskAnalysisNote: RoadmapInterviewStrict['taskAnalysisNote'];
  taskAnalysisAttachment?: RoadmapInterviewStrict['taskAnalysisAttachment'];
}

interface StepTaskAnalysisProps extends RoadmapStepProps<StepTaskAnalysisValue> {
  /** 업로드 대상 프로젝트 ID — 분석 노트 PDF 첨부 시 uploadInterviewAttachment 호출에 사용 */
  projectId: string;
}

/** 빈 과업 행 */
function emptyItem(): RoadmapTaskAnalysisItem {
  return {
    domain: '',
    task: '',
    asIs: '',
    problem: '',
    dataTiming: '',
    aiScore: 3,
  };
}

/** 초기 5행 기본 (양식 L279 준수) */
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
    value.taskAnalysis && value.taskAnalysis.length > 0
      ? value.taskAnalysis
      : defaultRows();
  const note = value.taskAnalysisNote ?? '';
  const attachment: RoadmapTaskAnalysisAttachment | null =
    value.taskAnalysisAttachment ?? null;

  function emit(patch: Partial<StepTaskAnalysisValue>) {
    onChange({
      taskAnalysis: rows,
      taskAnalysisNote: note,
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

  function onScoreChange(idx: number, raw: string) {
    // 빈 입력은 그대로 유지 (타이핑 중 UX 고려) — 저장 시 Zod 가 검증
    if (raw === '') {
      updateRow(idx, { aiScore: Number.NaN });
      return;
    }
    const parsed = Number(raw);
    if (Number.isNaN(parsed)) return;
    // 정수만 허용 (소수 입력 차단)
    if (!Number.isInteger(parsed)) return;
    updateRow(idx, { aiScore: parsed });
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
        ...(att.extracted_text != null
          ? { extractedText: att.extracted_text }
          : {}),
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
      description="직무별 주요 과업을 식별하고 현행 수행방식·문제점·AI 도입 필요도를 구조적으로 분석합니다."
    >
      {/* 분석 표 ---------------------------------------------------------- */}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse border border-border text-sm">
          <caption className="sr-only">과업·워크플로우 분석 표</caption>
          <thead>
            <tr>
              <th scope="col" className="w-[120px] border border-border bg-muted px-2 py-2 text-center font-semibold">
                직무
              </th>
              <th scope="col" className="w-[140px] border border-border bg-muted px-2 py-2 text-center font-semibold">
                과업(Task)
              </th>
              <th scope="col" className="border border-border bg-muted px-2 py-2 text-center font-semibold">
                현행 방식 (As-Is)
              </th>
              <th scope="col" className="border border-border bg-muted px-2 py-2 text-center font-semibold">
                문제점
              </th>
              <th scope="col" className="border border-border bg-muted px-2 py-2 text-center font-semibold">
                데이터 발생 시점 / 보유 현황
              </th>
              <th scope="col" className="w-[90px] border border-border bg-muted px-2 py-2 text-center font-semibold">
                AI 필요도
                <span className="block text-xs font-normal text-muted-foreground">
                  (1~5)
                </span>
              </th>
              <th scope="col" className="w-[56px] border border-border bg-muted px-2 py-2 text-center font-semibold">
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
                    minHeightClassName="min-h-[60px]"
                  />
                </td>
                <td className="border border-border p-1 align-top">
                  <LargeTextBox
                    value={row.task}
                    onChange={(e) => updateRow(idx, { task: e.target.value })}
                    placeholder="과업"
                    disabled={readOnly}
                    aria-label={`과업 ${idx + 1}`}
                    minHeightClassName="min-h-[60px]"
                  />
                </td>
                <td className="border border-border p-1 align-top">
                  <LargeTextBox
                    value={row.asIs}
                    onChange={(e) => updateRow(idx, { asIs: e.target.value })}
                    placeholder="현행 수행방식"
                    disabled={readOnly}
                    aria-label={`현행 방식 ${idx + 1}`}
                    minHeightClassName="min-h-[60px]"
                  />
                </td>
                <td className="border border-border p-1 align-top">
                  <LargeTextBox
                    value={row.problem}
                    onChange={(e) => updateRow(idx, { problem: e.target.value })}
                    placeholder="문제점"
                    disabled={readOnly}
                    aria-label={`문제점 ${idx + 1}`}
                    minHeightClassName="min-h-[60px]"
                  />
                </td>
                <td className="border border-border p-1 align-top">
                  <LargeTextBox
                    value={row.dataTiming}
                    onChange={(e) =>
                      updateRow(idx, { dataTiming: e.target.value })
                    }
                    placeholder="데이터 발생 시점/보유 현황"
                    disabled={readOnly}
                    aria-label={`데이터 발생 시점 ${idx + 1}`}
                    minHeightClassName="min-h-[60px]"
                  />
                </td>
                <td className="border border-border p-1 align-top">
                  <input
                    type="number"
                    min={1}
                    max={5}
                    step={1}
                    value={
                      Number.isNaN(row.aiScore) || row.aiScore == null
                        ? ''
                        : row.aiScore
                    }
                    onChange={(e) => onScoreChange(idx, e.target.value)}
                    disabled={readOnly}
                    aria-label={`AI 도입·활용 필요도 ${idx + 1}`}
                    className="h-10 w-full rounded-md border border-input bg-background px-2 text-center text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                  />
                </td>
                <td className="border border-border p-1 text-center align-top">
                  <button
                    type="button"
                    onClick={() => removeRow(idx)}
                    disabled={readOnly || rows.length <= 1}
                    aria-label={`행 삭제 ${idx + 1}`}
                    className="inline-flex h-9 w-9 items-center justify-center rounded text-muted-foreground hover:bg-muted disabled:opacity-30"
                  >
                    <Trash2 className="size-4" />
                  </button>
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

      {/* 분석내용 ---------------------------------------------------------- */}
      <div className="space-y-2">
        <h3 className="text-sm font-semibold">분석내용</h3>
        <LargeTextBox
          value={note}
          onChange={(e) => emit({ taskAnalysisNote: e.target.value })}
          placeholder="과업·워크플로우 분석 결과에 대한 총평 및 시사점을 자유롭게 서술하세요..."
          disabled={readOnly}
          aria-label="분석내용"
        />
      </div>

      {/* 선택 첨부 --------------------------------------------------------- */}
      <div className="space-y-2">
        <h3 className="text-sm font-semibold">
          분석 노트 추가 첨부
          <span className="ml-2 text-xs font-normal text-muted-foreground">
            (선택 · PDF)
          </span>
        </h3>
        <PdfUploadField
          file={
            attachment
              ? {
                  name: attachment.fileName,
                  size: 0,
                  url: attachment.url.startsWith('http')
                    ? attachment.url
                    : undefined,
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
        guide={
          <ul className="list-disc space-y-1 pl-4">
            <li>
              직무별 주요 과업을 5개 내외로 식별하고, 각 과업의 현행 수행방식(As-Is)·문제점·관련 데이터 발생 시점/보유 현황을 구체적으로 기술합니다.
            </li>
            <li>AI 도입·활용 필요도는 1(낮음) ~ 5(높음) 정수로 평가합니다.</li>
            <li>분석 과정에서 참고한 내부 자료가 있으면 PDF 로 첨부할 수 있습니다 (선택).</li>
          </ul>
        }
      />
    </FormSection>
  );
}
