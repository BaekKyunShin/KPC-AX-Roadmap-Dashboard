'use client';

import { Textarea } from '@/components/ui/textarea';
import { FormField } from '@/components/ui/form-field';
import { GuideNote } from '@/components/ui/guide-note';
import {
  AI_LEVEL_OPTIONS,
  type AILevel,
  type PBLAILevelDiagnosis,
} from '@/lib/schemas/interview-pbl';

interface StepPBLAILevelProps {
  value: PBLAILevelDiagnosis;
  onChange: (next: PBLAILevelDiagnosis) => void;
}

type LevelField = 'current_ai_level' | 'expected_ai_level';

interface LevelRadioGroupProps {
  field: LevelField;
  groupLabel: string;
  selected: AILevel;
  onSelect: (next: AILevel) => void;
}

function LevelRadioGroup({ field, groupLabel, selected, onSelect }: LevelRadioGroupProps) {
  return (
    <div
      role="radiogroup"
      aria-label={groupLabel}
      className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2"
    >
      {AI_LEVEL_OPTIONS.map(({ value: levelVal, grade, description }) => {
        const checked = selected === levelVal;
        const radioId = `ai-${field}-${levelVal}`;
        return (
          <label
            key={levelVal}
            htmlFor={radioId}
            className={`flex flex-col gap-1 p-3 rounded-md border cursor-pointer transition-colors ${
              checked
                ? 'border-primary bg-primary/10 text-primary'
                : 'border-border hover:bg-muted'
            }`}
            title={description}
          >
            <input
              id={radioId}
              type="radio"
              role="radio"
              name={`ai-${field}`}
              value={levelVal}
              checked={checked}
              onChange={() => onSelect(levelVal)}
              className="sr-only"
              aria-label={levelVal}
            />
            <span className="text-sm font-medium">
              {levelVal}
              <span className="ml-1 font-normal text-xs text-muted-foreground">({grade})</span>
            </span>
            <span className="text-xs text-muted-foreground">{description}</span>
          </label>
        );
      })}
    </div>
  );
}

export default function StepPBLAILevel({ value, onChange }: StepPBLAILevelProps) {
  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-lg font-semibold text-foreground">Ⅲ-4. AI수준 진단</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          산인공 AI PBL 양식 Ⅲ-4 (11p). 현재 AI역량 수준과 훈련 후 도달하고자 하는 목표 수준을
          선택하고, 향상 사유를 서술하세요.
        </p>
      </div>

      <fieldset className="space-y-3">
        <legend className="text-sm font-semibold text-foreground">가. 현재 기업의 AI역량 수준 진단</legend>
        <p className="text-xs text-muted-foreground">
          현재 기업의 AI 활용 성숙도를 선택하세요.
        </p>
        <LevelRadioGroup
          field="current_ai_level"
          groupLabel="현재 AI역량 수준"
          selected={value.current_ai_level}
          onSelect={(next) => onChange({ ...value, current_ai_level: next })}
        />
      </fieldset>

      <fieldset className="space-y-3">
        <legend className="text-sm font-semibold text-foreground">나. 훈련 이후 AI역량 수준 향상도(예상)</legend>
        <p className="text-xs text-muted-foreground">
          훈련 종료 후 도달을 목표로 하는 AI 활용 성숙도를 선택하세요.
        </p>
        <LevelRadioGroup
          field="expected_ai_level"
          groupLabel="향후 AI역량 수준"
          selected={value.expected_ai_level}
          onSelect={(next) => onChange({ ...value, expected_ai_level: next })}
        />
      </fieldset>

      <FormField
        label="AI역량 수준 향상 사유"
        htmlFor="ai-improvement-reason"
        required
        hint="현재 수준에서 목표 수준으로 향상시키려는 사유와 기대 효과를 서술하세요."
      >
        <Textarea
          id="ai-improvement-reason"
          rows={6}
          value={value.improvement_reason}
          onChange={(e) => onChange({ ...value, improvement_reason: e.target.value })}
          placeholder="예) 부서별 AI 도구 시범 사용에서 벗어나, 전사 워크플로우에 AI를 탑재하여 품질·납기 개선을 달성하고자 함."
          className="break-keep"
        />
      </FormField>

      <GuideNote
        items={[
          "'현재 기업의 AI역량 수준 진단'은 공단에서 제공하는 AI역량 수준 진단 툴을 활용할 수 있으며(선택사항), 기업 현황 분석 등을 통해 전문가의 판단하에 기업의 현재 AI역량 수준이 어느 정도인지 판단하여 총 4수준 중 해당되는 수준을 기재한다.",
          "'훈련 이후 AI역량 수준 향상도'는 훈련 이후 기업 AI역량 변화를 사전에 진단·예측하여 그러한 향상도를 보이는 이유를 기재한다.",
          '해당 수준 진단은 훈련 난이도와 훈련교과목 프로파일 개발에 반영하기 위한 사전 진단단계로, 해당 내용을 반영하여 기업에 적합한 AI훈련 프로그램을 설계에 활용한다.',
        ]}
      />
    </div>
  );
}
