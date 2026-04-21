'use client';

import { useRef, useState } from 'react';
import { Loader2, Paperclip, Trash2, Download } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { FieldError } from '@/components/ui/field-error';
import { FormField } from '@/components/ui/form-field';
import { GuideNote } from '@/components/ui/guide-note';
import { showErrorToast, showSuccessToast } from '@/lib/utils/toast';
import {
  AI_COMPETENCY_LEVEL_OPTIONS,
  type AiCompetencyLevel,
  type Overview,
} from '@/lib/schemas/interview-roadmap';

interface StepOverviewProps {
  value: Overview;
  onChange: (next: Overview) => void;
  errors?: Partial<Record<keyof Overview, string>>;
  /** HRD이음 첨부 업로드 핸들러 (Server Action). projectId를 prebound한 함수 */
  onUploadHrdReport?: (file: File) => Promise<
    | { success: true; data: NonNullable<Overview['hrd_report_attachment']> }
    | { success: false; error: string }
  >;
  /** HRD이음 첨부 삭제 핸들러 */
  onRemoveHrdReport?: (storagePath: string) => Promise<{ success: boolean; error?: string }>;
  /** HRD이음 첨부 다운로드 URL 발급 */
  onDownloadHrdReport?: (storagePath: string) => Promise<{ url: string } | null>;
}

const TEXT_FIELDS: ReadonlyArray<{
  key: 'establishment_necessity' | 'selected_tasks_summary' | 'roadmap_summary';
  label: string;
  hint: string;
  placeholder: string;
  rows: number;
}> = [
  {
    key: 'establishment_necessity',
    label: '수립 필요성',
    hint: '해당 과업(또는 워크플로우) 선정 이유 및 AI 적용의 필요성 (양식 Ⅰ-1, 5줄 내외)',
    placeholder:
      '예) 제조 공정의 품질검사 업무에서 인력 의존도가 높아 품질 편차가 발생하고 있다.\nAI 비전 검사 도입으로 1차 스크리닝을 자동화하면 작업자 부담이 줄고 품질 편차 또한 줄어들 것으로 기대된다.',
    rows: 6,
  },
  {
    key: 'selected_tasks_summary',
    label: '선정 과업',
    hint: '훈련 대상으로 확정된 과업을 간단히 나열 (양식 Ⅰ-3)',
    placeholder: '예) 1) 품질검사 1차 스크리닝 자동화  2) 월간 보고서 초안 생성  3) 현장 설비 이상 감지',
    rows: 5,
  },
  {
    key: 'roadmap_summary',
    label: 'AI훈련로드맵 수립 주요내용 (요약)',
    hint: '훈련요구 분석 및 로드맵 수립 결과를 1장 이내로 요약 (양식 Ⅰ-3)',
    placeholder:
      '예) 전사 3단계 AI 인력 양성 로드맵(기초/탐구/활용). 생산기술팀 15명 대상. 집체 + 원격 혼합. 2026 상반기 기초 과정 시작.',
    rows: 6,
  },
];

function formatBytes(bytes?: number): string {
  if (!bytes || bytes <= 0) return '';
  const units = ['B', 'KB', 'MB', 'GB'];
  let i = 0;
  let v = bytes;
  while (v >= 1024 && i < units.length - 1) {
    v /= 1024;
    i++;
  }
  return `${v.toFixed(v >= 10 ? 0 : 1)} ${units[i]}`;
}

