'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { registerUser } from '../actions';
import { createClient } from '@/lib/supabase/client';
import { registerSchema } from '@/lib/schemas/user';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription } from '@/components/ui/alert';
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
import { COPYRIGHT_TEXT } from '@/lib/constants';
import ProfileForm from '@/components/consultant/ProfileForm';

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
          <ProfileForm
            profile={null}
            variant="registration"
            showRegistrationAlert={true}
            backUrl="/register"
            successRedirectUrl="/dashboard"
            cardClassName="shadow-xl border-0 bg-white/80 backdrop-blur-sm"
          />
        )}

        {/* Footer */}
        <p className="mt-8 text-center text-sm text-muted-foreground">{COPYRIGHT_TEXT}</p>
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
