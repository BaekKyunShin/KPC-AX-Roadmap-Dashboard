'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { MoreVertical, Power, Copy, Trash2, FileText, Info } from 'lucide-react';
import type { SelfAssessmentTemplate } from '@/types/database';
import { setActiveTemplate, duplicateTemplate, deleteTemplate } from '../actions';
import { showSuccessToast } from '@/lib/utils/toast';
import { cn } from '@/lib/utils';
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { formatDateKR } from '@/lib/utils/date';

// =============================================================================
// Types
// =============================================================================

export interface TemplateWithUsage extends SelfAssessmentTemplate {
  usage_count: number;
}

interface TemplateListProps {
  templates: TemplateWithUsage[];
}

// =============================================================================
// Constants
// =============================================================================

const TABLE_COLUMNS = {
  version: 'w-[10%]',
  name: 'w-[28%] text-left',
  questions: 'w-[11%]',
  usage: 'w-[15%]',
  status: 'w-[11%]',
  createdAt: 'w-[18%]',
  actions: 'w-[7%]',
} as const;

const BADGE_BASE = 'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium';

// =============================================================================
// Sub-Components
// =============================================================================

function TemplateActionMenu({
  template,
  disabled,
  onSetActive,
  onDuplicate,
  onDelete,
}: {
  template: TemplateWithUsage;
  disabled: boolean;
  onSetActive: (id: string) => void;
  onDuplicate: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          aria-label="작업 메뉴"
          disabled={disabled}
        >
          <MoreVertical className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {!template.is_active && (
          <DropdownMenuItem
            onClick={() => onSetActive(template.id)}
            disabled={disabled}
          >
            <Power className="h-4 w-4" />
            활성화
          </DropdownMenuItem>
        )}
        <DropdownMenuItem
          onClick={() => onDuplicate(template.id)}
          disabled={disabled}
        >
          <Copy className="h-4 w-4" />
          복제
        </DropdownMenuItem>
        {!template.is_active && template.usage_count === 0 && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              variant="destructive"
              onClick={() => onDelete(template.id)}
              disabled={disabled}
            >
              <Trash2 className="h-4 w-4" />
              삭제
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function TemplateMobileCard({
  template,
  loading,
  isPending,
  onSetActive,
  onDuplicate,
  onDelete,
}: {
  template: TemplateWithUsage;
  loading: string | null;
  isPending: boolean;
  onSetActive: (id: string) => void;
  onDuplicate: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  const disabled = loading === template.id || isPending;

  return (
    <div className={cn(
      "border rounded-lg p-4 space-y-2",
      template.is_active && "bg-green-50"
    )}>
      <div className="min-w-0">
        <Link
          href={`/ops/templates/${template.id}`}
          className="font-medium text-blue-600 hover:text-blue-800 underline-offset-2 hover:underline transition-colors duration-150 break-keep"
        >
          {template.name}
        </Link>
      </div>

      <div className="flex items-center gap-2">
        <span className={cn(BADGE_BASE, 'bg-gray-100 text-gray-800')}>
          v{template.version}
        </span>
        {template.is_active ? (
          <span className={cn(BADGE_BASE, 'gap-1.5 bg-green-100 text-green-800')}>
            <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
            활성
          </span>
        ) : (
          <span className={cn(BADGE_BASE, 'bg-gray-100 text-gray-600')}>비활성</span>
        )}
      </div>

      <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
        <div className="text-gray-500">문항 수</div>
        <div className="text-gray-900">{template.questions?.length || 0}개</div>
        <div className="text-gray-500">사용 현황</div>
        <div className="text-gray-900">
          {template.usage_count > 0 ? (
            <span className="text-blue-600">{template.usage_count}건 사용</span>
          ) : (
            <span className="text-gray-400">미사용</span>
          )}
        </div>
        <div className="text-gray-500">생성일</div>
        <div className="text-gray-900">
          {formatDateKR(template.created_at)}
        </div>
      </div>

      <div className="flex items-center justify-between pt-2 border-t">
        <Link
          href={`/ops/templates/${template.id}`}
          className="text-sm text-blue-600 hover:text-blue-800 hover:underline underline-offset-2 transition-colors duration-150"
        >
          편집
        </Link>
        <TemplateActionMenu
          template={template}
          disabled={disabled}
          onSetActive={onSetActive}
          onDuplicate={onDuplicate}
          onDelete={onDelete}
        />
      </div>
    </div>
  );
}

export default function TemplateList({ templates }: TemplateListProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const executeAction = async (
    templateId: string,
    action: () => Promise<{ success: boolean; error?: string }>,
    options: { confirmMessage?: string; errorFallback: string; onSuccess?: () => void },
  ) => {
    if (options.confirmMessage && !confirm(options.confirmMessage)) {
      return;
    }

    setLoading(templateId);
    setError(null);

    try {
      const result = await action();
      if (result.success) {
        options.onSuccess?.();
      } else {
        setError(result.error || options.errorFallback);
      }
      startTransition(() => {
        router.refresh();
      });
    } catch {
      setError('서버와 통신 중 오류가 발생했습니다.');
    } finally {
      setLoading(null);
    }
  };

  const handleSetActive = (templateId: string) =>
    executeAction(templateId, () => setActiveTemplate(templateId), {
      confirmMessage: '이 템플릿을 활성화하시겠습니까? 기존 활성 템플릿은 비활성화됩니다.',
      errorFallback: '활성화에 실패했습니다.',
    });

  const handleDelete = (templateId: string) =>
    executeAction(templateId, () => deleteTemplate(templateId), {
      confirmMessage: '이 템플릿을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.',
      errorFallback: '삭제에 실패했습니다.',
      onSuccess: () => showSuccessToast('템플릿이 삭제되었습니다.'),
    });

  const handleDuplicate = (templateId: string) =>
    executeAction(templateId, () => duplicateTemplate(templateId), {
      errorFallback: '복제에 실패했습니다.',
    });

  if (templates.length === 0) {
    return (
      <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
        <FileText className="mx-auto h-12 w-12 text-gray-400" />
        <h3 className="mt-2 text-sm font-medium text-gray-900">템플릿 없음</h3>
        <p className="mt-1 text-sm text-gray-500">새 템플릿을 생성해주세요.</p>
      </div>
    );
  }

  const isActionDisabled = (templateId: string) => loading === templateId || isPending;

  return (
    <div className="space-y-4">
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      <div className="bg-white shadow rounded-lg overflow-x-auto">
        <div className="hidden md:block">
          <Table className="w-full">
          <TableHeader>
            <TableRow>
              <TableHead className={cn(TABLE_COLUMNS.version, 'pl-8')}>버전</TableHead>
              <TableHead className={TABLE_COLUMNS.name}>템플릿 이름</TableHead>
              <TableHead className={TABLE_COLUMNS.questions}>문항 수</TableHead>
              <TableHead className={TABLE_COLUMNS.usage}>사용 현황</TableHead>
              <TableHead className={TABLE_COLUMNS.status}>상태</TableHead>
              <TableHead className={TABLE_COLUMNS.createdAt}>생성일</TableHead>
              <TableHead className={TABLE_COLUMNS.actions}>
                <span className="sr-only">작업</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {templates.map((template) => (
              <TableRow
                key={template.id}
                className={cn('hover:bg-gray-50', template.is_active && 'bg-green-50 hover:bg-green-100/60')}
              >
                <TableCell className="pl-8">
                  <span className={cn(BADGE_BASE, 'bg-gray-100 text-gray-800')}>
                    v{template.version}
                  </span>
                </TableCell>
                <TableCell className="text-left">
                  <Link
                    href={`/ops/templates/${template.id}`}
                    className="font-medium text-blue-600 hover:text-blue-800 underline-offset-2 hover:underline transition-colors duration-150"
                  >
                    {template.name}
                  </Link>
                  {template.description && (
                    <p className="mt-0.5 text-xs text-gray-400 truncate">
                      {template.description}
                    </p>
                  )}
                </TableCell>
                <TableCell className="text-gray-500">{template.questions?.length || 0}개</TableCell>
                <TableCell>
                  {template.usage_count > 0 ? (
                    <span className="text-blue-600">{template.usage_count}건 사용</span>
                  ) : (
                    <span className="text-gray-400">미사용</span>
                  )}
                </TableCell>
                <TableCell>
                  {template.is_active ? (
                    <span className={cn(BADGE_BASE, 'gap-1.5 bg-green-100 text-green-800')}>
                      <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
                      활성
                    </span>
                  ) : (
                    <span className={cn(BADGE_BASE, 'bg-gray-100 text-gray-600')}>비활성</span>
                  )}
                </TableCell>
                <TableCell className="text-gray-500">
                  {formatDateKR(template.created_at)}
                </TableCell>
                <TableCell>
                  <div className="flex justify-end mr-4">
                    <TemplateActionMenu
                      template={template}
                      disabled={isActionDisabled(template.id)}
                      onSetActive={handleSetActive}
                      onDuplicate={handleDuplicate}
                      onDelete={handleDelete}
                    />
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
          </Table>
        </div>

        {/* 모바일: 카드 뷰 */}
        <div className="md:hidden space-y-3 p-4">
          {templates.map((template) => (
            <TemplateMobileCard
              key={template.id}
              template={template}
              loading={loading}
              isPending={isPending}
              onSetActive={handleSetActive}
              onDuplicate={handleDuplicate}
              onDelete={handleDelete}
            />
          ))}
        </div>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
        <div className="flex">
          <div className="flex-shrink-0">
            <Info className="h-5 w-5 text-blue-400" />
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-blue-800">템플릿 안내</h3>
            <div className="mt-2 text-sm text-blue-700">
              <ul className="list-disc list-inside space-y-1">
                <li>활성화된 템플릿이 새로운 자가진단에 사용됩니다.</li>
                <li>사용 중인 템플릿의 질문을 수정하면 새 버전으로 저장되며, 이름·설명만 수정하면 현재 버전이 업데이트됩니다.</li>
                <li>기존 자가진단은 작성 당시의 템플릿 버전을 유지합니다.</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
