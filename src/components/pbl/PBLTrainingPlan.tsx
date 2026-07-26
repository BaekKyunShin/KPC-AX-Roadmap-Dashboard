'use client';

import { useMemo } from 'react';
import { AlertCircle, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FormField } from '@/components/ui/form-field';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  CARD_HEADER_CLASS,
  SyncedTableRow,
  TableInlineCell,
  TableNumericCell,
  TableTextCell,
} from '@/components/roadmap/shared';
import { bulletizeDetails } from '@/lib/utils/list-format';
import type {
  PBLFacility,
  PBLInstructor,
  PBLSubjectProfile,
  PBLTrainee,
  PBLTrainingContent,
  PBLTrainingInstructor,
  PBLTrainingPlan as PBLTrainingPlanType,
} from '@/lib/services/pbl';

// ============================================================================
// Ⅳ-3. 훈련 실시 계획 (양식 2번 13~14p)
//  가. 훈련과정 개요
//  나. 학습그룹 구성 (instructors + trainees)
//  다. 훈련 교과목 프로파일 (training_contents 행)
//  라. 시설·장비
//  마. 훈련강사
// ============================================================================

interface PBLTrainingPlanProps {
  canEdit: boolean;
  value: PBLTrainingPlanType;
  onChange: (next: PBLTrainingPlanType) => void;
}

// ----------------------------------------------------------------------------

export function PBLTrainingPlan({ canEdit, value, onChange }: PBLTrainingPlanProps) {
  const update = (patch: Partial<PBLTrainingPlanType>) => onChange({ ...value, ...patch });

  return (
    <div className="space-y-4">
      <OverviewSection canEdit={canEdit} value={value} update={update} />
      <LearningGroupSection canEdit={canEdit} value={value} update={update} />
      <SubjectProfileSection canEdit={canEdit} value={value} update={update} />
      <FacilitiesSection canEdit={canEdit} value={value} update={update} />
      <InstructorsSection canEdit={canEdit} value={value} update={update} />
    </div>
  );
}

// ----------------------------------------------------------------------------
// 가. 훈련과정 개요
// ----------------------------------------------------------------------------

