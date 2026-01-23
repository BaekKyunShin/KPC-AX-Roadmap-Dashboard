'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getConsultantProfile, updateConsultantProfile } from '@/app/(auth)/actions';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import {
  Loader2,
  AlertCircle,
  CheckCircle2,
  ArrowLeft,
  Save,
} from 'lucide-react';
import type { ConsultantProfile } from '@/types/database';

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

export default function ProfilePage() {
  const router = useRouter();
  const [profile, setProfile] = useState<ConsultantProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // 선택된 값들을 상태로 관리
  const [selectedDomains, setSelectedDomains] = useState<string[]>([]);
  const [selectedIndustries, setSelectedIndustries] = useState<string[]>([]);
  const [selectedLevels, setSelectedLevels] = useState<string[]>([]);
  const [selectedMethods, setSelectedMethods] = useState<string[]>([]);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  // 프로필 조회
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const result = await getConsultantProfile();
        if (result.success && result.data?.profile) {
          const p = result.data.profile as ConsultantProfile;
          setProfile(p);
          setSelectedDomains(p.expertise_domains || []);
          setSelectedIndustries(p.available_industries || []);
          setSelectedLevels(p.teaching_levels || []);
          setSelectedMethods(p.coaching_methods || []);
          setSelectedTags(p.skill_tags || []);
        } else if (!result.success) {
          setError(result.error || '프로필을 불러오는데 실패했습니다.');
        }
      } catch (err) {
        console.error('프로필 조회 오류:', err);
        setError('프로필을 불러오는데 실패했습니다.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchProfile();
  }, []);

  // 체크박스 토글 핸들러
  const toggleSelection = (
    value: string,
    selected: string[],
    setSelected: (v: string[]) => void
  ) => {
    if (selected.includes(value)) {
      setSelected(selected.filter((v) => v !== value));
    } else {
      setSelected([...selected, value]);
    }
  };

  // 폼 제출
  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    // 필수 선택 항목 검증
    if (selectedDomains.length === 0) {
      setError('전문분야를 최소 1개 이상 선택해주세요.');
      return;
    }
    if (selectedIndustries.length === 0) {
      setError('가능 업종을 최소 1개 이상 선택해주세요.');
      return;
    }
    if (selectedLevels.length === 0) {
      setError('강의 가능 레벨을 최소 1개 이상 선택해주세요.');
      return;
    }
    if (selectedMethods.length === 0) {
      setError('코칭 방식을 최소 1개 이상 선택해주세요.');
      return;
    }
    if (selectedTags.length === 0) {
      setError('역량 태그를 최소 1개 이상 선택해주세요.');
      return;
    }

    setIsSaving(true);

    const formData = new FormData(e.currentTarget);
    formData.set('expertise_domains', JSON.stringify(selectedDomains));
    formData.set('available_industries', JSON.stringify(selectedIndustries));
    formData.set('teaching_levels', JSON.stringify(selectedLevels));
    formData.set('coaching_methods', JSON.stringify(selectedMethods));
    formData.set('skill_tags', JSON.stringify(selectedTags));

    try {
      const result = await updateConsultantProfile(formData);

      if (result.success) {
        setSuccess('프로필이 성공적으로 수정되었습니다.');
        // 3초 후 대시보드로 이동
        setTimeout(() => {
          router.push('/dashboard');
          router.refresh();
        }, 2000);
      } else {
        setError(result.error || '프로필 수정에 실패했습니다.');
      }
    } catch (err) {
      console.error('프로필 수정 오류:', err);
      setError('서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요.');
    }

    setIsSaving(false);
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600 mx-auto" />
          <p className="mt-2 text-muted-foreground">프로필 불러오는 중...</p>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="max-w-2xl mx-auto">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            프로필을 찾을 수 없습니다. 컨설턴트 계정으로 회원가입 시 프로필을 등록해주세요.
          </AlertDescription>
        </Alert>
        <div className="mt-4">
          <Button variant="outline" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            돌아가기
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6">
        <Button variant="ghost" onClick={() => router.back()} className="mb-4">
          <ArrowLeft className="h-4 w-4 mr-2" />
          돌아가기
        </Button>
        <h1 className="text-2xl font-bold text-gray-900">프로필 수정</h1>
        <p className="mt-1 text-muted-foreground">
          컨설턴트 프로필 정보를 수정할 수 있습니다.
        </p>
      </div>

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

      <Card>
        <CardHeader>
          <CardTitle>컨설턴트 프로필</CardTitle>
          <CardDescription>
            프로필이 상세할수록 적합한 기업과 매칭될 확률이 높아집니다.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* 전문분야 */}
            <div className="space-y-3">
              <Label>
                전문분야 <span className="text-red-500">*</span>
              </Label>
              <div className="flex flex-wrap gap-2">
                {EXPERTISE_DOMAINS.map((domain) => (
                  <Badge
                    key={domain}
                    variant="outline"
                    className={`cursor-pointer transition-colors ${
                      selectedDomains.includes(domain)
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'hover:bg-blue-50'
                    }`}
                    onClick={() => toggleSelection(domain, selectedDomains, setSelectedDomains)}
                  >
                    {domain}
                  </Badge>
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
                  <Badge
                    key={industry}
                    variant="outline"
                    className={`cursor-pointer transition-colors ${
                      selectedIndustries.includes(industry)
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'hover:bg-blue-50'
                    }`}
                    onClick={() => toggleSelection(industry, selectedIndustries, setSelectedIndustries)}
                  >
                    {industry}
                  </Badge>
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
                  <Badge
                    key={level.value}
                    variant="outline"
                    className={`cursor-pointer transition-colors ${
                      selectedLevels.includes(level.value)
                        ? 'bg-emerald-600 text-white border-emerald-600'
                        : 'hover:bg-emerald-50'
                    }`}
                    onClick={() => toggleSelection(level.value, selectedLevels, setSelectedLevels)}
                  >
                    {level.label}
                  </Badge>
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
                  <Badge
                    key={method.value}
                    variant="outline"
                    className={`cursor-pointer transition-colors ${
                      selectedMethods.includes(method.value)
                        ? 'bg-purple-600 text-white border-purple-600'
                        : 'hover:bg-purple-50'
                    }`}
                    onClick={() => toggleSelection(method.value, selectedMethods, setSelectedMethods)}
                  >
                    {method.label}
                  </Badge>
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
                  <Badge
                    key={tag}
                    variant="outline"
                    className={`cursor-pointer transition-colors ${
                      selectedTags.includes(tag)
                        ? 'bg-amber-600 text-white border-amber-600'
                        : 'hover:bg-amber-50'
                    }`}
                    onClick={() => toggleSelection(tag, selectedTags, setSelectedTags)}
                  >
                    {tag}
                  </Badge>
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
                defaultValue={profile.years_of_experience}
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
                defaultValue={profile.representative_experience}
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
                defaultValue={profile.portfolio}
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
                defaultValue={profile.strengths_constraints}
                placeholder="예: 제조 데이터 경험 有, 보안 규정 경험 有, 주 2회 이상 방문 가능 등 (최소 20자)"
                className="resize-none"
              />
            </div>

            <div className="flex gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.back()}
                disabled={isSaving}
              >
                취소
              </Button>
              <Button type="submit" disabled={isSaving}>
                {isSaving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    저장 중...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    저장
                  </>
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
