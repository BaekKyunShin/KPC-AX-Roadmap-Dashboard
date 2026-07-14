'use client';

import {
  Trash2,
  Plus,
  BookOpen,
  FileText,
  Target,
  Users,
  Wrench,
  ClipboardList,
  CalendarDays,
  GraduationCap,
} from 'lucide-react';
import type {
  RoadmapCourseSpec,
  RoadmapCourseSubject,
  TrainingLevel,
} from '@/lib/services/roadmap/roadmap-types';
import { TRAINING_LEVEL_LABEL } from '@/lib/services/roadmap/roadmap-types';
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
  TABLE_CELL_TEXT_CLASS,
} from '@/components/roadmap/shared';
import { splitByUnit } from '@/lib/utils/list-format';

// ============================================================================
// 타입 & 상수
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

/** 프로파일 표에서 자유 텍스트로 편집하는 필드 (과정명은 카드 헤더에서 편집). */
type ProfileTextKey =
  | 'training_period'
  | 'training_method'
  | 'recommended_program'
  | 'goal'
  | 'main_content'
  | 'target_audience';

interface ProfileRow {
  key: ProfileTextKey | 'training_level';
  label: string;
  icon: typeof BookOpen;
}

/**
 * 과정 프로파일 표 행 — 산인공 양식 v2 명세서 순서.
 * 훈련시기·훈련수준이 v2에서 신규 추가되었고, v1 `format`은 `training_method`(훈련방법)로 대체.
 */
const PROFILE_ROWS: ProfileRow[] = [
  { key: 'training_period', label: '훈련시기', icon: CalendarDays },
  { key: 'training_level', label: '훈련수준', icon: GraduationCap },
  { key: 'training_method', label: '훈련방법', icon: BookOpen },
  { key: 'recommended_program', label: '추천 훈련사업', icon: Wrench },
  { key: 'goal', label: '훈련 목표', icon: Target },
  { key: 'main_content', label: '주요 훈련 내용', icon: FileText },
  { key: 'target_audience', label: '훈련 대상', icon: Users },
];

const TRAINING_LEVEL_OPTIONS: TrainingLevel[] = ['BEGINNER', 'INTERMEDIATE', 'ADVANCED'];

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
  return (
    <div className="rounded-lg border border-border overflow-hidden">
      <table className="w-full text-sm">
        <tbody className="divide-y divide-border">
          {PROFILE_ROWS.map((row) => {
            const Icon = row.icon;
            const inputId = `course-${index}-${row.key}`;
            const ariaLabel = `명세서 ${index + 1} ${row.label}`;

            return (
              <tr key={row.key} className="align-top">
                <td className="min-w-[140px] bg-muted/50 px-3 py-3 text-left font-medium text-muted-foreground whitespace-normal break-keep">
                  <Label htmlFor={inputId} className="flex items-center gap-2 cursor-pointer">
                    <Icon className="h-4 w-4 text-muted-foreground shrink-0" />
                    {row.label}
                  </Label>
                </td>

                {row.key === 'training_level' ? (
                  <TrainingLevelCell
                    canEdit={canEdit}
                    value={spec.training_level}
                    inputId={inputId}
                    ariaLabel={ariaLabel}
                    onChange={(v) => onUpdate({ training_level: v })}
                  />
                ) : (
                  <TableTextCell
                    canEdit={canEdit}
                    value={spec[row.key] ?? ''}
                    onChange={(v) => onUpdate({ [row.key]: v } as Partial<RoadmapCourseSpec>)}
                    placeholder={row.label}
                    ariaLabel={ariaLabel}
                    readOnlyClassName="break-keep"
                  />
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ============================================================================
// 훈련수준 셀 (enum) — 읽기: 뱃지 / 편집: 네이티브 select
// ----------------------------------------------------------------------------
// 자유 텍스트가 아닌 3지선다 enum 이므로 TableTextCell 대신 select 를 쓴다.
// (InlineSelectField 와 동일하게 네이티브 select — 표 셀 안에서 가볍고 접근성이 좋다)
// ============================================================================

interface TrainingLevelCellProps {
  canEdit: boolean;
  value: TrainingLevel;
  inputId: string;
  ariaLabel: string;
  onChange: (value: TrainingLevel) => void;
}

function TrainingLevelCell({
  canEdit,
  value,
  inputId,
  ariaLabel,
  onChange,
}: TrainingLevelCellProps) {
  return (
    <td className={TABLE_CELL_TEXT_CLASS}>
      {canEdit ? (
        <select
          id={inputId}
          value={value}
          onChange={(e) => onChange(e.target.value as TrainingLevel)}
          aria-label={ariaLabel}
          className="h-9 w-full max-w-[180px] rounded-md border border-input bg-background px-2 text-sm shadow-xs transition-colors focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none"
        >
          {TRAINING_LEVEL_OPTIONS.map((level) => (
            <option key={level} value={level}>
              {TRAINING_LEVEL_LABEL[level]}
            </option>
          ))}
        </select>
      ) : (
        // 매핑되지 않은 legacy 값이 들어와도 빈 뱃지가 되지 않도록 원본값 fallback
        <Badge variant="secondary">{TRAINING_LEVEL_LABEL[value] ?? value}</Badge>
      )}
    </td>
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
        value={canEdit ? subject.details : splitByUnit(subject.details)}
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
