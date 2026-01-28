'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { registerUser, saveConsultantProfile } from '../actions';
import { createClient } from '@/lib/supabase/client';
import { registerSchema, consultantProfileSchema } from '@/lib/schemas/user';
import {
  EXPERTISE_DOMAINS,
  INDUSTRIES,
  SKILL_TAGS,
  TEACHING_LEVELS,
  COACHING_METHODS,
} from '@/lib/constants/consultant-options';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { FieldError } from '@/components/ui/field-error';
import {
  Loader2,
  Eye,
  EyeOff,
  AlertCircle,
  CheckCircle2,
  User,
  Briefcase,
  ChevronRight,
  Shield,
} from 'lucide-react';
import { Logo } from '@/components/ui/logo';
import { AuthBackgroundDecoration } from '@/components/auth/AuthBackgroundDecoration';

type RegisterType = 'CONSULTANT' | 'OPS_ADMIN';

// 필드별 에러 타입
type Step1Errors = {
  email?: string;
  name?: string;
  phone?: string;
  password?: string;
  confirmPassword?: string;
  agreeToTerms?: string;
};

type Step2Errors = {
  expertise_domains?: string;
  available_industries?: string;
  teaching_levels?: string;
  coaching_methods?: string;
  skill_tags?: string;
  years_of_experience?: string;
  representative_experience?: string;
  portfolio?: string;
  strengths_constraints?: string;
};

