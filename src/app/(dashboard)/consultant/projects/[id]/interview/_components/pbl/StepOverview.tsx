'use client';

import { FormSection } from '@/components/forms/FormSection';
import { LargeTextBox } from '@/components/forms/LargeTextBox';
import { ExampleAccordion } from '@/components/forms/ExampleAccordion';

import type { PBLStepProps } from './types';
import type { PBLOverview } from '@/lib/schemas/interview-pbl';

/**
 * Ⅰ 훈련과정 개요 — [인터뷰 입력]
 *
 * 양식 Ⅰ 의 표 (기업명·훈련과정명·NCS·시간·대상 등) 중 인터뷰 단계에서 입력 받는
 * 핵심 필드만 추린다. 주소·관할 등 신청서 자동 불러옴 항목은 결과 화면에서
 * 별도로 바인딩하므로 본 스텝에서는 다루지 않는다.
 *
 * 데이터 슬라이스: `PBLOverview` (companyName/courseName/ncsCode?/trainingHours/
 * trainingTarget/trainingForm/trainingPeriod/businessIssues).
 */
export function StepOverview({ value, onChange, readOnly = false }: PBLStepProps<PBLOverview>) {
  function update(patch: Partial<PBLOverview>) {
    onChange({ ...value, ...patch });
  }

  return (
    <FormSection
      number="Ⅰ"
      title="훈련과정 개요"
      label="[인터뷰 입력]"
      description="기업 기본 정보와 훈련과정 기본 속성을 입력합니다. 신청서에서 자동 불러오는 항목(주소·관할 등)은 결과 화면에서 별도 바인딩됩니다."
    >
      <div className="grid gap-4 md:grid-cols-2">
        <LabeledInput
          label="기업명"
          id="pbl-overview-company-name"
          value={value.companyName}
          onChange={(v) => update({ companyName: v })}
          placeholder="예: 한국생산성본부"
          disabled={readOnly}
        />
        <LabeledInput
          label="훈련과정명"
          id="pbl-overview-course-name"
          value={value.courseName}
          onChange={(v) => update({ courseName: v })}
          placeholder="예: 제조업 품질관리 담당자를 위한 AI 활용 교육"
          disabled={readOnly}
        />
        <LabeledInput
          label="NCS 분류 코드 (선택)"
          id="pbl-overview-ncs-code"
          value={value.ncsCode ?? ''}
          onChange={(v) => update({ ncsCode: v })}
          placeholder="예: 200107 인공지능"
          disabled={readOnly}
        />
        <LabeledNumberInput
          label="훈련시간 (시간)"
          id="pbl-overview-training-hours"
          value={value.trainingHours}
          onChange={(v) => update({ trainingHours: v })}
          placeholder="예: 40"
          disabled={readOnly}
        />
        <LabeledInput
          label="훈련대상 (훈련생)"
          id="pbl-overview-training-target"
          value={value.trainingTarget}
          onChange={(v) => update({ trainingTarget: v })}
          placeholder="예: 품질관리팀 실무자 15명"
          disabled={readOnly}
        />
        <LabeledInput
          label="훈련형태"
          id="pbl-overview-training-form"
          value={value.trainingForm}
          onChange={(v) => update({ trainingForm: v })}
          placeholder="예: 집체 · 혼합 · 온라인"
          disabled={readOnly}
        />
        <LabeledInput
          label="훈련기간"
          id="pbl-overview-training-period"
          value={value.trainingPeriod}
          onChange={(v) => update({ trainingPeriod: v })}
          placeholder="예: 2026.06.01 ~ 2026.07.15"
          disabled={readOnly}
        />
      </div>

      <div className="space-y-1">
        <label
          htmlFor="pbl-overview-business-issues"
          className="text-xs font-medium text-muted-foreground"
        >
          사업 쟁점 (경영 이슈 요약)
        </label>
        <LargeTextBox
          id="pbl-overview-business-issues"
          value={value.businessIssues}
          onChange={(e) => update({ businessIssues: e.target.value })}
          placeholder="본 훈련이 해결하고자 하는 경영 이슈를 3~5줄로 요약하세요..."
          disabled={readOnly}
          aria-label="사업 쟁점"
        />
      </div>

      <ExampleAccordion
        guideLabel="작성 가이드"
        guide={
          <ul className="list-none space-y-1">
            <li>
              ☞ (기업명/사업장관리번호/주요 업종/주소/훈련실시주소/관할 지부·지사) 신청서 기준으로
              자동 불러옴 처리되며, 내용 수정이 불가
            </li>
            <li>☞ (담당자 연락처/NCS 분류) 신청서 기준으로 자동 불러옴 처리되며, 내용 수정 가능</li>
            <li>
              ☞ (훈련과정명/훈련시간/훈련생) 훈련 프로파일 기준으로 자동 불러옴 처리되며, 내용
              수정이 불가
            </li>
            <li>☞ (훈련직무) 직접 입력</li>
            <li>☞ (AI역량 수준) 현재 기업의 AI역량 수준을 체크</li>
            <li>☞ (훈련 목표) 훈련을 통해 달성하고자 하는 목표를 선택(중복선택 가능)</li>
            <li>사업 쟁점은 이어지는 Ⅱ-1-가 기업 경영 이슈의 간결 요약본으로 사용됩니다.</li>
          </ul>
        }
      />
    </FormSection>
  );
}

// ---------------------------------------------------------------------------
// 내부 헬퍼 — 작은 라벨드 input 재사용
// ---------------------------------------------------------------------------

interface LabeledInputProps {
  label: string;
  id: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  disabled?: boolean;
}

function LabeledInput({ label, id, value, onChange, placeholder, disabled }: LabeledInputProps) {
  return (
    <div className="space-y-1">
      <label htmlFor={id} className="text-xs font-medium text-muted-foreground">
        {label}
      </label>
      <input
        id={id}
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        aria-label={label}
        className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
      />
    </div>
  );
}

interface LabeledNumberInputProps extends Omit<LabeledInputProps, 'value' | 'onChange'> {
  value: number;
  onChange: (v: number) => void;
}

function LabeledNumberInput({
  label,
  id,
  value,
  onChange,
  placeholder,
  disabled,
}: LabeledNumberInputProps) {
  return (
    <div className="space-y-1">
      <label htmlFor={id} className="text-xs font-medium text-muted-foreground">
        {label}
      </label>
      <input
        id={id}
        type="number"
        min={0}
        value={Number.isFinite(value) ? value : 0}
        onChange={(e) => {
          const next = Number(e.target.value);
          onChange(Number.isFinite(next) ? next : 0);
        }}
        placeholder={placeholder}
        disabled={disabled}
        aria-label={label}
        className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
      />
    </div>
  );
}
