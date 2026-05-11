'use client';

/**
 * STT 인사이트 추출 UI (ISSUE-16)
 *
 * - 현장 인터뷰 녹취 STT 텍스트를 붙여넣고 LLM 으로 6 카테고리 인사이트로 정리한다.
 * - ROADMAP/PBL 트랙의 확인·제출 페이지에서 동일하게 사용한다.
 * - 추출된 인사이트는 부모 컴포넌트의 `onChange` 로 끌어올려 자동저장(useInterviewAutoSave)이
 *   formData 와 함께 영속화한다. 이 컴포넌트 자체는 DB 에 직접 쓰지 않는다.
 */

import { useState, useTransition } from 'react';
import { Upload, Loader2, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { showSuccessToast, showErrorToast } from '@/lib/utils';
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
  const [sttText, setSttText] = useState('');
  const [isPending, startTransition] = useTransition();

  function handleExtract() {
    const trimmed = sttText.trim();
    if (!trimmed) {
      showErrorToast('STT 원문 필요', '추출할 텍스트를 먼저 입력해 주세요.');
      return;
    }
    startTransition(async () => {
      const result = await onExtract(trimmed);
      if (result.success) {
        onChange(result.data);
        showSuccessToast('인사이트 추출 완료', '6개 카테고리로 정리되었습니다.');
      } else {
        showErrorToast('추출 실패', result.error);
      }
    });
  }

  function handleClear() {
    setSttText('');
    onChange(undefined);
  }

  const isEmpty = sttText.trim().length === 0;

  return (
    <section className="border border-border rounded-lg p-4 space-y-3">
      {showHeader && (
        <div>
          <h3 className="text-sm font-semibold text-foreground">STT 인사이트 추출 (선택)</h3>
          <p className="mt-1 text-xs text-muted-foreground break-keep">
            현장 인터뷰 녹취 STT 텍스트를 붙여넣고 LLM 으로 6개 카테고리(추가 업무·페인포인트·숨은
            니즈·조직 맥락·AI 태도·주요 인용)로 자동 정리하세요. 추출 결과는 자동 저장됩니다.
          </p>
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="stt-input">STT 원문</Label>
        <Textarea
          id="stt-input"
          value={sttText}
          onChange={(e) => setSttText(e.target.value)}
          rows={5}
          placeholder="STT 원문을 붙여넣으세요…"
          disabled={isPending}
        />
        <div className="flex items-center gap-2">
          <Button
            type="button"
            size="sm"
            onClick={handleExtract}
            disabled={isPending || isEmpty}
          >
            {isPending ? (
              <>
                <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" />
                분석 중…
              </>
            ) : (
              <>
                <Upload className="w-3.5 h-3.5 mr-1" />
                인사이트 추출
              </>
            )}
          </Button>
          {insights && (
            <Button type="button" size="sm" variant="ghost" onClick={handleClear} disabled={isPending}>
              초기화
            </Button>
          )}
        </div>
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
        추출된 인사이트가 없습니다. 다른 텍스트로 다시 시도해 보세요.
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
