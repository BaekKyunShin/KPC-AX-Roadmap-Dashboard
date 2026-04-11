'use client';

import { useState } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import { PageHeader } from '@/components/ui/page-header';
import { cn } from '@/lib/utils';
import {
  GripVertical,
  Plus,
  Pencil,
  Check,
  X,
  Trash2,
  AlertTriangle,
} from 'lucide-react';

/* ------------------------------------------------------------------ */
/*  Types & Dummy data                                                 */
/* ------------------------------------------------------------------ */

interface Template {
  id: number;
  name: string;
  description: string;
  required: boolean;
  maxFiles: number;
  allowedExtensions: string;
  active: boolean;
}

const INITIAL_TEMPLATES: Template[] = [
  {
    id: 1,
    name: '현장 사진',
    description: '현장 방문 시 촬영한 사진',
    required: true,
    maxFiles: 5,
    allowedExtensions: 'jpg, png',
    active: true,
  },
  {
    id: 2,
    name: '회의록',
    description: '인터뷰 및 회의 기록',
    required: true,
    maxFiles: 3,
    allowedExtensions: 'pdf, docx, hwp',
    active: true,
  },
  {
    id: 3,
    name: '최종 보고서',
    description: '컨설팅 최종 보고서',
    required: true,
    maxFiles: 1,
    allowedExtensions: 'pdf, docx, hwp',
    active: true,
  },
  {
    id: 4,
    name: '출장 보고서',
    description: '출장 경비 및 활동 보고',
    required: true,
    maxFiles: 1,
    allowedExtensions: 'pdf, docx, hwp',
    active: true,
  },
  {
    id: 5,
    name: '기타 참고 자료',
    description: '추가 참고 자료 (선택 제출)',
    required: false,
    maxFiles: 10,
    allowedExtensions: '전체',
    active: false,
  },
];

/* ------------------------------------------------------------------ */
/*  Extension pill — uniform gray                                      */
/* ------------------------------------------------------------------ */

