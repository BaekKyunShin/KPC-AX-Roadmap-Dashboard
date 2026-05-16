'use client';

import {
  Building2,
  Factory,
  Users,
  User,
  Mail,
  Phone,
  MapPin,
  MessageSquareText,
  StickyNote,
  Edit3,
  Save,
  X,
  Loader2,
  Briefcase,
  FileText,
  Hash,
  Building,
  type LucideIcon,
} from 'lucide-react';
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useBeforeUnloadGuard } from '@/hooks/useBeforeUnloadGuard';
import {
  COMPANY_SIZE_VALUES,
  COMPANY_SIZE_LABELS,
  type CompanySizeValue,
} from '@/lib/constants/company-size';
import { PROJECT_INDUSTRIES } from '@/lib/constants/industry';
import type { UpdateProjectByConsultantInput } from '@/lib/schemas/project-consultant-edit';

import { updateProjectCompanyInfo } from '../actions';

interface CompanyInfoEditableCardProps {
  projectId: string;
  initial: UpdateProjectByConsultantInput;
  /** 서버에서 조회한 projects.updated_at — optimistic lock 비교용 */
  updatedAt: string;
}

type Mode = 'view' | 'edit';

// ─── 표시용 row ────────────────────────────────────────────────────────────

function InfoRow({
  icon: Icon,
  label,
  value,
}: {
  icon: LucideIcon;
  label: string;
  value: string | null | undefined;
}) {
  const display = value && value.trim() ? value : '—';
  return (
    <div className="flex items-start gap-3 py-2">
      <Icon className="h-4 w-4 mt-1 shrink-0 text-gray-400" />
      <dt className="w-20 shrink-0 text-sm text-gray-500">{label}</dt>
      <dd
        className={`text-base font-medium ${display === '—' ? 'text-gray-400' : 'text-gray-900'} break-words flex-1`}
      >
        {display}
      </dd>
    </div>
  );
}

// ─── 편집용 row ────────────────────────────────────────────────────────────

