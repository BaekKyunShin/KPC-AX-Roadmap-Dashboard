'use client';

import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
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
  { value: true, label: '사용' },
  { value: false, label: '미사용' },
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

      {/* 훈련 장소 및 시간 */}
      <fieldset className="space-y-4">
        <legend className="text-sm font-semibold text-foreground">훈련 장소 및 시간</legend>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="te-hours">
              적정 훈련시간(H) <span className="text-destructive">*</span>
            </Label>
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
              className="mt-1"
            />
          </div>
        </div>

        <div>
          <div className="text-sm font-medium text-foreground mb-2">훈련장소</div>
          <div
            role="radiogroup"
            aria-label="훈련장소"
            className="flex flex-wrap gap-2"
          >
            {TRAINING_PLACE_OPTIONS.map((placeValue) => {
              const checked = value.training_place.type === placeValue;
              const radioId = `te-place-${placeValue}`;
              return (
                <label
                  key={placeValue}
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
                    name="te-place"
                    value={placeValue}
                    checked={checked}
                    onChange={() => updatePlace({ type: placeValue })}
                    className="sr-only"
                    aria-label={placeValue}
                  />
                  <span className="text-sm">{placeValue}</span>
                </label>
              );
            })}
          </div>
        </div>

        <div>
          <Label htmlFor="te-place-notes">특이사항</Label>
          <Textarea
            id="te-place-notes"
            rows={3}
            value={value.training_place.special_notes}
            onChange={(e) => updatePlace({ special_notes: e.target.value })}
            placeholder="예: 야간 교대·주말 집중 등 훈련 운영 특이사항"
            className="mt-1 break-keep"
          />
        </div>
      </fieldset>

      {/* 사내 강사 */}
      <fieldset className="space-y-4">
        <legend className="text-sm font-semibold text-foreground">사내 강사</legend>

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
            <div>
              <Label htmlFor="te-instructor-name">성명</Label>
              <Input
                id="te-instructor-name"
                value={value.internal_instructor.name}
                onChange={(e) => updateInstructor({ name: e.target.value })}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="te-instructor-position">직위</Label>
              <Input
                id="te-instructor-position"
                value={value.internal_instructor.position}
                onChange={(e) => updateInstructor({ position: e.target.value })}
                className="mt-1"
              />
            </div>
          </div>
        )}
      </fieldset>

      {/* 대상자 */}
      <fieldset className="space-y-4">
        <legend className="text-sm font-semibold text-foreground">훈련 대상자</legend>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <Label htmlFor="te-target-count">
              대상 인원 <span className="text-destructive">*</span>
            </Label>
            <Input
              id="te-target-count"
              type="number"
              min={1}
              value={value.target_count || ''}
              onChange={(e) =>
                onChange({ ...value, target_count: Number(e.target.value) || 0 })
              }
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="te-target-career">경력</Label>
            <Input
              id="te-target-career"
              value={value.target_characteristics.career}
              onChange={(e) => updateCharacteristics({ career: e.target.value })}
              placeholder="예: 3년 이상"
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="te-target-level">수준</Label>
            <Input
              id="te-target-level"
              value={value.target_characteristics.level}
              onChange={(e) => updateCharacteristics({ level: e.target.value })}
              placeholder="예: 중급자"
              className="mt-1"
            />
          </div>
        </div>
      </fieldset>

      {/* AI 인프라 */}
      <fieldset className="space-y-4">
        <legend className="text-sm font-semibold text-foreground">AI 인프라</legend>

        <div>
          <div className="text-sm font-medium text-foreground mb-2">AI 도구 활용</div>
          <div
            role="radiogroup"
            aria-label="AI 도구 활용"
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
          <div>
            <Label htmlFor="te-pc-count">PC 대수</Label>
            <Input
              id="te-pc-count"
              type="number"
              min={0}
              value={value.ai_infrastructure.pc_count || ''}
              onChange={(e) =>
                updateInfrastructure({ pc_count: Number(e.target.value) || 0 })
              }
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="te-etc-equipment">기타 장비</Label>
            <Input
              id="te-etc-equipment"
              value={value.ai_infrastructure.etc_equipment}
              onChange={(e) => updateInfrastructure({ etc_equipment: e.target.value })}
              placeholder="예: 프로젝터, 공용 GPU 워크스테이션"
              className="mt-1"
            />
          </div>
        </div>
      </fieldset>

      {/* 훈련 요구분석 */}
      <div>
        <Label htmlFor="te-needs">
          AI훈련 요구분석 결과 <span className="text-destructive">*</span>
        </Label>
        <p className="text-xs text-muted-foreground mb-2">
          불릿 스타일로 현업의 페인포인트·목표를 정리하세요.
        </p>
        <Textarea
          id="te-needs"
          rows={5}
          value={value.training_needs_analysis}
          onChange={(e) => onChange({ ...value, training_needs_analysis: e.target.value })}
          placeholder={'예) - 반복 보고서 작성 시간 과다\n- 신입 교육 자료 부족\n- 데이터 기반 의사결정 경험 부족'}
          className="break-keep"
        />
      </div>

      {/* 기대효과 */}
      <fieldset className="space-y-4">
        <legend className="text-sm font-semibold text-foreground">기대효과</legend>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="te-expect-asis">
              현재(As-Is) <span className="text-destructive">*</span>
            </Label>
            <Textarea
              id="te-expect-asis"
              rows={4}
              value={value.expectation.as_is}
              onChange={(e) => updateExpectation({ as_is: e.target.value })}
              placeholder="예: 수작업 엑셀 집계로 월 20시간 소요"
              className="mt-1 break-keep"
            />
          </div>
          <div>
            <Label htmlFor="te-expect-tobe">
              향후(To-Be) <span className="text-destructive">*</span>
            </Label>
            <Textarea
              id="te-expect-tobe"
              rows={4}
              value={value.expectation.to_be}
              onChange={(e) => updateExpectation({ to_be: e.target.value })}
              placeholder="예: AI 자동화로 월 4시간으로 단축"
              className="mt-1 break-keep"
            />
          </div>
        </div>
      </fieldset>
    </div>
  );
}
