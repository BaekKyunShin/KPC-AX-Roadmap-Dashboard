'use client';

import { useState } from 'react';

import { FormSection } from '@/components/forms/FormSection';
import { PdfUploadField } from '@/components/forms/PdfUploadField';
import { ExampleAccordion } from '@/components/forms/ExampleAccordion';
import { showErrorToast } from '@/lib/utils';

import { uploadInterviewAttachment } from '../../actions';
import type { PBLStepProps } from './types';
import type { PBLHrdReportPdf } from '@/lib/schemas/interview-pbl';

interface StepHrdReportPdfProps
  extends PBLStepProps<PBLHrdReportPdf | null> {
  projectId: string;
}

/**
 * Ⅱ-3-가 HRD이음컨설팅 결과 PDF 첨부 — [PDF 첨부]
 *
 * 로드맵 V2 의 StepHrdReportPdf 와 거의 동일. 스키마만 `PBLHrdReportPdf` 사용.
 *
 * - 업로드 시 `uploadInterviewAttachment` Server Action 호출 → Storage 업로드 +
 *   PDF 본문 추출.
 * - 반환되는 snake_case `HrdReportAttachment` 를 camelCase `PBLHrdReportPdf`
 *   (fileName / url / size + 내부 extractedText / parseError) 로 변환.
 * - extractedText / parseError 는 LLM 프롬프트 전용 내부 필드 — UI 노출 금지.
 * - 첨부 선택적 — null 허용 (단, courseNecessity 가 비어있으면 strict 제출 차단).
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
        // upload Action 은 storage_path 를 반환한다. 미리보기 signed URL 은
        // page.tsx 의 hydration 시 별도 helper 로 부여한다.
        url: att.storage_path,
        size: att.size ?? file.size,
        ...(att.extracted_text != null
          ? { extractedText: att.extracted_text }
          : {}),
        ...(att.parse_error ? { parseError: att.parse_error } : {}),
      });
    } catch (error) {
      console.error('[PBL StepHrdReportPdf] upload error', error);
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
      number="Ⅱ-3-가"
      title="기업HRD이음컨설팅 결과 (PDF 첨부)"
      label="[PDF 첨부]"
      description="HRD이음 컨설팅 결과 보고서(PDF) 를 업로드하면 본문이 자동 추출되어 LLM 분석에 활용됩니다. (선택 첨부 — 단, 미첨부 시 Ⅱ-3-나 'AI훈련과정 개발 필요성' 작성 필수)"
    >
      <PdfUploadField
        file={
          value
            ? {
                name: value.fileName,
                size: value.size,
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
        <p role="alert" className="text-xs text-amber-600">
          PDF 본문 자동 추출 실패: {value.parseError}. LLM 분석은 제한적으로 수행됩니다.
        </p>
      )}
      <ExampleAccordion
        guide={
          <ul className="list-disc space-y-1 pl-4">
            <li>HRD이음 컨설팅 결과 보고서 (PDF) 1건만 업로드합니다.</li>
            <li>업로드 즉시 본문 텍스트가 자동 추출되어 LLM 프롬프트에 함께 전달됩니다.</li>
            <li>최대 10MB · PDF 외 형식은 허용되지 않습니다.</li>
            <li>
              PDF 를 첨부하지 않으려면 Ⅱ-3-나 &ldquo;AI훈련과정 개발 필요성&rdquo; 을 반드시
              작성해야 합니다 (최종 제출 검증).
            </li>
          </ul>
        }
      />
    </FormSection>
  );
}
