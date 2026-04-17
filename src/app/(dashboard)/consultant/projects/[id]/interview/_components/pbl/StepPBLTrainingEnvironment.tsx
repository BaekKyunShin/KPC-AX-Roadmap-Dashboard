'use client';

import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { FormField } from '@/components/ui/form-field';
import { GuideNote } from '@/components/ui/guide-note';
import {
  type PBLTrainingEnvironment,
  type TrainingPlaceType,
  type AIToolCapacity,
  type NetworkLevel,
} from '@/lib/schemas/interview-pbl';

interface StepPBLTrainingEnvironmentProps {
  value: PBLTrainingEnvironment;
  onChange: (next: PBLTrainingEnvironment) => void;
}

const TRAINING_PLACE_OPTIONS: TrainingPlaceType[] = ['사내', '사외'];
const AI_TOOL_OPTIONS: AIToolCapacity[] = ['가능', '제한적', '불가능'];
const NETWORK_OPTIONS: NetworkLevel[] = ['양호', '보통', '개선필요'];
const INSTRUCTOR_OPTIONS: Array<{ value: boolean; label: string }> = [
  { value: true, label: '활용' },
  { value: false, label: '미활용' },
];

export default function StepPBLTrainingEnvironment({
  value,
  onChange,
}: StepPBLTrainingEnvironmentProps) {
  const updatePlace = (next: Partial<PBLTrainingEnvironment['training_place']>) => {
    onChange({ ...value, training_place: { ...value.training_place, ...next } });
  };

  const updateInstructor = (next: Partial<PBLTrainingEnvironment['internal_instructor']>) => {
    onChange({
      ...value,
      internal_instructor: { ...value.internal_instructor, ...next },
    });
  };

  const updateCharacteristics = (
    next: Partial<PBLTrainingEnvironment['target_characteristics']>
  ) => {
    onChange({
      ...value,
      target_characteristics: { ...value.target_characteristics, ...next },
    });
  };

  const updateInfrastructure = (next: Partial<PBLTrainingEnvironment['ai_infrastructure']>) => {
    onChange({
      ...value,
      ai_infrastructure: { ...value.ai_infrastructure, ...next },
    });
  };

  const updateExpectation = (next: Partial<PBLTrainingEnvironment['expectation']>) => {
    onChange({ ...value, expectation: { ...value.expectation, ...next } });
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-foreground">Ⅱ-2. 기업 훈련환경 분석</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          산인공 양식 Ⅱ-2. 훈련 장소·대상자·AI 인프라·기대효과를 입력하세요.
        </p>
      </div>

      {/* 훈련 여건 - 훈련 장소 및 시간 */}
      <fieldset className="space-y-4">
        <legend className="text-sm font-semibold text-foreground">훈련 여건</legend>

        <FormField
          label="적정 훈련시간"
          htmlFor="te-hours"
          required
          hint="단위: 시간"
        >
          <Input
            id="te-hours"
            type="number"
            min={1}
            value={value.proper_training_hours || ''}
            onChange={(e) =>
              onChange({
                ...value,
                proper_training_hours: Number(e.target.value) || 0,
              })
            }
          />
        </FormField>

        {/* 적정 훈련장소 체크박스 (복수 선택) — 양식: ☑ 사내 / □ 사외 */}
        <div>
          <div className="text-sm font-medium text-foreground mb-2">
            적정 훈련장소{' '}
            <span className="text-xs font-normal text-muted-foreground">(복수 선택 가능)</span>
          </div>
          <div className="flex flex-wrap gap-3">
            {TRAINING_PLACE_OPTIONS.map((placeValue) => {
              const checked = value.training_place.types.includes(placeValue);
              const checkId = `te-place-${placeValue}`;
              return (
                <label
                  key={placeValue}
                  htmlFor={checkId}
                  className={`flex items-center gap-2 px-3 py-2 rounded-md border cursor-pointer transition-colors ${
                    checked
                      ? 'border-primary bg-primary/10 text-primary font-medium'
                      : 'border-border hover:bg-muted'
                  }`}
                >
                  <Checkbox
                    id={checkId}
                    checked={checked}
                    onCheckedChange={(next) => {
                      const shouldCheck = next === true;
                      const nextTypes = shouldCheck
                        ? [...new Set([...value.training_place.types, placeValue])]
                        : value.training_place.types.filter((t) => t !== placeValue);
                      updatePlace({ types: nextTypes });
                    }}
                    aria-label={placeValue}
                  />
                  <span className="text-sm">{placeValue}</span>
                </label>
              );
            })}
          </div>
        </div>

        <FormField
          label="훈련장소"
          htmlFor="te-place-location"
          hint="구체적 훈련 장소를 입력하세요 (예: 본사 3층 교육장, ○○컨벤션센터 B홀)."
        >
          <Input
            id="te-place-location"
            value={value.training_place.location}
            onChange={(e) => updatePlace({ location: e.target.value })}
            placeholder="예: 본사 3층 교육장"
          />
        </FormField>

        <FormField
          label="훈련장소 특이사항"
          htmlFor="te-place-notes"
          hint="추가 훈련장 필요 사유 등을 기재하세요 (예: 승강기 정비 업무를 수행하는 작업 현장은 서울 ○○곳에 분포되어 있으며, 하나의 장소로 한정할 경우 원활한 현장훈련 실시가 어려움)."
        >
          <Textarea
            id="te-place-notes"
            rows={5}
            value={value.training_place.special_notes}
            onChange={(e) => updatePlace({ special_notes: e.target.value })}
            placeholder="예: 야간 교대·주말 집중 등 훈련 운영 특이사항"
            className="break-keep"
          />
        </FormField>
      </fieldset>

      {/* 사내 강사 활용 여부 */}
      <fieldset className="space-y-4">
        <legend className="text-sm font-semibold text-foreground">사내 강사 활용 여부</legend>

        <div>
          <div className="text-sm font-medium text-foreground mb-2">사내강사 활용 여부</div>
          <div
            role="radiogroup"
            aria-label="사내강사 활용 여부"
            className="flex flex-wrap gap-2"
          >
            {INSTRUCTOR_OPTIONS.map((opt) => {
              const checked = value.internal_instructor.used === opt.value;
              const radioId = `te-instructor-${opt.value ? 'yes' : 'no'}`;
              return (
                <label
                  key={opt.label}
                  htmlFor={radioId}
                  className={`flex items-center gap-2 px-3 py-2 rounded-md border cursor-pointer transition-colors ${
                    checked
                      ? 'border-primary bg-primary/10 text-primary font-medium'
                      : 'border-border hover:bg-muted'
                  }`}
                >
                  <input
                    id={radioId}
                    type="radio"
                    role="radio"
                    name="te-instructor-used"
                    checked={checked}
                    onChange={() => updateInstructor({ used: opt.value })}
                    className="sr-only"
                    aria-label={opt.label}
                  />
                  <span className="text-sm">{opt.label}</span>
                </label>
              );
            })}
          </div>
        </div>

        {value.internal_instructor.used && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField label="성명" htmlFor="te-instructor-name">
              <Input
                id="te-instructor-name"
                value={value.internal_instructor.name}
                onChange={(e) => updateInstructor({ name: e.target.value })}
              />
            </FormField>
            <FormField label="직위" htmlFor="te-instructor-position">
              <Input
                id="te-instructor-position"
                value={value.internal_instructor.position}
                onChange={(e) => updateInstructor({ position: e.target.value })}
              />
            </FormField>
          </div>
        )}
      </fieldset>

      {/* 훈련 대상자 특성 */}
      <fieldset className="space-y-4">
        <legend className="text-sm font-semibold text-foreground">훈련 대상자 특성</legend>

        <FormField label="대상 인원" htmlFor="te-target-count" required hint="단위: 명">
          <Input
            id="te-target-count"
            type="number"
            min={1}
            value={value.target_count || ''}
            onChange={(e) =>
              onChange({ ...value, target_count: Number(e.target.value) || 0 })
            }
          />
        </FormField>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            label="업무 경력"
            htmlFor="te-target-career"
            hint="예: 직책별(사원/대리급, 과·차장급 등), 연차(1~2년차 등)"
          >
            <Input
              id="te-target-career"
              value={value.target_characteristics.career}
              onChange={(e) => updateCharacteristics({ career: e.target.value })}
              placeholder="예: 사원/대리급, 1~2년차"
            />
          </FormField>
          <FormField
            label="수준"
            htmlFor="te-target-level"
            hint="예: 기초-실무-심화 등"
          >
            <Input
              id="te-target-level"
              value={value.target_characteristics.level}
              onChange={(e) => updateCharacteristics({ level: e.target.value })}
              placeholder="예: 기초 / 실무 / 심화"
            />
          </FormField>
        </div>
      </fieldset>

      {/* AI활용 가능 인프라 */}
      <fieldset className="space-y-4">
        <legend className="text-sm font-semibold text-foreground">AI활용 가능 인프라</legend>

        <div>
          <div className="text-sm font-medium text-foreground mb-2">AI 도구 사용 가능 환경</div>
          <div
            role="radiogroup"
            aria-label="AI 도구 사용 가능 환경"
            className="flex flex-wrap gap-2"
          >
            {AI_TOOL_OPTIONS.map((capacity) => {
              const checked = value.ai_infrastructure.ai_tools === capacity;
              const radioId = `te-ai-tools-${capacity}`;
              return (
                <label
                  key={capacity}
                  htmlFor={radioId}
                  className={`flex items-center gap-2 px-3 py-2 rounded-md border cursor-pointer transition-colors ${
                    checked
                      ? 'border-primary bg-primary/10 text-primary font-medium'
                      : 'border-border hover:bg-muted'
                  }`}
                >
                  <input
                    id={radioId}
                    type="radio"
                    role="radio"
                    name="te-ai-tools"
                    value={capacity}
                    checked={checked}
                    onChange={() => updateInfrastructure({ ai_tools: capacity })}
                    className="sr-only"
                    aria-label={capacity}
                  />
                  <span className="text-sm">{capacity}</span>
                </label>
              );
            })}
          </div>
        </div>

        <div>
          <div className="text-sm font-medium text-foreground mb-2">네트워크 환경</div>
          <div role="radiogroup" aria-label="네트워크 환경" className="flex flex-wrap gap-2">
            {NETWORK_OPTIONS.map((level) => {
              const checked = value.ai_infrastructure.network === level;
              const radioId = `te-network-${level}`;
              return (
                <label
                  key={level}
                  htmlFor={radioId}
                  className={`flex items-center gap-2 px-3 py-2 rounded-md border cursor-pointer transition-colors ${
                    checked
                      ? 'border-primary bg-primary/10 text-primary font-medium'
                      : 'border-border hover:bg-muted'
                  }`}
                >
                  <input
                    id={radioId}
                    type="radio"
                    role="radio"
                    name="te-network"
                    value={level}
                    checked={checked}
                    onChange={() => updateInfrastructure({ network: level })}
                    className="sr-only"
                    aria-label={level}
                  />
                  <span className="text-sm">{level}</span>
                </label>
              );
            })}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField label="PC 보유 현황" htmlFor="te-pc-count" hint="단위: 대">
            <Input
              id="te-pc-count"
              type="number"
              min={0}
              value={value.ai_infrastructure.pc_count || ''}
              onChange={(e) =>
                updateInfrastructure({ pc_count: Number(e.target.value) || 0 })
              }
            />
          </FormField>
          <FormField label="기타 장비 보유 현황" htmlFor="te-etc-equipment">
            <Input
              id="te-etc-equipment"
              value={value.ai_infrastructure.etc_equipment}
              onChange={(e) => updateInfrastructure({ etc_equipment: e.target.value })}
              placeholder="예: 프로젝터, 공용 GPU 워크스테이션"
            />
          </FormField>
        </div>
      </fieldset>

      {/* 훈련 요구분석 */}
      <FormField
        label="AI훈련 요구분석 결과"
        htmlFor="te-needs"
        required
        hint="불릿 스타일로 현업의 페인포인트·목표를 정리하세요."
      >
        <Textarea
          id="te-needs"
          rows={7}
          value={value.training_needs_analysis}
          onChange={(e) => onChange({ ...value, training_needs_analysis: e.target.value })}
          placeholder={'예) - 반복 보고서 작성 시간 과다\n- 신입 교육 자료 부족\n- 데이터 기반 의사결정 경험 부족'}
          className="break-keep"
        />
      </FormField>

      {/* 훈련을 통한 기대효과 */}
      <fieldset className="space-y-4">
        <legend className="text-sm font-semibold text-foreground">훈련을 통한 기대효과</legend>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField label="As-is (현재 상황)" htmlFor="te-expect-asis" required>
            <Textarea
              id="te-expect-asis"
              rows={5}
              value={value.expectation.as_is}
              onChange={(e) => updateExpectation({ as_is: e.target.value })}
              placeholder="예: 수작업 엑셀 집계로 월 20시간 소요"
              className="break-keep"
            />
          </FormField>
          <FormField label="To-be (원하는 상황)" htmlFor="te-expect-tobe" required>
            <Textarea
              id="te-expect-tobe"
              rows={5}
              value={value.expectation.to_be}
              onChange={(e) => updateExpectation({ to_be: e.target.value })}
              placeholder="예: AI 자동화로 월 4시간으로 단축"
              className="break-keep"
            />
          </FormField>
        </div>
      </fieldset>

      <GuideNote
        items={[
          "'훈련 대상자 특성'은 훈련업무를 수행하는 직원들의 특징 기술",
          "'훈련 여건'은 훈련과정 개발·운영을 위해 활용 가능한 기업 자원을 파악",
          "'훈련을 통한 기대효과'는 업무수행 시 애로사항(As-is)과 해당 업무를 우수하게 수행하기 위해 요구되는 수준(To-be)을 작성(gap 분석)하고, 이를 훈련 목표 및 내용에 연계",
          '과정개발 시 기업의 훈련에 대한 요구사항을 반영하기 위함',
        ]}
      />
    </div>
  );
}
