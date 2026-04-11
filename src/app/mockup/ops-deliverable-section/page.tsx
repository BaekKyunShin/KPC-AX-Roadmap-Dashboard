'use client';

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardAction,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/ui/page-header';
import { cn } from '@/lib/utils';
import {
  Check,
  Circle,
  Download,
  FileArchive,
  FileText,
  Info,
  Minus,
} from 'lucide-react';

/* ────────────────────────────────────────────
 * Mock data
 * ──────────────────────────────────────────── */

type DeliverableStatus = 'completed' | 'pending' | 'skipped';

interface MockFile {
  name: string;
  size: string;
  uploadedAt: string;
}

interface DeliverableItem {
  label: string;
  required: boolean;
  status: DeliverableStatus;
  files: MockFile[];
}

const MOCK_DELIVERABLES: DeliverableItem[] = [
  {
    label: '현장 사진',
    required: true,
    status: 'completed',
    files: [
      { name: '현장사진_01.jpg', size: '2.4 MB', uploadedAt: '2026-04-08' },
      { name: '현장사진_02.jpg', size: '3.1 MB', uploadedAt: '2026-04-08' },
    ],
  },
  {
    label: '회의록',
    required: true,
    status: 'completed',
    files: [
      {
        name: '회의록_20260405.pdf',
        size: '540 KB',
        uploadedAt: '2026-04-09',
      },
    ],
  },
  {
    label: '최종 보고서',
    required: true,
    status: 'pending',
    files: [],
  },
  {
    label: '출장 보고서',
    required: true,
    status: 'pending',
    files: [],
  },
  {
    label: '기타 참고 자료',
    required: false,
    status: 'skipped',
    files: [],
  },
];

/* ────────────────────────────────────────────
 * Timeline step data
 * ──────────────────────────────────────────── */

interface TimelineStep {
  key: string;
  label: string;
  date?: string;
}

const TIMELINE_STEPS: TimelineStep[] = [
  { key: 'NEW', label: '생성', date: '03/15' },
  { key: 'DIAGNOSED', label: '진단', date: '03/20' },
  { key: 'ASSIGNED', label: '배정', date: '03/22' },
  { key: 'INTERVIEWED', label: '인터뷰', date: '04/01' },
  { key: 'DRAFTED', label: '초안', date: '04/05' },
  { key: 'FINALIZED', label: '최종', date: '04/10' },
];

const CURRENT_STEP_KEY = 'FINALIZED';

/* ────────────────────────────────────────────
 * Sub-components
 * ──────────────────────────────────────────── */

function StatusIcon({ status }: { status: DeliverableStatus }) {
  switch (status) {
    case 'completed':
      return (
        <div className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500 text-white flex-shrink-0">
          <Check className="h-3.5 w-3.5" />
        </div>
      );
    case 'pending':
      return (
        <div className="flex h-6 w-6 items-center justify-center rounded-full bg-gray-200 text-gray-400 flex-shrink-0">
          <Circle className="h-3.5 w-3.5" />
        </div>
      );
    case 'skipped':
      return (
        <div className="flex h-6 w-6 items-center justify-center rounded-full bg-gray-100 text-gray-300 flex-shrink-0">
          <Minus className="h-3.5 w-3.5" />
        </div>
      );
  }
}

function StatusLabel({ status }: { status: DeliverableStatus }) {
  switch (status) {
    case 'completed':
      return (
        <span className="inline-flex items-center gap-1.5 text-xs text-emerald-700">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
          완료
        </span>
      );
    case 'pending':
      return (
        <span className="inline-flex items-center gap-1.5 text-xs text-gray-500">
          <span className="h-1.5 w-1.5 rounded-full bg-gray-300" />
          미제출
        </span>
      );
    case 'skipped':
      return (
        <span className="inline-flex items-center gap-1.5 text-xs text-gray-400">
          <span className="h-1.5 w-1.5 rounded-full bg-gray-300" />
          건너뜀
        </span>
      );
  }
}

