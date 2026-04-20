# 2026-04-19 OFA Step 12: `pbl_course` 컬럼 제거 계획 철회 결정

## 결정 요약

**계획서 §4 Step 12 Task 2-a/2-b 에 명시된 `roadmap_versions.pbl_course` DROP 계획을 철회**하고, 동일한 마이그(066)에서 advisor 보안 경고 1건(`audit_logs_archive` RLS 활성화)만 수행한다.

## 배경

계획서(`docs/plans/2026-04-14-official-form-alignment.md` §4 Step 12)는 Session 09 시점의 코드 실측에 근거해 `pbl_course` 컬럼을 레거시 잔존물로 간주하고 DROP COLUMN 을 지시했다.

## 실제 코드 상태 (2026-04-19)

`src/lib/services/roadmap/roadmap-storage-mapper.ts:36-56` 의 `RoadmapVersionColumns` 인터페이스:

```ts
export interface RoadmapVersionColumns {
  /** legacy 컬럼명. 실제 저장 데이터는 {competencies, annual_plan, 신규 필드들}. */
  pbl_course: {
    competencies: RoadmapCompetency[];
    annual_plan: RoadmapAnnualPlan;
    setup_necessity: string;              // Step 6.5 신규
    outcome_summary: RoadmapOutcomeSummary; // Step 6.5 신규
    training_structure_method: string;    // Step 6.5 신규
    ncs: { used: boolean; methodology: string; derivation_method: string }; // Step 6.5 신규
    hrd_report_attachment_url?: string;   // Step 6.5 신규
  };
  // ...
}
```

파일 머리 주석(line 14) 에 다음과 같이 명시되어 있다:

> `(마이그 신설 금지) pbl_course 하위 구조만 확장한다`

즉 Step 6.5가 컬럼 이름(`pbl_course`)을 유지한 채 JSONB 내부 구조를 의도적으로 확장했다. 컬럼 이름은 레거시지만 저장되는 데이터는 **로드맵의 핵심 결과물**(역량 체계, 연차 계획, NCS, 성과 요약 등) 전부다.

## 영향 평가

`ALTER TABLE roadmap_versions DROP COLUMN pbl_course;` 를 그대로 수행하면:

1. `roadmap_versions` 테이블의 모든 기존 로드맵이 역량·연차 계획·NCS 등 핵심 데이터를 잃는다.
2. `toRoadmapVersionColumns()` / `fromRoadmapVersionColumns()` 가 즉시 실패해 로드맵 저장/조회 경로 전체가 5xx 를 반환한다.
3. HWPX·PDF·XLSX 내보내기, 갤러리 상세, 인터뷰 확정 등 연쇄 장애.

복구하려면 별도 마이그로 컬럼을 추가하고 백업에서 데이터를 끌어와야 하므로 **회복 불가능에 가까운 destructive 변경**이다.

## 결정

1. **Task 2-a 스킵**: 코드 레퍼런스 제거를 수행하지 않는다. `pbl_course` 는 활성 storage layer 의 일부이므로 유지.
2. **Task 2-b 용도 변경**: 마이그 `066_ofa_cleanup.sql` 은 당초 목적(legacy 정리) 을 유지하되 실제 작업은 advisor 보안 경고 1건(`audit_logs_archive` 테이블 RLS 활성화) 해결로 축소.
3. **후속 계획**: 장기적으로 컬럼명(`pbl_course` → `roadmap_core` 같은 의미 일치 이름) 을 정리하려면 별도 3-phase 마이그(add new column → backfill → drop old) 가 필요하다. 본 OFA 프로젝트 범위 밖.

## 근거

- 근본 원인 해결 원칙(`~/.claude/projects/.../feedback_root_cause_preference.md`): 임시 우회 대신 실제 구조 파악.
- 파괴적 작업 안전 원칙(프로젝트 CLAUDE.md): "destructive operations 은 실제 필요할 때만".
- 계획서 자체가 `(마이그 신설 금지)` 주석을 간과했으므로 계획을 수정한다.

## 참고

- `src/lib/services/roadmap/roadmap-storage-mapper.ts`
- `src/types/database.ts:268`
- `docs/plans/2026-04-14-official-form-alignment.md` §4 Step 12 Task 2
