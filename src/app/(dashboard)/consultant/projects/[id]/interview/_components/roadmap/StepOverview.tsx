'use client';

import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { FieldError } from '@/components/ui/field-error';
import {
  AI_COMPETENCY_LEVEL_OPTIONS,
  type AiCompetencyLevel,
  type Overview,
} from '@/lib/schemas/interview-roadmap';

interface StepOverviewProps {
  value: Overview;
  onChange: (next: Overview) => void;
  errors?: Partial<Record<keyof Overview, string>>;
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
    hint: 'AI 훈련로드맵 수립 배경 · 해당 과업 선정 이유 · AI 적용 필요성 (양식 Ⅰ-1, 5줄 내외)',
    placeholder:
      '예) 제조 공정의 품질검사 업무에서 인력 의존도가 높아 품질 편차가 발생하고 있다.\nAI 비전 검사 도입으로 1차 스크리닝을 자동화하면 작업자 부담이 줄고 품질 편차 또한 줄어들 것으로 기대된다.',
    rows: 5,
  },
  {
    key: 'selected_tasks_summary',
    label: '선정 과업',
    hint: '훈련 대상으로 확정된 과업을 간단히 나열 (양식 Ⅰ-3)',
    placeholder: '예) 1) 품질검사 1차 스크리닝 자동화  2) 월간 보고서 초안 생성  3) 현장 설비 이상 감지',
    rows: 3,
  },
  {
    key: 'roadmap_summary',
    label: '수립 주요내용 요약',
    hint: '훈련 목표 · 대상 · 주요 과정 · 운영 방식 핵심만 요약 (양식 Ⅰ-3, 1장 이내)',
    placeholder:
      '예) 전사 3단계 AI 인력 양성 로드맵(기초/탐구/활용). 생산기술팀 15명 대상. 집체 + 원격 혼합. 2026 상반기 기초 과정 시작.',
    rows: 5,
  },
];

export default function StepOverview({ value, onChange, errors }: StepOverviewProps) {
  const handleText = (
    key: 'establishment_necessity' | 'selected_tasks_summary' | 'roadmap_summary',
    next: string,
  ) => {
    onChange({ ...value, [key]: next });
  };

  const handleLevel = (next: AiCompetencyLevel) => {
    onChange({ ...value, ai_competency_level: next });
  };

  const handleUrl = (next: string) => {
    onChange({
      ...value,
      hrd_report_attachment_url: next.trim() === '' ? undefined : next,
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-foreground">개요</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          산업인력공단 AI 훈련로드맵 양식 Ⅰ장. 수립 필요성, 기업 AI 역량 수준, 선정 과업, 수립 주요내용을 입력해주세요.
        </p>
      </div>

      <div className="space-y-5">
        {TEXT_FIELDS.map(({ key, label, hint, placeholder, rows }) => {
          const errorMsg = errors?.[key];
          const fieldId = `ov-${key}`;
          const hintId = `ov-${key}-hint`;
          return (
            <div key={key}>
              <Label htmlFor={fieldId} className="mb-1 block">
                {label} <span className="text-destructive">*</span>
              </Label>
              <p id={hintId} className="text-xs text-muted-foreground mb-2">
                {hint}
              </p>
              <Textarea
                id={fieldId}
                rows={rows}
                value={value[key]}
                onChange={(e) => handleText(key, e.target.value)}
                placeholder={placeholder}
                aria-describedby={hintId}
                aria-invalid={Boolean(errorMsg) || undefined}
                className="break-keep"
              />
              <FieldError message={errorMsg} />
            </div>
          );
        })}

        <fieldset>
          <legend className="mb-1 block text-sm font-medium">
            기업 AI 역량 수준 <span className="text-destructive">*</span>
          </legend>
          <p className="text-xs text-muted-foreground mb-2">
            HRD이음 진단 결과를 바탕으로 선택 (양식 Ⅰ-3)
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
          <Label htmlFor="ov-hrd-url" className="mb-1 block">
            HRD이음 진단 보고서 URL (선택)
          </Label>
          <p id="ov-hrd-url-hint" className="text-xs text-muted-foreground mb-2">
            첨부 대신 외부 URL로 대체 가능. Step 12 이후 자동 연동 예정 (양식 Ⅱ-1).
          </p>
          <Input
            id="ov-hrd-url"
            type="url"
            value={value.hrd_report_attachment_url ?? ''}
            onChange={(e) => handleUrl(e.target.value)}
            placeholder="https://hrd4u.or.kr/report/..."
            aria-describedby="ov-hrd-url-hint"
            aria-invalid={Boolean(errors?.hrd_report_attachment_url) || undefined}
          />
          <FieldError message={errors?.hrd_report_attachment_url} />
        </div>
      </div>
    </div>
  );
}
