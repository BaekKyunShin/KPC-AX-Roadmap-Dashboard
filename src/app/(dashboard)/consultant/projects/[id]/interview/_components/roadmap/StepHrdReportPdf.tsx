'use client';

import { useState } from 'react';

import { FormSection } from '@/components/forms/FormSection';
import { PdfUploadField } from '@/components/forms/PdfUploadField';
import { ExampleAccordion } from '@/components/forms/ExampleAccordion';
import { showErrorToast } from '@/lib/utils';

import { uploadInterviewAttachment } from '../../actions';
import type { RoadmapStepProps } from './types';
import type { RoadmapHrdReportPdf } from '@/lib/schemas/interview-roadmap';

interface StepHrdReportPdfProps extends RoadmapStepProps<RoadmapHrdReportPdf | null> {
  /** 업로드 대상 프로젝트 ID. uploadInterviewAttachment Server Action 호출에 사용. */
  projectId: string;
}

/**
 * Ⅱ-1 HRD이음 진단 보고서 PDF 첨부 — [PDF 첨부]
 *
 * - 업로드 시 `uploadInterviewAttachment` Server Action 을 호출해 Storage 업로드 +
 *   PDF 본문 추출까지 수행한다.
 * - 반환되는 snake_case `HrdReportAttachment` 를 camelCase `RoadmapHrdReportPdf`
 *   (fileName / url / size + 내부 extractedText / parseError) 로 변환해 onChange 에 주입한다.
 * - extractedText / parseError 는 LLM 프롬프트가 사용하는 내부 필드이며 UI 에는 노출하지 않는다.
 * - 제거 시 onChange(null). Storage 정리는 Task 2.3-d (자동저장 통합) 에서 처리한다.
 */
export function StepHrdReportPdf({
  value,
  onChange,
  readOnly = false,
  projectId,
}: StepHrdReportPdfProps) {
  const [isUploading, setIsUploading] = useState(false);

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
      onChange({
        fileName: att.file_name,
        // upload Action 은 storage_path 만 반환한다. 미리보기 signed URL 은
        // Task 2.3-d 의 자동저장 통합 시점에 별도 helper 로 부여한다. 그 전까지는
        // storage_path 를 url 자리에 둬 스키마 (`url: string.min(1)`) 를 통과시킨다.
        url: att.storage_path,
        size: att.size ?? file.size,
        ...(att.extracted_text != null ? { extractedText: att.extracted_text } : {}),
        ...(att.parse_error ? { parseError: att.parse_error } : {}),
      });
    } catch (error) {
      console.error('[StepHrdReportPdf] upload error', error);
      showErrorToast('파일 업로드 중 오류가 발생했습니다.');
    } finally {
      setIsUploading(false);
    }
  }

  function handleRemove() {
    if (readOnly) return;
    onChange(null);
  }

  return (
    <FormSection
      number="Ⅱ-1"
      title="HRD이음 진단 보고서 PDF 첨부"
      label="[PDF 첨부]"
      description="훈련수요 진단 보고서(PDF) 를 업로드하면 본문이 자동 추출되어 LLM 분석에 활용됩니다."
    >
      <PdfUploadField
        file={
          value
            ? {
                name: value.fileName,
                size: value.size,
                // url 자리에 storage_path 만 있을 때는 미리보기 링크 노출이 의미 없으므로 생략
                url: value.url.startsWith('http') ? value.url : undefined,
              }
            : null
        }
        onFileSelect={handleFileSelect}
        onRemove={handleRemove}
        disabled={readOnly || isUploading}
        accept=".pdf"
      />
      {value?.parseError && (
        <p
          role="alert"
          className="text-xs text-amber-600"
        >
          PDF 본문 자동 추출 실패: {value.parseError}. LLM 분석은 제한적으로 수행됩니다.
        </p>
      )}
      <ExampleAccordion
        guide={
          <ul className="list-disc space-y-1 pl-4">
            <li>HRD이음 진단 보고서 (PDF) 1건만 업로드합니다.</li>
            <li>업로드 즉시 본문 텍스트가 자동 추출되어 LLM 프롬프트에 함께 전달됩니다.</li>
            <li>최대 10MB. PDF 외 형식은 허용되지 않습니다.</li>
          </ul>
        }
      />
    </FormSection>
  );
}