function OverviewSection({
  canEdit,
  value,
  update,
}: {
  canEdit: boolean;
  value: PBLTrainingPlanType;
  update: (p: Partial<PBLTrainingPlanType>) => void;
}) {
  return (
    <Card>
      <CardHeader className={CARD_HEADER_CLASS}>
        <CardTitle className="text-base">Ⅳ-3. 훈련 실시 계획 &mdash; 가. 훈련과정 개요</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 pt-5">
        <FormField label="과정명" htmlFor="pbl-course-name">
          <Input
            id="pbl-course-name"
            value={value.overview.course_name}
            disabled={!canEdit}
            onChange={(e) =>
              update({ overview: { ...value.overview, course_name: e.target.value } })
            }
          />
        </FormField>
        <div>
          <label className="block text-sm font-medium leading-none mb-1.5">훈련기간</label>
          <div className="flex items-center gap-2">
            <Input
              id="pbl-period-start"
              type="date"
              aria-label="훈련기간 시작"
              value={value.overview.training_period.start}
              disabled={!canEdit}
              onChange={(e) =>
                update({
                  overview: {
                    ...value.overview,
                    training_period: { ...value.overview.training_period, start: e.target.value },
                  },
                })
              }
            />
            <span className="text-muted-foreground text-sm shrink-0">~</span>
            <Input
              id="pbl-period-end"
              type="date"
              aria-label="훈련기간 종료"
              value={value.overview.training_period.end}
              disabled={!canEdit}
              onChange={(e) =>
                update({
                  overview: {
                    ...value.overview,
                    training_period: { ...value.overview.training_period, end: e.target.value },
                  },
                })
              }
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ----------------------------------------------------------------------------
// 나. 학습그룹 구성
// ----------------------------------------------------------------------------

function LearningGroupSection({
  canEdit,
  value,
  update,
}: {
  canEdit: boolean;
  value: PBLTrainingPlanType;
  update: (p: Partial<PBLTrainingPlanType>) => void;
}) {
  const { instructors, trainees } = value.learning_group;
  const updateInstructor = (i: number, patch: Partial<PBLInstructor>) => {
    const next = instructors.map((item, idx) => (idx === i ? { ...item, ...patch } : item));
    update({ learning_group: { ...value.learning_group, instructors: next } });
  };
  const addInstructor = () =>
    update({
      learning_group: {
        ...value.learning_group,
        instructors: [
          ...instructors,
          { type: '외부', role: '팀원', affiliation: '', position: '', name: '' },
        ],
      },
    });
  const removeInstructor = (i: number) =>
    update({
      learning_group: {
        ...value.learning_group,
        instructors: instructors.filter((_, idx) => idx !== i),
      },
    });

  const updateTrainee = (i: number, patch: Partial<PBLTrainee>) => {
    const next = trainees.map((item, idx) => (idx === i ? { ...item, ...patch } : item));
    update({ learning_group: { ...value.learning_group, trainees: next } });
  };
  const addTrainee = () =>
    update({
      learning_group: {
        ...value.learning_group,
        trainees: [...trainees, { role: '팀원', affiliation: '', position: '', name: '' }],
      },
    });
  const removeTrainee = (i: number) =>
    update({
      learning_group: {
        ...value.learning_group,
        trainees: trainees.filter((_, idx) => idx !== i),
      },
    });

  return (
    <Card>
      <CardHeader className={CARD_HEADER_CLASS}>
        <CardTitle className="text-base">나. 학습그룹 구성</CardTitle>
      </CardHeader>
      <CardContent className="space-y-5 pt-5">
        {/* 훈련 강사 */}
        <section>
          <h3 className="text-sm font-medium text-foreground mb-2">훈련 강사</h3>
          <div className="overflow-x-auto rounded border border-border">
            <Table className="min-w-[720px]">
              <TableHeader className="bg-muted/40">
                <TableRow>
                  <TableHead className="w-[10%] text-center">구분</TableHead>
                  <TableHead className="w-[12%] text-center">역할</TableHead>
                  <TableHead className="w-[22%] text-center">소속(부서)</TableHead>
                  <TableHead className="w-[18%] text-center">직위</TableHead>
                  <TableHead className="w-[20%] text-center">성명</TableHead>
                  {canEdit && <TableHead className="w-[8%] text-center">작업</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {instructors.length === 0 ? (
                  <TableRow>
                    <td
                      colSpan={canEdit ? 6 : 5}
                      className="px-3 py-6 text-center text-sm text-muted-foreground"
                    >
                      훈련강사를 추가하세요.
                    </td>
                  </TableRow>
                ) : (
                  instructors.map((ins, idx) => (
                    <SyncedTableRow key={idx} deps={[ins.affiliation, ins.position, ins.name]}>
                      <TableInlineCell
                        canEdit={canEdit}
                        value={ins.type}
                        onChange={(v) =>
                          updateInstructor(idx, {
                            type: v === '내부' ? '내부' : '외부',
                          })
                        }
                        ariaLabel="구분 (내부/외부)"
                      />
                      <TableInlineCell
                        canEdit={canEdit}
                        value={ins.role}
                        onChange={(v) =>
                          updateInstructor(idx, { role: v === '팀장' ? '팀장' : '팀원' })
                        }
                        ariaLabel="역할 (팀원/팀장)"
                      />
                      <TableTextCell
                        canEdit={canEdit}
                        value={ins.affiliation}
                        onChange={(v) => updateInstructor(idx, { affiliation: v })}
                        ariaLabel="소속(부서)"
                      />
                      <TableInlineCell
                        canEdit={canEdit}
                        value={ins.position}
                        onChange={(v) => updateInstructor(idx, { position: v })}
                        ariaLabel="직위"
                      />
                      <TableInlineCell
                        canEdit={canEdit}
                        value={ins.name}
                        onChange={(v) => updateInstructor(idx, { name: v })}
                        ariaLabel="성명"
                      />
                      {canEdit && (
                        <td className="px-2 py-3 align-top text-center">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            aria-label={`강사 ${ins.name || idx + 1} 삭제`}
                            onClick={() => removeInstructor(idx)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </td>
                      )}
                    </SyncedTableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
          {canEdit && (
            <div className="flex justify-end mt-2">
              <Button type="button" variant="outline" size="sm" onClick={addInstructor}>
                <Plus className="h-4 w-4 mr-1" /> 강사 추가
              </Button>
            </div>
          )}
        </section>

        {/* 훈련생 */}
        <section>
          <h3 className="text-sm font-medium text-foreground mb-2">훈련생</h3>
          <div className="overflow-x-auto rounded border border-border">
            <Table className="min-w-[720px]">
              <TableHeader className="bg-muted/40">
                <TableRow>
                  <TableHead className="w-[10%] text-center">구분</TableHead>
                  <TableHead className="w-[12%] text-center">역할</TableHead>
                  <TableHead className="w-[28%] text-center">소속(부서)</TableHead>
                  <TableHead className="w-[20%] text-center">직위</TableHead>
                  <TableHead className="w-[22%] text-center">성명</TableHead>
                  {canEdit && <TableHead className="w-[8%] text-center">작업</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {trainees.length === 0 ? (
                  <TableRow>
                    <td
                      colSpan={canEdit ? 6 : 5}
                      className="px-3 py-6 text-center text-sm text-muted-foreground"
                    >
                      훈련생을 추가하세요.
                    </td>
                  </TableRow>
                ) : (
                  trainees.map((tr, idx) => (
                    <SyncedTableRow key={idx} deps={[tr.affiliation, tr.position, tr.name]}>
                      <td className="h-0 px-3 py-3 align-top text-center text-sm text-muted-foreground">
                        내부
                      </td>
                      <TableInlineCell
                        canEdit={canEdit}
                        value={tr.role}
                        onChange={(v) =>
                          updateTrainee(idx, { role: v === '팀장' ? '팀장' : '팀원' })
                        }
                        ariaLabel="역할 (팀원/팀장)"
                      />
                      <TableTextCell
                        canEdit={canEdit}
                        value={tr.affiliation}
                        onChange={(v) => updateTrainee(idx, { affiliation: v })}
                        ariaLabel="훈련생 소속(부서)"
                      />
                      <TableInlineCell
                        canEdit={canEdit}
                        value={tr.position}
                        onChange={(v) => updateTrainee(idx, { position: v })}
                        ariaLabel="훈련생 직위"
                      />
                      <TableInlineCell
                        canEdit={canEdit}
                        value={tr.name}
                        onChange={(v) => updateTrainee(idx, { name: v })}
                        ariaLabel="훈련생 성명"
                      />
                      {canEdit && (
                        <td className="px-2 py-3 align-top text-center">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            aria-label={`훈련생 ${tr.name || idx + 1} 삭제`}
                            onClick={() => removeTrainee(idx)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </td>
                      )}
                    </SyncedTableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
          {canEdit && (
            <div className="flex justify-end mt-2">
              <Button type="button" variant="outline" size="sm" onClick={addTrainee}>
                <Plus className="h-4 w-4 mr-1" /> 훈련생 추가
              </Button>
            </div>
          )}
        </section>
      </CardContent>
    </Card>
  );
}

// ----------------------------------------------------------------------------
// 다. 훈련 교과목 프로파일
// ----------------------------------------------------------------------------

function SubjectProfileSection({
  canEdit,
  value,
  update,
}: {
  canEdit: boolean;
  value: PBLTrainingPlanType;
  update: (p: Partial<PBLTrainingPlanType>) => void;
}) {
  const profile = value.subject_profile;
  const updateProfile = (patch: Partial<PBLSubjectProfile>) => {
    const next = { ...profile, ...patch };
    next.total_sum_hours = next.training_contents.reduce((acc, row) => acc + row.training_hours, 0);
    update({ subject_profile: next });
  };

  const updateRow = (i: number, patch: Partial<PBLTrainingContent>) => {
    const next = profile.training_contents.map((row, idx) =>
      idx === i ? { ...row, ...patch } : row
    );
    updateProfile({ training_contents: next });
  };

  const addRow = () =>
    updateProfile({
      training_contents: [
        ...profile.training_contents,
        {
          unit_name: '',
          detail: '',
          training_hours: 0,
          instructor_hours: { external: 0, internal: 0 },
        },
      ],
    });

  const removeRow = (i: number) =>
    updateProfile({
      training_contents: profile.training_contents.filter((_, idx) => idx !== i),
    });

  const rowWarnings = useMemo(
    () =>
      profile.training_contents.map((row) => {
        const sum = row.instructor_hours.external + row.instructor_hours.internal;
        return Math.abs(sum - row.training_hours) > 1e-6 ? sum : null;
      }),
    [profile.training_contents]
  );

  return (
    <Card>
      <CardHeader className={CARD_HEADER_CLASS}>
        <CardTitle className="text-base">다. 훈련 교과목 프로파일</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 pt-5">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField label="과정명" htmlFor="pbl-subject-course-name">
            <Input
              id="pbl-subject-course-name"
              value={profile.course_name}
              disabled={!canEdit}
              onChange={(e) => updateProfile({ course_name: e.target.value })}
            />
          </FormField>
          <FormField label="총 훈련시간(H)" htmlFor="pbl-subject-total-hours">
            <Input
              id="pbl-subject-total-hours"
              type="number"
              min={0}
              value={profile.total_hours || ''}
              disabled={!canEdit}
              onChange={(e) => updateProfile({ total_hours: Number(e.target.value) || 0 })}
            />
          </FormField>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            label="훈련목표"
            htmlFor="pbl-subject-goals"
            hint="각 줄에 하나씩 작성 (불릿 자동 적용)"
          >
            <textarea
              id="pbl-subject-goals"
              className="min-h-[96px] w-full resize-y rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
              rows={4}
              value={profile.training_goals.join('\n')}
              disabled={!canEdit}
              onChange={(e) =>
                updateProfile({
                  training_goals: e.target.value
                    .split('\n')
                    .map((s) => s.trim())
                    .filter(Boolean),
                })
              }
            />
          </FormField>
          <FormField label="활용 AI도구" htmlFor="pbl-subject-ai-tools" hint="쉼표(,)로 구분">
            <Input
              id="pbl-subject-ai-tools"
              value={profile.ai_tools.join(', ')}
              disabled={!canEdit}
              onChange={(e) =>
                updateProfile({
                  ai_tools: e.target.value
                    .split(',')
                    .map((s) => s.trim())
                    .filter(Boolean),
                })
              }
            />
          </FormField>
          <FormField label="활용 데이터" htmlFor="pbl-subject-data">
            <Input
              id="pbl-subject-data"
              value={profile.utilized_data}
              disabled={!canEdit}
              onChange={(e) => updateProfile({ utilized_data: e.target.value })}
            />
          </FormField>
          <FormField label="분석방법" htmlFor="pbl-subject-analysis">
            <Input
              id="pbl-subject-analysis"
              value={profile.analysis_method}
              disabled={!canEdit}
              placeholder="예: LLM, RGA 등"
              onChange={(e) => updateProfile({ analysis_method: e.target.value })}
            />
          </FormField>
        </div>

        <div className="overflow-x-auto rounded border border-border">
          <Table className="min-w-[900px]">
            <TableHeader className="bg-muted/40">
              <TableRow>
                <TableHead rowSpan={2} className="w-[18%] text-center align-middle">
                  업무(단원)명
                </TableHead>
                <TableHead rowSpan={2} className="w-[30%] text-center align-middle">
                  세부 내용
                </TableHead>
                <TableHead rowSpan={2} className="w-[14%] text-center align-middle">
                  훈련시간(H)
                </TableHead>
                <TableHead colSpan={2} className="w-[28%] text-center border-b border-border/40">
                  강사 투입시간(H)
                </TableHead>
                {canEdit && (
                  <TableHead rowSpan={2} className="w-[10%] text-center align-middle">
                    작업
                  </TableHead>
                )}
              </TableRow>
              <TableRow>
                <TableHead className="text-center">외부</TableHead>
                <TableHead className="text-center">내부</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {profile.training_contents.length === 0 ? (
                <TableRow>
                  <td
                    colSpan={canEdit ? 6 : 5}
                    className="px-3 py-6 text-center text-sm text-muted-foreground"
                  >
                    교과목을 추가하세요.
                  </td>
                </TableRow>
              ) : (
                profile.training_contents.map((row, idx) => {
                  const warn = rowWarnings[idx];
                  return (
                    <SyncedTableRow
                      key={idx}
                      deps={[
                        row.unit_name,
                        row.detail,
                        row.training_hours,
                        row.instructor_hours.external,
                        row.instructor_hours.internal,
                      ]}
                    >
                      <TableTextCell
                        canEdit={canEdit}
                        value={row.unit_name}
                        onChange={(v) => updateRow(idx, { unit_name: v })}
                        ariaLabel="업무(단원)명"
                      />
                      {/* 읽기 모드는 항목별 머리기호(▪) — 한글(HWPX)·PDF·XLSX 와 동일.
                          편집 모드는 raw 값 유지(저장값 보존). */}
                      <TableTextCell
                        canEdit={canEdit}
                        value={canEdit ? row.detail : bulletizeDetails(row.detail)}
                        onChange={(v) => updateRow(idx, { detail: v })}
                        ariaLabel="세부 내용"
                      />
                      <TableNumericCell
                        canEdit={canEdit}
                        value={row.training_hours}
                        onChange={(v) => updateRow(idx, { training_hours: v })}
                        ariaLabel="훈련시간"
                      />
                      <TableNumericCell
                        canEdit={canEdit}
                        value={row.instructor_hours.external}
                        onChange={(v) =>
                          updateRow(idx, {
                            instructor_hours: { ...row.instructor_hours, external: v },
                          })
                        }
                        ariaLabel="외부 강사 투입시간"
                        tdClassName={warn !== null ? 'bg-amber-50' : undefined}
                      />
                      <TableNumericCell
                        canEdit={canEdit}
                        value={row.instructor_hours.internal}
                        onChange={(v) =>
                          updateRow(idx, {
                            instructor_hours: { ...row.instructor_hours, internal: v },
                          })
                        }
                        ariaLabel="내부 강사 투입시간"
                        tdClassName={warn !== null ? 'bg-amber-50' : undefined}
                      />
                      {canEdit && (
                        <td className="px-2 py-3 align-top text-center">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            aria-label={`교과목 ${row.unit_name || idx + 1} 삭제`}
                            onClick={() => removeRow(idx)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </td>
                      )}
                    </SyncedTableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>

        {rowWarnings.some((w) => w !== null) && (
          <div className="flex items-start gap-2 p-3 rounded border border-amber-200 bg-amber-50 text-amber-800 text-sm">
            <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
            <span>
              강사 투입시간(외부+내부)이 훈련시간과 일치하지 않는 행이 있습니다. 양식 가이드 #9.
            </span>
          </div>
        )}

        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="text-sm text-muted-foreground">
            전체시간 (자동 산출):{' '}
            <strong className="text-foreground">{profile.total_sum_hours}H</strong>
          </div>
          {canEdit && (
            <Button type="button" variant="outline" size="sm" onClick={addRow}>
              <Plus className="h-4 w-4 mr-1" /> 교과목 추가
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// ----------------------------------------------------------------------------
// 라. 시설·장비
// ----------------------------------------------------------------------------

function FacilitiesSection({
  canEdit,
  value,
  update,
}: {
  canEdit: boolean;
  value: PBLTrainingPlanType;
  update: (p: Partial<PBLTrainingPlanType>) => void;
}) {
  const { facilities } = value;
  const updateFacility = (i: number, patch: Partial<PBLFacility>) => {
    const next = facilities.map((row, idx) => (idx === i ? { ...row, ...patch } : row));
    update({ facilities: next });
  };
  const addFacility = () =>
    update({
      facilities: [
        ...facilities,
        { seq: facilities.length + 1, category: '시설', name: '', spec: '', location: '' },
      ],
    });
  const removeFacility = (i: number) =>
    update({ facilities: facilities.filter((_, idx) => idx !== i) });

  return (
    <Card>
      <CardHeader className={CARD_HEADER_CLASS}>
        <CardTitle className="text-base">라. 시설·장비</CardTitle>
        <p className="text-xs text-muted-foreground mt-1">
          * AI 도구 및 고사양 PC 등 AI훈련에 필요한 인프라는 반드시 기재
        </p>
      </CardHeader>
      <CardContent className="space-y-4 pt-5">
        <div className="overflow-x-auto rounded border border-border">
          <Table className="min-w-[720px]">
            <TableHeader className="bg-muted/40">
              <TableRow>
                <TableHead className="w-[8%] text-center">연번</TableHead>
                <TableHead className="w-[12%] text-center">구분</TableHead>
                <TableHead className="w-[28%] text-center">시설명</TableHead>
                <TableHead className="w-[26%] text-center">규격(사양)</TableHead>
                <TableHead className="w-[18%] text-center">위치</TableHead>
                {canEdit && <TableHead className="w-[8%] text-center">작업</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {facilities.length === 0 ? (
                <TableRow>
                  <td
                    colSpan={canEdit ? 6 : 5}
                    className="px-3 py-6 text-center text-sm text-muted-foreground"
                  >
                    시설 또는 장비를 추가하세요.
                  </td>
                </TableRow>
              ) : (
                facilities.map((row, idx) => (
                  <SyncedTableRow key={idx} deps={[row.name, row.spec, row.location]}>
                    <TableNumericCell
                      canEdit={canEdit}
                      value={row.seq}
                      onChange={(v) => updateFacility(idx, { seq: v })}
                      ariaLabel="연번"
                      unit=""
                    />
                    <TableInlineCell
                      canEdit={canEdit}
                      value={row.category}
                      onChange={(v) =>
                        updateFacility(idx, { category: v === '장비' ? '장비' : '시설' })
                      }
                      ariaLabel="구분 (시설/장비)"
                    />
                    <TableTextCell
                      canEdit={canEdit}
                      value={row.name}
                      onChange={(v) => updateFacility(idx, { name: v })}
                      ariaLabel="시설명"
                    />
                    <TableTextCell
                      canEdit={canEdit}
                      value={row.spec}
                      onChange={(v) => updateFacility(idx, { spec: v })}
                      ariaLabel="규격(사양)"
                    />
                    <TableInlineCell
                      canEdit={canEdit}
                      value={row.location}
                      onChange={(v) => updateFacility(idx, { location: v })}
                      ariaLabel="위치"
                    />
                    {canEdit && (
                      <td className="px-2 py-3 align-top text-center">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          aria-label={`시설·장비 ${row.name || idx + 1} 삭제`}
                          onClick={() => removeFacility(idx)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </td>
                    )}
                  </SyncedTableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
        {canEdit && (
          <div className="flex justify-end">
            <Button type="button" variant="outline" size="sm" onClick={addFacility}>
              <Plus className="h-4 w-4 mr-1" /> 시설·장비 추가
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ----------------------------------------------------------------------------
// 마. 훈련강사 (세부)
// ----------------------------------------------------------------------------

function InstructorsSection({
  canEdit,
  value,
  update,
}: {
  canEdit: boolean;
  value: PBLTrainingPlanType;
  update: (p: Partial<PBLTrainingPlanType>) => void;
}) {
  const { training_instructors: items } = value;
  const updateItem = (i: number, patch: Partial<PBLTrainingInstructor>) => {
    const next = items.map((row, idx) => (idx === i ? { ...row, ...patch } : row));
    update({ training_instructors: next });
  };
  const addItem = () =>
    update({
      training_instructors: [
        ...items,
        {
          name: '',
          internal_external: '외부',
          career_years: 0,
          work_name: '',
          detailed_training_content: [],
        },
      ],
    });
  const removeItem = (i: number) =>
    update({ training_instructors: items.filter((_, idx) => idx !== i) });

  return (
    <Card>
      <CardHeader className={CARD_HEADER_CLASS}>
        <CardTitle className="text-base">마. 훈련강사</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 pt-5">
        <div className="overflow-x-auto rounded border border-border">
          <Table className="min-w-[960px]">
            <TableHeader className="bg-muted/40">
              <TableRow>
                <TableHead className="w-[14%] text-center">성명</TableHead>
                <TableHead className="w-[10%] text-center">내·외부</TableHead>
                <TableHead className="w-[10%] text-center">업무경력</TableHead>
                <TableHead className="w-[22%] text-center">업무명</TableHead>
                <TableHead className="w-[36%] text-center">
                  세부 교육훈련 내용
                  <span className="block text-[10px] font-normal text-muted-foreground mt-0.5">
                    각 줄에 하나씩 작성 (불릿 자동 적용)
                  </span>
                </TableHead>
                {canEdit && <TableHead className="w-[8%] text-center">작업</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.length === 0 ? (
                <TableRow>
                  <td
                    colSpan={canEdit ? 6 : 5}
                    className="px-3 py-6 text-center text-sm text-muted-foreground"
                  >
                    훈련강사를 추가하세요.
                  </td>
                </TableRow>
              ) : (
                items.map((row, idx) => (
                  <SyncedTableRow
                    key={idx}
                    deps={[row.name, row.work_name, row.detailed_training_content.join(',')]}
                  >
                    <TableInlineCell
                      canEdit={canEdit}
                      value={row.name}
                      onChange={(v) => updateItem(idx, { name: v })}
                      ariaLabel="강사 성명"
                    />
                    <TableInlineCell
                      canEdit={canEdit}
                      value={row.internal_external}
                      onChange={(v) =>
                        updateItem(idx, {
                          internal_external: v === '내부' ? '내부' : '외부',
                        })
                      }
                      ariaLabel="내·외부"
                    />
                    <TableNumericCell
                      canEdit={canEdit}
                      value={row.career_years}
                      onChange={(v) => updateItem(idx, { career_years: v })}
                      ariaLabel="업무경력 (년)"
                      unit="년"
                    />
                    <TableTextCell
                      canEdit={canEdit}
                      value={row.work_name}
                      onChange={(v) => updateItem(idx, { work_name: v })}
                      ariaLabel="업무명"
                    />
                    <TableTextCell
                      canEdit={canEdit}
                      value={row.detailed_training_content.join('\n')}
                      onChange={(v) =>
                        updateItem(idx, {
                          detailed_training_content: v
                            .split('\n')
                            .map((s) => s.trim())
                            .filter(Boolean),
                        })
                      }
                      ariaLabel="세부 교육훈련 내용"
                    />
                    {canEdit && (
                      <td className="px-2 py-3 align-top text-center">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          aria-label={`강사 ${row.name || idx + 1} 삭제`}
                          onClick={() => removeItem(idx)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </td>
                    )}
                  </SyncedTableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
        {canEdit && (
          <div className="flex justify-end">
            <Button type="button" variant="outline" size="sm" onClick={addItem}>
              <Plus className="h-4 w-4 mr-1" /> 훈련강사 추가
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