function ExtensionPill({ ext }: { ext: string }) {
  return (
    <span className="inline-flex items-center rounded bg-gray-100 px-1.5 py-0.5 text-xs font-medium text-gray-600">
      .{ext}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/*  Delete confirmation                                                */
/* ------------------------------------------------------------------ */

function DeleteConfirmation({
  templateName,
  onConfirm,
  onCancel,
}: {
  templateName: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <Card className="w-full max-w-sm mx-4 shadow-xl">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-50">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
            </div>
            <div>
              <CardTitle className="text-base">템플릿 삭제</CardTitle>
              <CardDescription>이 작업은 되돌릴 수 없습니다.</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-600 mb-4">
            <span className="font-semibold text-gray-900">{templateName}</span>{' '}
            템플릿을 삭제하시겠습니까?
          </p>
          <div className="flex items-center justify-end gap-2">
            <Button variant="outline" size="sm" onClick={onCancel}>
              취소
            </Button>
            <Button
              size="sm"
              className="bg-red-600 text-white hover:bg-red-700"
              onClick={onConfirm}
            >
              <Trash2 className="h-3.5 w-3.5" />
              삭제
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Template table                                                     */
/* ------------------------------------------------------------------ */

interface TemplateTableProps {
  templates: Template[];
  editingId: number | null;
  onEdit: (template: Template) => void;
  onDelete: (template: Template) => void;
}

function TemplateTable({
  templates,
  editingId,
  onEdit,
  onDelete,
}: TemplateTableProps) {
  const activeCount = templates.filter((t) => t.active).length;

  return (
    <Card>
      <CardHeader>
        <div>
          <CardTitle className="text-base">
            총 {templates.length}개 템플릿
            <span className="ml-2 text-sm font-normal text-gray-500">
              (활성 {activeCount}개)
            </span>
          </CardTitle>
          <CardDescription className="mt-1">
            비활성화된 템플릿은 신규 프로젝트에 적용되지 않습니다.
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-y bg-gray-50 text-left text-xs uppercase text-gray-500">
                <th className="w-10 px-3 py-3" />
                <th className="px-4 py-3 font-medium">서류명</th>
                <th className="hidden px-4 py-3 font-medium md:table-cell">
                  설명
                </th>
                <th className="px-4 py-3 font-medium text-center">
                  필수 여부
                </th>
                <th className="hidden px-4 py-3 font-medium text-center sm:table-cell">
                  최대 파일
                </th>
                <th className="hidden px-4 py-3 font-medium lg:table-cell">
                  허용 확장자
                </th>
                <th className="px-4 py-3 font-medium text-center">상태</th>
                <th className="w-24 px-4 py-3 font-medium text-center">
                  작업
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {templates.map((t) => {
                const isEditing = editingId === t.id;
                return (
                  <tr
                    key={t.id}
                    className={cn(
                      'transition-colors',
                      isEditing
                        ? 'bg-blue-50 ring-1 ring-inset ring-blue-200'
                        : 'hover:bg-gray-50',
                      !t.active && !isEditing && 'opacity-60'
                    )}
                  >
                    {/* Drag handle */}
                    <td className="px-3 py-3">
                      <div className="flex h-8 w-6 cursor-grab items-center justify-center rounded hover:bg-gray-200 active:cursor-grabbing">
                        <GripVertical className="h-5 w-5 text-gray-300 hover:text-gray-500" />
                      </div>
                    </td>

                    {/* 서류명 */}
                    <td className="px-4 py-3">
                      <span className="font-medium text-gray-900">
                        {t.name}
                      </span>
                      {/* Show description on mobile under name */}
                      <p className="mt-0.5 text-xs text-gray-500 md:hidden">
                        {t.description}
                      </p>
                    </td>

                    {/* 설명 — desktop only */}
                    <td className="hidden px-4 py-3 text-gray-600 md:table-cell">
                      {t.description}
                    </td>

                    {/* 필수 여부 */}
                    <td className="px-4 py-3 text-center">
                      {t.required ? (
                        <span className="inline-flex items-center rounded-full bg-gray-900 px-2 py-0.5 text-[11px] font-medium text-white">
                          필수
                        </span>
                      ) : (
                        <span className="inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-medium text-gray-600">
                          선택
                        </span>
                      )}
                    </td>

                    {/* 최대 파일 수 */}
                    <td className="hidden px-4 py-3 text-center text-gray-700 sm:table-cell">
                      {t.maxFiles}개
                    </td>

                    {/* 허용 확장자 */}
                    <td className="hidden px-4 py-3 lg:table-cell">
                      <div className="flex flex-wrap gap-1">
                        {t.allowedExtensions === '전체' ? (
                          <span className="text-xs text-gray-500">전체</span>
                        ) : (
                          t.allowedExtensions
                            .split(', ')
                            .map((ext) => (
                              <ExtensionPill key={ext} ext={ext} />
                            ))
                        )}
                      </div>
                    </td>

                    {/* 상태 — toggle switch */}
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-1.5">
                        <Switch
                          checked={t.active}
                          aria-label={`${t.name} 활성화 토글`}
                          onCheckedChange={() =>
                            alert(`${t.name} 상태 토글 (목업)`)
                          }
                        />
                        <span className="hidden text-xs text-gray-500 sm:inline">
                          {t.active ? '활성' : '비활성'}
                        </span>
                      </div>
                    </td>

                    {/* 수정/삭제 */}
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          className={cn(
                            'text-gray-400 hover:text-blue-600',
                            isEditing && 'text-blue-600 hover:text-blue-700'
                          )}
                          onClick={() => onEdit(t)}
                        >
                          <Pencil className="h-4 w-4" />
                          <span className="sr-only">{t.name} 수정</span>
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          className="text-gray-400 hover:text-red-500"
                          onClick={() => onDelete(t)}
                        >
                          <Trash2 className="h-4 w-4" />
                          <span className="sr-only">{t.name} 삭제</span>
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/*  Add / Edit form (overlay panel)                                    */
/* ------------------------------------------------------------------ */

interface TemplateFormProps {
  template: Template | null;
  onClose: () => void;
  onDelete: () => void;
}

function TemplateForm({ template, onClose, onDelete }: TemplateFormProps) {
  const isEdit = template !== null;
  const title = isEdit ? '템플릿 수정' : '새 템플릿 추가';

  return (
    <div className="fixed inset-0 z-40 flex items-start justify-end bg-black/30">
      {/* Backdrop click to close */}
      <div className="absolute inset-0" onClick={onClose} />

      {/* Sheet panel from right */}
      <Card className="relative z-50 h-full w-full max-w-lg overflow-y-auto rounded-none border-l border-gray-200 bg-white shadow-lg sm:rounded-l-xl">
        <CardHeader className="border-b">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">{title}</CardTitle>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="h-4 w-4" />
              <span className="sr-only">닫기</span>
            </Button>
          </div>
          {isEdit && (
            <CardDescription>
              &ldquo;{template.name}&rdquo; 템플릿을 수정합니다.
            </CardDescription>
          )}
        </CardHeader>
        <CardContent className="pt-6">
          <div className="space-y-5">
            {/* 서류명 */}
            <div className="space-y-2">
              <Label htmlFor="tpl-name">서류명</Label>
              <Input
                id="tpl-name"
                placeholder="예: 현장 사진"
                defaultValue={template?.name ?? ''}
              />
            </div>

            {/* 설명 */}
            <div className="space-y-2">
              <Label htmlFor="tpl-desc">설명</Label>
              <Textarea
                id="tpl-desc"
                placeholder="서류에 대한 간단한 설명"
                rows={3}
                defaultValue={template?.description ?? ''}
              />
            </div>

            {/* 최대 파일 수 & 허용 확장자 */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="tpl-max-files">최대 파일 수</Label>
                <Input
                  id="tpl-max-files"
                  type="number"
                  min={1}
                  defaultValue={template?.maxFiles ?? 1}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="tpl-extensions">허용 확장자</Label>
                <Input
                  id="tpl-extensions"
                  placeholder="jpg, png, pdf"
                  defaultValue={template?.allowedExtensions ?? ''}
                />
              </div>
            </div>

            {/* 필수 여부 & 활성 상태 */}
            <div className="flex flex-col gap-4 rounded-lg border border-gray-200 bg-gray-50/50 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label
                    htmlFor="tpl-required"
                    className="cursor-pointer text-sm font-medium"
                  >
                    필수 여부
                  </Label>
                  <p className="text-xs text-gray-500">
                    필수 서류는 프로젝트 완료 전 반드시 제출해야 합니다
                  </p>
                </div>
                <Checkbox
                  id="tpl-required"
                  defaultChecked={template?.required ?? true}
                />
              </div>
              <div className="border-t pt-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label
                      htmlFor="tpl-active"
                      className="cursor-pointer text-sm font-medium"
                    >
                      활성 상태
                    </Label>
                    <p className="text-xs text-gray-500">
                      비활성 템플릿은 신규 프로젝트에 적용되지 않습니다
                    </p>
                  </div>
                  <Switch
                    id="tpl-active"
                    defaultChecked={template?.active ?? true}
                  />
                </div>
              </div>
            </div>

            {/* 버튼 */}
            <div className="flex items-center gap-2 border-t pt-5">
              {isEdit && (
                <Button
                  variant="outline"
                  className="text-red-600 hover:bg-red-50 hover:text-red-700"
                  onClick={onDelete}
                >
                  <Trash2 className="h-4 w-4" />
                  삭제
                </Button>
              )}
              <div className="flex-1" />
              <Button variant="outline" onClick={onClose}>
                취소
              </Button>
              <Button
                className="bg-blue-600 text-white hover:bg-blue-700"
                onClick={onClose}
              >
                <Check className="h-4 w-4" />
                저장
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Page component                                                     */
/* ------------------------------------------------------------------ */

export default function OpsTemplatesMockup() {
  const [templates] = useState<Template[]>(INITIAL_TEMPLATES);
  const [editing, setEditing] = useState<Template | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Template | null>(null);

  function handleEdit(template: Template) {
    setEditing(template);
    setShowForm(true);
  }

  function handleAdd() {
    setEditing(null);
    setShowForm(true);
  }

  function handleClose() {
    setEditing(null);
    setShowForm(false);
  }

  function handleDeleteRequest(template: Template) {
    setDeleteTarget(template);
  }

  function handleDeleteConfirm() {
    alert(`${deleteTarget?.name} 삭제됨 (목업)`);
    setDeleteTarget(null);
    // Close edit form if the deleted template was being edited
    if (editing?.id === deleteTarget?.id) {
      handleClose();
    }
  }

  function handleDeleteFromForm() {
    if (editing) {
      setDeleteTarget(editing);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="서류 템플릿 관리"
        description="컨설턴트가 제출해야 할 서류 종류를 관리합니다."
        actions={
          <Button onClick={handleAdd}>
            <Plus className="h-4 w-4" />
            템플릿 추가
          </Button>
        }
      />

      <TemplateTable
        templates={templates}
        editingId={editing?.id ?? null}
        onEdit={handleEdit}
        onDelete={handleDeleteRequest}
      />

      {/* Sheet-style form panel */}
      {showForm && (
        <TemplateForm
          template={editing}
          onClose={handleClose}
          onDelete={handleDeleteFromForm}
        />
      )}

      {/* Delete confirmation dialog */}
      {deleteTarget && (
        <DeleteConfirmation
          templateName={deleteTarget.name}
          onConfirm={handleDeleteConfirm}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </div>
  );
}
