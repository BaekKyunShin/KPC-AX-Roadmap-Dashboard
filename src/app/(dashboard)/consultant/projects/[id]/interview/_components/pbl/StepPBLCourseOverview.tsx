'use client';

import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { FieldError } from '@/components/ui/field-error';
import { FormField } from '@/components/ui/form-field';
import { GuideNote } from '@/components/ui/guide-note';
import {
  AI_LEVEL_OPTIONS,
  TRAINING_GOAL_OPTIONS,
  type PBLCourseOverview,
  type AILevel,
  type TrainingGoal,
} from '@/lib/schemas/interview-pbl';

interface StepPBLCourseOverviewProps {
  value: PBLCourseOverview;
  onChange: (next: PBLCourseOverview) => void;
  errors?: Partial<Record<keyof PBLCourseOverview, string>>;
}

export default function StepPBLCourseOverview({
  value,
  onChange,
  errors,
}: StepPBLCourseOverviewProps) {
  const update = <K extends keyof PBLCourseOverview>(key: K, next: PBLCourseOverview[K]) => {
    onChange({ ...value, [key]: next });
  };

  const updateContact = (key: keyof PBLCourseOverview['contact'], next: string) => {
    onChange({ ...value, contact: { ...value.contact, [key]: next } });
  };

  const toggleTrainingGoal = (goal: TrainingGoal) => {
    const exists = value.training_goals.includes(goal);
    const nextGoals = exists
      ? value.training_goals.filter((g) => g !== goal)
      : [...value.training_goals, goal];
    update('training_goals', nextGoals);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-foreground">Ⅰ. 훈련과정 개요</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          산인공 AI PBL 양식 Ⅰ장. 기업·훈련 기본 정보와 AI역량 수준·훈련 목표를 입력하세요.
        </p>
      </div>

      {/* 기업 기본정보 */}
      <fieldset className="space-y-4">
        <legend className="text-sm font-semibold text-foreground">기업 기본정보</legend>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField label="기업명" htmlFor="co-company-name">
            <Input
              id="co-company-name"
              value={value.company_name}
              onChange={(e) => update('company_name', e.target.value)}
              placeholder="예: 주식회사 테스트"
            />
          </FormField>
          <FormField label="사업장관리번호" htmlFor="co-biz-no">
            <Input
              id="co-biz-no"
              value={value.business_registration_no}
              onChange={(e) => update('business_registration_no', e.target.value)}
              placeholder="예: 123-45-67890"
            />
          </FormField>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField label="업종코드" htmlFor="co-industry-code">
            <Input
              id="co-industry-code"
              value={value.industry_code}
              onChange={(e) => update('industry_code', e.target.value)}
              placeholder="예: C26"
            />
          </FormField>
          <FormField label="주업종(주된 사업)" htmlFor="co-industry-main">
            <Input
              id="co-industry-main"
              value={value.industry_main}
              onChange={(e) => update('industry_main', e.target.value)}
              placeholder="예: 전자부품 제조업"
            />
          </FormField>
        </div>

        <FormField label="주소" htmlFor="co-address">
          <Input
            id="co-address"
            value={value.address}
            onChange={(e) => update('address', e.target.value)}
            placeholder="본사 주소"
          />
        </FormField>
        <FormField label="훈련실시주소" htmlFor="co-training-address">
          <Input
            id="co-training-address"
            value={value.training_address}
            onChange={(e) => update('training_address', e.target.value)}
            placeholder="본사와 다를 경우 입력"
          />
        </FormField>
        <FormField label="관할 지부·지사" htmlFor="co-jurisdiction">
          <Input
            id="co-jurisdiction"
            value={value.jurisdiction_office}
            onChange={(e) => update('jurisdiction_office', e.target.value)}
            placeholder="예: 서울지역본부"
          />
        </FormField>
      </fieldset>

      {/* 담당자 */}
      <fieldset className="space-y-4">
        <legend className="text-sm font-semibold text-foreground">담당자 연락처</legend>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField label="직위" htmlFor="co-contact-position">
            <Input
              id="co-contact-position"
              value={value.contact.position}
              onChange={(e) => updateContact('position', e.target.value)}
            />
          </FormField>
          <FormField label="성명" htmlFor="co-contact-name">
            <Input
              id="co-contact-name"
              value={value.contact.name}
              onChange={(e) => updateContact('name', e.target.value)}
            />
          </FormField>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField label="연락처" htmlFor="co-contact-phone">
            <Input
              id="co-contact-phone"
              type="tel"
              value={value.contact.phone}
              onChange={(e) => updateContact('phone', e.target.value)}
              placeholder="010-0000-0000"
            />
          </FormField>
          <FormField label="e-mail" htmlFor="co-contact-email">
            <Input
              id="co-contact-email"
              type="email"
              value={value.contact.email}
              onChange={(e) => updateContact('email', e.target.value)}
              placeholder="contact@example.com"
            />
          </FormField>
        </div>
      </fieldset>

      {/* 훈련 과정 정보 */}
      <fieldset className="space-y-4">
        <legend className="text-sm font-semibold text-foreground">훈련 과정 정보</legend>

        <FormField
          label="훈련과정명"
          htmlFor="co-course-name"
          required
          error={errors?.course_name}
        >
          <Input
            id="co-course-name"
            value={value.course_name}
            onChange={(e) => update('course_name', e.target.value)}
            placeholder="예: AI 기반 품질관리 과정"
            aria-invalid={Boolean(errors?.course_name) || undefined}
          />
        </FormField>

        <FormField label="NCS 분류" htmlFor="co-ncs">
          <Input
            id="co-ncs"
            value={value.ncs_code}
            onChange={(e) => update('ncs_code', e.target.value)}
            placeholder="예: 200107 인공지능"
          />
        </FormField>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            label="훈련시간"
            htmlFor="co-hours"
            required
            error={errors?.training_hours}
            hint="단위: 시간"
          >
            <Input
              id="co-hours"
              type="number"
              min={1}
              value={value.training_hours || ''}
              onChange={(e) => update('training_hours', Number(e.target.value) || 0)}
              aria-invalid={Boolean(errors?.training_hours) || undefined}
            />
          </FormField>
          <FormField
            label="훈련생"
            htmlFor="co-trainees"
            required
            error={errors?.trainee_count}
            hint="단위: 명"
          >
            <Input
              id="co-trainees"
              type="number"
              min={1}
              value={value.trainee_count || ''}
              onChange={(e) => update('trainee_count', Number(e.target.value) || 0)}
              aria-invalid={Boolean(errors?.trainee_count) || undefined}
            />
          </FormField>
        </div>

        <FormField
          label="훈련 직무"
          htmlFor="co-job"
          required
          error={errors?.training_job}
        >
          <Input
            id="co-job"
            value={value.training_job}
            onChange={(e) => update('training_job', e.target.value)}
            placeholder="예: 품질관리"
            aria-invalid={Boolean(errors?.training_job) || undefined}
          />
        </FormField>
      </fieldset>

      {/* AI역량 수준 */}
      <fieldset>
        <legend className="text-sm font-semibold text-foreground mb-2">
          AI역량 수준 <span className="text-destructive">*</span>
        </legend>
        <p className="text-xs text-muted-foreground mb-3">
          양식 Ⅰ장 4등급 체크. 현재 기업의 AI 활용 성숙도.
        </p>
        <div
          role="radiogroup"
          aria-label="AI역량 수준"
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2"
        >
          {AI_LEVEL_OPTIONS.map(({ value: levelVal, grade, description }) => {
            const checked = value.ai_level === levelVal;
            const radioId = `co-ai-level-${levelVal}`;
            return (
              <label
                key={levelVal}
                htmlFor={radioId}
                className={`flex flex-col gap-1 p-3 rounded-md border cursor-pointer transition-colors ${
                  checked
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-border hover:bg-muted'
                }`}
              >
                <input
                  id={radioId}
                  type="radio"
                  role="radio"
                  name="co-ai-level"
                  value={levelVal}
                  checked={checked}
                  onChange={() => update('ai_level', levelVal as AILevel)}
                  className="sr-only"
                  aria-label={`${levelVal}(${grade})`}
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
      </fieldset>

      {/* 훈련 목표 (체크박스 복수 선택) */}
      <fieldset>
        <legend className="text-sm font-semibold text-foreground mb-2">
          훈련 목표 <span className="text-destructive">*</span>
          <span className="ml-2 text-xs font-normal text-muted-foreground">
            (복수 선택 가능)
          </span>
        </legend>
        <div className="flex flex-wrap gap-3">
          {TRAINING_GOAL_OPTIONS.map((goal) => {
            const checked = value.training_goals.includes(goal);
            const checkId = `co-goal-${goal}`;
            return (
              <label
                key={goal}
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
                  onCheckedChange={() => toggleTrainingGoal(goal)}
                  aria-label={goal}
                />
                <span className="text-sm">{goal}</span>
              </label>
            );
          })}
        </div>
        <FieldError message={errors?.training_goals} />
      </fieldset>

      <GuideNote
        items={[
          '(기업명/사업장관리번호/주요 업종/주소/훈련실시주소/관할 지부·지사) 신청서 기준으로 자동 불러옴 처리되며, 내용 수정이 불가',
          '(담당자 연락처/NCS 분류) 신청서 기준으로 자동 불러옴 처리되며, 내용 수정 가능',
          '(훈련과정명/훈련시간/훈련생) 훈련 프로파일 기준으로 자동 불러옴 처리되며, 내용 수정 불가',
          '(훈련직무) 직접 입력',
          '(AI역량 수준) 현재 기업의 AI역량 수준을 체크',
          '(훈련 목표) 훈련을 통해 달성하고자 하는 목표를 선택(중복선택 가능)',
        ]}
      />
    </div>
  );
}
