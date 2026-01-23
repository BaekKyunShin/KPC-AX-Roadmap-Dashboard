'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { registerUser, saveConsultantProfile } from '../actions';
import { createClient } from '@/lib/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import {
  Loader2,
  Eye,
  EyeOff,
  Sparkles,
  AlertCircle,
  CheckCircle2,
  User,
  Briefcase,
  ChevronRight,
  Shield,
} from 'lucide-react';

// 전문분야 옵션
const EXPERTISE_DOMAINS = [
  '제조/생산',
  '품질관리',
  '영업/마케팅',
  '인사/총무',
  '재무/회계',
  '연구개발',
  'IT/시스템',
  '물류/유통',
  '고객서비스',
];

// 업종 옵션
const INDUSTRIES = [
  '제조업',
  '서비스업',
  '유통/물류',
  'IT/소프트웨어',
  '금융/보험',
  '건설/부동산',
  '의료/헬스케어',
  '교육',
  '공공/정부',
];

// 역량 태그 옵션
const SKILL_TAGS = [
  '데이터 전처리',
  '업무자동화',
  '문서/보고',
  '품질/통계',
  '보안/컴플라이언스',
  '프로젝트 관리',
  '교육/코칭',
  'AI 도구 활용',
  '프로세스 개선',
];

const TEACHING_LEVELS = [
  { value: 'BEGINNER', label: '초급' },
  { value: 'INTERMEDIATE', label: '중급' },
  { value: 'ADVANCED', label: '고급' },
];

const COACHING_METHODS = [
  { value: 'PBL', label: 'PBL' },
  { value: 'WORKSHOP', label: '워크숍' },
  { value: 'MENTORING', label: '멘토링' },
  { value: 'LECTURE', label: '강의' },
  { value: 'HYBRID', label: '혼합형' },
];

type RegisterType = 'CONSULTANT' | 'OPS_ADMIN';

