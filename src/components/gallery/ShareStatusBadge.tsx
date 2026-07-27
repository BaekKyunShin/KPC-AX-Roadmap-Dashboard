import { Share2 } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * ShareStatusBadge — 갤러리 공유 여부 읽기 전용 표시.
 *
 * 공유 설정 변경 권한이 없는 뷰어(운영관리자)에게 상태만 노출한다.
 * 공유 주체인 작성 컨설턴트에게는 {@link ShareToggle} 이 대신 렌더된다 —
 * `toggleShare` Server Action 이 `CONSULTANT_APPROVED` + 본인 작성 로드맵만
 * 허용하므로, 권한 없는 역할에 조작 가능한 컨트롤을 보여주지 않기 위함이다.
 *
 * 나란히 놓이는 `VersionStatusBadge` 의 compact variant 와 동일한 시각 언어를 따른다.
 * 접근성: 색상만으로 의미를 전달하지 않는다 — 라벨 텍스트가 상태를 명시.
 */

interface ShareStatusBadgeProps {
  isShared: boolean;
  className?: string;
}

export function ShareStatusBadge({ isShared, className }: ShareStatusBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded border px-2 py-0.5 text-xs font-medium',
        isShared
          ? 'bg-green-100 text-green-700 border-green-200'
          : 'bg-gray-100 text-gray-600 border-gray-200',
        className
      )}
    >
      <Share2 className="size-3" aria-hidden="true" />
      {isShared ? '갤러리 공유됨' : '갤러리 미공유'}
    </span>
  );
}
