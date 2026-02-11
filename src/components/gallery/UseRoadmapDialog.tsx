'use client';

import { useState, useEffect, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Loader2, AlertTriangle, Copy } from 'lucide-react';
import {
  fetchEligibleProjects,
  copyRoadmapToProject,
} from '@/app/(dashboard)/gallery/actions';
import type { EligibleProject } from '@/app/(dashboard)/gallery/actions';
import { showSuccessToast, showErrorToast } from '@/lib/utils/toast';

interface UseRoadmapDialogProps {
  isOpen: boolean;
  onClose: () => void;
  roadmapVersionId: string;
}

const STATUS_LABEL: Record<string, string> = {
  INTERVIEWED: '인터뷰 완료',
  ROADMAP_DRAFTED: '로드맵 초안',
  FINALIZED: '확정됨',
};

export function UseRoadmapDialog({
  isOpen,
  onClose,
  roadmapVersionId,
}: UseRoadmapDialogProps) {
  if (!isOpen) return null;

  return (
    <UseRoadmapDialogInner
      onClose={onClose}
      roadmapVersionId={roadmapVersionId}
    />
  );
}

/** isOpen=true일 때만 마운트되는 내부 컴포넌트 */
function UseRoadmapDialogInner({
  onClose,
  roadmapVersionId,
}: {
  onClose: () => void;
  roadmapVersionId: string;
}) {
  const router = useRouter();
  const [projects, setProjects] = useState<EligibleProject[]>([]);
  const [isLoadingProjects, setIsLoadingProjects] = useState(true);
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    let cancelled = false;
    fetchEligibleProjects().then((result) => {
      if (cancelled) return;
      if (result.success) {
        setProjects(result.data);
      }
      setIsLoadingProjects(false);
    });
    return () => { cancelled = true; };
  }, []);

  const handleCopy = () => {
    if (!selectedProjectId) return;

    startTransition(async () => {
      const result = await copyRoadmapToProject({
        sourceRoadmapVersionId: roadmapVersionId,
        targetProjectId: selectedProjectId,
      });

      if (result.success) {
        showSuccessToast(
          `로드맵이 복사되었습니다. (버전 ${result.data.versionNumber})`
        );
        onClose();
        router.push(`/consultant/projects/${selectedProjectId}/roadmap`);
      } else {
        showErrorToast('복사 실패', result.error);
      }
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* 배경 오버레이 */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
      />

      {/* 다이얼로그 */}
      <div className="relative z-10 w-full max-w-md rounded-lg bg-white p-6 shadow-xl mx-4">
        <h2 className="text-lg font-semibold text-gray-900">
          이 로드맵을 가져오시겠습니까?
        </h2>
        <p className="mt-2 text-sm text-gray-600">
          이 로드맵의 데이터가 선택한 프로젝트의 새 초안 버전으로 복사됩니다.
          원본에는 영향 없습니다.
        </p>

        <div className="mt-4 space-y-3">
          <label htmlFor="project-select" className="text-sm font-medium text-gray-700">
            적용할 프로젝트
          </label>

          {isLoadingProjects ? (
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <Loader2 className="h-4 w-4 animate-spin" />
              프로젝트 목록 불러오는 중...
            </div>
          ) : projects.length === 0 ? (
            <p className="text-sm text-gray-500">
              적용 가능한 프로젝트가 없습니다. (인터뷰 완료 이상 상태 필요)
            </p>
          ) : (
            <select
              id="project-select"
              value={selectedProjectId}
              onChange={(e) => setSelectedProjectId(e.target.value)}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            >
              <option value="">프로젝트 선택...</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.companyName} — {STATUS_LABEL[p.status] || p.status}
                </option>
              ))}
            </select>
          )}

          <div className="flex items-start gap-2 rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-700">
            <AlertTriangle className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" />
            <span>기존 초안 버전이 있으면 새 버전으로 추가됩니다.</span>
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <Button variant="outline" onClick={onClose} disabled={isPending}>
            취소
          </Button>
          <Button
            onClick={handleCopy}
            disabled={!selectedProjectId || isPending}
            className="gap-1.5"
          >
            {isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                복사 중...
              </>
            ) : (
              <>
                <Copy className="h-4 w-4" />
                가져오기
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