function FileChips({ files }: { files: MockFile[] }) {
  return (
    <div className="flex flex-wrap gap-2">
      {files.map((file) => (
        <div
          key={file.name}
          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-gray-50 border border-gray-200 rounded-md text-sm text-gray-700"
        >
          <FileText className="h-3.5 w-3.5 text-gray-400" />
          <span className="truncate max-w-[160px]">{file.name}</span>
          <span className="text-gray-400 text-xs">({file.size})</span>
          <button
            className="text-gray-400 hover:text-gray-600"
            onClick={() => alert(`다운로드: ${file.name} (목업)`)}
          >
            <Download className="h-3 w-3" />
          </button>
        </div>
      ))}
    </div>
  );
}

function DeliverableRow({ item }: { item: DeliverableItem }) {
  const isSkipped = item.status === 'skipped';

  return (
    <div
      className={cn(
        'rounded-lg border border-gray-200 bg-white p-4 transition-colors',
        item.status === 'completed' && 'border-l-[3px] border-l-emerald-500',
        item.status === 'pending' && 'border-l-[3px] border-l-gray-200',
        item.status === 'skipped' && 'border-l-[3px] border-l-gray-200 opacity-60'
      )}
    >
      {/* Header row */}
      <div className="flex items-center gap-3">
        <StatusIcon status={item.status} />
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <span
            className={cn(
              'text-sm font-medium',
              isSkipped ? 'text-gray-400' : 'text-gray-900'
            )}
          >
            {item.label}
          </span>
          {item.required ? (
            <span className="bg-gray-900 text-white text-[11px] px-1.5 py-0.5 rounded font-medium">
              필수
            </span>
          ) : (
            <span className="bg-gray-100 text-gray-500 text-[11px] px-1.5 py-0.5 rounded font-medium">
              선택
            </span>
          )}
        </div>
        <StatusLabel status={item.status} />
      </div>

      {/* File chips (completed only) */}
      {item.files.length > 0 && (
        <div className="mt-3">
          <FileChips files={item.files} />
        </div>
      )}

      {/* Pending message */}
      {item.status === 'pending' && (
        <p className="mt-2 text-xs text-gray-500">
          컨설턴트가 아직 제출하지 않았습니다.
        </p>
      )}
    </div>
  );
}

/* ────────────────────────────────────────────
 * Company Info Card
 * ──────────────────────────────────────────── */

