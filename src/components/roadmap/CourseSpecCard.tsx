'use client';

import { useRef } from 'react';
import { Trash2, Plus, BookOpen, FileText, Target, Users, Wrench, ClipboardList } from 'lucide-react';
import type {
  RoadmapCourseSpec,
  RoadmapCourseSubject,
} from '@/lib/services/roadmap/roadmap-types';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { AutoResizeTextarea } from '@/components/ui/auto-resize-textarea';
import { Label } from '@/components/ui/label';
import { useRowHeightSync } from '@/hooks/useRowHeightSync';

// ============================================================================
// 타입
// ============================================================================

interface CourseSpecCardProps {
  spec: RoadmapCourseSpec;
  index: number;
  canEdit?: boolean;
  onChange?: (next: RoadmapCourseSpec) => void;
  onDelete?: () => void;
}

const EMPTY_SUBJECT: RoadmapCourseSubject = {
  name: '',
  details: '',
  hours: 0,
};

const DEFAULT_ACCORDION_VALUES = ['profile', 'subjects'];

// ============================================================================
// 메인 컴포넌트
// ============================================================================

export function CourseSpecCard({
  spec,
  index,
  canEdit = false,
  onChange,
  onDelete,
}: CourseSpecCardProps) {
  const subjects = spec?.subjects ?? [];
  const totalHours = subjects.reduce((sum, s) => sum + (s.hours || 0), 0);

  // ----- 편집 헬퍼 -----
  const updateSpec = (patch: Partial<RoadmapCourseSpec>) => {
    if (!onChange) return;
    onChange({ ...spec, ...patch });
  };

  const updateSubject = (sIndex: number, patch: Partial<RoadmapCourseSubject>) => {
    if (!onChange) return;
    const nextSubjects = subjects.map((s, i) => (i === sIndex ? { ...s, ...patch } : s));
    onChange({ ...spec, subjects: nextSubjects });
  };

  const addSubject = () => {
    if (!onChange) return;
    onChange({ ...spec, subjects: [...subjects, { ...EMPTY_SUBJECT }] });
  };

  const removeSubject = (sIndex: number) => {
    if (!onChange) return;
    const nextSubjects = subjects.filter((_, i) => i !== sIndex);
    onChange({ ...spec, subjects: nextSubjects });
  };

  return (
    <Card className="overflow-hidden shadow-sm hover:shadow-md transition-shadow">
      {/* 헤더 */}
      <CardHeader className="pb-3 bg-gradient-to-r from-gray-50 to-white">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0 space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                명세서 #{index + 1}
              </Badge>
            </div>
            {canEdit ? (
              <Input
                value={spec.course_name}
                onChange={(e) => updateSpec({ course_name: e.target.value })}
                placeholder="과정명"
                aria-label={`명세서 ${index + 1} 과정명`}
                className="text-base font-semibold"
              />
            ) : (
              <h3 className="text-lg font-semibold text-foreground break-keep">
                {spec.course_name || '(과정명 미입력)'}
              </h3>
            )}
          </div>
          {canEdit && onDelete && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onDelete}
              aria-label={`명세서 ${index + 1} 삭제`}
              title="삭제"
            >
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent className="pt-0 px-0">
        <Accordion type="multiple" defaultValue={DEFAULT_ACCORDION_VALUES} className="w-full">
          {/* 과정 프로파일 */}
          <AccordionItem value="profile" className="border-b-0">
            <AccordionTrigger className="px-6 py-3 hover:no-underline hover:bg-gray-50/50 text-sm font-medium text-gray-700">
              <div className="flex items-center gap-2">
                <BookOpen className="h-4 w-4 text-gray-500" />
                과정 프로파일
              </div>
            </AccordionTrigger>
            <AccordionContent className="px-6 pb-4">
              <ProfileSection spec={spec} index={index} canEdit={canEdit} onUpdate={updateSpec} />
            </AccordionContent>
          </AccordionItem>

          {/* 교과목 */}
          <AccordionItem value="subjects" className="border-b-0">
            <AccordionTrigger className="px-6 py-3 hover:no-underline hover:bg-gray-50/50 text-sm font-medium text-gray-700">
              <div className="flex items-center gap-2">
                <ClipboardList className="h-4 w-4 text-indigo-500" />
                교과목
                <Badge variant="secondary" className="ml-2 text-xs">
                  {subjects.length}개 / {totalHours}H
                </Badge>
              </div>
            </AccordionTrigger>
            <AccordionContent className="px-6 pb-4">
              <SubjectsSection
                index={index}
                subjects={subjects}
                totalHours={totalHours}
                canEdit={canEdit}
                onUpdate={updateSubject}
                onAdd={addSubject}
                onRemove={removeSubject}
              />
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </CardContent>
    </Card>
  );
}

