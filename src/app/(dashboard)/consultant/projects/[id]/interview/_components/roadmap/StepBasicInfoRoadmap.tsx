'use client';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { FormField } from '@/components/ui/form-field';
import { GuideNote } from '@/components/ui/guide-note';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Plus, X } from 'lucide-react';
import {
  createEmptyRoadmapParticipant,
  INTERVIEW_METHOD_OPTIONS,
  type InterviewMethod,
  type RoadmapParticipant,
} from '@/lib/schemas/interview-roadmap';

interface StepBasicInfoRoadmapProps {
  interviewDate: string;
  interviewRound: number;
  // ISSUE-10 Step C-2: 단일 시간 → 시작/종료 두 입력
  interviewStartTime: string;
  interviewEndTime: string;
  interviewMethod: InterviewMethod;
  participants: RoadmapParticipant[];
  onInterviewDateChange: (date: string) => void;
  onInterviewRoundChange: (round: number) => void;
  onInterviewStartTimeChange: (time: string) => void;
  onInterviewEndTimeChange: (time: string) => void;
  onInterviewMethodChange: (method: InterviewMethod) => void;
  onParticipantsChange: (participants: RoadmapParticipant[]) => void;
}

const ROUND_OPTIONS = [1, 2, 3];

export default function StepBasicInfoRoadmap({
  interviewDate,
  interviewRound,
  interviewStartTime,
  interviewEndTime,
  interviewMethod,
  participants,
  onInterviewDateChange,
  onInterviewRoundChange,
  onInterviewStartTimeChange,
  onInterviewEndTimeChange,
  onInterviewMethodChange,
  onParticipantsChange,
}: StepBasicInfoRoadmapProps) {
  const updateParticipant = (
    index: number,
    field: keyof RoadmapParticipant,
    value: string,
  ) => {
    const next = participants.map((p, i) => (i === index ? { ...p, [field]: value } : p));
    onParticipantsChange(next);
  };

  const addParticipant = () => {
    onParticipantsChange([...participants, createEmptyRoadmapParticipant()]);
  };

  const removeParticipant = (index: number) => {
    if (participants.length <= 1) return;
    onParticipantsChange(participants.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-foreground">Ⅰ-2. 주요 활동</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          컨설팅 수행 차수·일시·수행 방법·참석자를 입력하세요.
          이 정보는 최종 보고서의 <strong>주요 활동</strong> 표로 자동 반영됩니다.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-3xl">
        <FormField label="수행 차수" htmlFor="basic-round" required>
          <Select
            value={String(interviewRound)}
            onValueChange={(v) => onInterviewRoundChange(Number(v))}
          >
            <SelectTrigger id="basic-round" aria-label="수행 차수">
              <SelectValue placeholder="차수 선택" />
            </SelectTrigger>
            <SelectContent>
              {ROUND_OPTIONS.map((n) => (
                <SelectItem key={n} value={String(n)}>
                  {n}차
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FormField>
        <FormField label="수행 방법" htmlFor="basic-method" required>
          <Select value={interviewMethod} onValueChange={(v) => onInterviewMethodChange(v as InterviewMethod)}>
            <SelectTrigger id="basic-method" aria-label="수행 방법">
              <SelectValue placeholder="방법 선택" />
            </SelectTrigger>
            <SelectContent>
              {INTERVIEW_METHOD_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FormField>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-3xl">
        <FormField label="수행 일자" htmlFor="basic-date" required>
          <Input
            id="basic-date"
            type="date"
            value={interviewDate}
            onChange={(e) => onInterviewDateChange(e.target.value)}
            required
          />
        </FormField>
        <FormField label="수행 시간 (시작)" htmlFor="basic-start-time" required>
          <Input
            id="basic-start-time"
            type="time"
            value={interviewStartTime}
            onChange={(e) => onInterviewStartTimeChange(e.target.value)}
            required
          />
        </FormField>
        <FormField label="수행 시간 (종료)" htmlFor="basic-end-time" required>
          <Input
            id="basic-end-time"
            type="time"
            value={interviewEndTime}
            onChange={(e) => onInterviewEndTimeChange(e.target.value)}
            required
          />
        </FormField>
      </div>

      <div className="border-t border-border pt-6">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div>
            <Label className="block">
              참석자 <span className="text-destructive">*</span>
            </Label>
            <p className="mt-1 text-xs text-muted-foreground">
              컨설팅 책임자(PM)와 기업 내부전문가 등 면담 참석자를 입력하세요.
            </p>
          </div>
          <Button type="button" variant="outline" size="sm" onClick={addParticipant}>
            <Plus className="w-4 h-4 mr-1" />
            참석자 추가
          </Button>
        </div>

        <div className="space-y-3">
          {participants.map((participant, index) => (
            <div
              key={participant.id}
              className="flex items-center gap-3 p-3 bg-muted/40 rounded-lg"
            >
              <span className="w-6 h-6 rounded-full bg-primary/10 text-primary text-xs flex items-center justify-center flex-shrink-0">
                {index + 1}
              </span>
              <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-3">
                <Input
                  type="text"
                  value={participant.name}
                  onChange={(e) => updateParticipant(index, 'name', e.target.value)}
                  placeholder="성명"
                  aria-label={`참석자 ${index + 1} 성명`}
                />
                <Input
                  type="text"
                  value={participant.position || ''}
                  onChange={(e) => updateParticipant(index, 'position', e.target.value)}
                  placeholder="소속 / 직급 (예: 기업 내부전문가, 팀장)"
                  aria-label={`참석자 ${index + 1} 소속/직급`}
                />
              </div>
              {participants.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeParticipant(index)}
                  className="p-1.5 text-muted-foreground hover:text-destructive transition-colors"
                  aria-label={`참석자 ${index + 1} 삭제`}
                >
                  <X className="w-5 h-5" />
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      <GuideNote
        items={[
          '컨설팅 수행일지의 주요내용을 반영하여 시스템에서 자동생성 예정(별도 작성 불요)',
        ]}
      />
    </div>
  );
}
