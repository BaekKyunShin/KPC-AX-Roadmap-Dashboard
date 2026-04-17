'use client';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { FieldError } from '@/components/ui/field-error';
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
          <div>
            <Label htmlFor="co-company-name">기업명</Label>
            <Input
              id="co-company-name"
              value={value.company_name}
              onChange={(e) => update('company_name', e.target.value)}
              placeholder="예: 주식회사 테스트"
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="co-biz-no">사업장관리번호</Label>
            <Input
              id="co-biz-no"
              value={value.business_registration_no}
              onChange={(e) => update('business_registration_no', e.target.value)}
              placeholder="예: 123-45-67890"
              className="mt-1"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="co-industry-code">업종코드</Label>
            <Input
              id="co-industry-code"
              value={value.industry_code}
              onChange={(e) => update('industry_code', e.target.value)}
              placeholder="예: C26"
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="co-industry-main">주업종</Label>
            <Input
              id="co-industry-main"
              value={value.industry_main}
              onChange={(e) => update('industry_main', e.target.value)}
              placeholder="예: 전자부품 제조업"
              className="mt-1"
            />
          </div>
        </div>

        <div>
          <Label htmlFor="co-address">주소</Label>
          <Input
            id="co-address"
            value={value.address}
            onChange={(e) => update('address', e.target.value)}
            placeholder="본사 주소"
            className="mt-1"
          />
        </div>
        <div>
          <Label htmlFor="co-training-address">훈련실시주소</Label>
          <Input
            id="co-training-address"
            value={value.training_address}
            onChange={(e) => update('training_address', e.target.value)}
            placeholder="본사와 다를 경우 입력"
            className="mt-1"
          />
        </div>
        <div>
          <Label htmlFor="co-jurisdiction">관할 지부·지사</Label>
          <Input
            id="co-jurisdiction"
            value={value.jurisdiction_office}
            onChange={(e) => update('jurisdiction_office', e.target.value)}
            placeholder="예: 서울지역본부"
            className="mt-1"
          />
        </div>
      </fieldset>

      {/* 담당자 */}
      <fieldset className="space-y-4">
        <legend className="text-sm font-semibold text-foreground">담당자 연락처</legend>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="co-contact-position">직책</Label>
            <Input
              id="co-contact-position"
              value={value.contact.position}
              onChange={(e) => updateContact('position', e.target.value)}
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="co-contact-name">성명</Label>
            <Input
              id="co-contact-name"
              value={value.contact.name}
              onChange={(e) => updateContact('name', e.target.value)}
              className="mt-1"
            />
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="co-contact-phone">연락처</Label>
            <Input
              id="co-contact-phone"
              type="tel"
              value={value.contact.phone}
              onChange={(e) => updateContact('phone', e.target.value)}
              placeholder="010-0000-0000"
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="co-contact-email">이메일</Label>
            <Input
              id="co-contact-email"
              type="email"
              value={value.contact.email}
              onChange={(e) => updateContact('email', e.target.value)}
              placeholder="contact@example.com"
              className="mt-1"
            />
          </div>
        </div>
      </fieldset>

      {/* 훈련 과정 정보 */}
      <fieldset className="space-y-4">
        <legend className="text-sm font-semibold text-foreground">훈련 과정 정보</legend>

        <div>
          <Label htmlFor="co-course-name">
            훈련과정명 <span className="text-destructive">*</span>
          </Label>
          <Input
            id="co-course-name"
            value={value.course_name}
            onChange={(e) => update('course_name', e.target.value)}
            placeholder="예: AI 기반 품질관리 과정"
            aria-invalid={Boolean(errors?.course_name) || undefined}
            className="mt-1"
          />
          <FieldError message={errors?.course_name} />
        </div>

        <div>
          <Label htmlFor="co-ncs">NCS 분류</Label>
          <Input
            id="co-ncs"
            value={value.ncs_code}
            onChange={(e) => update('ncs_code', e.target.value)}
            placeholder="예: 200107 인공지능"
            className="mt-1"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <Label htmlFor="co-hours">
              훈련시간(H) <span className="text-destructive">*</span>
            </Label>
            <Input
              id="co-hours"
              type="number"
              min={1}
              value={value.training_hours || ''}
              onChange={(e) => update('training_hours', Number(e.target.value) || 0)}
              aria-invalid={Boolean(errors?.training_hours) || undefined}
              className="mt-1"
            />
            <FieldError message={errors?.training_hours} />
          </div>
          <div>
            <Label htmlFor="co-trainees">
              훈련생(명) <span className="text-destructive">*</span>
            </Label>
            <Input
              id="co-trainees"
              type="number"
              min={1}
              value={value.trainee_count || ''}
              onChange={(e) => update('trainee_count', Number(e.target.value) || 0)}
              aria-invalid={Boolean(errors?.trainee_count) || undefined}
              className="mt-1"
            />
            <FieldError message={errors?.trainee_count} />
          </div>
          <div>
            <Label htmlFor="co-job">
              훈련 직무 <span className="text-destructive">*</span>
            </Label>
            <Input
              id="co-job"
              value={value.training_job}
              onChange={(e) => update('training_job', e.target.value)}
              placeholder="예: 품질관리"
              aria-invalid={Boolean(errors?.training_job) || undefined}
              className="mt-1"
            />
            <FieldError message={errors?.training_job} />
          </div>
        </div>
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
    </div>
  );
}
