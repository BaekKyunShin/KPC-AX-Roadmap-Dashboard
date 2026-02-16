import { useState, useRef } from 'react';
import { INTERVIEW_STEPS } from '@/lib/constants/interview-steps';
import type { TestInputData } from '@/lib/schemas/test-roadmap';
import type { SttInsights } from '@/lib/schemas/interview';
import {
  createEmptyParticipant,
  createEmptyJobTask,
  createEmptyPainPoint,
  createEmptyImprovementGoal,
  type InterviewParticipant,
  type JobTask,
  type PainPoint,
  type Constraint,
  type ImprovementGoal,
  type CompanyDetails,
} from '@/lib/schemas/interview';

// =============================================================================
// 타입
// =============================================================================

interface UseTestRoadmapFormOptions {
  setError: (error: string | null) => void;
}

// =============================================================================
// 훅
// =============================================================================

export function useTestRoadmapForm({ setError }: UseTestRoadmapFormOptions) {
  // ===== 스테퍼 상태 =====
  const [currentStep, setCurrentStep] = useState(1);
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);

  // ===== 기업 기본정보 상태 (테스트 전용) =====
  const [companyName, setCompanyName] = useState('');
  const [industry, setIndustry] = useState('');
  const [subIndustries, setSubIndustries] = useState<string[]>([]);
  const [companySize, setCompanySize] = useState('');

  // ===== 인터뷰 폼 상태 =====
  const [interviewDate, setInterviewDate] = useState(new Date().toISOString().split('T')[0]);
  const [participants, setParticipants] = useState<InterviewParticipant[]>([
    createEmptyParticipant(),
  ]);
  const [companyDetails, setCompanyDetails] = useState<CompanyDetails>({
    systems_and_tools: [],
    ai_experience: '',
  });
  const [jobTasks, setJobTasks] = useState<JobTask[]>([createEmptyJobTask()]);
  const [painPoints, setPainPoints] = useState<PainPoint[]>([createEmptyPainPoint()]);
  const [constraints, setConstraints] = useState<Constraint[]>([]);
  const [improvementGoals, setImprovementGoals] = useState<ImprovementGoal[]>([
    createEmptyImprovementGoal(),
  ]);
  const [notes, setNotes] = useState('');
  const [customerRequirements] = useState('');

  // ===== STT 상태 =====
  const [sttInsights, setSttInsights] = useState<SttInsights | null>(null);
  const [isProcessingStt, setIsProcessingStt] = useState(false);
  const [sttText, setSttText] = useState<string | null>(null);
  const sttFileRef = useRef<string | null>(null);

  // ===== 스텝 네비게이션 =====
  const goToNextStep = () => {
    if (currentStep < INTERVIEW_STEPS.length) {
      setCurrentStep(currentStep + 1);
    }
  };

  const goToPrevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  // ===== STT 파일 업로드 핸들러 =====
  const handleSttFileUpload = async (text: string) => {
    setIsProcessingStt(true);
    setSttText(text);
    sttFileRef.current = text;
    try {
      // 테스트 모드에서는 STT 인사이트 추출을 로드맵 생성 시 수행
      // 여기서는 텍스트만 저장하고 UI에 표시
      setSttInsights({
        추가_업무: [],
        추가_페인포인트: [],
        숨은_니즈: [],
        조직_맥락: '',
        AI_태도: '',
        주요_인용: [],
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'STT 처리 중 오류가 발생했습니다.');
      setTimeout(() => setError(null), 5000);
    } finally {
      setIsProcessingStt(false);
    }
  };

  // STT 인사이트 삭제 핸들러
  const handleSttInsightsDelete = async () => {
    setSttInsights(null);
    setSttText(null);
    sttFileRef.current = null;
  };

  // ===== 폼 데이터 구성 =====
  const buildInputData = (): TestInputData => {
    return {
      company_name: companyName.trim(),
      industry: industry as TestInputData['industry'],
      sub_industries: subIndustries.length > 0 ? subIndustries : undefined,
      company_size: companySize as TestInputData['company_size'],
      interview_date: interviewDate,
      participants,
      company_details: companyDetails,
      job_tasks: jobTasks.filter((t) => t.task_name && t.task_description),
      pain_points: painPoints.filter((p) => p.description),
      constraints: constraints.length > 0 ? constraints : undefined,
      improvement_goals: improvementGoals.filter((g) => g.goal_description),
      notes: notes || undefined,
      customer_requirements: customerRequirements || undefined,
      stt_text: sttText || undefined,
    };
  };

  return {
    // Stepper
    currentStep,
    setCurrentStep,
    completedSteps,
    setCompletedSteps,
    goToNextStep,
    goToPrevStep,
    // Company info
    companyName,
    setCompanyName,
    industry,
    setIndustry,
    subIndustries,
    setSubIndustries,
    companySize,
    setCompanySize,
    // Interview data
    interviewDate,
    setInterviewDate,
    participants,
    setParticipants,
    companyDetails,
    setCompanyDetails,
    jobTasks,
    setJobTasks,
    painPoints,
    setPainPoints,
    constraints,
    setConstraints,
    improvementGoals,
    setImprovementGoals,
    notes,
    setNotes,
    customerRequirements,
    // STT
    sttInsights,
    isProcessingStt,
    sttText,
    handleSttFileUpload,
    handleSttInsightsDelete,
    // Build
    buildInputData,
  };
}
