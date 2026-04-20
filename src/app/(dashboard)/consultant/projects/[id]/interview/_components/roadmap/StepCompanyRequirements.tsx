'use client';

import { Textarea } from '@/components/ui/textarea';
import { FormField } from '@/components/ui/form-field';
import { GuideNote } from '@/components/ui/guide-note';
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
    hint: '업종, 생산품, AI 도입·활용 현황, 훈련 이력 등',
    placeholder: '예) 자동차 부품 제조업. 연 매출 200억. 생산 공정 1개 라인.\nAI 도입 없음. 2024년 디지털 전환 교육 12시간 이수.',
  },
  {
    key: 'main_problems',
    label: '주요 문제',
    hint: '현행 공정 프로세스, 설비 관리 등의 문제점 파악',
    placeholder: '예) 월간 보고서 수작업에 2일 소요. 검사 인력별 품질 편차 발생.',
  },
  {
    key: 'push_willingness',
    label: '추진 의지',
    hint: 'AI 도입·활용 및 훈련 실시 의지 파악',
    placeholder: '예) 대표 직접 챔피언. 2026 상반기 내 도입 목표. 교육 예산 500만원.',
  },
  {
    key: 'expected_outcomes',
    label: '기대 성과',
    hint: 'AI 도입·활용 훈련으로 인한 개선 목표 등',
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
        <h2 className="text-lg font-semibold text-foreground">Ⅱ-2. 기업 요구분석</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          기업 현황, 주요 문제, 추진 의지, 기대 성과를 정리하세요.
        </p>
      </div>

      <div className="space-y-5">
        {FIELDS.map(({ key, label, hint, placeholder }) => {
          const errorMsg = errors?.[key];
          const fieldId = `cr-${key}`;
          return (
            <FormField
              key={key}
              label={label}
              htmlFor={fieldId}
              required
              hint={hint}
              error={errorMsg}
            >
              <Textarea
                id={fieldId}
                rows={5}
                value={value[key]}
                onChange={(e) => handleChange(key, e.target.value)}
                placeholder={placeholder}
                aria-invalid={Boolean(errorMsg) || undefined}
                className="break-keep"
              />
            </FormField>
          );
        })}
      </div>

      <GuideNote
        items={[
          '기업의 내부전문가와 면담을 통해 현재 기업의 현황과 AI 도입·활용에 대한 요구를 구조적으로 도출',
          '요구분석에서 우선적으로 AI도입·활용이 필요한 과업(또는 워크플로우)은 필수적으로 파악해야 함. 본 내용은 훈련대상 과업 선정의 논리적 근거가 됨',
          '추가로 필요한 내용은 별첨의 내부환경 부분에 제시',
        ]}
      />
    </div>
  );
}
