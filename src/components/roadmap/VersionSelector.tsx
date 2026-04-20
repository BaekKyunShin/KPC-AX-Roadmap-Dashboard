'use client';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { RoadmapStatusBadge } from './RoadmapStatusBadge';
import type { RoadmapVersionUI } from '@/types/roadmap-ui';

interface VersionSelectorProps {
  versions: RoadmapVersionUI[];
  selectedId: string | undefined;
  onSelect: (versionId: string) => void;
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
  } catch {
    return iso.slice(0, 10);
  }
}

export function VersionSelector({ versions, selectedId, onSelect }: VersionSelectorProps) {
  const disabled = versions.length === 0;
  return (
    <Select value={selectedId} onValueChange={onSelect} disabled={disabled}>
      <SelectTrigger className="min-w-[240px]">
        <SelectValue placeholder="버전 선택" />
      </SelectTrigger>
      <SelectContent>
        {versions.map((v) => (
          <SelectItem key={v.id} value={v.id}>
            <span className="flex items-center gap-2">
              <span className="font-medium">버전 {v.version_number}</span>
              <RoadmapStatusBadge status={v.status} versionNumber={v.version_number} />
              <span className="text-xs text-muted-foreground">{formatDate(v.created_at)}</span>
            </span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
