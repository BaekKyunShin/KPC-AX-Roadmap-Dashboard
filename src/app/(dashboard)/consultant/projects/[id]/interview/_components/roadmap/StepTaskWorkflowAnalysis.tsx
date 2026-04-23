'use client';

import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { FormField } from '@/components/ui/form-field';
import { GuideNote } from '@/components/ui/guide-note';
import { Plus, Trash2 } from 'lucide-react';
import {
  createEmptyTaskWorkflowItem,
  type AnalysisNotes,
  type HrdReportAttachment,
  type TaskWorkflowItem,
} from '@/lib/schemas/interview-roadmap';
import { AttachmentFileList } from '@/components/interview/AttachmentFileList';
import { AI_NECESSITY_LABELS, AI_NECESSITY_OPTIONS } from '@/lib/constants/interview';

interface StepTaskWorkflowAnalysisProps {
  items: TaskWorkflowItem[];
  onChange: (next: TaskWorkflowItem[]) => void;
  analysisNotes: AnalysisNotes;
  onAnalysisNotesChange: (next: AnalysisNotes) => void;
  /**
   * 분석 노트 첨부 업로드 콜백 — `uploadInterviewAttachment(projectId, formData)` 래퍼.
   * Storage 업로드 + 본문 파싱(file-parser) 결과를 그대로 반환한다.
   */
  onUploadAttachment: (
    file: File,
  ) => Promise<{ success: true; data: HrdReportAttachment } | { success: false; error: string }>;
  /**
   * 분석 노트 첨부 삭제 콜백 — `removeInterviewAttachment(projectId, storagePath)` 래퍼.
   */
  onRemoveAttachment: (
    storagePath: string,
  ) => Promise<{ success: true } | { success: false; error: string }>;
}