// ============================================================================
// 프로필 섹션
// ============================================================================

interface ProfileSectionProps {
  spec: RoadmapCourseSpec;
  index: number;
  canEdit: boolean;
  onUpdate: (patch: Partial<RoadmapCourseSpec>) => void;
}

function ProfileSection({ spec, index, canEdit, onUpdate }: ProfileSectionProps) {
  const fields: {
    key: keyof RoadmapCourseSpec;
    label: string;
    icon: typeof BookOpen;
    multiline: boolean;
    rows?: number;
  }[] = [
    { key: 'format', label: '훈련형태', icon: BookOpen, multiline: false },
    { key: 'recommended_program', label: '추천 훈련사업', icon: Wrench, multiline: false },
    { key: 'goal', label: '훈련 목표', icon: Target, multiline: true, rows: 2 },
    { key: 'main_content', label: '주요 훈련 내용', icon: FileText, multiline: true, rows: 3 },
    { key: 'target_audience', label: '훈련 대상', icon: Users, multiline: false },
  ];

  return (
    <div className="rounded-lg border border-border overflow-hidden">
      <table className="w-full text-sm">
        <tbody className="divide-y divide-border">
          {fields.map((f) => {
            const Icon = f.icon;
            const value = (spec[f.key] ?? '') as string;
            const inputId = `course-${index}-${f.key}`;
            return (
              <tr key={f.key} className="align-top">
                <td className="min-w-[140px] bg-muted/50 px-3 py-3 text-left font-medium text-muted-foreground whitespace-normal break-keep">
                  <Label htmlFor={inputId} className="flex items-center gap-2 cursor-pointer">
                    <Icon className="h-4 w-4 text-muted-foreground shrink-0" />
                    {f.label}
                  </Label>
                </td>
                <td className="px-3 py-3 text-foreground">
                  {canEdit ? (
                    f.multiline ? (
                      <AutoResizeTextarea
                        id={inputId}
                        value={value}
                        onChange={(e) =>
                          onUpdate({ [f.key]: e.target.value } as Partial<RoadmapCourseSpec>)
                        }
                        placeholder={f.label}
                        aria-label={`명세서 ${index + 1} ${f.label}`}
                      />
                    ) : (
                      <Input
                        id={inputId}
                        value={value}
                        onChange={(e) =>
                          onUpdate({ [f.key]: e.target.value } as Partial<RoadmapCourseSpec>)
                        }
                        placeholder={f.label}
                        aria-label={`명세서 ${index + 1} ${f.label}`}
                      />
                    )
                  ) : (
                    <span className="break-keep whitespace-pre-wrap">{value || '-'}</span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ============================================================================
// 교과목 섹션
// ============================================================================

interface SubjectsSectionProps {
  index: number;
  subjects: RoadmapCourseSubject[];
  totalHours: number;
  canEdit: boolean;
  onUpdate: (sIndex: number, patch: Partial<RoadmapCourseSubject>) => void;
  onAdd: () => void;
  onRemove: (sIndex: number) => void;
}

function SubjectsSection({
  index,
  subjects,
  totalHours,
  canEdit,
  onUpdate,
  onAdd,
  onRemove,
}: SubjectsSectionProps) {
  const isEmpty = subjects.length === 0;

  return (
    <div className="space-y-3">
      {isEmpty ? (
        <div className="rounded-md border border-dashed border-border px-3 py-6 text-center text-sm text-muted-foreground">
          (교과목 없음)
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="min-w-full divide-y divide-border text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th
                  scope="col"
                  className="w-[180px] px-3 py-2 text-center text-xs font-semibold text-muted-foreground uppercase tracking-wide"
                >
                  교과목명
                </th>
                <th
                  scope="col"
                  className="px-3 py-2 text-center text-xs font-semibold text-muted-foreground uppercase tracking-wide"
                >
                  <span>세부 내용</span>
                  <span className="ml-1 font-normal normal-case text-[11px] text-muted-foreground/80">
                    (단원, 과제명)
                  </span>
                </th>
                <th
                  scope="col"
                  className="w-[90px] px-3 py-2 text-center text-xs font-semibold text-muted-foreground uppercase tracking-wide"
                >
                  시간
                </th>
                {canEdit && (
                  <th
                    scope="col"
                    className="w-[60px] px-3 py-2 text-center text-xs font-semibold text-muted-foreground uppercase"
                  >
                    액션
                  </th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-border bg-card">
              {subjects.map((subject, sIdx) => (
                <SubjectRow
                  key={sIdx}
                  courseIndex={index}
                  sIdx={sIdx}
                  subject={subject}
                  canEdit={canEdit}
                  onUpdate={onUpdate}
                  onRemove={onRemove}
                />
              ))}
            </tbody>
            {!isEmpty && (
              <tfoot className="bg-muted/30">
                <tr>
                  <td
                    colSpan={2}
                    className="px-3 py-2 text-right text-xs font-semibold text-muted-foreground"
                  >
                    시간 합계
                  </td>
                  <td className="px-3 py-2 text-right text-sm font-semibold text-foreground">
                    {totalHours}H
                  </td>
                  {canEdit && <td />}
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      )}

      {canEdit && (
        <div className="flex justify-end">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onAdd}
            aria-label={`명세서 ${index + 1} 교과목 추가`}
          >
            <Plus className="h-4 w-4" />
            교과목 추가
          </Button>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// 교과목 행 (행 높이 동기화)
// ============================================================================

interface SubjectRowProps {
  courseIndex: number;
  sIdx: number;
  subject: RoadmapCourseSubject;
  canEdit: boolean;
  onUpdate: (sIndex: number, patch: Partial<RoadmapCourseSubject>) => void;
  onRemove: (sIndex: number) => void;
}

function SubjectRow({ courseIndex, sIdx, subject, canEdit, onUpdate, onRemove }: SubjectRowProps) {
  const rowRef = useRef<HTMLTableRowElement>(null);
  useRowHeightSync(rowRef, [subject.details, canEdit]);

  return (
    <tr ref={rowRef}>
      <td className="px-3 py-3 align-top whitespace-pre-wrap break-words [overflow-wrap:anywhere]">
        {canEdit ? (
          <Input
            value={subject.name}
            onChange={(e) => onUpdate(sIdx, { name: e.target.value })}
            placeholder="교과목명"
            aria-label={`명세서 ${courseIndex + 1} 교과목 ${sIdx + 1} 이름`}
          />
        ) : (
          <span className="font-medium text-foreground">{subject.name || '-'}</span>
        )}
      </td>
      <td className="px-3 py-3 align-top whitespace-pre-wrap break-words [overflow-wrap:anywhere]">
        {canEdit ? (
          <AutoResizeTextarea
            value={subject.details}
            onChange={(e) => onUpdate(sIdx, { details: e.target.value })}
            placeholder="세부 내용 (단원, 과제명)"
            aria-label={`명세서 ${courseIndex + 1} 교과목 ${sIdx + 1} 세부 내용 (단원, 과제명)`}
          />
        ) : (
          <span className="text-muted-foreground break-keep whitespace-pre-wrap">
            {subject.details || '-'}
          </span>
        )}
      </td>
      <td className="px-3 py-3 text-right align-top whitespace-pre-wrap break-words [overflow-wrap:anywhere]">
        {canEdit ? (
          <Input
            type="number"
            min={1}
            value={subject.hours || ''}
            onChange={(e) => onUpdate(sIdx, { hours: Number(e.target.value) || 0 })}
            placeholder="시간"
            className="text-right"
            aria-label={`명세서 ${courseIndex + 1} 교과목 ${sIdx + 1} 시간`}
          />
        ) : (
          <span className="font-medium text-foreground">
            {subject.hours > 0 ? `${subject.hours}H` : '-'}
          </span>
        )}
      </td>
      {canEdit && (
        <td className="px-3 py-3 text-center">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => onRemove(sIdx)}
            aria-label={`명세서 ${courseIndex + 1} 교과목 ${sIdx + 1} 삭제`}
            title="삭제"
          >
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        </td>
      )}
    </tr>
  );
}
