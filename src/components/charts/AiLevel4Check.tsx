'use client';

import { useId } from 'react';

import { LargeTextBox } from '@/components/forms/LargeTextBox';
import type {
  PBLAiLevelAssessment,
  PBLAILevel,
} from '@/lib/schemas/interview-pbl';

/**
 * AiLevel4Check — PBL 양식 Ⅲ-4 (현재/예상) AI 수준 진단 위젯
 *
 * 4등급(AI기초형/AI탐구형/AI활용형/AI선도형) 중 택1 radio + 선택 근거 note 박스.
 *
 * 각 등급은 양식 원본 설명 그대로 표기하고, enum 값은 camelCase 내부 키
 * (BASIC/EXPLORER/USER/LEADER) 로 보존해 HWPX·LLM 페이로드 표기 흔들림을 방지한다.
 *
 * 본 컴포넌트는 "현재 AI역량 수준"과 "예상 AI역량 수준" 두 번 재사용된다. 그러므로
 * ariaLabel prop 으로 접근성 이름과 비고 input 라벨을 구분한다.
 */

interface LevelOption {
  value: PBLAILevel;
  label: string; // AI기초형 등
  grade: string; // 기초/초급/중급/고급
  description: string;
}

const LEVEL_OPTIONS: ReadonlyArray<LevelOption> = [
  {
    value: 'BASIC',
    label: 'AI기초형',
    grade: '기초',
    description:
      'AI 및 디지털 기술 도입에 대한 인식은 있으나, 실제 활용은 거의 없거나 매우 제한적인 단계',
  },
  {
    value: 'EXPLORER',
    label: 'AI탐구형',
    grade: '초급',
    description:
      '일부 구성원이 AI 도구를 시범적으로 사용하고 있으며, 업무 일부에 적용을 검토·시도하는 단계',
  },
  {
    value: 'USER',
    label: 'AI활용형',
    grade: '중급',
    description:
      '부서 단위로 AI 도구·자동화를 활용하고 있으며, 데이터 기반 의사결정이 일부 업무에 정착된 단계',
  },
  {
    value: 'LEADER',
    label: 'AI선도형',
    grade: '고급',
    description:
      '전사적으로 AI를 도입해 자체 모델·워크플로우를 운영하며, 타 조직 확산을 선도하는 단계',
  },
];

export interface AiLevel4CheckProps {
  value: PBLAiLevelAssessment;
  onChange: (next: PBLAiLevelAssessment) => void;
  /** 라디오 그룹 접근성 레이블. 같은 페이지 내 2개 인스턴스 구분용. */
  ariaLabel: string;
  readOnly?: boolean;
}

export function AiLevel4Check({
  value,
  onChange,
  ariaLabel,
  readOnly = false,
}: AiLevel4CheckProps) {
  const groupName = useId();

  return (
    <div className="space-y-3" role="group" aria-label={ariaLabel}>
      <div
        role="radiogroup"
        aria-label={ariaLabel}
        className="grid gap-2 md:grid-cols-2"
      >
        {LEVEL_OPTIONS.map((opt) => {
          const checked = value.level === opt.value;
          return (
            <label
              key={opt.value}
              className={`flex cursor-pointer flex-col gap-1 rounded border p-3 text-sm transition-colors ${
                checked
                  ? 'border-primary bg-primary/5'
                  : 'border-border bg-card hover:bg-muted/50'
              } ${readOnly ? 'cursor-not-allowed opacity-70' : ''}`}
            >
              <div className="flex items-center gap-2">
                <input
                  type="radio"
                  name={groupName}
                  value={opt.value}
                  checked={checked}
                  disabled={readOnly}
                  onChange={() =>
                    onChange({ level: opt.value, note: value.note })
                  }
                  aria-label={`${opt.label} (${opt.grade})`}
                  className="size-4 shrink-0 accent-primary"
                />
                <span className="font-semibold">
                  {opt.label}{' '}
                  <span className="text-xs font-normal text-muted-foreground">
                    ({opt.grade})
                  </span>
                </span>
              </div>
              <p className="pl-6 text-xs text-muted-foreground">
                {opt.description}
              </p>
            </label>
          );
        })}
      </div>

      <div className="space-y-1">
        <label
          htmlFor={`${groupName}-note`}
          className="text-xs font-medium text-muted-foreground"
        >
          선택 근거·비고
        </label>
        <LargeTextBox
          id={`${groupName}-note`}
          value={value.note ?? ''}
          onChange={(e) =>
            onChange({ level: value.level, note: e.target.value })
          }
          placeholder="선택한 등급의 근거 또는 특이사항을 서술하세요..."
          disabled={readOnly}
          aria-label={`${ariaLabel} 비고`}
          minHeightClassName="min-h-[80px]"
        />
      </div>
    </div>
  );
}
