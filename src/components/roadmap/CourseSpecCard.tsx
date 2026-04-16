'use client';

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
import { Label } from '@/components/ui/label';
import {
  SyncedTableRow,
  TableTextCell,
  TableNumericCell,
  SectionNumberBadge,
  CARD_HEADER_CLASS,
} from '@/components/roadmap/shared';

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
      <CardHeader className={CARD_HEADER_CLASS}>
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0 space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <SectionNumberBadge label="명세서" index={index} />
            </div>
            {canEdit ? (
              <table>
                <tbody>
                  <tr>
                    <TableTextCell
                      canEdit={true}
                      value={spec.course_name}
                      onChange={(v) => updateSpec({ course_name: v })}
                      placeholder="과정명"
                      ariaLabel={`명세서 ${index + 1} 과정명`}
                      inputClassName="text-base font-semibold"
                      tdClassName="px-0 py-0"
                    />
                  </tr>
                </tbody>
              </table>
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
  }[] = [
    { key: 'format', label: '훈련형태', icon: BookOpen },
    { key: 'recommended_program', label: '추천 훈련사업', icon: Wrench },
    { key: 'goal', label: '훈련 목표', icon: Target },
    { key: 'main_content', label: '주요 훈련 내용', icon: FileText },
    { key: 'target_audience', label: '훈련 대상', icon: Users },
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
                <TableTextCell
                  canEdit={canEdit}
                  value={value}
                  onChange={(v) =>
                    onUpdate({ [f.key]: v } as Partial<RoadmapCourseSpec>)
                  }
                  placeholder={f.label}
                  ariaLabel={`명세서 ${index + 1} ${f.label}`}
                  readOnlyClassName="break-keep"
                />
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
  return (
    <SyncedTableRow deps={[subject.name, subject.details, canEdit]}>
      <TableTextCell
        canEdit={canEdit}
        value={subject.name}
        onChange={(v) => onUpdate(sIdx, { name: v })}
        placeholder="교과목명"
        ariaLabel={`명세서 ${courseIndex + 1} 교과목 ${sIdx + 1} 이름`}
        inputClassName="font-medium"
        readOnlyClassName="font-medium text-foreground"
      />

      <TableTextCell
        canEdit={canEdit}
        value={subject.details}
        onChange={(v) => onUpdate(sIdx, { details: v })}
        placeholder="세부 내용 (단원, 과제명)"
        ariaLabel={`명세서 ${courseIndex + 1} 교과목 ${sIdx + 1} 세부 내용 (단원, 과제명)`}
        readOnlyClassName="text-muted-foreground"
      />

      <TableNumericCell
        canEdit={canEdit}
        value={subject.hours}
        onChange={(v) => onUpdate(sIdx, { hours: v })}
        placeholder="시간"
        ariaLabel={`명세서 ${courseIndex + 1} 교과목 ${sIdx + 1} 시간`}
      />

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
    </SyncedTableRow>
  );
}
