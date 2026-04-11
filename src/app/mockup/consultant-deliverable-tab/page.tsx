'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/ui/page-header';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  Check,
  Upload,
  X,
  FileText,
  Image as ImageIcon,
  Download,
  Clock,
  CircleCheck,
  Circle,
  Minus,
} from 'lucide-react';
import { cn } from '@/lib/utils';

/* ------------------------------------------------------------------ */
/*  Mock Data                                                          */
/* ------------------------------------------------------------------ */

interface MockFile {
  name: string;
  size: string;
  uploadedAt: string;
}

interface DeliverableItem {
  id: string;
  label: string;
  description: string;
  required: boolean;
  status: 'UPLOADED' | 'PENDING' | 'SKIPPED';
  maxFiles: number;
  acceptedFormats: string;
  allowedExtensions: string[];
  maxSizeMb: number;
  files: MockFile[];
  type: 'image' | 'document';
}

const MOCK_DELIVERABLES_PENDING: DeliverableItem[] = [
  {
    id: '1',
    label: '현장 사진',
    description: '현장 방문 시 촬영한 사진을 업로드하세요',
    required: true,
    status: 'UPLOADED',
    maxFiles: 5,
    acceptedFormats: 'JPG, PNG (최대 10MB)',
    allowedExtensions: ['JPG', 'PNG'],
    maxSizeMb: 10,
    files: [
      { name: '현장사진_01.jpg', size: '2.4 MB', uploadedAt: '2026-04-08 09:30' },
      { name: '현장사진_02.png', size: '3.1 MB', uploadedAt: '2026-04-08 09:32' },
    ],
    type: 'image',
  },
  {
    id: '2',
    label: '회의록',
    description: '기업 담당자와의 회의 내용을 정리한 문서를 업로드하세요',
    required: true,
    status: 'UPLOADED',
    maxFiles: 3,
    acceptedFormats: 'PDF, DOCX, HWP (최대 20MB)',
    allowedExtensions: ['PDF', 'DOCX', 'HWP'],
    maxSizeMb: 20,
    files: [
      { name: '회의록_20260408.pdf', size: '1.8 MB', uploadedAt: '2026-04-09 14:15' },
    ],
    type: 'document',
  },
  {
    id: '3',
    label: '최종 보고서',
    description: '컨설팅 결과를 종합한 최종 보고서를 업로드하세요',
    required: true,
    status: 'PENDING',
    maxFiles: 1,
    acceptedFormats: 'PDF, DOCX, HWP (최대 20MB)',
    allowedExtensions: ['PDF', 'DOCX', 'HWP'],
    maxSizeMb: 20,
    files: [],
    type: 'document',
  },
  {
    id: '4',
    label: '출장 보고서',
    description: '출장 일정, 내용, 결과를 기록한 보고서를 업로드하세요',
    required: true,
    status: 'PENDING',
    maxFiles: 1,
    acceptedFormats: 'PDF, DOCX, HWP (최대 20MB)',
    allowedExtensions: ['PDF', 'DOCX', 'HWP'],
    maxSizeMb: 20,
    files: [],
    type: 'document',
  },
  {
    id: '5',
    label: '기타 참고 자료',
    description: '추가 참고 자료가 있으면 업로드하세요 (선택사항)',
    required: false,
    status: 'SKIPPED',
    maxFiles: 5,
    acceptedFormats: 'PDF, DOCX, HWP, JPG, PNG, XLSX (최대 20MB)',
    allowedExtensions: ['PDF', 'DOCX', 'HWP', 'JPG', 'PNG', 'XLSX'],
    maxSizeMb: 20,
    files: [],
    type: 'document',
  },
];

