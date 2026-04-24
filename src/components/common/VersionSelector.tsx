'use client';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { VersionStatusBadge } from './VersionStatusBadge';
import { cn } from '@/lib/utils';
import { formatDateKR } from '@/lib/utils/date';
import type { VersionStatus } from '@/types/database';

/**
 * VersionSelector — 로드맵·PBL 공용 제네릭 버전 셀렉터.
 *
 * 기존 `src/components/roadmap/VersionSelector.tsx` 와
 * `src/components/pbl/PBLVersionSelector.tsx` 두 복제를 단일 제네릭 컴포넌트로
 * 통합한다. 두 selector 모두 `{id, version_number, status, created_at}` shape
 * 만 사용하므로 `T extends VersionLike` 제약이면 `getId/getLabel/getStatus`
 * 같은 함수 props 없이 속성 직접 접근으로 타입 안전성과 간결성을 동시에 확보.
 *
 * 호출부 이전(roadmap·pbl 의 기존 selector 제거)은 PR #2 Task 2.11 에서 수행.
 *
 * 주요 UX 특성:
 * - 버전 배열이 비어 있으면 자동 disabled
 * - 각 항목에 `VersionStatusBadge` + 생성일(`formatDateKR`) 표시
 * - `className` · `placeholder` 로 호출부 커스터마이즈 지원
 */

/**
 * 버전 셀렉터 T 제약.
 *
 * 로드맵(`RoadmapVersionUI`) · PBL(`PBLReportRow`) 모두 이 shape 을 만족한다.
 */
export interface VersionLike {
  id: string;
  version_number: number;
  status: VersionStatus;
  created_at: string;
}

interface VersionSelectorProps<T extends VersionLike> {
  versions: T[];
  selectedId: string | undefined;
  onSelect: (versionId: string) => void;
  className?: string;
  placeholder?: string;
}

export function VersionSelector<T extends VersionLike>({
  versions,
  selectedId,
  onSelect,
  className,
  placeholder = '버전 선택',
}: VersionSelectorProps<T>) {
  const disabled = versions.length === 0;
  return (
    <Select value={selectedId} onValueChange={onSelect} disabled={disabled}>
      <SelectTrigger className={cn('min-w-[240px]', className)}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {versions.map((v) => (
          <SelectItem key={v.id} value={v.id}>
            <span className="flex items-center gap-2">
              <span className="font-medium">버전 {v.version_number}</span>
              <VersionStatusBadge
                status={v.status}
                versionNumber={v.version_number}
              />
              <span className="text-xs text-muted-foreground">
                {formatDateKR(v.created_at)}
              </span>
            </span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