export default function RegisterPage() {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);

  // UI 상태
  const [step, setStep] = useState(1);
  const [serverError, setServerError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [registerType, setRegisterType] = useState<RegisterType>('CONSULTANT');

  // 필드별 에러 상태
  const [step1Errors, setStep1Errors] = useState<Step1Errors>({});
  const [step2Errors, setStep2Errors] = useState<Step2Errors>({});

  // Step 2 폼 데이터
  const [expertiseDomains, setExpertiseDomains] = useState<string[]>([]);
  const [availableIndustries, setAvailableIndustries] = useState<string[]>([]);
  const [teachingLevels, setTeachingLevels] = useState<string[]>([]);
  const [coachingMethods, setCoachingMethods] = useState<string[]>([]);
  const [skillTags, setSkillTags] = useState<string[]>([]);
  const [yearsOfExperience, setYearsOfExperience] = useState<number>(0);
  const [representativeExperience, setRepresentativeExperience] = useState('');
  const [portfolio, setPortfolio] = useState('');
  const [strengthsConstraints, setStrengthsConstraints] = useState('');

  // 페이지 로드 시 기존 세션 로그아웃
  useEffect(() => {
    const clearSession = async () => {
      try {
        const supabase = createClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (user) {
          await supabase.auth.signOut();
        }
      } catch (err) {
        console.error('세션 초기화 오류:', err);
      } finally {
        setIsInitializing(false);
      }
    };

    clearSession();
  }, []);

  // 에러 발생 시 첫 번째 에러 필드로 스크롤
  function scrollToFirstError() {
    setTimeout(() => {
      const firstErrorElement = formRef.current?.querySelector('[data-error="true"]');
      if (firstErrorElement) {
        firstErrorElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
        const input = firstErrorElement.querySelector('input, textarea');
        if (input) {
          (input as HTMLElement).focus();
        }
      }
    }, 100);
  }

  // 배열 토글 헬퍼
  function toggleArrayValue(
    array: string[],
    value: string,
    setter: React.Dispatch<React.SetStateAction<string[]>>
  ) {
    if (array.includes(value)) {
      setter(array.filter((v) => v !== value));
    } else {
      setter([...array, value]);
    }
  }

  // Step 1: 기본 정보 제출
  async function handleStep1Submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setServerError(null);
    setStep1Errors({});

    const formData = new FormData(e.currentTarget);
    const data = {
      email: formData.get('email') as string,
      password: formData.get('password') as string,
      confirmPassword: formData.get('confirmPassword') as string,
      name: formData.get('name') as string,
      phone: (formData.get('phone') as string) || '',
      registerType: registerType,
      agreeToTerms: formData.get('agreeToTerms') === 'on',
    };

    // Zod로 검증
    const result = registerSchema.safeParse(data);
    if (!result.success) {
      const errors: Step1Errors = {};
      result.error.errors.forEach((err) => {
        const field = err.path[0] as keyof Step1Errors;
        if (!errors[field]) {
          errors[field] = err.message;
        }
      });
      setStep1Errors(errors);
      scrollToFirstError();
      return;
    }

    setIsLoading(true);

    const submitFormData = new FormData();
    submitFormData.set('email', data.email);
    submitFormData.set('password', data.password);
    submitFormData.set('confirmPassword', data.confirmPassword);
    submitFormData.set('name', data.name);
    submitFormData.set('phone', data.phone);
    submitFormData.set('registerType', data.registerType);
    submitFormData.set('agreeToTerms', 'true');

    const serverResult = await registerUser(submitFormData);

    // 회원가입 실패 시 에러 표시 후 종료
    if (!serverResult.success || !serverResult.data?.userId) {
      setServerError(serverResult.error || '회원가입에 실패했습니다.');
      setIsLoading(false);
      return;
    }

    // 운영관리자는 바로 대시보드로 이동 (로딩 상태 유지)
    if (registerType === 'OPS_ADMIN') {
      router.push('/dashboard');
      return;
    }

    // 컨설턴트는 2단계(프로필 입력)로 진행
    setStep(2);
    setIsLoading(false);
  }

  // Step 2: 프로필 정보 제출
  async function handleStep2Submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setServerError(null);
    setStep2Errors({});

    const data = {
      expertise_domains: expertiseDomains,
      available_industries: availableIndustries,
      teaching_levels: teachingLevels,
      coaching_methods: coachingMethods,
      skill_tags: skillTags,
      years_of_experience: yearsOfExperience,
      representative_experience: representativeExperience,
      portfolio: portfolio,
      strengths_constraints: strengthsConstraints,
    };

    // Zod로 검증
    const result = consultantProfileSchema.safeParse(data);
    if (!result.success) {
      const errors: Step2Errors = {};
      result.error.errors.forEach((err) => {
        const field = err.path[0] as keyof Step2Errors;
        if (!errors[field]) {
          errors[field] = err.message;
        }
      });
      setStep2Errors(errors);
      scrollToFirstError();
      return;
    }

    setIsLoading(true);

    const formData = new FormData();
    formData.set('expertise_domains', JSON.stringify(expertiseDomains));
    formData.set('available_industries', JSON.stringify(availableIndustries));
    formData.set('teaching_levels', JSON.stringify(teachingLevels));
    formData.set('coaching_methods', JSON.stringify(coachingMethods));
    formData.set('skill_tags', JSON.stringify(skillTags));
    formData.set('years_of_experience', String(yearsOfExperience));
    formData.set('representative_experience', representativeExperience);
    formData.set('portfolio', portfolio);
    formData.set('strengths_constraints', strengthsConstraints);

    try {
      const serverResult = await saveConsultantProfile(formData);

      // 프로필 저장 실패 시 에러 표시 후 종료
      if (!serverResult.success) {
        setServerError(serverResult.error || '프로필 저장에 실패했습니다.');
        setIsLoading(false);
        return;
      }

      // 프로필 저장 성공 시 대시보드로 이동 (로딩 상태 유지)
      router.push('/dashboard');
    } catch (err) {
      console.error('프로필 저장 오류:', err);
      setServerError('서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요.');
      setIsLoading(false);
    }
  }

  // 초기화 중 로딩 표시
  if (isInitializing) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600 mx-auto" />
          <p className="mt-2 text-muted-foreground">페이지 준비 중...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 py-8 px-4">
      <AuthBackgroundDecoration />

      <div className="max-w-2xl mx-auto relative">
        {/* Logo & Title */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-block mb-4">
            <Logo height={32} />
          </Link>
          <p className="mt-1 text-muted-foreground">회원가입</p>
        </div>

        {/* Progress Steps */}
        <div className="flex items-center justify-center mb-8">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div
                className={`flex h-10 w-10 items-center justify-center rounded-full border-2 transition-all ${
                  step >= 1
                    ? 'border-blue-600 bg-blue-600 text-white'
                    : 'border-gray-300 bg-white text-gray-400'
                }`}
              >
                {step > 1 ? <CheckCircle2 className="h-5 w-5" /> : <User className="h-5 w-5" />}
              </div>
              <span
                className={`text-base font-medium ${step >= 1 ? 'text-blue-600' : 'text-gray-400'}`}
              >
                기본 정보
              </span>
            </div>

            {registerType === 'CONSULTANT' && (
              <>
                <ChevronRight className="h-5 w-5 text-gray-300" />
                <div className="flex items-center gap-2">
                  <div
                    className={`flex h-10 w-10 items-center justify-center rounded-full border-2 transition-all ${
                      step >= 2
                        ? 'border-blue-600 bg-blue-600 text-white'
                        : 'border-gray-300 bg-white text-gray-400'
                    }`}
                  >
                    <Briefcase className="h-5 w-5" />
                  </div>
                  <span
                    className={`text-base font-medium ${step >= 2 ? 'text-blue-600' : 'text-gray-400'}`}
                  >
                    프로필 등록
                  </span>
                </div>
              </>
            )}
          </div>
        </div>

        {/* 서버 에러 표시 */}
        {serverError && (
          <Alert variant="destructive" className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{serverError}</AlertDescription>
          </Alert>
        )}

        {step === 1 ? (
          <Step1Form
            formRef={formRef}
            registerType={registerType}
            setRegisterType={setRegisterType}
            step1Errors={step1Errors}
            showPassword={showPassword}
            setShowPassword={setShowPassword}
            showConfirmPassword={showConfirmPassword}
            setShowConfirmPassword={setShowConfirmPassword}
            isLoading={isLoading}
            onSubmit={handleStep1Submit}
          />
        ) : (
          <Step2Form
            formRef={formRef}
            step2Errors={step2Errors}
            expertiseDomains={expertiseDomains}
            setExpertiseDomains={setExpertiseDomains}
            availableIndustries={availableIndustries}
            setAvailableIndustries={setAvailableIndustries}
            teachingLevels={teachingLevels}
            setTeachingLevels={setTeachingLevels}
            coachingMethods={coachingMethods}
            setCoachingMethods={setCoachingMethods}
            skillTags={skillTags}
            setSkillTags={setSkillTags}
            yearsOfExperience={yearsOfExperience}
            setYearsOfExperience={setYearsOfExperience}
            representativeExperience={representativeExperience}
            setRepresentativeExperience={setRepresentativeExperience}
            portfolio={portfolio}
            setPortfolio={setPortfolio}
            strengthsConstraints={strengthsConstraints}
            setStrengthsConstraints={setStrengthsConstraints}
            isLoading={isLoading}
            toggleArrayValue={toggleArrayValue}
            onSubmit={handleStep2Submit}
          />
        )}

        {/* Footer */}
        <p className="mt-8 text-center text-sm text-muted-foreground">
          &copy; 2026 KPC 한국생산성본부 · Developed by Baek Kyun Shin
        </p>
      </div>
    </div>
  );
}

