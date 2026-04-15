'use client';

import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { FieldError } from '@/components/ui/field-error';
import type { CompanyRequirements } from '@/lib/schemas/interview-roadmap';

interface StepCompanyRequirementsProps {
  value: CompanyRequirements;
  onChange: (next: CompanyRequirements) => void;
  errors?: Partial<Record<keyof CompanyRequirements, string>>;
}

const FIELDS: ReadonlyArray<{
  key: keyof CompanyRequirements;
  label: string;
  hint: string;
  placeholder: string;
}> = [
  {
    key: 'company_status',
    label: '기업 현황',
    hint: '업종 · 주요 생산품/서비스 · AI 도입 현황 · 훈련 이력',
    placeholder: '예) 자동차 부품 제조업. 연 매출 200억. 생산 공정 1개 라인.\nAI 도입 없음. 2024년 디지털 전환 교육 12시간 이수.',
  },
  {
    key: 'main_problems',
    label: '주요 문제',
    hint: '반복 업무 · 품질 편차 · 데이터 활용 한계 등',
    placeholder: '예) 월간 보고서 수작업에 2일 소요. 검사 인력별 품질 편차 발생.',
  },
  {
    key: 'push_willingness',
    label: '추진 의지',
    hint: '경영진 지원 · 예산 · 참여 인력 · 일정 제약',
    placeholder: '예) 대표 직접 챔피언. 2026 상반기 내 도입 목표. 교육 예산 500만원.',
  },
  {
    key: 'expected_outcomes',
    label: '기대 성과',
    hint: '정성적 목표 + 가능하면 정량 KPI',
    placeholder: '예) 월간 보고서 작성 시간 50% 단축. 불량 탐지율 15%p 향상.',
  },
];

export default function StepCompanyRequirements({
  value,
  onChange,
  errors,
}: StepCompanyRequirementsProps) {
  const handleChange = (key: keyof CompanyRequirements, next: string) => {
    onChange({ ...value, [key]: next });
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-foreground">기업 요구분석</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          산업인력공단 AI 훈련로드맵 양식 Ⅱ-2. 기업 현황, 문제, 추진 의지, 기대 성과를 정리해주세요.
        </p>
      </div>

      <div className="space-y-5">
        {FIELDS.map(({ key, label, hint, placeholder }) => {
          const errorMsg = errors?.[key];
          const fieldId = `cr-${key}`;
          const hintId = `cr-${key}-hint`;
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
                rows={4}
                value={value[key]}
                onChange={(e) => handleChange(key, e.target.value)}
                placeholder={placeholder}
                aria-describedby={hintId}
                aria-invalid={Boolean(errorMsg) || undefined}
                className="break-keep"
              />
              <FieldError message={errorMsg} />
            </div>
          );
        })}
      </div>
    </div>
  );
}
