'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { fetchConsultantOptions } from '@/app/(dashboard)/gallery/actions';
import type { ConsultantOption } from '@/app/(dashboard)/gallery/actions';

const DEFAULT_FILTER_VALUE = 'all';

const STATUS_OPTIONS = [
  { value: 'DRAFT', label: '초안' },
  { value: 'FINAL', label: '확정' },
  { value: 'ARCHIVED', label: '이전 확정본' },
];

const SHARED_OPTIONS = [
  { value: 'true', label: '공유됨' },
  { value: 'false', label: '비공유' },
];

export function AdminFilters() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [consultants, setConsultants] = useState<ConsultantOption[]>([]);

  const currentStatus = searchParams.get('status') || DEFAULT_FILTER_VALUE;
  const currentShared = searchParams.get('isShared') || DEFAULT_FILTER_VALUE;
  const currentConsultant = searchParams.get('consultantId') || DEFAULT_FILTER_VALUE;

  useEffect(() => {
    fetchConsultantOptions().then((result) => {
      if (result.success) {
        setConsultants(result.data);
      }
    });
  }, []);

  const updateParam = useCallback(
    (key: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value && value !== DEFAULT_FILTER_VALUE) {
        params.set(key, value);
      } else {
        params.delete(key);
      }
      router.push(`${pathname}?${params.toString()}`);
    },
    [router, pathname, searchParams]
  );

  const hasAdminFilters =
    currentStatus !== DEFAULT_FILTER_VALUE ||
    currentShared !== DEFAULT_FILTER_VALUE ||
    currentConsultant !== DEFAULT_FILTER_VALUE;

  const handleResetAdminFilters = () => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete('status');
    params.delete('isShared');
    params.delete('consultantId');
    const qs = params.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname);
  };

  const getStatusLabel = (value: string) =>
    STATUS_OPTIONS.find((o) => o.value === value)?.label || value;

  const getSharedLabel = (value: string) =>
    SHARED_OPTIONS.find((o) => o.value === value)?.label || value;

  const getConsultantLabel = (value: string) =>
    consultants.find((c) => c.id === value)?.name || value;

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex flex-col gap-4 md:flex-row md:items-center">
          <span className="text-xs font-medium text-muted-foreground whitespace-nowrap">
            관리자 필터
          </span>

          <div className="flex flex-wrap gap-2">
            <Select
              value={currentStatus}
              onValueChange={(v) => updateParam('status', v === DEFAULT_FILTER_VALUE ? '' : v)}
            >
              <SelectTrigger className="w-full sm:w-[130px]">
                <SelectValue placeholder="상태" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={DEFAULT_FILTER_VALUE}>모든 상태</SelectItem>
                {STATUS_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={currentShared}
              onValueChange={(v) => updateParam('isShared', v === DEFAULT_FILTER_VALUE ? '' : v)}
            >
              <SelectTrigger className="w-full sm:w-[120px]">
                <SelectValue placeholder="공유" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={DEFAULT_FILTER_VALUE}>모든 공유</SelectItem>
                {SHARED_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={currentConsultant}
              onValueChange={(v) => updateParam('consultantId', v === DEFAULT_FILTER_VALUE ? '' : v)}
            >
              <SelectTrigger className="w-full sm:w-[150px]">
                <SelectValue placeholder="컨설턴트" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={DEFAULT_FILTER_VALUE}>모든 컨설턴트</SelectItem>
                {consultants.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {hasAdminFilters && (
              <Button variant="ghost" size="icon" onClick={handleResetAdminFilters}>
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>

        {/* 활성 관리자 필터 표시 */}
        {hasAdminFilters && (
          <div className="mt-3 flex flex-wrap gap-2">
            {currentStatus !== DEFAULT_FILTER_VALUE && (
              <Badge variant="secondary" className="gap-1">
                상태: {getStatusLabel(currentStatus)}
                <button onClick={() => updateParam('status', '')}>
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            )}
            {currentShared !== DEFAULT_FILTER_VALUE && (
              <Badge variant="secondary" className="gap-1">
                공유: {getSharedLabel(currentShared)}
                <button onClick={() => updateParam('isShared', '')}>
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            )}
            {currentConsultant !== DEFAULT_FILTER_VALUE && (
              <Badge variant="secondary" className="gap-1">
                컨설턴트: {getConsultantLabel(currentConsultant)}
                <button onClick={() => updateParam('consultantId', '')}>
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
