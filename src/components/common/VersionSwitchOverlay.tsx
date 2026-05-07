'use client';

import { Loader2 } from 'lucide-react';

/**
 * 버전 전환 시 노출되는 가벼운 풀스크린 오버레이.
 *
 * 신규 버전 *생성* 용 `RoadmapLoadingOverlay` 와 달리, 단순 데이터 fetch 동안의
 * 짧은 대기 (보통 200ms~1s) 를 시각적으로 알리는 데 목적이 있다.
 */
interface VersionSwitchOverlayProps {
  open: boolean;
  label?: string;
}

export function VersionSwitchOverlay({
  open,
  label = '이전 버전을 불러오는 중…',
}: VersionSwitchOverlayProps) {
  if (!open) return null;
  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm"
    >
      <div className="flex items-center gap-3 rounded-xl bg-white px-5 py-4 shadow-xl">
        <Loader2 className="size-5 animate-spin text-purple-600" aria-hidden />
        <p className="text-sm font-medium text-gray-700">{label}</p>
      </div>
    </div>
  );
}
