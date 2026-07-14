'use client';

import { useEffect, useRef, useState } from 'react';
import { Sparkles } from 'lucide-react';

import { SectionCard } from '@/components/result/SectionCard';
import { CoursesList } from '@/components/roadmap/CoursesList';
import type { RoadmapCourseSpec } from '@/lib/services/roadmap';
import { ROADMAP_COURSE_SPEC_COUNT } from '@/lib/services/roadmap/roadmap-types';

import type { RoadmapResultEditPayload, TabCommonProps } from './types';

/**
 * 명세서 편집 → 서버 저장까지의 debounce 대기(ms).
 *
 * `CoursesList` 는 셀 입력마다 onChange 를 발화하는 폼형 컴포넌트다. 키 입력마다
 * Server Action(editRoadmapV2 → 저장 + 페이지 재조회) 을 호출하면 요청이 폭주하므로
 * 입력이 멈춘 뒤 한 번만 저장한다.
 */
export const COURSE_SPECS_AUTOSAVE_DEBOUNCE_MS = 800;

/**
 * Ⅲ. 훈련실시 계획 제안 탭 — 로드맵 결과 V2 (산인공 양식 v2, 2026-07-13 개정).
 *
 * v1 의 4개 섹션(Ⅲ-1 역량 모델링 + NCS 박스 · Ⅲ-2 훈련체계도 · Ⅲ-3 연간 훈련계획 ·
 * Ⅲ-4 명세서) 은 신규 양식에서 표가 통째로 삭제됐고, **훈련과정 명세서 1개 섹션**
 * (6개 과정) 만 남는다.
 *
 * 명세서 렌더·편집은 갤러리·데모 화면과 공용인 `CoursesList` 를 재사용한다
 * (훈련시기·훈련수준 등 v2 필드 대응 완료).
 */
export function TabTraining({ version, readOnly, onEdit }: TabCommonProps) {
  const specs = version?.course_specs ?? [];
  const hasSpecs = specs.length > 0;

  return (
    <div className="space-y-6">
      <SectionCard
        title="Ⅲ. 훈련실시 계획 제안"
        description={`훈련과정 명세서 ${ROADMAP_COURSE_SPEC_COUNT}개 — 훈련시기·훈련수준·과정명·훈련방법·추천 훈련사업·훈련목표·주요 훈련내용·훈련대상·교과목 (LLM 생성 결과, 직접 수정 가능)`}
        dataSource="ai"
      >
        {version && (hasSpecs || !readOnly) ? (
          // key: 버전 전환 시 편집 draft 를 새 버전의 서버 값으로 초기화한다.
          <CourseSpecsEditor
            key={version.id}
            initialSpecs={specs}
            readOnly={readOnly}
            onEdit={onEdit}
          />
        ) : (
          <RegeneratePlaceholder section="훈련과정 명세서" />
        )}
      </SectionCard>
    </div>
  );
}

// ─── 명세서 편집 draft ────────────────────────────────────────────────────

interface CourseSpecsEditorProps {
  /** 서버(선택 버전) 의 명세서. draft 초기값으로만 사용한다. */
  initialSpecs: RoadmapCourseSpec[];
  readOnly: boolean;
  onEdit: (patch: RoadmapResultEditPayload) => Promise<void>;
}

/**
 * 명세서 편집 상태 관리.
 *
 * 1. 로컬 draft 로 즉시 반영 — 서버 값을 그대로 내려주면 응답이 오기 전까지 입력이
 *    되돌아가 타이핑이 끊긴다.
 * 2. 입력이 멈추면 debounce 후 `course_specs` patch 1회로 저장.
 * 3. 저장 전에 언마운트되면 (탭 전환·버전 전환) 대기 중인 변경분을 flush —
 *    편집이 조용히 유실되는 것을 막는다.
 */
function CourseSpecsEditor({ initialSpecs, readOnly, onEdit }: CourseSpecsEditorProps) {
  const [specs, setSpecs] = useState<RoadmapCourseSpec[]>(initialSpecs);

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  /** debounce 대기 중인 미저장 변경분. 저장(또는 flush) 시 null 로 비운다. */
  const pendingRef = useRef<RoadmapCourseSpec[] | null>(null);
  /** 언마운트 flush 가 항상 최신 onEdit 을 호출하도록 ref 로 보관. */
  const onEditRef = useRef(onEdit);
  useEffect(() => {
    onEditRef.current = onEdit;
  }, [onEdit]);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      const pending = pendingRef.current;
      pendingRef.current = null;
      if (pending) void onEditRef.current({ course_specs: pending });
    };
  }, []);

  const handleChange = (next: RoadmapCourseSpec[]) => {
    setSpecs(next);
    pendingRef.current = next;

    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      timerRef.current = null;
      const pending = pendingRef.current;
      pendingRef.current = null;
      if (pending) void onEditRef.current({ course_specs: pending });
    }, COURSE_SPECS_AUTOSAVE_DEBOUNCE_MS);
  };

  return <CoursesList specs={specs} canEdit={!readOnly} onChange={handleChange} />;
}

/** Ⅲ LLM 결과가 없을 때 재생성 안내. */
function RegeneratePlaceholder({ section }: { section: string }) {
  return (
    <div className="flex flex-col items-center justify-center rounded border border-dashed bg-muted/20 px-6 py-10 text-center">
      <Sparkles className="mb-2 size-8 text-muted-foreground" aria-hidden />
      <p className="text-sm font-medium">{section} 가 아직 생성되지 않았습니다</p>
      <p className="mt-1 text-xs text-muted-foreground">
        상단 &quot;새 버전 생성&quot; 버튼을 눌러 LLM 이 결과를 생성하도록 요청하세요.
      </p>
    </div>
  );
}