export default function StepOverview({
  value,
  onChange,
  errors,
  onUploadHrdReport,
  onRemoveHrdReport,
  onDownloadHrdReport,
}: StepOverviewProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const handleText = (
    key: 'establishment_necessity' | 'selected_tasks_summary' | 'roadmap_summary',
    next: string,
  ) => {
    onChange({ ...value, [key]: next });
  };

  const handleLevel = (next: AiCompetencyLevel) => {
    onChange({ ...value, ai_competency_level: next });
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ''; // 같은 파일 재선택 허용
    if (!file || !onUploadHrdReport) return;

    setIsUploading(true);
    try {
      const result = await onUploadHrdReport(file);
      if (result.success) {
        onChange({ ...value, hrd_report_attachment: result.data });
        showSuccessToast('업로드 완료', `${file.name} (${formatBytes(file.size)})`);
      } else {
        showErrorToast('업로드 실패', result.error);
      }
    } catch {
      showErrorToast('업로드 실패', '서버와 통신 중 오류가 발생했습니다.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleRemoveAttachment = async () => {
    const att = value.hrd_report_attachment;
    if (!att || !onRemoveHrdReport) return;
    if (!confirm(`"${att.file_name}" 첨부를 삭제하시겠습니까?`)) return;

    const result = await onRemoveHrdReport(att.storage_path);
    if (result.success) {
      onChange({ ...value, hrd_report_attachment: undefined });
      showSuccessToast('삭제 완료', '첨부 파일이 삭제되었습니다.');
    } else {
      showErrorToast('삭제 실패', result.error || '서버 오류가 발생했습니다.');
    }
  };

  const handleDownload = async () => {
    const att = value.hrd_report_attachment;
    if (!att || !onDownloadHrdReport) return;
    const result = await onDownloadHrdReport(att.storage_path);
    if (result?.url) {
      window.open(result.url, '_blank', 'noopener,noreferrer');
    } else {
      showErrorToast('다운로드 실패', '미리보기 URL을 가져오지 못했습니다.');
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-foreground">Ⅰ. 개요</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          산업인력공단 AI훈련로드맵 양식 Ⅰ장. 수립 필요성, 주요 활동, 주요 결과를 입력하세요.
        </p>
      </div>

      <div className="space-y-5">
        {TEXT_FIELDS.map(({ key, label, hint, placeholder, rows }) => {
          const errorMsg = errors?.[key];
          const fieldId = `ov-${key}`;
          return (
            <div key={key} className="space-y-2">
              <FormField
                label={label}
                htmlFor={fieldId}
                required
                hint={hint}
                error={errorMsg}
              >
                <Textarea
                  id={fieldId}
                  rows={rows}
                  value={value[key] ?? ''}
                  onChange={(e) => handleText(key, e.target.value)}
                  placeholder={placeholder}
                  aria-invalid={Boolean(errorMsg) || undefined}
                  className="break-keep"
                />
              </FormField>
              {key === 'establishment_necessity' && (
                <GuideNote
                  items={[
                    '컨설팅 대상 기업의 경영진 또는 담당자(내부전문가)와 인터뷰 등을 통해 파악한 AI훈련로드맵 수립을 위해 해당 과업(또는 워크플로우) 선정 이유 및 AI 적용의 필요성 작성(5줄 내외로 간단히 기술)',
                  ]}
                />
              )}
              {key === 'roadmap_summary' && (
                <GuideNote
                  items={[
                    '뒤쪽에서 작성된 훈련요구 분석 및 로드맵 수립 결과를 한 번에 확인할 수 있도록 1장 이내로 요약하여 작성',
                  ]}
                />
              )}
            </div>
          );
        })}

        <fieldset>
          <legend className="mb-1 block text-sm font-medium">
            기업 AI 역량 수준 <span className="text-destructive">*</span>
          </legend>
          <p className="text-xs text-muted-foreground mb-2">
            (초급) AI기초형 / (중급) AI탐구형 / (고급) AI활용형·선도형 중 선택 (양식 Ⅰ-3)
          </p>
          <div
            role="radiogroup"
            aria-label="AI 역량 수준"
            aria-invalid={Boolean(errors?.ai_competency_level) || undefined}
            className="flex flex-col gap-2 sm:flex-row sm:gap-4"
          >
            {AI_COMPETENCY_LEVEL_OPTIONS.map(({ value: level, label, subtitle }) => {
              const inputId = `ov-level-${level}`;
              const checked = value.ai_competency_level === level;
              return (
                <label
                  key={level}
                  htmlFor={inputId}
                  className={`flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-sm transition-colors ${
                    checked
                      ? 'border-primary bg-primary/5 text-foreground'
                      : 'border-border bg-background hover:bg-muted/50'
                  }`}
                >
                  <input
                    id={inputId}
                    type="radio"
                    name="ai_competency_level"
                    value={level}
                    checked={checked}
                    onChange={() => handleLevel(level)}
                    className="h-4 w-4 accent-primary"
                  />
                  <span className="font-medium">{label}</span>
                  <span className="text-xs text-muted-foreground">({subtitle})</span>
                </label>
              );
            })}
          </div>
          <FieldError message={errors?.ai_competency_level} />
        </fieldset>

        <div>
          <Label className="mb-1 block">
            기업HRD이음컨설팅 보고서 (AI역량 진단 결과 · 선택)
          </Label>
          <p className="text-xs text-muted-foreground mb-2">
            기업HRD이음컨설팅 보고서의 AI역량 진단 결과 내용을 첨부하세요(별도 작성 불요). 로드맵 생성 시 LLM 프롬프트에서 첨부 파일이 있다는 사실을 함께 안내합니다 (양식 Ⅱ-1).
          </p>

          {value.hrd_report_attachment ? (
            <div className="rounded-md border border-border bg-muted/20 p-3 flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-2 min-w-0 flex-1">
                <Paperclip className="h-4 w-4 text-muted-foreground shrink-0" />
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">
                    {value.hrd_report_attachment.file_name}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {value.hrd_report_attachment.mime_type ?? '파일'}
                    {value.hrd_report_attachment.size
                      ? ` · ${formatBytes(value.hrd_report_attachment.size)}`
                      : ''}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                {onDownloadHrdReport && (
                  <Button type="button" variant="ghost" size="sm" onClick={handleDownload}>
                    <Download className="h-4 w-4" />
                    다운로드
                  </Button>
                )}
                {onRemoveHrdReport && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={handleRemoveAttachment}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                    삭제
                  </Button>
                )}
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.hwpx,.hwp,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.webp,application/pdf"
                onChange={handleFileSelect}
                className="hidden"
                aria-label="HRD이음 진단 보고서 첨부"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading || !onUploadHrdReport}
              >
                {isUploading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                    업로드 중…
                  </>
                ) : (
                  <>
                    <Paperclip className="h-4 w-4 mr-1" />
                    파일 선택
                  </>
                )}
              </Button>
              <span className="text-xs text-muted-foreground">
                PDF · HWPX · DOCX · XLSX · 이미지 (최대 20MB)
              </span>
            </div>
          )}
          <FieldError message={errors?.hrd_report_attachment} />
        </div>
      </div>

      <GuideNote
        items={[
          '본 장은 AI훈련로드맵 수립의 필요성, 주요 활동, 주요 결과를 한 눈에 제시하고자 하는 목적을 가지고 있음',
        ]}
      />
    </div>
  );
}