const MOCK_DELIVERABLES_COMPLETED: DeliverableItem[] = [
  {
    id: '1',
    label: '현장 사진',
    description: '현장 방문 시 촬영한 사진을 업로드하세요',
    required: true,
    status: 'UPLOADED',
    maxFiles: 5,
    acceptedFormats: 'JPG, PNG (최대 10MB)',
    allowedExtensions: ['JPG', 'PNG'],
    maxSizeMb: 10,
    files: [
      { name: '현장사진_01.jpg', size: '2.4 MB', uploadedAt: '2026-04-08 09:30' },
      { name: '현장사진_02.png', size: '3.1 MB', uploadedAt: '2026-04-08 09:32' },
    ],
    type: 'image',
  },
  {
    id: '2',
    label: '회의록',
    description: '기업 담당자와의 회의 내용을 정리한 문서를 업로드하세요',
    required: true,
    status: 'UPLOADED',
    maxFiles: 3,
    acceptedFormats: 'PDF, DOCX, HWP (최대 20MB)',
    allowedExtensions: ['PDF', 'DOCX', 'HWP'],
    maxSizeMb: 20,
    files: [
      { name: '회의록_20260408.pdf', size: '1.8 MB', uploadedAt: '2026-04-09 14:15' },
    ],
    type: 'document',
  },
  {
    id: '3',
    label: '최종 보고서',
    description: '컨설팅 결과를 종합한 최종 보고서를 업로드하세요',
    required: true,
    status: 'UPLOADED',
    maxFiles: 1,
    acceptedFormats: 'PDF, DOCX, HWP (최대 20MB)',
    allowedExtensions: ['PDF', 'DOCX', 'HWP'],
    maxSizeMb: 20,
    files: [
      { name: '최종보고서_v3.pdf', size: '4.2 MB', uploadedAt: '2026-04-10 16:45' },
    ],
    type: 'document',
  },
  {
    id: '4',
    label: '출장 보고서',
    description: '출장 일정, 내용, 결과를 기록한 보고서를 업로드하세요',
    required: true,
    status: 'UPLOADED',
    maxFiles: 1,
    acceptedFormats: 'PDF, DOCX, HWP (최대 20MB)',
    allowedExtensions: ['PDF', 'DOCX', 'HWP'],
    maxSizeMb: 20,
    files: [
      { name: '출장보고서_202604.hwp', size: '2.1 MB', uploadedAt: '2026-04-11 10:20' },
    ],
    type: 'document',
  },
  {
    id: '5',
    label: '기타 참고 자료',
    description: '추가 참고 자료가 있으면 업로드하세요 (선택사항)',
    required: false,
    status: 'SKIPPED',
    maxFiles: 5,
    acceptedFormats: 'PDF, DOCX, HWP, JPG, PNG, XLSX (최대 20MB)',
    allowedExtensions: ['PDF', 'DOCX', 'HWP', 'JPG', 'PNG', 'XLSX'],
    maxSizeMb: 20,
    files: [],
    type: 'document',
  },
];

/* ------------------------------------------------------------------ */
/*  Utility                                                            */
/* ------------------------------------------------------------------ */

function getFileIcon(fileName: string, size: 'sm' | 'md' = 'md') {
  const ext = fileName.split('.').pop()?.toLowerCase() ?? '';
  const cls = size === 'sm' ? 'h-3.5 w-3.5 text-gray-400' : 'h-4 w-4 text-gray-400';
  if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(ext)) {
    return <ImageIcon className={cls} />;
  }
  return <FileText className={cls} />;
}

/* ------------------------------------------------------------------ */
/*  Progress Ring                                                      */
/* ------------------------------------------------------------------ */

