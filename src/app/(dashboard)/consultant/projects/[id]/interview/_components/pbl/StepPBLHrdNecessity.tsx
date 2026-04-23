'use client';

import { useRef, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { FormField } from '@/components/ui/form-field';
import { GuideNote } from '@/components/ui/guide-note';
import {
  Download,
  FileWarning,
  Loader2,
  Paperclip,
  Plus,
  Trash2,
} from 'lucide-react';
import { showErrorToast, showSuccessToast } from '@/lib/utils/toast';
import {
  createEmptyTrainingHistoryItem,
  createEmptySupportHistoryItem,
  createEmptyRecommendation,
  type PBLHrdNecessity,
} from '@/lib/schemas/interview-pbl';
import type { HrdReportAttachment } from '@/lib/schemas/interview-roadmap';

interface StepPBLHrdNecessityProps {
  value: PBLHrdNecessity;
  onChange: (next: PBLHrdNecessity) => void;
  /** Ⅱ-3-가 HRD이음컨설팅 결과 PDF 업로드 (Server Action prebound). 미전달 시 첨부 섹션 자체를 숨긴다. */
  onUploadHrdReport?: (
    file: File,
  ) => Promise<
    | { success: true; data: HrdReportAttachment }
    | { success: false; error: string }
  >;
  /** 첨부 삭제 Server Action. onUploadHrdReport 와 쌍으로 주입. */
  onRemoveHrdReport?: (
    storagePath: string,
  ) => Promise<{ success: boolean; error?: string }>;
  /** 첨부 다운로드 signed URL 발급 (선택). */
  onDownloadHrdReport?: (
    storagePath: string,
  ) => Promise<{ url: string } | null>;
}

const MAX_RECOMMENDATIONS = 3;

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

export default function StepPBLHrdNecessity({
  value,
  onChange,
  onUploadHrdReport,
  onRemoveHrdReport,
  onDownloadHrdReport,
}: StepPBLHrdNecessityProps) {
  const hrdFileInputRef = useRef<HTMLInputElement | null>(null);
  const [isHrdUploading, setIsHrdUploading] = useState(false);

  const handleHrdFileSelect = async (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !onUploadHrdReport) return;

    // ISSUE-14 PBL 확장: PDF 단일 허용 (HWPX 제외 — LLM 파싱 필요)
    if (file.type !== 'application/pdf') {
      showErrorToast(
        '지원하지 않는 형식',
        'HRD이음 보고서는 PDF 파일만 업로드할 수 있습니다.',
      );
      return;
    }

    setIsHrdUploading(true);
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
      setIsHrdUploading(false);
    }
  };

  const handleHrdRemove = async () => {
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

  const handleHrdDownload = async () => {
    const att = value.hrd_report_attachment;
    if (!att || !onDownloadHrdReport) return;
    const result = await onDownloadHrdReport(att.storage_path);
    if (result?.url) {
      window.open(result.url, '_blank', 'noopener,noreferrer');
    } else {
      showErrorToast('다운로드 실패', '미리보기 URL을 가져오지 못했습니다.');
    }
  };

  // ---- 훈련 이력 (training_history) ----
  const updateTrainingHistory = (
    index: number,
    next: Partial<PBLHrdNecessity['training_history'][number]>
  ) => {
    const training_history = value.training_history.map((item, i) =>
      i === index ? { ...item, ...next } : item
    );
    onChange({ ...value, training_history });
  };
  const addTrainingHistory = () => {
    onChange({
      ...value,
      training_history: [...value.training_history, createEmptyTrainingHistoryItem()],
    });
  };
  const removeTrainingHistory = (index: number) => {
    onChange({
      ...value,
      training_history: value.training_history.filter((_, i) => i !== index),
    });
  };

  // ---- 지원 이력 (support_history) ----
  const updateSupportHistory = (
    index: number,
    next: Partial<PBLHrdNecessity['support_history'][number]>
  ) => {
    const support_history = value.support_history.map((item, i) =>
      i === index ? { ...item, ...next } : item
    );
    onChange({ ...value, support_history });
  };
  const addSupportHistory = () => {
    onChange({
      ...value,
      support_history: [...value.support_history, createEmptySupportHistoryItem()],
    });
  };
  const removeSupportHistory = (index: number) => {
    onChange({
      ...value,
      support_history: value.support_history.filter((_, i) => i !== index),
    });
  };

  // ---- 추천 과정 (recommendations) ----
  const updateRecommendation = (
    index: number,
    next: Partial<PBLHrdNecessity['recommendations'][number]>
  ) => {
    const recommendations = value.recommendations.map((item, i) =>
      i === index ? { ...item, ...next } : item
    );
    onChange({ ...value, recommendations });
  };
  const addRecommendation = () => {
    if (value.recommendations.length >= MAX_RECOMMENDATIONS) return;
    const nextRank =
      Math.min(value.recommendations.length + 1, MAX_RECOMMENDATIONS) || 1;
    onChange({
      ...value,
      recommendations: [
        ...value.recommendations,
        { ...createEmptyRecommendation(), rank: nextRank },
      ],
    });
  };
  const removeRecommendation = (index: number) => {
    onChange({
      ...value,
      recommendations: value.recommendations.filter((_, i) => i !== index),
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-foreground">
          Ⅱ-3. AI 과정개발의 필요성
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          산인공 양식 Ⅱ-3 (양식 2번 6p). 훈련 실시·지원 이력, 추천훈련사업, AI훈련과정 개발 필요성을 입력하세요.
        </p>
      </div>

      {/* Ⅱ-3-가. 기업HRD이음컨설팅 결과 PDF 업로드 (ISSUE-14 PBL 확장) */}
      {onUploadHrdReport ? (
        <section className="space-y-3">
          <div>
            <h3 className="text-sm font-semibold text-foreground">
              Ⅱ-3-가. 기업HRD이음컨설팅 결과 (전산 자동 표출 · 선택)
            </h3>
            <p className="text-xs text-muted-foreground mt-1 break-keep">
              기업HRD이음컨설팅 보고서 PDF 를 업로드하면 본문이 자동 추출되어 PBL 커리큘럼 생성에 반영됩니다 (최대 5000자 · 10MB).
            </p>
          </div>

          <Label className="sr-only" htmlFor="pbl-hrd-report-input">
            HRD이음컨설팅 결과 보고서 첨부
          </Label>

          {value.hrd_report_attachment ? (
            <div className="rounded-md border border-border bg-muted/20 p-3 flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-2 min-w-0 flex-1">
                <Paperclip className="h-4 w-4 text-muted-foreground shrink-0" />
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">
                    {value.hrd_report_attachment.file_name}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {value.hrd_report_attachment.mime_type ?? 'PDF'}
                    {value.hrd_report_attachment.size
                      ? ` · ${formatBytes(value.hrd_report_attachment.size)}`
                      : ''}
                    {value.hrd_report_attachment.extracted_text
                      ? ` · 본문 ${value.hrd_report_attachment.extracted_text.length}자 추출`
                      : ''}
                    {value.hrd_report_attachment.parse_error ? (
                      <span className="text-amber-600 ml-1">
                        <FileWarning className="inline w-3 h-3 mr-0.5" />
                        본문 추출 실패
                      </span>
                    ) : null}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                {onDownloadHrdReport && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={handleHrdDownload}
                  >
                    <Download className="h-4 w-4" />
                    다운로드
                  </Button>
                )}
                {onRemoveHrdReport && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={handleHrdRemove}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                    삭제
                  </Button>
                )}
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2 flex-wrap">
              <input
                id="pbl-hrd-report-input"
                ref={hrdFileInputRef}
                type="file"
                accept=".pdf,application/pdf"
                onChange={handleHrdFileSelect}
                className="sr-only"
                aria-label="HRD이음컨설팅 결과 보고서 첨부"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => hrdFileInputRef.current?.click()}
                disabled={isHrdUploading}
              >
                {isHrdUploading ? (
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
                PDF (최대 10MB)
              </span>
            </div>
          )}
        </section>
      ) : null}

      {/* 훈련 실시 이력 */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-foreground">훈련 실시 이력</h3>
            <p className="text-xs text-muted-foreground mt-1">
              참여사업·훈련과정명·훈련방법·훈련기간(일)을 행 단위로 입력하세요.
            </p>
          </div>
          <Button type="button" variant="outline" size="sm" onClick={addTrainingHistory}>
            <Plus className="w-4 h-4 mr-1" />
            이력 추가
          </Button>
        </div>

        {value.training_history.length === 0 ? (
          <p className="text-sm text-muted-foreground">등록된 훈련 이력이 없습니다.</p>
        ) : (
          <div className="space-y-3">
            {value.training_history.map((item, index) => (
              <div
                key={item.id}
                className="border border-border rounded-lg p-4 bg-muted/30"
              >
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-medium flex items-center">
                    <span className="w-6 h-6 rounded-full bg-primary/10 text-primary text-xs flex items-center justify-center mr-2">
                      {index + 1}
                    </span>
                    훈련 이력 {index + 1}
                  </span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    aria-label={`훈련 이력 ${index + 1} 삭제`}
                    onClick={() => removeTrainingHistory(index)}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="w-4 h-4 mr-1" />
                    삭제
                  </Button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField label="연번" htmlFor={`th-seq-${item.id}`}>
                    <Input
                      id={`th-seq-${item.id}`}
                      type="number"
                      min={0}
                      value={item.seq || ''}
                      onChange={(e) =>
                        updateTrainingHistory(index, {
                          seq: Number(e.target.value) || 0,
                        })
                      }
                    />
                  </FormField>
                  <FormField label="참여사업" htmlFor={`th-program-${item.id}`}>
                    <Input
                      id={`th-program-${item.id}`}
                      value={item.program}
                      onChange={(e) =>
                        updateTrainingHistory(index, { program: e.target.value })
                      }
                      placeholder="예: 재직자 향상훈련"
                    />
                  </FormField>
                  <FormField label="훈련과정명" htmlFor={`th-course-${item.id}`}>
                    <Input
                      id={`th-course-${item.id}`}
                      value={item.course_name}
                      onChange={(e) =>
                        updateTrainingHistory(index, { course_name: e.target.value })
                      }
                      placeholder="예: 스마트팩토리 기초"
                    />
                  </FormField>
                  <FormField label="훈련방법" htmlFor={`th-method-${item.id}`}>
                    <Input
                      id={`th-method-${item.id}`}
                      value={item.method}
                      onChange={(e) =>
                        updateTrainingHistory(index, { method: e.target.value })
                      }
                      placeholder="예: 집체(대면)"
                    />
                  </FormField>
                </div>
                <div className="mt-3">
                  <FormField label="훈련기간(일)" htmlFor={`th-duration-${item.id}`}>
                    <Input
                      id={`th-duration-${item.id}`}
                      type="number"
                      min={0}
                      value={item.duration_days || ''}
                      onChange={(e) =>
                        updateTrainingHistory(index, {
                          duration_days: Number(e.target.value) || 0,
                        })
                      }
                    />
                  </FormField>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* 훈련 지원 이력 */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-foreground">
              훈련 지원 이력
            </h3>
            <p className="text-xs text-muted-foreground mt-1">
              연도·연간 정부지원 한도금액(원)(A)·지원받은 금액(원)(B)·비율(B/A)을 입력하세요.
            </p>
          </div>
          <Button type="button" variant="outline" size="sm" onClick={addSupportHistory}>
            <Plus className="w-4 h-4 mr-1" />
            연도 추가
          </Button>
        </div>

        {value.support_history.length === 0 ? (
          <p className="text-sm text-muted-foreground">등록된 지원 이력이 없습니다.</p>
        ) : (
          <div className="space-y-3">
            {value.support_history.map((item, index) => (
              <div
                key={item.id}
                className="border border-border rounded-lg p-4 bg-muted/30"
              >
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-medium flex items-center">
                    <span className="w-6 h-6 rounded-full bg-primary/10 text-primary text-xs flex items-center justify-center mr-2">
                      {index + 1}
                    </span>
                    지원 이력 {index + 1}
                  </span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    aria-label={`지원 이력 ${index + 1} 삭제`}
                    onClick={() => removeSupportHistory(index)}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="w-4 h-4 mr-1" />
                    삭제
                  </Button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField label="연도" htmlFor={`sh-year-${item.id}`}>
                    <Input
                      id={`sh-year-${item.id}`}
                      value={item.year}
                      onChange={(e) =>
                        updateSupportHistory(index, { year: e.target.value })
                      }
                      placeholder="예: 2025"
                    />
                  </FormField>
                  <FormField
                    label="연간 정부지원 한도금액(원) (A)"
                    htmlFor={`sh-limit-${item.id}`}
                  >
                    <Input
                      id={`sh-limit-${item.id}`}
                      type="number"
                      min={0}
                      value={item.annual_limit || ''}
                      onChange={(e) =>
                        updateSupportHistory(index, {
                          annual_limit: Number(e.target.value) || 0,
                        })
                      }
                    />
                  </FormField>
                  <FormField
                    label="지원받은 금액(원) (B)"
                    htmlFor={`sh-supported-${item.id}`}
                  >
                    <Input
                      id={`sh-supported-${item.id}`}
                      type="number"
                      min={0}
                      value={item.supported || ''}
                      onChange={(e) =>
                        updateSupportHistory(index, {
                          supported: Number(e.target.value) || 0,
                        })
                      }
                    />
                  </FormField>
                  <FormField label="비율(B/A)" htmlFor={`sh-ratio-${item.id}`}>
                    <Input
                      id={`sh-ratio-${item.id}`}
                      value={item.ratio}
                      onChange={(e) =>
                        updateSupportHistory(index, { ratio: e.target.value })
                      }
                      placeholder="예: 60%"
                    />
                  </FormField>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* 추천훈련사업 */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-foreground">추천훈련사업</h3>
            <p className="text-xs text-muted-foreground mt-1">
              추천 순위(1~3)·훈련사업명·HRD 제안(적합 훈련 및 과정 제안)을 입력하세요. (최대 {MAX_RECOMMENDATIONS}개)
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={addRecommendation}
            disabled={value.recommendations.length >= MAX_RECOMMENDATIONS}
          >
            <Plus className="w-4 h-4 mr-1" />
            추천 추가
          </Button>
        </div>

        {value.recommendations.length === 0 ? (
          <p className="text-sm text-muted-foreground">등록된 추천 과정이 없습니다.</p>
        ) : (
          <div className="space-y-3">
            {value.recommendations.map((item, index) => (
              <div
                key={item.id}
                className="border border-border rounded-lg p-4 bg-muted/30"
              >
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-medium flex items-center">
                    <span className="w-6 h-6 rounded-full bg-primary/10 text-primary text-xs flex items-center justify-center mr-2">
                      {index + 1}
                    </span>
                    추천 {index + 1}
                  </span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    aria-label={`추천 ${index + 1} 삭제`}
                    onClick={() => removeRecommendation(index)}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="w-4 h-4 mr-1" />
                    삭제
                  </Button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField label="추천 순위" htmlFor={`rec-rank-${item.id}`}>
                    <Input
                      id={`rec-rank-${item.id}`}
                      type="number"
                      min={1}
                      max={3}
                      value={item.rank || ''}
                      onChange={(e) =>
                        updateRecommendation(index, {
                          rank: Math.min(
                            3,
                            Math.max(1, Number(e.target.value) || 1)
                          ),
                        })
                      }
                    />
                  </FormField>
                  <FormField label="훈련사업명" htmlFor={`rec-program-${item.id}`}>
                    <Input
                      id={`rec-program-${item.id}`}
                      value={item.program}
                      onChange={(e) =>
                        updateRecommendation(index, { program: e.target.value })
                      }
                      placeholder="예) 체계적 현장훈련(S-OJT)"
                    />
                  </FormField>
                </div>
                <div className="mt-3">
                  <FormField
                    label="HRD 제안 (적합 훈련 및 과정 제안)"
                    htmlFor={`rec-proposal-${item.id}`}
                  >
                    <Textarea
                      id={`rec-proposal-${item.id}`}
                      rows={3}
                      value={item.proposal}
                      onChange={(e) =>
                        updateRecommendation(index, { proposal: e.target.value })
                      }
                      placeholder="제안 배경 및 기대효과"
                      className="break-keep"
                    />
                  </FormField>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* AI훈련과정 개발 필요성 */}
      <FormField
        label="AI훈련과정 개발 필요성"
        htmlFor="hrd-necessity"
        required
        hint="불릿 스타일로 개발이 필요한 근거를 정리하세요."
      >
        <Textarea
          id="hrd-necessity"
          rows={7}
          value={value.course_development_necessity}
          onChange={(e) =>
            onChange({ ...value, course_development_necessity: e.target.value })
          }
          placeholder={'예) - 기존 과정의 AI 실습 부재\n- 현업 데이터 기반 커스텀 실습 필요\n- 사내 전문가와 연계한 PBL 형식 요구'}
          className="break-keep"
        />
      </FormField>

      <GuideNote
        items={[
          '기업HRD이음컨설팅에서 제시된 결과와 연계하여 작성 필요',
          "기업HRD이음컨설팅 외에도 'Ⅱ. 훈련 요구분석' 및 기업관계자 면담 등을 통해 파악한 내용(AI 업무적용 니즈 등)을 과정개발의 필요성으로 함께 제시할 것",
        ]}
      />
    </div>
  );
}
