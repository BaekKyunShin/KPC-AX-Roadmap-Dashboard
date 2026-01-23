'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { registerUser, saveConsultantProfile } from '../actions';

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

export default function RegisterPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Step 1: 기본 정보
  async function handleStep1Submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    const formData = new FormData(e.currentTarget);
    formData.set('agreeToTerms', formData.get('agreeToTerms') ? 'true' : 'false');

    const result = await registerUser(formData);

    if (result.success && result.data?.userId) {
      setStep(2);
    } else {
      setError(result.error || '회원가입에 실패했습니다.');
    }

    setIsLoading(false);
  }

  // Step 2: 프로필 정보
  async function handleStep2Submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    const formData = new FormData(e.currentTarget);

    // 체크박스 배열 처리
    const expertiseDomains = formData.getAll('expertise_domains');
    const industries = formData.getAll('available_industries');
    const teachingLevels = formData.getAll('teaching_levels');
    const coachingMethods = formData.getAll('coaching_methods');
    const skillTags = formData.getAll('skill_tags');

    formData.set('expertise_domains', JSON.stringify(expertiseDomains));
    formData.set('available_industries', JSON.stringify(industries));
    formData.set('teaching_levels', JSON.stringify(teachingLevels));
    formData.set('coaching_methods', JSON.stringify(coachingMethods));
    formData.set('skill_tags', JSON.stringify(skillTags));

    const result = await saveConsultantProfile(formData);

    if (result.success) {
      router.push('/dashboard');
      router.refresh();
    } else {
      setError(result.error || '프로필 저장에 실패했습니다.');
    }

    setIsLoading(false);
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">KPC AI 훈련 로드맵</h1>
          <h2 className="mt-2 text-xl text-gray-600">
            {step === 1 ? '회원가입' : '컨설턴트 프로필 등록'}
          </h2>

          {/* 진행 단계 표시 */}
          <div className="flex justify-center mt-4 space-x-4">
            <div className={`flex items-center ${step >= 1 ? 'text-blue-600' : 'text-gray-400'}`}>
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center ${
                  step >= 1 ? 'bg-blue-600 text-white' : 'bg-gray-200'
                }`}
              >
                1
              </div>
              <span className="ml-2 text-sm">기본 정보</span>
            </div>
            <div className={`flex items-center ${step >= 2 ? 'text-blue-600' : 'text-gray-400'}`}>
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center ${
                  step >= 2 ? 'bg-blue-600 text-white' : 'bg-gray-200'
                }`}
              >
                2
              </div>
              <span className="ml-2 text-sm">프로필 등록</span>
            </div>
          </div>
        </div>

        {error && (
          <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
            {error}
          </div>
        )}

        {step === 1 ? (
          <form onSubmit={handleStep1Submit} className="bg-white shadow rounded-lg p-6 space-y-6">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                이메일 *
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
              />
            </div>

            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                이름 *
              </label>
              <input
                id="name"
                name="name"
                type="text"
                required
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
              />
            </div>

            <div>
              <label htmlFor="phone" className="block text-sm font-medium text-gray-700">
                연락처
              </label>
              <input
                id="phone"
                name="phone"
                type="tel"
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                비밀번호 *
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
              />
              <p className="mt-1 text-sm text-gray-500">
                8자 이상, 영문과 숫자 포함
              </p>
            </div>

            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">
                비밀번호 확인 *
              </label>
              <input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                required
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
              />
            </div>

            <div className="flex items-start">
              <input
                id="agreeToTerms"
                name="agreeToTerms"
                type="checkbox"
                required
                className="h-4 w-4 text-blue-600 border-gray-300 rounded"
              />
              <label htmlFor="agreeToTerms" className="ml-2 block text-sm text-gray-700">
                개인정보 수집·이용에 동의합니다. (필수)
                <p className="text-xs text-gray-500 mt-1">
                  수집항목: 이메일, 이름, 연락처 | 목적: 서비스 제공 및 회원 관리 | 보관기간: 회원
                  탈퇴 시까지
                </p>
              </label>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-2 px-4 border border-transparent rounded-md text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
            >
              {isLoading ? '처리 중...' : '다음'}
            </button>

            <div className="text-center text-sm">
              <span className="text-gray-600">이미 계정이 있으신가요?</span>{' '}
              <Link href="/login" className="text-blue-600 hover:text-blue-500 font-medium">
                로그인
              </Link>
            </div>
          </form>
        ) : (
          <form onSubmit={handleStep2Submit} className="bg-white shadow rounded-lg p-6 space-y-6">
            <p className="text-sm text-gray-600 mb-4">
              매칭용 프로필을 입력해 주세요. 프로필이 상세할수록 적합한 기업과 매칭될 확률이
              높아집니다.
            </p>

            {/* 전문분야 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">전문분야 *</label>
              <div className="grid grid-cols-3 gap-2">
                {EXPERTISE_DOMAINS.map((domain) => (
                  <label key={domain} className="flex items-center">
                    <input
                      type="checkbox"
                      name="expertise_domains"
                      value={domain}
                      className="h-4 w-4 text-blue-600 border-gray-300 rounded"
                    />
                    <span className="ml-2 text-sm">{domain}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* 가능 업종 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">가능 업종 *</label>
              <div className="grid grid-cols-3 gap-2">
                {INDUSTRIES.map((industry) => (
                  <label key={industry} className="flex items-center">
                    <input
                      type="checkbox"
                      name="available_industries"
                      value={industry}
                      className="h-4 w-4 text-blue-600 border-gray-300 rounded"
                    />
                    <span className="ml-2 text-sm">{industry}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* 강의 가능 레벨 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                강의 가능 레벨 *
              </label>
              <div className="flex space-x-4">
                {[
                  { value: 'BEGINNER', label: '초급' },
                  { value: 'INTERMEDIATE', label: '중급' },
                  { value: 'ADVANCED', label: '고급' },
                ].map((level) => (
                  <label key={level.value} className="flex items-center">
                    <input
                      type="checkbox"
                      name="teaching_levels"
                      value={level.value}
                      className="h-4 w-4 text-blue-600 border-gray-300 rounded"
                    />
                    <span className="ml-2 text-sm">{level.label}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* 코칭 방식 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">코칭 방식 *</label>
              <div className="flex flex-wrap gap-4">
                {[
                  { value: 'PBL', label: 'PBL' },
                  { value: 'WORKSHOP', label: '워크숍' },
                  { value: 'MENTORING', label: '멘토링' },
                  { value: 'LECTURE', label: '강의' },
                  { value: 'HYBRID', label: '혼합형' },
                ].map((method) => (
                  <label key={method.value} className="flex items-center">
                    <input
                      type="checkbox"
                      name="coaching_methods"
                      value={method.value}
                      className="h-4 w-4 text-blue-600 border-gray-300 rounded"
                    />
                    <span className="ml-2 text-sm">{method.label}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* 역량 태그 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">역량 태그 *</label>
              <div className="grid grid-cols-3 gap-2">
                {SKILL_TAGS.map((tag) => (
                  <label key={tag} className="flex items-center">
                    <input
                      type="checkbox"
                      name="skill_tags"
                      value={tag}
                      className="h-4 w-4 text-blue-600 border-gray-300 rounded"
                    />
                    <span className="ml-2 text-sm">{tag}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* 경력 연수 */}
            <div>
              <label
                htmlFor="years_of_experience"
                className="block text-sm font-medium text-gray-700"
              >
                경력 연수 *
              </label>
              <input
                id="years_of_experience"
                name="years_of_experience"
                type="number"
                min="0"
                max="50"
                required
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
              />
            </div>

            {/* 대표 수행경험 */}
            <div>
              <label
                htmlFor="representative_experience"
                className="block text-sm font-medium text-gray-700"
              >
                대표 수행경험/프로젝트 *
              </label>
              <textarea
                id="representative_experience"
                name="representative_experience"
                rows={4}
                required
                placeholder="주요 프로젝트 경험을 상세히 작성해 주세요. (최소 50자)"
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
              />
            </div>

            {/* 포트폴리오 */}
            <div>
              <label htmlFor="portfolio" className="block text-sm font-medium text-gray-700">
                강의 포트폴리오 *
              </label>
              <textarea
                id="portfolio"
                name="portfolio"
                rows={3}
                required
                placeholder="강의/코칭 경험을 작성해 주세요. (최소 30자)"
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
              />
            </div>

            {/* 강점/제약 */}
            <div>
              <label
                htmlFor="strengths_constraints"
                className="block text-sm font-medium text-gray-700"
              >
                강점/제약 *
              </label>
              <textarea
                id="strengths_constraints"
                name="strengths_constraints"
                rows={3}
                required
                placeholder="예: 제조 데이터 경험 有, 보안 규정 경험 有, 주 2회 이상 방문 가능 등 (최소 20자)"
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
              />
            </div>

            <div className="flex space-x-4">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="flex-1 py-2 px-4 border border-gray-300 rounded-md text-gray-700 bg-white hover:bg-gray-50"
              >
                이전
              </button>
              <button
                type="submit"
                disabled={isLoading}
                className="flex-1 py-2 px-4 border border-transparent rounded-md text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
              >
                {isLoading ? '저장 중...' : '가입 완료'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