function ProgressRing({
  completed,
  total,
}: {
  completed: number;
  total: number;
}) {
  const percentage = total > 0 ? (completed / total) * 100 : 0;
  const radius = 40;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width="100" height="100" className="-rotate-90">
        {/* Track */}
        <circle
          cx="50"
          cy="50"
          r={radius}
          fill="none"
          strokeWidth="8"
          className="stroke-gray-200"
        />
        {/* Fill */}
        <circle
          cx="50"
          cy="50"
          r={radius}
          fill="none"
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          className="stroke-blue-600 transition-all duration-500"
        />
      </svg>
      <div className="absolute flex flex-col items-center">
        <span className="text-lg font-bold text-gray-900">
          {completed}/{total}
        </span>
        <span className="text-[10px] text-gray-500">완료</span>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Progress Summary Card                                              */
/* ------------------------------------------------------------------ */

function ProgressSummary({
  items,
  isCompleted,
}: {
  items: DeliverableItem[];
  isCompleted: boolean;
}) {
  const requiredItems = items.filter((i) => i.required);
  const uploaded = requiredItems.filter((i) => i.status === 'UPLOADED').length;
  const pending = requiredItems.filter((i) => i.status === 'PENDING').length;
  const skipped = items.filter((i) => i.status === 'SKIPPED').length;
  const total = requiredItems.length;

  return (
    <Card>
      <CardContent className="pt-0">
        <div className="flex flex-col items-center gap-6 sm:flex-row">
          {/* Progress Ring */}
          <div className="flex-shrink-0">
            <ProgressRing completed={uploaded} total={total} />
          </div>

          {/* Progress Details */}
          <div className="flex-1 text-center sm:text-left">
            <h3 className="text-base font-semibold text-gray-900">
              {isCompleted ? '모든 필수 서류 제출 완료' : `필수 서류 ${uploaded}/${total} 완료`}
            </h3>
            <p className="mt-1 text-sm text-gray-600">
              {isCompleted
                ? '운영관리자 확인 후 프로젝트가 완료 처리됩니다.'
                : '모든 필수 서류를 업로드한 후 최종 제출할 수 있습니다.'}
            </p>

            {/* Stats row */}
            <div className="mt-3 flex flex-wrap justify-center gap-4 sm:justify-start">
              <div className="flex items-center gap-1.5">
                <div className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                <span className="text-sm text-gray-600">
                  완료 <span className="font-medium text-gray-900">{uploaded}건</span>
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <Circle className="h-3 w-3 text-gray-400" />
                <span className="text-sm text-gray-500">
                  미완료 <span className="font-medium">{pending}건</span>
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <Minus className="h-3 w-3 text-gray-400" />
                <span className="text-sm text-gray-400">
                  건너뜀 <span className="font-medium">{skipped}건</span>
                </span>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/*  Sub-components                                                     */
/* ------------------------------------------------------------------ */

/** Compact file chip for documents */
function FileChip({
  file,
  readOnly,
}: {
  file: MockFile;
  readOnly: boolean;
}) {
  return (
    <div className="inline-flex items-center gap-1.5 rounded-md border border-gray-200 bg-gray-50 px-2.5 py-1.5 text-sm text-gray-700">
      {getFileIcon(file.name, 'sm')}
      <span className="max-w-[160px] truncate">{file.name}</span>
      <span className="text-xs text-gray-400">({file.size})</span>
      {readOnly ? (
        <button
          type="button"
          className="ml-0.5 text-gray-400 hover:text-blue-600"
          aria-label={`${file.name} 다운로드`}
        >
          <Download className="h-3 w-3" />
        </button>
      ) : (
        <button
          type="button"
          className="ml-0.5 text-gray-300 hover:text-gray-500"
          aria-label={`${file.name} 삭제`}
        >
          <X className="h-3 w-3" />
        </button>
      )}
    </div>
  );
}

/** Compact photo thumbnail for images */
function PhotoThumbnail({
  file,
  readOnly,
}: {
  file: MockFile;
  readOnly: boolean;
}) {
  return (
    <div className="group relative rounded-md border border-gray-200 bg-gray-100 p-2">
      {/* Placeholder thumbnail area */}
      <div className="flex h-16 items-center justify-center rounded bg-gray-50">
        <ImageIcon className="h-6 w-6 text-gray-300" />
      </div>
      <div className="mt-1.5">
        <p className="max-w-full truncate text-xs text-gray-600">{file.name}</p>
        <p className="text-[10px] text-gray-400">{file.size}</p>
      </div>
      {/* Action button overlay */}
      <button
        type="button"
        className="absolute top-1 right-1 rounded-full bg-white p-0.5 text-gray-300 opacity-0 shadow-sm transition-opacity hover:text-gray-500 group-hover:opacity-100"
        aria-label={readOnly ? `${file.name} 다운로드` : `${file.name} 삭제`}
      >
        {readOnly ? <Download className="h-3 w-3" /> : <X className="h-3 w-3" />}
      </button>
    </div>
  );
}

function UploadDropZone({
  acceptedFormats,
  maxSizeMb,
}: {
  acceptedFormats: string;
  maxSizeMb: number;
}) {
  return (
    <div className="group cursor-pointer rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 px-6 py-8 text-center transition-colors hover:border-gray-400 hover:bg-gray-100">
      <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-gray-100 text-gray-400 transition-colors group-hover:bg-gray-200">
        <Upload className="h-5 w-5" />
      </div>
      <p className="mt-2.5 text-sm text-gray-600">
        파일을 여기에 드래그하거나{' '}
        <span className="font-medium text-blue-600 underline-offset-2 hover:underline">
          클릭하여 선택
        </span>
        하세요
      </p>
      <p className="mt-1 text-xs text-gray-400">
        {acceptedFormats} &middot; 최대 {maxSizeMb}MB
      </p>
    </div>
  );
}

function DeliverableCard({
  item,
  stepNumber,
  readOnly,
}: {
  item: DeliverableItem;
  stepNumber: number;
  readOnly: boolean;
}) {
  const isUploaded = item.status === 'UPLOADED';
  const isPending = item.status === 'PENDING';
  const isSkipped = item.status === 'SKIPPED';

  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-lg border bg-white transition-colors',
        isUploaded && 'border-gray-200 border-l-[3px] border-l-emerald-500',
        isPending && 'border-gray-200 border-l-[3px] border-l-gray-200',
        isSkipped && 'border-gray-200 border-l-[3px] border-l-gray-200 bg-gray-50',
      )}
    >
      <div className="py-4 pr-4 pl-5">
        {/* Header row */}
        <div className="flex items-start gap-3">
          {/* Step number */}
          <div
            className={cn(
              'flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full text-xs font-medium',
              isUploaded && 'bg-emerald-500 text-white',
              isPending && 'border border-gray-300 text-gray-400',
              isSkipped && 'bg-gray-200 text-gray-400',
            )}
          >
            {isUploaded ? <Check className="h-3.5 w-3.5" /> : stepNumber}
          </div>

          <div className="min-w-0 flex-1">
            {/* Title row */}
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="font-semibold text-gray-900">{item.label}</span>
              {item.required ? (
                <span className="rounded bg-gray-900 px-1.5 py-0.5 text-[11px] font-medium text-white">
                  필수
                </span>
              ) : (
                <span className="rounded bg-gray-100 px-1.5 py-0.5 text-[11px] font-medium text-gray-500">
                  선택
                </span>
              )}

              {/* Status indicator */}
              {isUploaded && (
                <span className="ml-1 inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5">
                  <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500" />
                  <span className="text-xs font-medium text-emerald-700">완료</span>
                </span>
              )}
              {isPending && (
                <span className="ml-1 inline-flex items-center gap-1 text-gray-500">
                  <Circle className="h-3 w-3" />
                  <span className="text-xs">미완료</span>
                </span>
              )}
              {isSkipped && (
                <span className="ml-1 inline-flex items-center gap-1 text-gray-400">
                  <Minus className="h-3 w-3" />
                  <span className="text-xs">건너뜀</span>
                </span>
              )}
            </div>

            {/* Description */}
            <p className="mt-1 text-xs text-gray-400">{item.description}</p>

            {/* Allowed extensions — plain text */}
            {!readOnly && !isSkipped && (
              <p className="mt-1.5 text-xs text-gray-500">
                {item.allowedExtensions.map((ext) => `.${ext.toLowerCase()}`).join(', ')}
              </p>
            )}

            {/* Uploaded files — compact layout */}
            {isUploaded && item.files.length > 0 && (
              <div className="mt-3">
                {item.type === 'image' ? (
                  /* Photo grid */
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                    {item.files.map((file) => (
                      <PhotoThumbnail
                        key={file.name}
                        file={file}
                        readOnly={readOnly}
                      />
                    ))}
                  </div>
                ) : (
                  /* Document chips */
                  <div className="flex flex-wrap gap-2">
                    {item.files.map((file) => (
                      <FileChip
                        key={file.name}
                        file={file}
                        readOnly={readOnly}
                      />
                    ))}
                  </div>
                )}
                {!readOnly && item.files.length < item.maxFiles && (
                  <Button variant="outline" size="sm" className="mt-2 text-gray-500">
                    <Upload className="h-3.5 w-3.5" />
                    파일 추가 ({item.files.length}/{item.maxFiles})
                  </Button>
                )}
              </div>
            )}

            {/* Pending upload area */}
            {isPending && !readOnly && (
              <div className="mt-3">
                <UploadDropZone
                  acceptedFormats={item.acceptedFormats}
                  maxSizeMb={item.maxSizeMb}
                />
              </div>
            )}

            {/* Skipped - show upload button */}
            {isSkipped && !readOnly && (
              <div className="mt-3">
                <Button variant="outline" size="sm" className="text-gray-500">
                  <Upload className="h-3.5 w-3.5" />
                  업로드
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Banners                                                            */
/* ------------------------------------------------------------------ */

function PendingBanner() {
  const completedRequired = 2;
  const totalRequired = 4;
  const missingItems = ['최종 보고서', '출장 보고서'];

  return (
    <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
      <div className="flex items-start gap-3">
        <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-amber-100">
          <Circle className="h-3.5 w-3.5 text-amber-600" />
        </div>
        <div className="flex-1">
          <p className="text-sm font-semibold text-amber-800">
            제출 대기 중
          </p>
          <p className="mt-0.5 text-sm text-amber-800/70">
            필수 서류 {completedRequired}/{totalRequired} 완료 &mdash;{' '}
            <span className="font-medium text-amber-800">{missingItems.join(', ')}</span>
            을(를) 업로드하면 제출할 수 있습니다.
          </p>
        </div>
      </div>
    </div>
  );
}

function CompletedBanner() {
  return (
    <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="flex flex-1 items-start gap-3">
          <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-emerald-100">
            <Check className="h-4 w-4 text-emerald-600" />
          </div>
          <div>
            <p className="text-sm font-semibold text-emerald-800">
              제출이 완료되었습니다
            </p>
            <div className="mt-1 flex items-center gap-1.5 text-sm text-emerald-800/70">
              <Clock className="h-3.5 w-3.5" />
              <span>2026-04-11 14:30 제출</span>
            </div>
            <p className="mt-1 text-sm text-emerald-800/70">
              운영관리자 확인 후 프로젝트가 완료 처리됩니다. 수고하셨습니다!
            </p>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="w-fit border-emerald-200 text-emerald-700 hover:bg-emerald-100"
        >
          제출 철회
        </Button>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Submit Area                                                        */
/* ------------------------------------------------------------------ */

function SubmitArea({ items }: { items: DeliverableItem[] }) {
  const requiredItems = items.filter((i) => i.required);
  const pendingItems = requiredItems.filter((i) => i.status === 'PENDING');
  const allRequiredUploaded = pendingItems.length === 0;
  const missingNames = pendingItems.map((i) => i.label);

  return (
    <Card>
      <CardContent className="pt-0">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            {allRequiredUploaded ? (
              <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-emerald-100">
                <CircleCheck className="h-4 w-4 text-emerald-600" />
              </div>
            ) : (
              <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-gray-100">
                <Circle className="h-4 w-4 text-gray-400" />
              </div>
            )}
            <div>
              <p
                className={cn(
                  'text-sm font-semibold',
                  allRequiredUploaded ? 'text-gray-900' : 'text-gray-600',
                )}
              >
                {allRequiredUploaded
                  ? '모든 필수 서류가 준비되었습니다'
                  : '필수 서류가 아직 부족합니다'}
              </p>
              {!allRequiredUploaded && (
                <p className="mt-0.5 text-xs text-gray-400">
                  <span className="font-medium text-gray-500">
                    {missingNames.join(', ')}
                  </span>
                  을(를) 업로드하면 제출할 수 있습니다
                </p>
              )}
            </div>
          </div>
          <Button
            disabled={!allRequiredUploaded}
            size="lg"
            className={cn(
              'gap-2',
              allRequiredUploaded
                ? 'bg-blue-600 text-white hover:bg-blue-700'
                : 'bg-gray-100 text-gray-400',
            )}
          >
            {allRequiredUploaded ? (
              <>
                <Check className="h-4 w-4" />
                최종 제출
              </>
            ) : (
              <>
                <Upload className="h-4 w-4" />
                최종 제출 (필수 {pendingItems.length}건 미완료)
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/*  State Toggle (underline style)                                     */
/* ------------------------------------------------------------------ */

function StateToggle({
  isSubmitted,
  onToggle,
}: {
  isSubmitted: boolean;
  onToggle: (value: boolean) => void;
}) {
  return (
    <div className="flex items-center gap-4 border-b border-gray-200 px-1 pb-0">
      <span className="pb-2.5 text-xs font-medium text-gray-400">상태 전환</span>
      <button
        type="button"
        onClick={() => onToggle(false)}
        className={cn(
          'pb-2.5 text-sm font-medium transition-colors',
          !isSubmitted
            ? 'border-b-2 border-gray-900 text-gray-900'
            : 'text-gray-500 hover:text-gray-700',
        )}
      >
        제출 대기
      </button>
      <button
        type="button"
        onClick={() => onToggle(true)}
        className={cn(
          'pb-2.5 text-sm font-medium transition-colors',
          isSubmitted
            ? 'border-b-2 border-gray-900 text-gray-900'
            : 'text-gray-500 hover:text-gray-700',
        )}
      >
        제출 완료
      </button>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main Page                                                          */
/* ------------------------------------------------------------------ */

export default function ConsultantDeliverableTabMockup() {
  const [isSubmitted, setIsSubmitted] = useState(false);

  const items = isSubmitted
    ? MOCK_DELIVERABLES_COMPLETED
    : MOCK_DELIVERABLES_PENDING;

  return (
    <div className="space-y-4">
      {/* State toggle */}
      <StateToggle isSubmitted={isSubmitted} onToggle={setIsSubmitted} />

      {/* Page header */}
      <PageHeader
        title="(주)한국전자 — 프로젝트 상세"
        backLink={{ href: '/mockup', label: '목업 목록' }}
      />

      {/* Tab navigation (simulating 5 tabs, "결과물" active) */}
      <Tabs defaultValue="deliverables" className="w-full">
        <TabsList className="w-full justify-start gap-0 rounded-none border-b bg-transparent p-0">
          {[
            { value: 'company-info', label: '기업 정보' },
            { value: 'pre-analysis', label: '사전 분석' },
            { value: 'interview', label: '인터뷰 기록' },
            { value: 'activity', label: '활동 일지' },
            { value: 'deliverables', label: '결과물' },
          ].map(({ value, label }) => (
            <TabsTrigger
              key={value}
              value={value}
              className="relative rounded-none border-b-2 border-transparent px-4 py-2.5 text-sm font-medium text-gray-500 shadow-none transition-colors hover:text-gray-700 data-[state=active]:border-b-blue-600 data-[state=active]:bg-transparent data-[state=active]:text-blue-600 data-[state=active]:shadow-none"
            >
              {label}
            </TabsTrigger>
          ))}
        </TabsList>

        {/* Other tabs - placeholder */}
        {['company-info', 'pre-analysis', 'interview', 'activity'].map(
          (tab) => (
            <TabsContent key={tab} value={tab} className="mt-6">
              <div className="flex h-32 items-center justify-center rounded-lg border border-dashed border-gray-300 text-sm text-gray-400">
                이 탭은 기존 기능 영역입니다 (목업 대상 아님)
              </div>
            </TabsContent>
          ),
        )}

        {/* Deliverables tab */}
        <TabsContent value="deliverables" className="mt-6">
          <div className="space-y-5">
            {/* Status banner */}
            {isSubmitted ? <CompletedBanner /> : <PendingBanner />}

            {/* Progress summary */}
            <ProgressSummary items={items} isCompleted={isSubmitted} />

            {/* Deliverable checklist */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <FileText className="h-5 w-5 text-gray-500" />
                  제출 서류 체크리스트
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {items.map((item, index) => (
                  <DeliverableCard
                    key={item.id}
                    item={item}
                    stepNumber={index + 1}
                    readOnly={isSubmitted}
                  />
                ))}
              </CardContent>
            </Card>

            {/* Submit button area (only in pending state) */}
            {!isSubmitted && <SubmitArea items={items} />}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