function EditRow({
  icon: Icon,
  label,
  required,
  children,
  error,
}: {
  icon: LucideIcon;
  label: string;
  required?: boolean;
  children: React.ReactNode;
  error?: string;
}) {
  return (
    <div className="flex items-start gap-3 py-2">
      <Icon className="h-4 w-4 mt-2.5 shrink-0 text-gray-400" />
      <label className="w-20 shrink-0 text-sm text-gray-500 mt-2.5">
        {label}
        {required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      <div className="flex-1 min-w-0">
        {children}
        {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
      </div>
    </div>
  );
}

// ─── 메인 컴포넌트 ─────────────────────────────────────────────────────────

export function CompanyInfoEditableCard({
  projectId,
  initial,
  updatedAt,
}: CompanyInfoEditableCardProps) {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>('view');
  const [draft, setDraft] = useState<UpdateProjectByConsultantInput>(initial);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [isPending, startTransition] = useTransition();

  const isDirty =
    mode === 'edit' && JSON.stringify(draft) !== JSON.stringify(initial);

  useBeforeUnloadGuard(isDirty);

  const setField = <K extends keyof UpdateProjectByConsultantInput>(
    key: K,
    value: UpdateProjectByConsultantInput[K],
  ) => {
    setDraft((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => ({ ...prev, [key]: '' }));
  };

  function validateClient(): boolean {
    const nextErrors: Record<string, string> = {};
    if (!draft.company_name.trim()) nextErrors.company_name = '회사명을 입력하세요.';
    if (!draft.industry.trim()) nextErrors.industry = '업종을 선택하세요.';
    if (!draft.contact_name || draft.contact_name.trim().length < 2)
      nextErrors.contact_name = '담당자명을 2자 이상 입력하세요.';
    if (!draft.contact_email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(draft.contact_email))
      nextErrors.contact_email = '유효한 이메일을 입력하세요.';
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  function handleEdit() {
    setDraft(initial);
    setErrors({});
    setMode('edit');
  }

  function handleCancel() {
    if (isDirty) {
      setShowCancelDialog(true);
      return;
    }
    setMode('view');
  }

  function confirmCancel() {
    setShowCancelDialog(false);
    setDraft(initial);
    setErrors({});
    setMode('view');
  }

  function handleSave() {
    if (!validateClient()) return;
    startTransition(async () => {
      const result = await updateProjectCompanyInfo(projectId, draft, updatedAt);
      if (result.success) {
        toast.success('기업 정보가 저장되었습니다.');
        setMode('view');
        setErrors({});
        router.refresh();
      } else {
        toast.error(result.error ?? '저장에 실패했습니다.');
      }
    });
  }

  // ─── view 모드 ───────────────────────────────────────────────────────────
  if (mode === 'view') {
    return (
      <div className="lg:col-span-2 bg-white shadow rounded-lg p-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold text-gray-900">기업 정보</h2>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleEdit}
            aria-label="기업 정보 수정"
            data-testid="company-info-edit-button"
          >
            <Edit3 className="h-3.5 w-3.5 mr-1" />
            수정
          </Button>
        </div>

        <dl>
          <InfoRow icon={Building2} label="회사명" value={initial.company_name} />
          <InfoRow icon={Factory} label="업종" value={initial.industry} />
          {initial.sub_industries && initial.sub_industries.length > 0 && (
            <InfoRow
              icon={Factory}
              label="세부 업종"
              value={initial.sub_industries.join(' · ')}
            />
          )}
          <InfoRow
            icon={Users}
            label="규모"
            value={COMPANY_SIZE_LABELS[initial.company_size as CompanySizeValue] ?? initial.company_size}
          />
          <InfoRow icon={MapPin} label="주소" value={initial.company_address} />
        </dl>

        <hr className="my-2 border-gray-100" />

        <dl>
          <InfoRow icon={User} label="담당자" value={initial.contact_name} />
          <InfoRow icon={Briefcase} label="직위" value={initial.contact_position} />
          <InfoRow icon={Mail} label="연락처" value={initial.contact_email} />
          <InfoRow icon={Phone} label="전화" value={initial.contact_phone} />
        </dl>

        {(initial.business_reg_no ||
          initial.industry_code ||
          initial.training_address ||
          initial.jurisdiction_branch) && (
          <>
            <hr className="my-2 border-gray-100" />
            <dl>
              <InfoRow icon={FileText} label="사업장관리" value={initial.business_reg_no} />
              <InfoRow icon={Hash} label="업종 코드" value={initial.industry_code} />
              <InfoRow icon={MapPin} label="훈련 주소" value={initial.training_address} />
              <InfoRow icon={Building} label="관할 지부" value={initial.jurisdiction_branch} />
            </dl>
          </>
        )}

        {initial.customer_comment && (
          <div className="mt-3 pt-3 border-t border-gray-100">
            <div className="flex items-center gap-2 mb-1.5">
              <MessageSquareText className="h-3.5 w-3.5 text-gray-400" />
              <span className="text-xs font-medium text-gray-500">고객 요청사항</span>
            </div>
            <p className="text-sm text-gray-700 whitespace-pre-wrap rounded-md bg-gray-50 px-3 py-2">
              {initial.customer_comment}
            </p>
          </div>
        )}

        <div className="mt-3 pt-3 border-t border-gray-100">
          <div className="flex items-center gap-2 mb-1.5">
            <StickyNote className="h-3.5 w-3.5 text-amber-500" />
            <span className="text-xs font-medium text-gray-500">
              내부 메모 (훈련코치 전용)
            </span>
          </div>
          {initial.consultant_internal_note ? (
            <p className="text-sm text-gray-700 whitespace-pre-wrap rounded-md bg-amber-50 px-3 py-2">
              {initial.consultant_internal_note}
            </p>
          ) : (
            <p className="text-sm text-gray-400 italic px-3 py-2">
              아직 메모가 없습니다. 수정 버튼을 눌러 메모를 추가하세요.
            </p>
          )}
        </div>
      </div>
    );
  }

  // ─── edit 모드 ───────────────────────────────────────────────────────────
  return (
    <div
      className="lg:col-span-2 bg-white shadow rounded-lg p-6 ring-2 ring-blue-200"
      data-testid="company-info-edit-form"
    >
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-lg font-semibold text-gray-900">
          기업 정보 <span className="text-sm font-normal text-blue-600">(수정 중)</span>
        </h2>
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleCancel}
            disabled={isPending}
            aria-label="취소"
          >
            <X className="h-3.5 w-3.5 mr-1" />
            취소
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={handleSave}
            disabled={isPending}
            aria-label="저장"
            data-testid="company-info-save-button"
          >
            {isPending ? (
              <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
            ) : (
              <Save className="h-3.5 w-3.5 mr-1" />
            )}
            저장
          </Button>
        </div>
      </div>

      <dl>
        <EditRow icon={Building2} label="회사명" required error={errors.company_name}>
          <Input
            value={draft.company_name}
            onChange={(e) => setField('company_name', e.target.value)}
            disabled={isPending}
            maxLength={100}
            aria-label="회사명"
          />
        </EditRow>

        <EditRow icon={Factory} label="업종" required error={errors.industry}>
          <Select
            value={draft.industry}
            onValueChange={(v) => setField('industry', v)}
            disabled={isPending}
          >
            <SelectTrigger aria-label="업종">
              <SelectValue placeholder="업종 선택" />
            </SelectTrigger>
            <SelectContent>
              {PROJECT_INDUSTRIES.map((opt) => (
                <SelectItem key={opt} value={opt}>
                  {opt}
                </SelectItem>
              ))}
              {/* 기존 값이 옵션 목록에 없으면 보존 */}
              {!PROJECT_INDUSTRIES.includes(draft.industry as never) && draft.industry && (
                <SelectItem value={draft.industry}>{draft.industry}</SelectItem>
              )}
            </SelectContent>
          </Select>
        </EditRow>

        <EditRow icon={Users} label="규모" required error={errors.company_size}>
          <Select
            value={draft.company_size}
            onValueChange={(v) => setField('company_size', v as CompanySizeValue)}
            disabled={isPending}
          >
            <SelectTrigger aria-label="기업 규모">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {COMPANY_SIZE_VALUES.map((opt) => (
                <SelectItem key={opt} value={opt}>
                  {COMPANY_SIZE_LABELS[opt]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </EditRow>

        <EditRow icon={MapPin} label="주소">
          <Input
            value={draft.company_address ?? ''}
            onChange={(e) => setField('company_address', e.target.value || null)}
            disabled={isPending}
            maxLength={300}
            placeholder="(선택) 도로명 주소"
            aria-label="회사 주소"
          />
        </EditRow>
      </dl>

      <hr className="my-2 border-gray-100" />

      <dl>
        <EditRow icon={User} label="담당자" required error={errors.contact_name}>
          <Input
            value={draft.contact_name}
            onChange={(e) => setField('contact_name', e.target.value)}
            disabled={isPending}
            maxLength={50}
            aria-label="담당자명"
          />
        </EditRow>

        <EditRow icon={Briefcase} label="직위">
          <Input
            value={draft.contact_position ?? ''}
            onChange={(e) => setField('contact_position', e.target.value || null)}
            disabled={isPending}
            maxLength={50}
            placeholder="(선택) 예: 팀장, 부장"
            aria-label="담당자 직위"
          />
        </EditRow>

        <EditRow icon={Mail} label="이메일" required error={errors.contact_email}>
          <Input
            type="email"
            value={draft.contact_email}
            onChange={(e) => setField('contact_email', e.target.value)}
            disabled={isPending}
            aria-label="담당자 이메일"
          />
        </EditRow>

        <EditRow icon={Phone} label="전화">
          <Input
            value={draft.contact_phone ?? ''}
            onChange={(e) => setField('contact_phone', e.target.value || null)}
            disabled={isPending}
            maxLength={30}
            placeholder="(선택) 010-0000-0000"
            aria-label="담당자 전화"
          />
        </EditRow>
      </dl>

      <hr className="my-2 border-gray-100" />

      <p className="text-xs text-gray-500 mb-1">
        PBL 행정 정보 (변경 시 운영관리자에게 자동으로 알림 표시됩니다)
      </p>
      <dl>
        <EditRow icon={FileText} label="사업장관리">
          <Input
            value={draft.business_reg_no ?? ''}
            onChange={(e) => setField('business_reg_no', e.target.value || null)}
            disabled={isPending}
            maxLength={50}
            placeholder="(선택) 사업장관리번호"
            aria-label="사업장관리번호"
          />
        </EditRow>

        <EditRow icon={Hash} label="업종 코드">
          <Input
            value={draft.industry_code ?? ''}
            onChange={(e) => setField('industry_code', e.target.value || null)}
            disabled={isPending}
            maxLength={20}
            placeholder="(선택)"
            aria-label="업종 코드"
          />
        </EditRow>

        <EditRow icon={MapPin} label="훈련 주소">
          <Input
            value={draft.training_address ?? ''}
            onChange={(e) => setField('training_address', e.target.value || null)}
            disabled={isPending}
            maxLength={300}
            placeholder="(선택)"
            aria-label="훈련 실시 주소"
          />
        </EditRow>

        <EditRow icon={Building} label="관할 지부">
          <Input
            value={draft.jurisdiction_branch ?? ''}
            onChange={(e) => setField('jurisdiction_branch', e.target.value || null)}
            disabled={isPending}
            maxLength={100}
            placeholder="(선택)"
            aria-label="관할 지부"
          />
        </EditRow>
      </dl>

      <hr className="my-3 border-gray-100" />

      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <MessageSquareText className="h-3.5 w-3.5 text-gray-400" />
          <label
            htmlFor="customer_comment"
            className="text-xs font-medium text-gray-500"
          >
            고객 요청사항
          </label>
        </div>
        <Textarea
          id="customer_comment"
          value={draft.customer_comment ?? ''}
          onChange={(e) => setField('customer_comment', e.target.value || null)}
          disabled={isPending}
          maxLength={2000}
          rows={3}
          placeholder="(선택)"
          aria-label="고객 요청사항"
        />
      </div>

      <div className="space-y-2 mt-3">
        <div className="flex items-center gap-2">
          <StickyNote className="h-3.5 w-3.5 text-amber-500" />
          <label
            htmlFor="consultant_internal_note"
            className="text-xs font-medium text-gray-500"
          >
            내부 메모 (훈련코치 전용 · 컨설팅 진행 시 참고용)
          </label>
        </div>
        <Textarea
          id="consultant_internal_note"
          value={draft.consultant_internal_note ?? ''}
          onChange={(e) =>
            setField('consultant_internal_note', e.target.value || null)
          }
          disabled={isPending}
          maxLength={4000}
          rows={4}
          placeholder="의사결정자 정보, 진행 시 주의사항 등 (최대 4000자)"
          aria-label="컨설턴트 내부 메모"
          className="bg-amber-50/30"
        />
      </div>

      <AlertDialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>변경사항을 취소하시겠습니까?</AlertDialogTitle>
            <AlertDialogDescription>
              저장하지 않은 변경사항이 사라집니다. 계속하시겠습니까?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>계속 수정</AlertDialogCancel>
            <AlertDialogAction onClick={confirmCancel}>취소하기</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
