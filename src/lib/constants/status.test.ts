import { describe, expect, it } from 'vitest';
import type { ProjectStatus } from '@/types/database';
import { validateStatusTransition, ALLOWED_STATUS_TRANSITIONS } from './status';

describe('ALLOWED_STATUS_TRANSITIONS', () => {
  it('모든 ProjectStatus에 대한 전이 맵이 정의되어 있다', () => {
    const allStatuses: ProjectStatus[] = [
      'NEW',
      'DIAGNOSED',
      'MATCH_RECOMMENDED',
      'ASSIGNED',
      'INTERVIEWED',
      'ROADMAP_DRAFTED',
      'FINALIZED',
    ];
    for (const status of allStatuses) {
      expect(ALLOWED_STATUS_TRANSITIONS).toHaveProperty(status);
    }
  });

  it('FINALIZED는 종료 상태 — 허용된 전이가 없다', () => {
    expect(ALLOWED_STATUS_TRANSITIONS.FINALIZED).toEqual([]);
  });
});

describe('validateStatusTransition', () => {
  // ── 허용되는 전이 ──

  it.each<[ProjectStatus, ProjectStatus, string]>([
    // 정방향 (메인 워크플로우)
    ['NEW', 'DIAGNOSED', '정방향'],
    ['DIAGNOSED', 'MATCH_RECOMMENDED', '정방향'],
    ['MATCH_RECOMMENDED', 'ASSIGNED', '정방향'],
    ['ASSIGNED', 'INTERVIEWED', '정방향'],
    ['INTERVIEWED', 'ROADMAP_DRAFTED', '정방향'],
    ['ROADMAP_DRAFTED', 'FINALIZED', '정방향'],
    // 스킵 전이
    ['NEW', 'MATCH_RECOMMENDED', '자가진단 없이 매칭 추천'],
    ['DIAGNOSED', 'ASSIGNED', '매칭 추천 없이 직접 배정'],
    // 동일 상태 재실행
    ['ASSIGNED', 'ASSIGNED', '컨설턴트 재배정'],
    ['ROADMAP_DRAFTED', 'ROADMAP_DRAFTED', '로드맵 재생성'],
  ])('%s → %s 허용 (%s)', (from, to) => {
    expect(validateStatusTransition(from, to)).toBe(true);
  });

  // ── 차단되는 전이 ──

  it.each<[ProjectStatus, ProjectStatus, string]>([
    // 동일 상태 (명시적 허용 외)
    ['NEW', 'NEW', '동일 상태'],
    ['DIAGNOSED', 'DIAGNOSED', '동일 상태'],
    ['FINALIZED', 'FINALIZED', '동일 상태'],
    // 역방향
    ['DIAGNOSED', 'NEW', '역방향'],
    ['ASSIGNED', 'DIAGNOSED', '역방향'],
    ['FINALIZED', 'ROADMAP_DRAFTED', '역방향'],
    ['INTERVIEWED', 'ASSIGNED', '역방향'],
    // 비인접
    ['NEW', 'FINALIZED', '비인접'],
    ['NEW', 'INTERVIEWED', '비인접'],
    ['ASSIGNED', 'FINALIZED', '비인접'],
  ])('%s → %s 차단 (%s)', (from, to) => {
    expect(validateStatusTransition(from, to)).toBe(false);
  });
});