export default function RegisterPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [registerType, setRegisterType] = useState<RegisterType>('CONSULTANT');

  // 페이지 로드 시 기존 세션 로그아웃
  useEffect(() => {
    const clearSession = async () => {
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (user) {
          // 기존 세션이 있으면 로그아웃
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

  // Step 1: 기본 정보
  async function handleStep1Submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    const formData = new FormData(e.currentTarget);
    formData.set('agreeToTerms', formData.get('agreeToTerms') ? 'true' : 'false');
    formData.set('registerType', registerType);

    const result = await registerUser(formData);

    if (result.success && result.data?.userId) {
      // 운영관리자는 프로필 입력 없이 바로 대시보드로
      if (registerType === 'OPS_ADMIN') {
        router.push('/dashboard');
        router.refresh();
      } else {
        // 컨설턴트는 2단계로 진행
        setStep(2);
      }
    } else {
      setError(result.error || '회원가입에 실패했습니다.');
    }

    setIsLoading(false);
  }

  // Step 2: 프로필 정보 (컨설턴트만)
  async function handleStep2Submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    const formData = new FormData(e.currentTarget);

    // 체크박스 배열 처리
    const expertiseDomains = formData.getAll('expertise_domains');
    const industries = formData.getAll('available_industries');
    const teachingLevels = formData.getAll('teaching_levels');
    const coachingMethods = formData.getAll('coaching_methods');
    const skillTags = formData.getAll('skill_tags');

    // 필수 선택 항목 검증
    if (expertiseDomains.length === 0) {
      setError('전문분야를 최소 1개 이상 선택해주세요.');
      return;
    }
    if (industries.length === 0) {
      setError('가능 업종을 최소 1개 이상 선택해주세요.');
      return;
    }
    if (teachingLevels.length === 0) {
      setError('강의 가능 레벨을 최소 1개 이상 선택해주세요.');
      return;
    }
    if (coachingMethods.length === 0) {
      setError('코칭 방식을 최소 1개 이상 선택해주세요.');
      return;
    }
    if (skillTags.length === 0) {
      setError('역량 태그를 최소 1개 이상 선택해주세요.');
      return;
    }

    setIsLoading(true);

    formData.set('expertise_domains', JSON.stringify(expertiseDomains));
    formData.set('available_industries', JSON.stringify(industries));
    formData.set('teaching_levels', JSON.stringify(teachingLevels));
    formData.set('coaching_methods', JSON.stringify(coachingMethods));
    formData.set('skill_tags', JSON.stringify(skillTags));

    try {
      const result = await saveConsultantProfile(formData);

      if (result.success) {
        router.push('/dashboard');
        router.refresh();
      } else {
        setError(result.error || '프로필 저장에 실패했습니다.');
      }
    } catch (err) {
      console.error('프로필 저장 오류:', err);
      setError('서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요.');
    }

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
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-200 rounded-full mix-blend-multiply filter blur-3xl opacity-30" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-indigo-200 rounded-full mix-blend-multiply filter blur-3xl opacity-30" />
      </div>

      <div className="max-w-2xl mx-auto relative">
        {/* Logo & Title */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 shadow-lg mb-4">
            <Sparkles className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">KPC AI 훈련 로드맵</h1>
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
              <span className={`text-base font-medium ${step >= 1 ? 'text-blue-600' : 'text-gray-400'}`}>
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
                  <span className={`text-base font-medium ${step >= 2 ? 'text-blue-600' : 'text-gray-400'}`}>
                    프로필 등록
                  </span>
                </div>
              </>
            )}
          </div>
        </div>

        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {step === 1 ? (
          <Card className="shadow-xl border-0 bg-white/80 backdrop-blur-sm">
            <CardHeader>
              <CardTitle>기본 정보 입력</CardTitle>
              <CardDescription>계정 생성을 위한 기본 정보를 입력해주세요</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleStep1Submit} className="space-y-4">
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

                <div className="space-y-2">
                  <Label htmlFor="email">
                    이메일 <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    required
                    placeholder="example@company.com"
                    className="h-11"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="name">
                    이름 <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="name"
                    name="name"
                    type="text"
                    required
                    placeholder="홍길동"
                    className="h-11"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone">연락처</Label>
                  <Input
                    id="phone"
                    name="phone"
                    type="tel"
                    placeholder="010-1234-5678"
                    className="h-11"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password">
                    비밀번호 <span className="text-red-500">*</span>
                  </Label>
                  <div className="relative">
                    <Input
                      id="password"
                      name="password"
                      type={showPassword ? 'text' : 'password'}
                      required
                      className="h-11 pr-10"
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
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">
                    비밀번호 확인 <span className="text-red-500">*</span>
                  </Label>
                  <div className="relative">
                    <Input
                      id="confirmPassword"
                      name="confirmPassword"
                      type={showConfirmPassword ? 'text' : 'password'}
                      required
                      className="h-11 pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute inset-y-0 right-0 flex items-center pr-3 text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {showConfirmPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-4 rounded-lg bg-muted/50">
                  <Checkbox id="agreeToTerms" name="agreeToTerms" required />
                  <div className="space-y-1">
                    <Label htmlFor="agreeToTerms" className="text-base font-medium cursor-pointer">
                      개인정보 수집·이용에 동의합니다. (필수)
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      수집항목: 이메일, 이름, 연락처 | 목적: 서비스 제공 및 회원 관리 | 보관기간: 회원
                      탈퇴 시까지
                    </p>
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
        ) : (
          <Card className="shadow-xl border-0 bg-white/80 backdrop-blur-sm">
            <CardHeader>
              <CardTitle>컨설턴트 프로필 등록</CardTitle>
              <CardDescription>
                매칭용 프로필을 입력해 주세요. 프로필이 상세할수록 적합한 기업과 매칭될 확률이
                높아집니다.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleStep2Submit} className="space-y-6">
                {/* 전문분야 */}
                <div className="space-y-3">
                  <Label>
                    전문분야 <span className="text-red-500">*</span>
                  </Label>
                  <div className="flex flex-wrap gap-2">
                    {EXPERTISE_DOMAINS.map((domain) => (
                      <label key={domain} className="cursor-pointer">
                        <input
                          type="checkbox"
                          name="expertise_domains"
                          value={domain}
                          className="peer sr-only"
                        />
                        <Badge
                          variant="outline"
                          className="peer-checked:bg-blue-600 peer-checked:text-white peer-checked:border-blue-600 hover:bg-blue-50 transition-colors cursor-pointer"
                        >
                          {domain}
                        </Badge>
                      </label>
                    ))}
                  </div>
                </div>

                {/* 가능 업종 */}
                <div className="space-y-3">
                  <Label>
                    가능 업종 <span className="text-red-500">*</span>
                  </Label>
                  <div className="flex flex-wrap gap-2">
                    {INDUSTRIES.map((industry) => (
                      <label key={industry} className="cursor-pointer">
                        <input
                          type="checkbox"
                          name="available_industries"
                          value={industry}
                          className="peer sr-only"
                        />
                        <Badge
                          variant="outline"
                          className="peer-checked:bg-blue-600 peer-checked:text-white peer-checked:border-blue-600 hover:bg-blue-50 transition-colors cursor-pointer"
                        >
                          {industry}
                        </Badge>
                      </label>
                    ))}
                  </div>
                </div>

                {/* 강의 가능 레벨 */}
                <div className="space-y-3">
                  <Label>
                    강의 가능 레벨 <span className="text-red-500">*</span>
                  </Label>
                  <div className="flex flex-wrap gap-2">
                    {TEACHING_LEVELS.map((level) => (
                      <label key={level.value} className="cursor-pointer">
                        <input
                          type="checkbox"
                          name="teaching_levels"
                          value={level.value}
                          className="peer sr-only"
                        />
                        <Badge
                          variant="outline"
                          className="peer-checked:bg-emerald-600 peer-checked:text-white peer-checked:border-emerald-600 hover:bg-emerald-50 transition-colors cursor-pointer"
                        >
                          {level.label}
                        </Badge>
                      </label>
                    ))}
                  </div>
                </div>

                {/* 코칭 방식 */}
                <div className="space-y-3">
                  <Label>
                    코칭 방식 <span className="text-red-500">*</span>
                  </Label>
                  <div className="flex flex-wrap gap-2">
                    {COACHING_METHODS.map((method) => (
                      <label key={method.value} className="cursor-pointer">
                        <input
                          type="checkbox"
                          name="coaching_methods"
                          value={method.value}
                          className="peer sr-only"
                        />
                        <Badge
                          variant="outline"
                          className="peer-checked:bg-purple-600 peer-checked:text-white peer-checked:border-purple-600 hover:bg-purple-50 transition-colors cursor-pointer"
                        >
                          {method.label}
                        </Badge>
                      </label>
                    ))}
                  </div>
                </div>

                {/* 역량 태그 */}
                <div className="space-y-3">
                  <Label>
                    역량 태그 <span className="text-red-500">*</span>
                  </Label>
                  <div className="flex flex-wrap gap-2">
                    {SKILL_TAGS.map((tag) => (
                      <label key={tag} className="cursor-pointer">
                        <input
                          type="checkbox"
                          name="skill_tags"
                          value={tag}
                          className="peer sr-only"
                        />
                        <Badge
                          variant="outline"
                          className="peer-checked:bg-amber-600 peer-checked:text-white peer-checked:border-amber-600 hover:bg-amber-50 transition-colors cursor-pointer"
                        >
                          {tag}
                        </Badge>
                      </label>
                    ))}
                  </div>
                </div>

                {/* 경력 연수 */}
                <div className="space-y-2">
                  <Label htmlFor="years_of_experience">
                    경력 연수 <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="years_of_experience"
                    name="years_of_experience"
                    type="number"
                    min="0"
                    max="50"
                    required
                    placeholder="10"
                    className="h-11 w-32"
                  />
                </div>

                {/* 대표 수행경험 */}
                <div className="space-y-2">
                  <Label htmlFor="representative_experience">
                    대표 수행경험/프로젝트 <span className="text-red-500">*</span>
                  </Label>
                  <Textarea
                    id="representative_experience"
                    name="representative_experience"
                    rows={4}
                    required
                    placeholder="주요 프로젝트 경험을 상세히 작성해 주세요. (최소 50자)"
                    className="resize-none"
                  />
                </div>

                {/* 포트폴리오 */}
                <div className="space-y-2">
                  <Label htmlFor="portfolio">
                    강의 포트폴리오 <span className="text-red-500">*</span>
                  </Label>
                  <Textarea
                    id="portfolio"
                    name="portfolio"
                    rows={3}
                    required
                    placeholder="강의/코칭 경험을 작성해 주세요. (최소 30자)"
                    className="resize-none"
                  />
                </div>

                {/* 강점/제약 */}
                <div className="space-y-2">
                  <Label htmlFor="strengths_constraints">
                    강점/제약 <span className="text-red-500">*</span>
                  </Label>
                  <Textarea
                    id="strengths_constraints"
                    name="strengths_constraints"
                    rows={3}
                    required
                    placeholder="예: 제조 데이터 경험 有, 보안 규정 경험 有, 주 2회 이상 방문 가능 등 (최소 20자)"
                    className="resize-none"
                  />
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
        )}

        {/* Footer */}
        <p className="mt-8 text-center text-sm text-muted-foreground">
          &copy; 2026 KPC 한국생산성본부 · Developed by Baek Kyun Shin
        </p>
      </div>
    </div>
  );
}