function CompanyInfoCard() {
  const fields = [
    { label: '기업명', value: '(주)한국전자' },
    { label: '업종', value: '제조업' },
    { label: '규모', value: '중소기업 (350명)' },
    { label: '담당자', value: '홍길동' },
    { label: '이메일', value: 'hong@example.com' },
    { label: '담당 컨설턴트', value: '김민수' },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">기업 정보</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 gap-x-8 gap-y-3 sm:grid-cols-2 lg:grid-cols-3">
          {fields.map((f) => (
            <div key={f.label} className="flex items-start gap-2">
              <span className="text-xs text-gray-500 min-w-[5.5rem] flex-shrink-0">
                {f.label}
              </span>
              <span className="text-sm font-medium text-gray-900">
                {f.value}
              </span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

/* ────────────────────────────────────────────
 * Timeline Card
 * ──────────────────────────────────────────── */

function TimelineCard() {
  const currentIdx = TIMELINE_STEPS.findIndex(
    (s) => s.key === CURRENT_STEP_KEY
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">진행 타임라인</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto pb-2">
          <div className="flex items-start gap-0 min-w-[480px]">
            {TIMELINE_STEPS.map((step, idx) => {
              const isCompleted = idx <= currentIdx;
              const isCurrent = idx === currentIdx;
              const isLast = idx === TIMELINE_STEPS.length - 1;

              return (
                <div key={step.key} className="flex items-start flex-1">
                  {/* Step circle + label */}
                  <div className="flex flex-col items-center">
                    <div
                      className={cn(
                        'flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold transition-colors',
                        isCurrent &&
                          'bg-blue-600 text-white ring-2 ring-blue-200',
                        isCompleted &&
                          !isCurrent &&
                          'bg-emerald-500 text-white',
                        !isCompleted && 'bg-gray-200 text-gray-400'
                      )}
                    >
                      {isCompleted && !isCurrent ? (
                        <Check className="h-4 w-4" />
                      ) : (
                        <span>{idx + 1}</span>
                      )}
                    </div>
                    <span
                      className={cn(
                        'mt-1.5 text-xs font-medium',
                        isCompleted ? 'text-gray-900' : 'text-gray-400'
                      )}
                    >
                      {step.label}
                    </span>
                    {step.date && (
                      <span className="text-[10px] text-gray-400">
                        {step.date}
                      </span>
                    )}
                  </div>

                  {/* Connector line */}
                  {!isLast && (
                    <div className="flex-1 pt-4 px-1">
                      <div
                        className={cn(
                          'h-0.5 w-full',
                          idx < currentIdx ? 'bg-emerald-400' : 'bg-gray-200'
                        )}
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

/* ────────────────────────────────────────────
 * Submission Status Card
 * ──────────────────────────────────────────── */

function SubmissionStatusCard() {
  const required = MOCK_DELIVERABLES.filter((d) => d.required);
  const completedRequired = required.filter(
    (d) => d.status === 'completed'
  ).length;
  const totalRequired = required.length;
  const progressPercent = Math.round((completedRequired / totalRequired) * 100);
  const isComplete = completedRequired === totalRequired;

  return (
    <div
      className={cn(
        'rounded-xl border p-5',
        isComplete
          ? 'border-emerald-200 bg-emerald-50'
          : 'border-amber-200 bg-amber-50'
      )}
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <span
            className={cn(
              'inline-flex items-center gap-1.5 text-sm font-medium',
              isComplete ? 'text-emerald-800' : 'text-amber-800'
            )}
          >
            <span
              className={cn(
                'h-2 w-2 rounded-full',
                isComplete ? 'bg-emerald-500' : 'bg-amber-500'
              )}
            />
            {isComplete ? '모든 필수 서류 제출 완료' : '제출 대기 중'}
          </span>
          <span
            className={cn(
              'text-xs',
              isComplete ? 'text-emerald-600' : 'text-amber-600'
            )}
          >
            필수 서류 {completedRequired}/{totalRequired} 완료
          </span>
        </div>

        {/* Progress bar */}
        <div className="flex items-center gap-3 sm:min-w-[200px]">
          <div className="flex-1 h-2 rounded-full bg-gray-200 overflow-hidden">
            <div
              className="h-full rounded-full bg-blue-500 transition-all"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <span className="text-sm font-medium tabular-nums text-gray-700">
            {progressPercent}%
          </span>
        </div>
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────
 * Page
 * ──────────────────────────────────────────── */

export default function OpsDeliverableSectionPage() {
  return (
    <div className="space-y-6">
      {/* Page header */}
      <PageHeader
        title="(주)한국전자 — 프로젝트 상세"
        backLink={{ href: '/mockup', label: '목업 목록' }}
      />

      {/* Read-only info banner */}
      <div className="flex items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-700">
        <Info className="h-4 w-4 flex-shrink-0" />
        읽기 전용 — 서류 업로드는 담당 컨설턴트만 가능합니다
      </div>

      {/* Company Info */}
      <CompanyInfoCard />

      {/* Timeline */}
      <TimelineCard />

      {/* Submission Status */}
      <SubmissionStatusCard />

      {/* Deliverables section */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">결과물</CardTitle>
          <CardAction>
            <Button
              variant="outline"
              size="default"
              onClick={() => alert('전체 ZIP 다운로드 (목업)')}
            >
              <FileArchive className="h-4 w-4" />
              <span className="hidden sm:inline">전체 다운로드 (ZIP)</span>
              <span className="sm:hidden">ZIP</span>
            </Button>
          </CardAction>
        </CardHeader>

        <CardContent>
          {/* Checklist */}
          <div className="space-y-3">
            {MOCK_DELIVERABLES.map((item) => (
              <DeliverableRow key={item.label} item={item} />
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
