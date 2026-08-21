/**
 * `src/types/database.ts` 의 유니온 타입 ↔ `supabase/migrations/` 의 enum 정합성 가드.
 *
 * Why: `database.ts` 는 수동 관리 파일이라(CLAUDE.md) DB 스키마와 자유롭게 어긋난다.
 *   타입에만 있고 DB enum 에 없는 값을 쓰면 insert 가 invalid enum 으로 실패하는데,
 *   타입 검사는 통과하므로 배포 전까지 아무도 모른다. 감사로그는 실패를 삼키기까지 해서
 *   **기록이 통째로 유실돼도 조용하다.**
 *
 *   실제 사고(2026-08-21 발견):
 *   - `audit_action` 6종 누락 → PROJECT_DELETE(영구 삭제) 등이 감사 기록 없이 수행됨
 *   - `user_status.WITHDRAWN` 누락 → 회원 탈퇴가 운영에서 실패 (마이그 013 미적용)
 *
 * 한계: 이 테스트는 **타입 ↔ 마이그레이션 파일**을 대조한다. 마이그레이션이 선언했으나
 *   운영 DB 에 적용되지 않은 경우(013 사례)는 잡지 못하므로, 마이그 작성 시
 *   DB 적용·검증까지 같은 작업 안에서 끝내는 규칙(CLAUDE.md)이 함께 필요하다.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';

const REPO_ROOT = path.resolve(__dirname, '../..');

/** TS 유니온 타입명 → SQL enum 타입명 */
const TYPE_TO_ENUM: Record<string, string> = {
  UserRole: 'user_role',
  UserStatus: 'user_status',
  ProjectStatus: 'project_status',
  ProjectTrack: 'project_track',
  PblReportStatus: 'pbl_report_status',
  RoadmapVersionStatus: 'roadmap_version_status',
  EducationLevel: 'education_level',
  CoachingMethod: 'coaching_method',
  AuditAction: 'audit_action',
  NotificationType: 'notification_type',
};

/**
 * DB enum 에는 남아 있지만 타입에서는 의도적으로 제외한 폐기 값.
 *
 * 마이그 005 에서 `CASE_*` → `PROJECT_*` 로 개명했으나 PostgreSQL 은 enum 값 제거를
 * 지원하지 않아 DB 에 남아 있다. 타입에 넣으면 신규 코드가 쓸 수 있게 되므로 제외한다.
 * **추가하려면 "왜 코드가 쓰면 안 되는가"를 근거로 남길 것.**
 */
const DEPRECATED_DB_ONLY: Record<string, readonly string[]> = {
  audit_action: ['CASE_CREATE', 'CASE_UPDATE', 'CASE_ASSIGN', 'CASE_REASSIGN'],
};

/** `export type X = 'A' | 'B';` (한 줄·여러 줄 모두) 에서 값 집합을 추출한다. */
function readUnion(source: string, typeName: string): Set<string> {
  const block = new RegExp(`export type ${typeName} =([\\s\\S]*?);`).exec(source);
  if (!block) throw new Error(`database.ts 에서 ${typeName} 유니온을 찾지 못했습니다.`);
  return new Set(Array.from(block[1].matchAll(/'([A-Za-z_]+)'/g), (m) => m[1]));
}

/**
 * 마이그레이션 SQL 이 선언하는 enum 값 집합을 타입별로 누적한다.
 * CREATE TYPE / ALTER TYPE ADD VALUE / ALTER TYPE RENAME TO 를 순서대로 반영한다.
 */
function readMigrationEnums(): Map<string, Set<string>> {
  const dir = path.join(REPO_ROOT, 'supabase/migrations');
  const enums = new Map<string, Set<string>>();
  const add = (name: string, values: Iterable<string>) => {
    const key = name.toLowerCase();
    if (!enums.has(key)) enums.set(key, new Set());
    for (const v of values) enums.get(key)!.add(v);
  };

  for (const file of readdirSync(dir)
    .filter((f) => f.endsWith('.sql'))
    .sort()) {
    const sql = readFileSync(path.join(dir, file), 'utf8');

    // 파일 안에서도 선언 순서를 지켜야 rename 이 올바르게 반영된다
    const statements = [
      ...sql.matchAll(/CREATE\s+TYPE\s+(\w+)\s+AS\s+ENUM\s*\(([\s\S]*?)\)\s*;/gi),
      ...sql.matchAll(
        /ALTER\s+TYPE\s+(\w+)\s+ADD\s+VALUE\s+(?:IF\s+NOT\s+EXISTS\s+)?'([A-Za-z_]+)'/gi
      ),
      ...sql.matchAll(/ALTER\s+TYPE\s+(\w+)\s+RENAME\s+TO\s+(\w+)\s*;/gi),
    ].sort((a, b) => (a.index ?? 0) - (b.index ?? 0));

    for (const m of statements) {
      const head = m[0].toUpperCase();
      if (head.startsWith('CREATE')) {
        add(
          m[1],
          Array.from(m[2].matchAll(/'([A-Za-z_]+)'/g), (v) => v[1])
        );
      } else if (head.includes('ADD VALUE')) {
        add(m[1], [m[2]]);
      } else {
        // RENAME: 기존 값 집합을 새 이름으로 이관
        const from = m[1].toLowerCase();
        const to = m[2].toLowerCase();
        if (enums.has(from)) {
          add(to, enums.get(from)!);
          enums.delete(from);
        }
      }
    }
  }
  return enums;
}

describe('database.ts 유니온 타입 ↔ 마이그레이션 enum 정합성', () => {
  const source = readFileSync(path.join(REPO_ROOT, 'src/types/database.ts'), 'utf8');
  const migrationEnums = readMigrationEnums();

  it.each(Object.entries(TYPE_TO_ENUM))(
    '%s 에만 있고 %s enum 에 없는 값이 없다 (있으면 런타임 insert 가 실패한다)',
    (typeName: string, enumName: string) => {
      const union = readUnion(source, typeName);
      const declared = migrationEnums.get(enumName);
      expect(declared, `마이그레이션에서 ${enumName} enum 을 찾지 못했습니다.`).toBeDefined();

      const typeOnly = [...union].filter((v) => !declared!.has(v)).sort();
      expect(typeOnly).toEqual([]);
    }
  );

  it.each(Object.entries(TYPE_TO_ENUM))(
    '%s enum 에만 있고 %s 타입에 없는 값이 없다 (폐기 값 제외)',
    (typeName: string, enumName: string) => {
      const union = readUnion(source, typeName);
      const declared = migrationEnums.get(enumName)!;
      const deprecated = new Set(DEPRECATED_DB_ONLY[enumName] ?? []);

      const enumOnly = [...declared].filter((v) => !union.has(v) && !deprecated.has(v)).sort();
      expect(enumOnly).toEqual([]);
    }
  );

  it('폐기 값은 타입에 다시 들어오지 않는다', () => {
    const revived = Object.entries(DEPRECATED_DB_ONLY).flatMap(([enumName, values]) => {
      const typeName = Object.keys(TYPE_TO_ENUM).find((k) => TYPE_TO_ENUM[k] === enumName)!;
      const union = readUnion(source, typeName);
      return values.filter((v) => union.has(v));
    });
    expect(revived.sort()).toEqual([]);
  });
});