// Step 1: 기본 정보 폼 컴포넌트
interface Step1FormProps {
  formRef: React.RefObject<HTMLFormElement | null>;
  registerType: RegisterType;
  setRegisterType: (type: RegisterType) => void;
  step1Errors: Step1Errors;
  showPassword: boolean;
  setShowPassword: (show: boolean) => void;
  showConfirmPassword: boolean;
  setShowConfirmPassword: (show: boolean) => void;
  isLoading: boolean;
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
}

function Step1Form({
  formRef,
  registerType,
  setRegisterType,
  step1Errors,
  showPassword,
  setShowPassword,
  showConfirmPassword,
  setShowConfirmPassword,
  isLoading,
  onSubmit,
}: Step1FormProps) {
  return (
    <Card className="shadow-xl border-0 bg-white/80 backdrop-blur-sm">
      <CardHeader>
        <CardTitle>기본 정보 입력</CardTitle>
        <CardDescription>계정 생성을 위한 기본 정보를 입력해주세요</CardDescription>
      </CardHeader>
      <CardContent>
        <form ref={formRef} onSubmit={onSubmit} className="space-y-4">
          {/* 역할 선택 */}
          <div className="space-y-3">
            <Label>
              가입 유형 <span className="text-red-500">*</span>
            </Label>
            <div className="grid grid-cols-2 gap-3">
              <label
                className={`flex items-center gap-3 p-4 rounded-lg border-2 cursor-pointer transition-all ${
                  registerType === 'CONSULTANT'
                    ? 'border-blue-600 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <input
                  type="radio"
                  name="registerTypeRadio"
                  value="CONSULTANT"
                  checked={registerType === 'CONSULTANT'}
                  onChange={() => setRegisterType('CONSULTANT')}
                  className="sr-only"
                />
                <div
                  className={`flex h-10 w-10 items-center justify-center rounded-full ${
                    registerType === 'CONSULTANT'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-500'
                  }`}
                >
                  <Briefcase className="h-5 w-5" />
                </div>
                <div>
                  <div className="font-medium text-gray-900">컨설턴트</div>
                  <div className="text-sm text-muted-foreground">기업 AI 교육 컨설팅</div>
                </div>
              </label>

              <label
                className={`flex items-center gap-3 p-4 rounded-lg border-2 cursor-pointer transition-all ${
                  registerType === 'OPS_ADMIN'
                    ? 'border-purple-600 bg-purple-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <input
                  type="radio"
                  name="registerTypeRadio"
                  value="OPS_ADMIN"
                  checked={registerType === 'OPS_ADMIN'}
                  onChange={() => setRegisterType('OPS_ADMIN')}
                  className="sr-only"
                />
                <div
                  className={`flex h-10 w-10 items-center justify-center rounded-full ${
                    registerType === 'OPS_ADMIN'
                      ? 'bg-purple-600 text-white'
                      : 'bg-gray-100 text-gray-500'
                  }`}
                >
                  <Shield className="h-5 w-5" />
                </div>
                <div>
                  <div className="font-medium text-gray-900">운영관리자</div>
                  <div className="text-sm text-muted-foreground">고객사/프로젝트 관리</div>
                </div>
              </label>
            </div>
            {registerType === 'OPS_ADMIN' && (
              <p className="text-sm text-amber-600 bg-amber-50 p-3 rounded-lg">
                운영관리자 계정은 시스템 관리자의 승인이 필요합니다.
              </p>
            )}
          </div>

          <div className="space-y-2" data-error={!!step1Errors.email}>
            <Label htmlFor="email">
              이메일 <span className="text-red-500">*</span>
            </Label>
            <Input
              id="email"
              name="email"
              type="email"
              required
              placeholder="example@company.com"
              className={`h-11 ${step1Errors.email ? 'border-destructive' : ''}`}
            />
            <FieldError message={step1Errors.email} />
          </div>

          <div className="space-y-2" data-error={!!step1Errors.name}>
            <Label htmlFor="name">
              이름 <span className="text-red-500">*</span>
            </Label>
            <Input
              id="name"
              name="name"
              type="text"
              required
              placeholder="홍길동"
              className={`h-11 ${step1Errors.name ? 'border-destructive' : ''}`}
            />
            <FieldError message={step1Errors.name} />
          </div>

          <div className="space-y-2" data-error={!!step1Errors.phone}>
            <Label htmlFor="phone">연락처</Label>
            <Input
              id="phone"
              name="phone"
              type="tel"
              placeholder="010-1234-5678"
              className={`h-11 ${step1Errors.phone ? 'border-destructive' : ''}`}
            />
            <FieldError message={step1Errors.phone} />
          </div>

          <div className="space-y-2" data-error={!!step1Errors.password}>
            <Label htmlFor="password">
              비밀번호 <span className="text-red-500">*</span>
            </Label>
            <div className="relative">
              <Input
                id="password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                required
                className={`h-11 pr-10 ${step1Errors.password ? 'border-destructive' : ''}`}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 flex items-center pr-3 text-muted-foreground hover:text-foreground transition-colors"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            <p className="text-sm text-muted-foreground">8자 이상, 영문과 숫자 포함</p>
            <FieldError message={step1Errors.password} />
          </div>

          <div className="space-y-2" data-error={!!step1Errors.confirmPassword}>
            <Label htmlFor="confirmPassword">
              비밀번호 확인 <span className="text-red-500">*</span>
            </Label>
            <div className="relative">
              <Input
                id="confirmPassword"
                name="confirmPassword"
                type={showConfirmPassword ? 'text' : 'password'}
                required
                className={`h-11 pr-10 ${step1Errors.confirmPassword ? 'border-destructive' : ''}`}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute inset-y-0 right-0 flex items-center pr-3 text-muted-foreground hover:text-foreground transition-colors"
              >
                {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            <FieldError message={step1Errors.confirmPassword} />
          </div>

          <div className="p-4 rounded-lg bg-muted/50" data-error={!!step1Errors.agreeToTerms}>
            <div className="flex items-center gap-3">
              <Checkbox
                id="agreeToTerms"
                name="agreeToTerms"
                required
                className="border-gray-400 data-[state=unchecked]:border-gray-400"
              />
              <Label htmlFor="agreeToTerms" className="text-base font-medium cursor-pointer">
                개인정보 수집·이용에 동의합니다. (필수)
              </Label>
            </div>
            <p className="text-sm text-muted-foreground mt-2 ml-7">
              수집항목: 이메일, 이름, 연락처 | 목적: 서비스 제공 및 회원 관리 | 보관기간: 회원 탈퇴
              시까지
            </p>
            <div className="ml-7">
              <FieldError message={step1Errors.agreeToTerms} />
            </div>
          </div>

          <Button type="submit" disabled={isLoading} className="w-full h-11 mt-4">
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                처리 중...
              </>
            ) : registerType === 'CONSULTANT' ? (
              <>
                다음
                <ChevronRight className="ml-2 h-4 w-4" />
              </>
            ) : (
              '가입 완료'
            )}
          </Button>

          <div className="text-center text-base pt-2">
            <span className="text-muted-foreground">이미 계정이 있으신가요?</span>{' '}
            <Link
              href="/login"
              className="font-medium text-blue-600 hover:text-blue-500 transition-colors"
            >
              로그인
            </Link>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

// Step 2: 프로필 등록 폼 컴포넌트
interface Step2FormProps {
  formRef: React.RefObject<HTMLFormElement | null>;
  step2Errors: Step2Errors;
  expertiseDomains: string[];
  setExpertiseDomains: React.Dispatch<React.SetStateAction<string[]>>;
  availableIndustries: string[];
  setAvailableIndustries: React.Dispatch<React.SetStateAction<string[]>>;
  teachingLevels: string[];
  setTeachingLevels: React.Dispatch<React.SetStateAction<string[]>>;
  coachingMethods: string[];
  setCoachingMethods: React.Dispatch<React.SetStateAction<string[]>>;
  skillTags: string[];
  setSkillTags: React.Dispatch<React.SetStateAction<string[]>>;
  yearsOfExperience: number;
  setYearsOfExperience: React.Dispatch<React.SetStateAction<number>>;
  representativeExperience: string;
  setRepresentativeExperience: React.Dispatch<React.SetStateAction<string>>;
  portfolio: string;
  setPortfolio: React.Dispatch<React.SetStateAction<string>>;
  strengthsConstraints: string;
  setStrengthsConstraints: React.Dispatch<React.SetStateAction<string>>;
  isLoading: boolean;
  toggleArrayValue: (
    array: string[],
    value: string,
    setter: React.Dispatch<React.SetStateAction<string[]>>
  ) => void;
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
}

function Step2Form({
  formRef,
  step2Errors,
  expertiseDomains,
  setExpertiseDomains,
  availableIndustries,
  setAvailableIndustries,
  teachingLevels,
  setTeachingLevels,
  coachingMethods,
  setCoachingMethods,
  skillTags,
  setSkillTags,
  yearsOfExperience,
  setYearsOfExperience,
  representativeExperience,
  setRepresentativeExperience,
  portfolio,
  setPortfolio,
  strengthsConstraints,
  setStrengthsConstraints,
  isLoading,
  toggleArrayValue,
  onSubmit,
}: Step2FormProps) {
  return (
    <Card className="shadow-xl border-0 bg-white/80 backdrop-blur-sm">
      <CardHeader>
        <CardTitle>컨설턴트 프로필 등록</CardTitle>
        <CardDescription>
          매칭용 프로필을 입력해 주세요. 프로필이 상세할수록 적합한 기업과 매칭될 확률이 높아집니다.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form ref={formRef} onSubmit={onSubmit} className="space-y-6">
          {/* 전문분야 */}
          <div className="space-y-3" data-error={!!step2Errors.expertise_domains}>
            <Label>
              전문분야 <span className="text-red-500">*</span>
            </Label>
            <div className="flex flex-wrap gap-2">
              {EXPERTISE_DOMAINS.map((domain) => (
                <Badge
                  key={domain}
                  variant="outline"
                  className={`cursor-pointer transition-colors ${
                    expertiseDomains.includes(domain)
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'hover:bg-blue-50'
                  }`}
                  onClick={() => toggleArrayValue(expertiseDomains, domain, setExpertiseDomains)}
                >
                  {domain}
                </Badge>
              ))}
            </div>
            <FieldError message={step2Errors.expertise_domains} />
          </div>

          {/* 가능 업종 */}
          <div className="space-y-3" data-error={!!step2Errors.available_industries}>
            <Label>
              가능 업종 <span className="text-red-500">*</span>
            </Label>
            <div className="flex flex-wrap gap-2">
              {INDUSTRIES.map((industry) => (
                <Badge
                  key={industry}
                  variant="outline"
                  className={`cursor-pointer transition-colors ${
                    availableIndustries.includes(industry)
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'hover:bg-blue-50'
                  }`}
                  onClick={() =>
                    toggleArrayValue(availableIndustries, industry, setAvailableIndustries)
                  }
                >
                  {industry}
                </Badge>
              ))}
            </div>
            <FieldError message={step2Errors.available_industries} />
          </div>

          {/* 강의 가능 레벨 */}
          <div className="space-y-3" data-error={!!step2Errors.teaching_levels}>
            <Label>
              강의 가능 레벨 <span className="text-red-500">*</span>
            </Label>
            <div className="flex flex-wrap gap-2">
              {TEACHING_LEVELS.map((level) => (
                <Badge
                  key={level.value}
                  variant="outline"
                  className={`cursor-pointer transition-colors ${
                    teachingLevels.includes(level.value)
                      ? 'bg-emerald-600 text-white border-emerald-600'
                      : 'hover:bg-emerald-50'
                  }`}
                  onClick={() => toggleArrayValue(teachingLevels, level.value, setTeachingLevels)}
                >
                  {level.label}
                </Badge>
              ))}
            </div>
            <FieldError message={step2Errors.teaching_levels} />
          </div>

          {/* 코칭 방식 */}
          <div className="space-y-3" data-error={!!step2Errors.coaching_methods}>
            <Label>
              코칭 방식 <span className="text-red-500">*</span>
            </Label>
            <div className="flex flex-wrap gap-2">
              {COACHING_METHODS.map((method) => (
                <Badge
                  key={method.value}
                  variant="outline"
                  className={`cursor-pointer transition-colors ${
                    coachingMethods.includes(method.value)
                      ? 'bg-purple-600 text-white border-purple-600'
                      : 'hover:bg-purple-50'
                  }`}
                  onClick={() =>
                    toggleArrayValue(coachingMethods, method.value, setCoachingMethods)
                  }
                >
                  {method.label}
                </Badge>
              ))}
            </div>
            <FieldError message={step2Errors.coaching_methods} />
          </div>

          {/* 역량 태그 */}
          <div className="space-y-3" data-error={!!step2Errors.skill_tags}>
            <Label>
              역량 태그 <span className="text-red-500">*</span>
            </Label>
            <div className="flex flex-wrap gap-2">
              {SKILL_TAGS.map((tag) => (
                <Badge
                  key={tag}
                  variant="outline"
                  className={`cursor-pointer transition-colors ${
                    skillTags.includes(tag)
                      ? 'bg-amber-600 text-white border-amber-600'
                      : 'hover:bg-amber-50'
                  }`}
                  onClick={() => toggleArrayValue(skillTags, tag, setSkillTags)}
                >
                  {tag}
                </Badge>
              ))}
            </div>
            <FieldError message={step2Errors.skill_tags} />
          </div>

          {/* 경력 연수 */}
          <div className="space-y-2" data-error={!!step2Errors.years_of_experience}>
            <Label htmlFor="years_of_experience">
              경력 연수 <span className="text-red-500">*</span>
            </Label>
            <Input
              id="years_of_experience"
              type="number"
              min="0"
              max="50"
              value={yearsOfExperience}
              onChange={(e) => setYearsOfExperience(Number(e.target.value))}
              placeholder="10"
              className={`h-11 w-32 ${step2Errors.years_of_experience ? 'border-destructive' : ''}`}
            />
            <FieldError message={step2Errors.years_of_experience} />
          </div>

          {/* 대표 수행경험 */}
          <div className="space-y-2" data-error={!!step2Errors.representative_experience}>
            <Label htmlFor="representative_experience">
              대표 수행경험/프로젝트 <span className="text-red-500">*</span>
            </Label>
            <Textarea
              id="representative_experience"
              value={representativeExperience}
              onChange={(e) => setRepresentativeExperience(e.target.value)}
              rows={4}
              placeholder="주요 프로젝트 경험을 상세히 작성해 주세요. (최소 50자)"
              className={`resize-none ${step2Errors.representative_experience ? 'border-destructive' : ''}`}
            />
            <FieldError message={step2Errors.representative_experience} />
          </div>

          {/* 포트폴리오 */}
          <div className="space-y-2" data-error={!!step2Errors.portfolio}>
            <Label htmlFor="portfolio">
              강의 포트폴리오 <span className="text-red-500">*</span>
            </Label>
            <Textarea
              id="portfolio"
              value={portfolio}
              onChange={(e) => setPortfolio(e.target.value)}
              rows={3}
              placeholder="강의/코칭 경험을 작성해 주세요. (최소 30자)"
              className={`resize-none ${step2Errors.portfolio ? 'border-destructive' : ''}`}
            />
            <FieldError message={step2Errors.portfolio} />
          </div>

          {/* 강점/제약 */}
          <div className="space-y-2" data-error={!!step2Errors.strengths_constraints}>
            <Label htmlFor="strengths_constraints">
              강점/제약 <span className="text-red-500">*</span>
            </Label>
            <Textarea
              id="strengths_constraints"
              value={strengthsConstraints}
              onChange={(e) => setStrengthsConstraints(e.target.value)}
              rows={3}
              placeholder="예: 제조 데이터 경험 有, 보안 규정 경험 有, 주 2회 이상 방문 가능 등 (최소 20자)"
              className={`resize-none ${step2Errors.strengths_constraints ? 'border-destructive' : ''}`}
            />
            <FieldError message={step2Errors.strengths_constraints} />
          </div>

          <Alert className="bg-blue-50 border-blue-200">
            <CheckCircle2 className="h-4 w-4 text-blue-600" />
            <AlertDescription className="text-blue-700">
              기본 정보 등록이 완료되었습니다. 컨설턴트 프로필을 입력하시면 가입이 완료됩니다.
            </AlertDescription>
          </Alert>

          <Button type="submit" disabled={isLoading} className="w-full h-11">
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                저장 중...
              </>
            ) : (
              '가입 완료'
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
