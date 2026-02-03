'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { updateConsultantProfile, saveConsultantProfile } from '@/app/(auth)/actions';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, AlertCircle, CheckCircle2, ArrowLeft, Save, User } from 'lucide-react';
import BadgeSelector from './BadgeSelector';
import {
  INDUSTRIES,
  EXPERTISE_DOMAINS,
  TEACHING_LEVELS,
  COACHING_METHODS,
  SKILL_TAGS,
  PROFILE_PLACEHOLDERS,
} from '@/lib/constants/profile-options';
import { SUB_INDUSTRY_CONSTRAINTS } from '@/lib/constants/industry';
import { TagInput } from '@/components/ui/tag-input';
import type { ConsultantProfile } from '@/types/database';

interface ProfileFormProps {
  profile: ConsultantProfile | null;
  backUrl: string;
  successRedirectUrl: string;
  backLabel?: string;
  /** 회원가입 모드 ('registration')일 때 헤더/취소버튼 숨김, 외부 래퍼 제거 */
  variant?: 'default' | 'registration';
  /** 회원가입 완료 알림 표시 여부 */
  showRegistrationAlert?: boolean;
  /** Card 컴포넌트에 적용할 추가 클래스 */
  cardClassName?: string;
}

export default function ProfileForm({
  profile,
  backUrl,
  successRedirectUrl,
  backLabel = '돌아가기',
  variant = 'default',
  showRegistrationAlert = false,
  cardClassName,
}: ProfileFormProps) {
  const router = useRouter();

  // UI 상태
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // 선택된 값들을 상태로 관리
  const [selectedIndustries, setSelectedIndustries] = useState<string[]>(
    profile?.available_industries || []
  );
  const [subIndustries, setSubIndustries] = useState<string[]>(profile?.sub_industries || []);
  const [selectedDomains, setSelectedDomains] = useState<string[]>(
    profile?.expertise_domains || []
  );
  const [selectedLevels, setSelectedLevels] = useState<string[]>(profile?.teaching_levels || []);
  const [selectedMethods, setSelectedMethods] = useState<string[]>(profile?.coaching_methods || []);
  const [selectedTags, setSelectedTags] = useState<string[]>(profile?.skill_tags || []);

  // 파생 상태
  const isRegistrationMode = variant === 'registration';
  const isCreateMode = !profile;

  // 필수 선택 항목 정의
  const requiredSelections = [
    { items: selectedIndustries, label: 'AI 훈련 가능 산업' },
    { items: selectedDomains, label: 'AI 적용 가능 업무' },
    { items: selectedLevels, label: '교육 대상 수준' },
    { items: selectedMethods, label: '선호 교육 방식' },
    { items: selectedTags, label: '보유 역량' },
  ];

  // 필수 항목 검증
  const validateSelections = (): string | null => {
    const emptySelection = requiredSelections.find((s) => s.items.length === 0);
    return emptySelection ? `${emptySelection.label}을 최소 1개 이상 선택해주세요.` : null;
  };

  // 필수 선택 항목 완료 여부 및 미선택 수
  const unselectedCount = requiredSelections.filter((s) => s.items.length === 0).length;
  const isSelectionsValid = unselectedCount === 0;

  // 폼 데이터 준비
  const prepareFormData = (form: HTMLFormElement): FormData => {
    const formData = new FormData(form);
    formData.set('expertise_domains', JSON.stringify(selectedDomains));
    formData.set('available_industries', JSON.stringify(selectedIndustries));
    formData.set('sub_industries', JSON.stringify(subIndustries));
    formData.set('teaching_levels', JSON.stringify(selectedLevels));
    formData.set('coaching_methods', JSON.stringify(selectedMethods));
    formData.set('skill_tags', JSON.stringify(selectedTags));
    return formData;
  };

  // 폼 제출 (생성/수정 공통)
  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    const validationError = validateSelections();
    if (validationError) {
      setError(validationError);
      return;
    }

    setIsSaving(true);

    const formData = prepareFormData(e.currentTarget);

    try {
      const result = profile
        ? await updateConsultantProfile(formData)
        : await saveConsultantProfile(formData);

      if (result.success) {
        setSuccess(
          profile ? '프로필이 성공적으로 수정되었습니다.' : '프로필이 성공적으로 등록되었습니다.'
        );
        setTimeout(() => {
          router.push(successRedirectUrl);
          router.refresh();
        }, 2000);
      } else {
        setError(
          result.error ||
            (profile ? '프로필 수정에 실패했습니다.' : '프로필 등록에 실패했습니다.')
        );
      }
    } catch (err) {
      console.error('프로필 저장 오류:', err);
      setError('서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요.');
    }

    setIsSaving(false);
  }

  // UI 텍스트 (모드에 따라 분기)
  const uiText = {
    pageTitle: isCreateMode ? '프로필 등록' : '프로필 관리',
    pageDescription: isCreateMode
      ? '컨설턴트 프로필을 등록해주세요. 프로필이 상세할수록 적합한 기업과 매칭될 확률이 높아집니다. 각 항목은 복수 선택이 가능하니 가급적 다양하게 선택해주세요.'
      : '컨설턴트 프로필 정보를 수정할 수 있습니다.',
    cardTitle: isCreateMode ? '컨설턴트 프로필 등록' : '컨설턴트 프로필',
    cardDescription: isCreateMode
      ? '모든 항목을 입력해주세요. * 표시는 필수 항목입니다.'
      : '프로필이 상세할수록 적합한 기업과 매칭될 확률이 높아집니다. 각 항목은 복수 선택이 가능하니 가급적 다양하게 선택해주세요.',
    submitButton: isRegistrationMode ? '가입 완료' : isCreateMode ? '프로필 등록' : '저장',
    savingButton: isCreateMode ? '등록 중...' : '저장 중...',
  };

  return (
    <div className={isRegistrationMode ? undefined : 'max-w-2xl mx-auto'}>
      {/* 헤더 영역 - 회원가입 모드에서는 숨김 */}
      {!isRegistrationMode && (
        <div className="mb-6">
          <Button variant="ghost" onClick={() => router.push(backUrl)} className="mb-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            {backLabel}
          </Button>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-blue-600 to-indigo-600">
              <User className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{uiText.pageTitle}</h1>
              <p className="text-sm text-muted-foreground">{uiText.pageDescription}</p>
            </div>
          </div>
        </div>
      )}

      {/* 알림 메시지 */}
      {error && (
        <Alert variant="destructive" className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {success && (
        <Alert className="mb-6 bg-green-50 border-green-200">
          <CheckCircle2 className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-700">{success}</AlertDescription>
        </Alert>
      )}

      {/* 프로필 폼 */}
      <Card className={cardClassName}>
        <CardHeader>
          <CardTitle>{uiText.cardTitle}</CardTitle>
          <CardDescription>{uiText.cardDescription}</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-9">
            {/* 회원가입 완료 알림 */}
            {showRegistrationAlert && (
              <Alert className="bg-blue-50 border-blue-200">
                <CheckCircle2 className="h-4 w-4 text-blue-600" />
                <AlertDescription className="text-blue-700">
                  기본 정보 등록이 완료되었습니다. 컨설턴트 프로필을 입력하시면 가입이 완료됩니다.
                </AlertDescription>
              </Alert>
            )}

            {/* 1. AI 훈련 가능 산업 */}
            <BadgeSelector
              number={1}
              label="AI 훈련 가능 산업"
              description="AI 훈련/코칭을 수행할 수 있는 산업을 선택해주세요."
              options={INDUSTRIES}
              selected={selectedIndustries}
              onSelectionChange={setSelectedIndustries}
              color="blue"
            />

            {/* 1-1. 선호 세부 업종 */}
            <div className="space-y-2 ml-6 border-l-2 border-blue-200 pl-4">
              <div>
                <Label className="text-sm font-medium">
                  선호 세부 업종 <span className="text-muted-foreground">(선택)</span>
                </Label>
                <p className="text-sm text-muted-foreground mt-1">
                  더 구체적인 업종을 입력해주세요. 세부 업종을 추가하면 더 정확한 매칭이 가능합니다. (예: 반도체, 디스플레이, 자동차 부품, 식품 등)
                </p>
              </div>
              <TagInput
                value={subIndustries}
                onChange={setSubIndustries}
                placeholder="세부 업종 입력 후 Enter 또는 추가 버튼"
                maxTags={SUB_INDUSTRY_CONSTRAINTS.maxTags}
                maxLength={SUB_INDUSTRY_CONSTRAINTS.maxLength}
              />
            </div>

            {/* 2. AI 적용 가능 업무 */}
            <BadgeSelector
              number={2}
              label="AI 적용 가능 업무"
              description="AI를 활용해 개선할 수 있는 업무 영역을 선택해주세요."
              options={EXPERTISE_DOMAINS}
              selected={selectedDomains}
              onSelectionChange={setSelectedDomains}
              color="indigo"
            />

            {/* 3. 교육 대상 수준 */}
            <BadgeSelector
              number={3}
              label="교육 대상 수준"
              description="교육 가능한 학습자의 AI 활용 수준을 선택해주세요."
              options={TEACHING_LEVELS}
              selected={selectedLevels}
              onSelectionChange={setSelectedLevels}
              color="emerald"
              showOptionDescriptions
            />

            {/* 4. 선호 교육 방식 */}
            <BadgeSelector
              number={4}
              label="선호 교육 방식"
              description="주로 활용하는 교육/코칭 방식을 선택해주세요."
              options={COACHING_METHODS}
              selected={selectedMethods}
              onSelectionChange={setSelectedMethods}
              color="purple"
            />

            {/* 5. 보유 역량 */}
            <BadgeSelector
              number={5}
              label="보유 역량"
              description="본인이 보유한 핵심 역량을 모두 선택해주세요."
              options={SKILL_TAGS}
              selected={selectedTags}
              onSelectionChange={setSelectedTags}
              color="amber"
            />

            {/* 6. AI 교육/컨설팅 경력 */}
            <div className="space-y-2">
              <div>
                <Label htmlFor="years_of_experience">
                  6. AI 교육/컨설팅 경력 <span className="text-red-500">*</span>
                </Label>
                <p className="text-sm text-muted-foreground mt-1">
                  AI 관련 교육 또는 컨설팅 경력을 입력해주세요.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Input
                  id="years_of_experience"
                  name="years_of_experience"
                  type="number"
                  min="0"
                  max="50"
                  required
                  defaultValue={profile?.years_of_experience || 0}
                  className="h-11 w-24"
                />
                <span className="text-sm text-muted-foreground">년</span>
              </div>
            </div>

            {/* 7. 경력 사항 */}
            <div className="space-y-2">
              <div>
                <Label htmlFor="representative_experience">
                  7. 경력 사항 <span className="text-red-500">*</span>
                </Label>
                <p className="text-sm text-muted-foreground mt-1">
                  이전 직장, 근무 기간, 담당 업무 등 경력을 작성해주세요.
                </p>
              </div>
              <Textarea
                id="representative_experience"
                name="representative_experience"
                rows={4}
                defaultValue={profile?.representative_experience || ''}
                placeholder={PROFILE_PLACEHOLDERS.representative_experience}
                className="resize-none break-keep"
              />
            </div>

            {/* 8. 강의/컨설팅 포트폴리오 */}
            <div className="space-y-2">
              <div>
                <Label htmlFor="portfolio">
                  8. 강의/컨설팅 포트폴리오 <span className="text-red-500">*</span>
                </Label>
                <p className="text-sm text-muted-foreground mt-1">
                  진행했던 강의, 워크숍, 컨설팅 등을 작성해주세요. 자세히 작성할수록 매칭 건수가
                  많아집니다.
                </p>
              </div>
              <Textarea
                id="portfolio"
                name="portfolio"
                rows={4}
                required
                defaultValue={profile?.portfolio || ''}
                placeholder={PROFILE_PLACEHOLDERS.portfolio}
                className="resize-none break-keep"
              />
            </div>

            {/* 9. 강점/제약 */}
            <div className="space-y-2">
              <div>
                <Label htmlFor="strengths_constraints">
                  9. 강점/제약 <span className="text-red-500">*</span>
                </Label>
                <p className="text-sm text-muted-foreground mt-1">
                  본인의 강점과 제약사항을 작성해주세요.
                </p>
              </div>
              <Textarea
                id="strengths_constraints"
                name="strengths_constraints"
                rows={4}
                required
                defaultValue={profile?.strengths_constraints || ''}
                placeholder={PROFILE_PLACEHOLDERS.strengths_constraints}
                className="resize-none break-keep"
              />
            </div>

            {/* 버튼 영역 */}
            <div className="space-y-3 pt-4">
              {!isSelectionsValid && (
                <p className="text-sm text-amber-600">
                  필수 선택 항목 {unselectedCount}개 미선택
                </p>
              )}
              <div className="flex gap-3">
                {/* 취소 버튼 - 회원가입 모드에서는 숨김 */}
                {!isRegistrationMode && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => router.push(backUrl)}
                    disabled={isSaving}
                  >
                    취소
                  </Button>
                )}
                <Button
                  type="submit"
                  disabled={isSaving || !isSelectionsValid}
                  className={isRegistrationMode ? 'w-full' : undefined}
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      {uiText.savingButton}
                    </>
                  ) : (
                    <>
                      <Save className="mr-2 h-4 w-4" />
                      {uiText.submitButton}
                    </>
                  )}
                </Button>
              </div>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