export default function StepTaskWorkflowAnalysis({
  items,
  onChange,
  analysisNotes,
  onAnalysisNotesChange,
  onUploadAttachment,
  onRemoveAttachment,
}: StepTaskWorkflowAnalysisProps) {
  const updateItem = <K extends keyof TaskWorkflowItem>(
    index: number,
    key: K,
    value: TaskWorkflowItem[K],
  ) => {
    const next = items.map((item, i) => (i === index ? { ...item, [key]: value } : item));
    onChange(next);
  };

  const addItem = () => {
    onChange([...items, createEmptyTaskWorkflowItem()]);
  };

  const removeItem = (index: number) => {
    if (items.length <= 1) return;
    onChange(items.filter((_, i) => i !== index));
  };

  // ISSUE-14 Step C-5: attachment_files 를 AttachmentFileList 공용 컴포넌트로 정식화.
  // 업로드는 uploadInterviewAttachment(Server Action)에서 Storage 업로드 + file-parser 본문 추출까지
  // 한 번에 처리하고, 결과 메타(extracted_text 또는 parse_error)가 LLM 프롬프트에 자동 반영된다.

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Ⅱ-3. 과업(Task)·워크플로우 분석</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            과업·워크플로우 분석표. 직무별 과업의 현행 방식과 문제점, 데이터 발생 시점(또는 데이터 보유현황),
            AI도입·활용 필요도(1~5점 척도)를 분석하세요.
          </p>
        </div>
        <Button type="button" variant="outline" size="sm" onClick={addItem}>
          <Plus className="w-4 h-4 mr-1" />
          과업 추가
        </Button>
      </div>

      <div className="space-y-4">
        {items.map((item, index) => (
          <div key={item.id} className="border border-border rounded-lg p-4 bg-muted/30">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-medium text-foreground flex items-center">
                <span className="w-6 h-6 rounded-full bg-primary/10 text-primary text-xs flex items-center justify-center mr-2">
                  {index + 1}
                </span>
                과업 {index + 1}
              </h3>
              {items.length > 1 && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  aria-label={`행 삭제: 과업 ${index + 1}`}
                  onClick={() => removeItem(index)}
                  className="text-destructive hover:text-destructive"
                >
                  <Trash2 className="w-4 h-4 mr-1" />
                  삭제
                </Button>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField label="직무" htmlFor={`twf-job-${item.id}`} required>
                <Input
                  id={`twf-job-${item.id}`}
                  value={item.job}
                  onChange={(e) => updateItem(index, 'job', e.target.value)}
                  placeholder="예: 생산 / 품질 / 설비"
                />
              </FormField>
              <FormField label="과업(Task)" htmlFor={`twf-task-${item.id}`} required>
                <Input
                  id={`twf-task-${item.id}`}
                  value={item.task_name}
                  onChange={(e) => updateItem(index, 'task_name', e.target.value)}
                  placeholder="예: 완제품 외관 검사"
                />
              </FormField>
            </div>

            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField label="현행 방식 (As-Is)" htmlFor={`twf-asis-${item.id}`} required>
                <Textarea
                  id={`twf-asis-${item.id}`}
                  rows={6}
                  value={item.as_is}
                  onChange={(e) => updateItem(index, 'as_is', e.target.value)}
                  placeholder="예) 검사원 2명이 라인에서 육안으로 외관 검사"
                  className="break-keep"
                />
              </FormField>
              <FormField label="문제점" htmlFor={`twf-problems-${item.id}`} required>
                <Textarea
                  id={`twf-problems-${item.id}`}
                  rows={6}
                  value={item.problems}
                  onChange={(e) => updateItem(index, 'problems', e.target.value)}
                  placeholder="예) 검사원 피로도에 따라 품질 편차 발생, 재검사 필요"
                  className="break-keep"
                />
              </FormField>
            </div>

            <div className="mt-4">
              <FormField
                label="데이터 발생 시점 (또는 데이터 보유현황)"
                htmlFor={`twf-data-${item.id}`}
                required
              >
                <Textarea
                  id={`twf-data-${item.id}`}
                  rows={6}
                  value={item.data_availability}
                  onChange={(e) => updateItem(index, 'data_availability', e.target.value)}
                  placeholder="예) 검사 이미지 2년치(DB 저장), 불량 판정 로그 1년치"
                  className="break-keep"
                />
              </FormField>
            </div>

            <div className="mt-4">
              <fieldset>
                <legend className="text-sm font-medium text-foreground mb-2">
                  AI도입·활용 필요도 <span className="text-destructive">*</span>
                </legend>
                <div
                  role="radiogroup"
                  aria-label="AI도입·활용 필요도"
                  className="flex flex-wrap gap-2"
                >
                  {AI_NECESSITY_OPTIONS.map((score) => {
                    const checked = item.ai_necessity === score;
                    const radioId = `twf-ai-${item.id}-${score}`;
                    return (
                      <label
                        key={score}
                        htmlFor={radioId}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-md border text-sm cursor-pointer transition-colors ${
                          checked
                            ? 'border-primary bg-primary/10 text-primary font-medium'
                            : 'border-border hover:bg-muted'
                        }`}
                      >
                        <input
                          id={radioId}
                          type="radio"
                          role="radio"
                          name={`twf-ai-${item.id}`}
                          value={String(score)}
                          checked={checked}
                          onChange={() => updateItem(index, 'ai_necessity', score)}
                          className="sr-only"
                          aria-label={`${score} - ${AI_NECESSITY_LABELS[score]}`}
                        />
                        <span>
                          {score}
                          <span className="ml-1 text-xs text-muted-foreground">
                            {AI_NECESSITY_LABELS[score]}
                          </span>
                        </span>
                      </label>
                    );
                  })}
                </div>
              </fieldset>
            </div>
          </div>
        ))}
      </div>

      <GuideNote
        items={[
          '기업 내부전문가와의 인터뷰를 통해 현재 기업에서 수행하고 있는 과업(또는 워크플로우) 중 AI 도입·활용이 필요하다고 판단되는 과업 분석',
          '※ 기업의 전체 과업을 대상으로 분석할 필요는 없으며, 기업 내부전문가와의 인터뷰를 통해 필요한 과업을 대상으로만 분석',
          '현행 수행방식과 문제점을 파악하고, AI 도입·활용이 가능한 데이터 발생(또는 보유) 여부 등을 감안하여 AI도입·활용 필요도를 1점(낮음)~5점(높음) 척도로 점수 부여',
        ]}
      />

      {/* Ⅱ-3 분석내용 — 양식: "과업(또는 워크플로우) 분석 과정 및 방법에 대한 내용 기술" */}
      <div className="border-t border-border pt-6 space-y-4">
        <div>
          <h3 className="text-sm font-semibold text-foreground">분석내용</h3>
          <p className="mt-1 text-xs text-muted-foreground">
            과업(또는 워크플로우) 분석 과정 및 방법에 대한 내용을 서술하세요. (선택)
          </p>
        </div>
        <Textarea
          id="twf-analysis-text"
          rows={6}
          value={analysisNotes.text}
          onChange={(e) => onAnalysisNotesChange({ ...analysisNotes, text: e.target.value })}
          placeholder="예) 기업 내부전문가 3명과의 그룹 인터뷰로 공정 단계별 과업을 도출하고, 데이터 보유 여부에 따라 우선순위를 재정렬함."
          className="break-keep"
          aria-label="분석 내용"
        />

        <AttachmentFileList
          files={analysisNotes.attachment_files}
          onChange={(files) =>
            onAnalysisNotesChange({ ...analysisNotes, attachment_files: files })
          }
          onUpload={onUploadAttachment}
          onRemove={onRemoveAttachment}
          label="추가자료 업로드"
          description="과업 분석에 참고할 자료를 첨부하면 본문이 자동 추출되어 로드맵 생성에 반영됩니다."
        />

        <GuideNote
          items={[
            '과업(또는 워크플로우) 분석 과정 및 방법에 대한 내용 기술',
            '작성한 내용 외에 제시해야 할 파일이 있는 경우 첨부파일로 업로드',
            '첨부 파일 본문은 자동 추출되어 LLM 로드맵·PBL 생성에 반영됩니다 (최대 5,000자)',
          ]}
        />
      </div>
    </div>
  );
}
