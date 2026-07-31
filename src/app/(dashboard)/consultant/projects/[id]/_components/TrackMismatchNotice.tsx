import Link from 'next/link';
import { AlertTriangle } from 'lucide-react';

import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { projectDetailHref, primaryActionLabel, trackShortLabel } from '@/lib/utils/project-track';
import type { ProjectTrack } from '@/lib/constants/tracks';

interface TrackMismatchNoticeProps {
  projectId: string;
  /** 이 프로젝트의 실제 트랙 */
  track: ProjectTrack;
  /** 링크 문구를 헤더 액션 버튼과 같은 규칙으로 맞추기 위한 프로젝트 상태 */
  status: string;
}

/**
 * 트랙이 맞지 않는 주소(예: PBL 프로젝트의 `/roadmap`)로 진입해 프로젝트 상세로
 * 되돌아왔을 때 그 사유를 알리는 배너 (#015).
 *
 * 예전에는 아무 안내 없이 튕겨서, 북마크·외부 링크로 들어온 컨설턴트가
 * "왜 나왔는지" 알 수 없었다. `?trackMismatch=1` 이 붙었을 때만 렌더된다.
 *
 * 문구·링크는 전부 `project-track.ts` 헬퍼로 만든다 — 헤더의 트랙 뱃지·액션 버튼과
 * 같은 출처를 써야 트랙 명칭이 화면마다 어긋나지 않는다.
 */
export function TrackMismatchNotice({ projectId, track, status }: TrackMismatchNoticeProps) {
  const attemptedTrack: ProjectTrack = track === 'PBL' ? 'ROADMAP' : 'PBL';

  return (
    <Alert className="border-amber-200 bg-amber-50 text-amber-900">
      <AlertTriangle className="h-4 w-4" />
      <AlertTitle>이 프로젝트는 {trackShortLabel(track)} 트랙입니다</AlertTitle>
      <AlertDescription className="text-amber-800">
        <p>{trackShortLabel(attemptedTrack)} 화면은 열 수 없어 프로젝트 상세로 이동했습니다.</p>
        <Link
          href={projectDetailHref(projectId, track)}
          className="font-medium underline underline-offset-4 hover:text-amber-900"
        >
          {primaryActionLabel(status, track)}
        </Link>
      </AlertDescription>
    </Alert>
  );
}
