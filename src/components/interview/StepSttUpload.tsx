'use client';

/**
 * STT 인사이트 추출 UI — .txt 파일 업로드 방식.
 *
 * - 현장 인터뷰 녹취 STT 텍스트 파일(.txt)을 업로드하면 클라이언트가
 *   `file.text()` 로 본문을 읽어 부모의 `onExtract(text)` 콜백으로 전달한다.
 * - 부모는 일반적으로 `extractSttInsights(projectId, text)` Server Action 으로
 *   래핑한다. 추출된 6 카테고리 인사이트는 `onChange` 로 끌어올려 자동저장
 *   (useInterviewAutoSave / 디바운스 saveRoadmapInterviewV2) 이 영속화한다.
 * - 본 컴포넌트는 DB 에 직접 쓰지 않는다 — 원문 파일도 Storage 에 올리지 않고
 *   클라이언트에서 휘발 처리한다 (인사이트만 영속화).
 *
 * 파일 제약 (`src/lib/constants/stt.ts`):
 *   - 확장자: `.txt`
 *   - 최대 크기: 500KB
 */

import { useRef, useState, useTransition } from 'react';
import { Upload, Loader2, FileText, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { showSuccessToast, showErrorToast } from '@/lib/utils';
import {
  ALLOWED_STT_FILE_EXTENSIONS,
  MAX_STT_FILE_SIZE_BYTES,
  MAX_STT_FILE_SIZE_KB,
} from '@/lib/constants/stt';
import type { SttInsights } from '@/lib/schemas/interview-roadmap';

export interface StepSttUploadProps {
  insights: SttInsights | undefined;
  onChange: (insights: SttInsights | undefined) => void;
  /**
   * STT 원문에서 인사이트를 추출하는 비동기 콜백.
   * 일반적으로 `extractSttInsights(projectId, text)` 같은 Server Action 을 감싼다.
   */
  onExtract: (
    sttText: string,
  ) => Promise<{ success: true; data: SttInsights } | { success: false; error: string }>;
  /**
   * 자체 h3 헤더와 안내문을 렌더할지 여부. 기본값 true (기존 사용처 호환).
   * 어댑터(`StepSttAttach`) 가 FormSection 으로 감싸 외부 헤더를 제공할 때
   * false 로 내려 헤더 중복을 차단한다.
   */
  showHeader?: boolean;
}

const SECTION_LABELS: Array<[keyof SttInsights, string]> = [
  ['추가_업무', '추가 업무'],
  ['추가_페인포인트', '추가 페인포인트'],
  ['숨은_니즈', '숨은 니즈'],
  ['조직_맥락', '조직 맥락'],
  ['AI_태도', 'AI 태도'],
  ['주요_인용', '주요 인용'],
];

export function StepSttUpload({
  insights,
  onChange,
  onExtract,
  showHeader = true,
}: StepSttUploadProps) {
  const [isPending, startTransition] = useTransition();
  const [fileName, setFileName] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function validateFile(file: File): string | null {
    const lower = file.name.toLowerCase();
    const hasAllowedExt = ALLOWED_STT_FILE_EXTENSIONS.some((ext) => lower.endsWith(ext));
    if (!hasAllowedExt) {
      return `.txt 파일만 업로드 가능합니다. (선택한 파일: ${file.name})`;
    }
    if (file.size > MAX_STT_FILE_SIZE_BYTES) {
      const currentKb = Math.round(file.size / 1024);
      return `파일 크기가 너무 큽니다. 최대 ${MAX_STT_FILE_SIZE_KB}KB 까지 업로드 가능합니다. (현재: ${currentKb}KB)`;
    }
    return null;
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const validationError = validateFile(file);
    if (validationError) {
      showErrorToast('파일 형식 오류', validationError);
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    startTransition(async () => {
      try {
        const text = await file.text();
        const trimmed = text.trim();
        if (trimmed.length < 10) {
          showErrorToast('파일 내용 부족', 'STT 본문이 너무 짧습니다 (10자 이상).');
          if (fileInputRef.current) fileInputRef.current.value = '';
          return;
        }

        const result = await onExtract(trimmed);
        if (result.success) {
          setFileName(file.name);
          onChange(result.data);
          showSuccessToast('인사이트 추출 완료', `${file.name} 파일에서 6개 카테고리를 정리했습니다.`);
        } else {
          showErrorToast('추출 실패', result.error);
        }
      } catch (error) {
        showErrorToast(
          '파일 읽기 실패',
          error instanceof Error ? error.message : '파일을 읽는 중 오류가 발생했습니다.',
        );
      } finally {
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    });
  }

  function handleClear() {
    setFileName(null);
    onChange(undefined);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  function handleClickUpload() {
    if (isPending) return;
    fileInputRef.current?.click();
  }

  return (
    <section className="border border-border rounded-lg p-4 space-y-3">
      {showHeader && (
        <div>
          <h3 className="text-sm font-semibold text-foreground">STT 인사이트 추출 (선택)</h3>
          <p className="mt-1 text-xs text-muted-foreground break-keep">
            현장 인터뷰 녹취 STT 텍스트 파일(.txt)을 업로드하면 LLM 으로 6개 카테고리(추가 업무·페인포인트·숨은
            니즈·조직 맥락·AI 태도·주요 인용)로 자동 정리합니다. 추출 결과는 자동 저장됩니다.
          </p>
        </div>
      )}

      {/* 파일 업로드 영역 */}
      <div className="space-y-2">
        <input
          ref={fileInputRef}
          type="file"
          accept={ALLOWED_STT_FILE_EXTENSIONS.join(',')}
          aria-label="STT 파일"
          onChange={handleFileChange}
          disabled={isPending}
          className="sr-only"
        />
        <button
          type="button"
          onClick={handleClickUpload}
          disabled={isPending}
          aria-label="STT 파일 업로드"
          className={`w-full rounded-lg border-2 border-dashed px-4 py-6 transition-colors text-sm ${
            isPending
              ? 'border-border bg-muted/30 cursor-not-allowed text-muted-foreground'
              : 'border-border hover:border-primary hover:bg-primary/5 text-foreground cursor-pointer'
          }`}
        >
          {isPending ? (
            <span className="inline-flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" />
              AI 가 인사이트를 추출하는 중…
            </span>
          ) : (
            <span className="inline-flex items-center gap-2">
              <Upload className="w-4 h-4" />
              .txt 파일을 클릭하여 업로드 (최대 {MAX_STT_FILE_SIZE_KB}KB)
            </span>
          )}
        </button>

        {fileName && !isPending && (
          <div className="flex items-center justify-between rounded-md bg-muted/40 px-3 py-2 text-xs">
            <span className="inline-flex items-center gap-1.5 text-foreground">
              <FileText className="w-3.5 h-3.5" />
              {fileName}
            </span>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={handleClear}
              className="h-auto px-2 py-1"
            >
              <X className="w-3.5 h-3.5 mr-1" />
              초기화
            </Button>
          </div>
        )}
      </div>

      {insights && <SttInsightsDisplay insights={insights} />}
    </section>
  );
}

function SttInsightsDisplay({ insights }: { insights: SttInsights }) {
  const cards = SECTION_LABELS.map(([key, label]) => {
    const value = insights[key];
    const items = Array.isArray(value)
      ? value.filter((s) => s.trim() !== '')
      : value && value.trim() !== ''
        ? [value]
        : [];
    return { key, label, items };
  }).filter((c) => c.items.length > 0);

  if (cards.length === 0) {
    return (
      <p className="text-xs text-muted-foreground bg-muted/30 rounded-md p-3">
        추출된 인사이트가 없습니다. 다른 파일로 다시 시도해 보세요.
      </p>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      {cards.map(({ key, label, items }) => (
        <div key={key} className="bg-muted/30 rounded-md p-3 text-xs">
          <div className="flex items-center gap-1 text-foreground font-semibold mb-1">
            <FileText className="w-3 h-3" />
            {label}
          </div>
          <ul className="space-y-1 list-disc list-outside pl-4 text-muted-foreground">
            {items.map((it, i) => (
              <li key={i} className="break-keep">
                {it}
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}
