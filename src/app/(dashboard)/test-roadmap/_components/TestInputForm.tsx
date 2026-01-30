'use client';

import { useState, useRef } from 'react';
import { Plus, Trash2, Building2, Briefcase, AlertTriangle, Target, Upload, FileText, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  industryOptions,
  companySizeOptions,
  type TestInputData,
  type TestJobTask,
  type TestPainPoint,
  type TestImprovementGoal,
} from '@/lib/schemas/test-roadmap';
import { COMPANY_SIZE_LABELS } from '@/lib/constants/company-size';
import {
  MAX_STT_FILE_SIZE_BYTES,
  MAX_STT_FILE_SIZE_KB,
  ALLOWED_STT_FILE_EXTENSIONS,
} from '@/lib/constants/stt';

interface TestInputFormProps {
  onSubmit: (data: TestInputData) => Promise<void>;
  isLoading: boolean;
}

export default function TestInputForm({ onSubmit, isLoading }: TestInputFormProps) {
  // 기업 기본정보
  const [companyName, setCompanyName] = useState('');
  const [industry, setIndustry] = useState<string>('');
  const [companySize, setCompanySize] = useState<string>('');

  // 업무
  const [jobTasks, setJobTasks] = useState<TestJobTask[]>([
    { task_name: '', task_description: '' },
  ]);

  // 페인포인트
  const [painPoints, setPainPoints] = useState<TestPainPoint[]>([
    { description: '', severity: 'MEDIUM' },
  ]);

  // 개선 목표
  const [improvementGoals, setImprovementGoals] = useState<TestImprovementGoal[]>([
    { goal_description: '' },
  ]);

  // 추가 요구사항
  const [customerRequirements, setCustomerRequirements] = useState('');

  // STT 텍스트
  const [sttText, setSttText] = useState<string | null>(null);
  const [sttFileName, setSttFileName] = useState<string | null>(null);
  const [sttError, setSttError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 유효성 검사
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!companyName.trim()) newErrors.companyName = '회사명을 입력하세요.';
    if (!industry) newErrors.industry = '업종을 선택하세요.';
    if (!companySize) newErrors.companySize = '기업 규모를 선택하세요.';

    const validTasks = jobTasks.filter((t) => t.task_name.trim() && t.task_description.trim());
    if (validTasks.length === 0) newErrors.jobTasks = '최소 1개의 업무를 입력하세요.';

    const validPainPoints = painPoints.filter((p) => p.description.trim());
    if (validPainPoints.length === 0) newErrors.painPoints = '최소 1개의 페인포인트를 입력하세요.';

    const validGoals = improvementGoals.filter((g) => g.goal_description.trim());
    if (validGoals.length === 0) newErrors.improvementGoals = '최소 1개의 개선 목표를 입력하세요.';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) return;

    const data: TestInputData = {
      company_name: companyName.trim(),
      industry: industry as TestInputData['industry'],
      company_size: companySize as TestInputData['company_size'],
      job_tasks: jobTasks.filter((t) => t.task_name.trim() && t.task_description.trim()),
      pain_points: painPoints.filter((p) => p.description.trim()),
      improvement_goals: improvementGoals.filter((g) => g.goal_description.trim()),
      customer_requirements: customerRequirements.trim() || undefined,
      stt_text: sttText || undefined,
    };

    await onSubmit(data);
  };

  // STT 파일 업로드 핸들러
  const handleSttFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setSttError(null);

    // 파일 형식 체크
    const hasValidExtension = ALLOWED_STT_FILE_EXTENSIONS.some(ext =>
      file.name.toLowerCase().endsWith(ext)
    );
    if (!hasValidExtension) {
      setSttError('txt 파일만 업로드 가능합니다.');
      return;
    }

    // 파일 크기 체크
    if (file.size > MAX_STT_FILE_SIZE_BYTES) {
      const currentSizeKB = Math.round(file.size / 1024);
      setSttError(`파일 크기가 너무 큽니다. 최대 ${MAX_STT_FILE_SIZE_KB}KB까지 업로드 가능합니다. (현재: ${currentSizeKB}KB)`);
      return;
    }

    try {
      const text = await file.text();
      setSttText(text);
      setSttFileName(file.name);
    } catch {
      setSttError('파일을 읽는 중 오류가 발생했습니다.');
    }

    // 파일 입력 초기화
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // STT 파일 삭제
  const handleSttRemove = () => {
    setSttText(null);
    setSttFileName(null);
    setSttError(null);
  };

  // 업무 추가/삭제
  const addJobTask = () => {
    setJobTasks([...jobTasks, { task_name: '', task_description: '' }]);
  };

  const removeJobTask = (index: number) => {
    if (jobTasks.length > 1) {
      setJobTasks(jobTasks.filter((_, i) => i !== index));
    }
  };

  const updateJobTask = (index: number, field: keyof TestJobTask, value: string) => {
    const updated = [...jobTasks];
    updated[index] = { ...updated[index], [field]: value };
    setJobTasks(updated);
  };

  // 페인포인트 추가/삭제
  const addPainPoint = () => {
    setPainPoints([...painPoints, { description: '', severity: 'MEDIUM' }]);
  };

  const removePainPoint = (index: number) => {
    if (painPoints.length > 1) {
      setPainPoints(painPoints.filter((_, i) => i !== index));
    }
  };

  const updatePainPoint = (index: number, field: keyof TestPainPoint, value: string) => {
    const updated = [...painPoints];
    updated[index] = { ...updated[index], [field]: value };
    setPainPoints(updated);
  };

  // 개선 목표 추가/삭제
  const addImprovementGoal = () => {
    setImprovementGoals([...improvementGoals, { goal_description: '' }]);
  };

  const removeImprovementGoal = (index: number) => {
    if (improvementGoals.length > 1) {
      setImprovementGoals(improvementGoals.filter((_, i) => i !== index));
    }
  };

  const updateImprovementGoal = (index: number, value: string) => {
    const updated = [...improvementGoals];
    updated[index] = { goal_description: value };
    setImprovementGoals(updated);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* 기업 기본정보 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            기업 기본정보
          </CardTitle>
          <CardDescription>테스트용 기업 정보를 입력하세요.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="companyName">회사명 *</Label>
              <Input
                id="companyName"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                placeholder="예: 테스트 제조회사"
              />
              {errors.companyName && (
                <p className="text-sm text-red-500">{errors.companyName}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="industry">업종 *</Label>
              <Select value={industry} onValueChange={setIndustry}>
                <SelectTrigger>
                  <SelectValue placeholder="업종 선택" />
                </SelectTrigger>
                <SelectContent>
                  {industryOptions.map((option) => (
                    <SelectItem key={option} value={option}>
                      {option}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.industry && <p className="text-sm text-red-500">{errors.industry}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="companySize">기업 규모 *</Label>
              <Select value={companySize} onValueChange={setCompanySize}>
                <SelectTrigger>
                  <SelectValue placeholder="규모 선택" />
                </SelectTrigger>
                <SelectContent>
                  {companySizeOptions.map((option) => (
                    <SelectItem key={option} value={option}>
                      {COMPANY_SIZE_LABELS[option]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.companySize && (
                <p className="text-sm text-red-500">{errors.companySize}</p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 세부 업무 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Briefcase className="h-5 w-5" />
            세부 업무
          </CardTitle>
          <CardDescription>
            AI 교육이 필요한 업무를 입력하세요. (최소 1개)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {jobTasks.map((task, index) => (
            <div key={index} className="flex gap-3 items-start">
              <div className="flex-1 grid gap-3 md:grid-cols-2">
                <Input
                  value={task.task_name}
                  onChange={(e) => updateJobTask(index, 'task_name', e.target.value)}
                  placeholder="업무명 (예: 수입검사)"
                />
                <Input
                  value={task.task_description}
                  onChange={(e) => updateJobTask(index, 'task_description', e.target.value)}
                  placeholder="업무 설명 (예: 수입 부품 품질 검사)"
                />
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => removeJobTask(index)}
                disabled={jobTasks.length === 1}
                className="shrink-0"
              >
                <Trash2 className="h-4 w-4 text-gray-400" />
              </Button>
            </div>
          ))}
          <Button type="button" variant="outline" size="sm" onClick={addJobTask}>
            <Plus className="h-4 w-4 mr-1" />
            업무 추가
          </Button>
          {errors.jobTasks && <p className="text-sm text-red-500">{errors.jobTasks}</p>}
        </CardContent>
      </Card>

      {/* 페인포인트 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            페인포인트
          </CardTitle>
          <CardDescription>
            현재 업무에서 겪는 어려움이나 병목을 입력하세요. (최소 1개)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {painPoints.map((point, index) => (
            <div key={index} className="flex gap-3 items-start">
              <div className="flex-1 grid gap-3 md:grid-cols-[1fr_auto]">
                <Input
                  value={point.description}
                  onChange={(e) => updatePainPoint(index, 'description', e.target.value)}
                  placeholder="페인포인트 설명 (예: 검사 데이터 수작업 입력으로 인한 오류 발생)"
                />
                <Select
                  value={point.severity}
                  onValueChange={(value) => updatePainPoint(index, 'severity', value)}
                >
                  <SelectTrigger className="w-full md:w-[120px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="HIGH">높음</SelectItem>
                    <SelectItem value="MEDIUM">중간</SelectItem>
                    <SelectItem value="LOW">낮음</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => removePainPoint(index)}
                disabled={painPoints.length === 1}
                className="shrink-0"
              >
                <Trash2 className="h-4 w-4 text-gray-400" />
              </Button>
            </div>
          ))}
          <Button type="button" variant="outline" size="sm" onClick={addPainPoint}>
            <Plus className="h-4 w-4 mr-1" />
            페인포인트 추가
          </Button>
          {errors.painPoints && <p className="text-sm text-red-500">{errors.painPoints}</p>}
        </CardContent>
      </Card>

      {/* 개선 목표 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            개선 목표
          </CardTitle>
          <CardDescription>
            AI 교육을 통해 달성하고자 하는 목표를 입력하세요. (최소 1개)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {improvementGoals.map((goal, index) => (
            <div key={index} className="flex gap-3 items-start">
              <Input
                className="flex-1"
                value={goal.goal_description}
                onChange={(e) => updateImprovementGoal(index, e.target.value)}
                placeholder="개선 목표 (예: 검사 시간 50% 단축)"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => removeImprovementGoal(index)}
                disabled={improvementGoals.length === 1}
                className="shrink-0"
              >
                <Trash2 className="h-4 w-4 text-gray-400" />
              </Button>
            </div>
          ))}
          <Button type="button" variant="outline" size="sm" onClick={addImprovementGoal}>
            <Plus className="h-4 w-4 mr-1" />
            목표 추가
          </Button>
          {errors.improvementGoals && (
            <p className="text-sm text-red-500">{errors.improvementGoals}</p>
          )}
        </CardContent>
      </Card>

      {/* 추가 요구사항 (선택) */}
      <Card>
        <CardHeader>
          <CardTitle>추가 요구사항 (선택)</CardTitle>
          <CardDescription>기타 참고할 사항이 있으면 입력하세요.</CardDescription>
        </CardHeader>
        <CardContent>
          <Textarea
            value={customerRequirements}
            onChange={(e) => setCustomerRequirements(e.target.value)}
            placeholder="예: 특정 도구 선호, 교육 일정 제약 등"
            rows={3}
          />
        </CardContent>
      </Card>

      {/* STT 녹취록 (선택) */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            인터뷰 녹취록 (선택)
          </CardTitle>
          <CardDescription>
            인터뷰 녹음을 STT로 변환한 텍스트 파일을 업로드하면, AI가 추가 인사이트를 추출하여 로드맵 생성에 활용합니다.
            <span className="text-xs text-gray-400 ml-2">최대 {MAX_STT_FILE_SIZE_KB}KB</span>
          </CardDescription>
        </CardHeader>
        <CardContent>
          {sttError && (
            <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded text-sm">
              {sttError}
            </div>
          )}

          {!sttText ? (
            <label className="block cursor-pointer">
              <input
                ref={fileInputRef}
                type="file"
                accept={ALLOWED_STT_FILE_EXTENSIONS.join(',')}
                onChange={handleSttFileChange}
                disabled={isLoading}
                className="hidden"
              />
              <div className={`flex items-center justify-center px-4 py-6 border-2 border-dashed rounded-lg transition-colors ${
                isLoading
                  ? 'border-gray-200 bg-gray-50 cursor-not-allowed'
                  : 'border-gray-300 hover:border-blue-400 hover:bg-blue-50'
              }`}>
                <div className="flex items-center text-gray-600">
                  <Upload className="w-5 h-5 mr-2" />
                  <span>txt 파일을 클릭하여 업로드</span>
                </div>
              </div>
            </label>
          ) : (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <FileText className="w-5 h-5 text-green-500 mr-3" />
                  <div>
                    <p className="text-sm font-medium text-green-800">파일 업로드 완료</p>
                    <p className="text-xs text-green-600">{sttFileName}</p>
                  </div>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={handleSttRemove}
                  className="text-green-600 hover:text-red-600"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
              <p className="mt-2 text-xs text-green-700">
                로드맵 생성 시 AI가 녹취록에서 추가 인사이트를 추출합니다.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 제출 버튼 */}
      <div className="flex justify-end">
        <Button type="submit" size="lg" disabled={isLoading}>
          {isLoading ? (
            <>
              <svg
                className="animate-spin -ml-1 mr-2 h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
              로드맵 생성 중...
            </>
          ) : (
            '테스트 로드맵 생성'
          )}
        </Button>
      </div>
    </form>
  );
}
