// e2e/helpers/bulk-seed.helper.ts
//
// scroll-ux 회귀 감시는 화면에 스크롤이 생겨야 실행된다(`isScrollable`: 문서높이 −
// 뷰포트 ≥ 200px). 시드가 적어 스크롤이 안 생기면 테스트가 스스로 skip 하고, CI 는
// dot reporter 라 그 사실이 로그에 드러나지 않는다 — 감시가 잠들어도 초록불로 보인다.
//
// **공용 `supabase/seed.sql` 을 늘리지 않는 이유**: `findFirstLinkHref` 로 "목록의 첫
// 프로젝트"를 집는 spec 이 9개 있어, 새 시드가 맨 앞에 끼면 그 9개가 통째로 다른
// 프로젝트를 보게 된다. 그래서 필요한 spec 이 beforeAll 에서 직접 만들고 afterAll 에서
// 지운다. CI 는 `fullyParallel:false` + `workers:1` 순차 실행이라 파일 단위로 격리된다.
//
// 설계 원칙 (`dummy-user.helper.ts` 와 동일):
// - **선청소 → 생성**: 이전 실행이 afterAll 도달 전 중단돼 잔여가 남아도 재실행 가능
// - 모든 생성물 이름에 `SEED_TAG` 접두 → 잔여를 태그 하나로 회수
// - 실패하면 **throw**. 조용히 넘어가면 시드 실패가 skip 으로 위장돼, 고치려던 문제가
//   그대로 재현된다
//
// ⚠️ **로컬에서 검증할 때는 `--workers=1` 을 붙여야 한다.**
// 이 헬퍼를 쓰는 파일들은 같은 태그를 공유하므로, 한 파일의 beforeAll 선청소가 동시에
// 돌던 다른 파일의 시드를 지운다. CI 는 `workers:1`(playwright.config.ts) 이라 순차
// 실행되어 안전하지만, 로컬 기본값은 2 라 파일이 겹쳐 엉뚱한 실패가 난다
// (`e2e/ops/projects-deeplink.spec.ts` 등 목록 개수에 민감한 spec 이 먼저 깨진다).
// 태그를 파일별로 쪼개는 대안은 여러 파일의 시드가 동시에 살아남아 프로젝트 목록이
// 수백 건으로 불어나므로 택하지 않았다.
import { createClient } from '@supabase/supabase-js';
import { test } from '../fixtures/auth.fixture';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/** 모든 대량 시드 생성물의 식별 접두. 정리·검색 격리의 단일 기준. */
export const SEED_TAG = 'E2E스크롤';

/**
 * 시드 프로젝트의 생성 시각 기준점 — **2025년으로 고정한다**.
 *
 * `/ops/projects` 는 `created_at DESC` 로 10개씩 끊어 보여준다
 * (`ops/projects/page.tsx:60`). 시드가 최신이면 기존 시드기업A~D 를 2페이지로
 * 밀어내, 그들의 노출을 단언하는 `e2e/ops/projects-deeplink.spec.ts` 가 깨진다.
 * 컨설턴트 목록(`created_at DESC`)의 "첫 프로젝트" 전제도 같은 이유로 과거 고정이
 * 필요하다 — `supabase/seed.sql:187-192` 가 시드기업C·D 를 2026-01-01/02 로 박아 둔
 * 것과 같은 장치다.
 */
const SEED_BASE_DATE = new Date('2025-06-01T00:00:00Z');

/** 업종을 번갈아 배치 — 업종 필터가 걸린 화면에서도 목록이 비지 않도록. */
const INDUSTRIES = ['IT/SW', '제조업'] as const;

function seedCreatedAt(index: number): string {
  // index 가 클수록 더 과거 → 목록 뒤쪽에 쌓인다
  return new Date(SEED_BASE_DATE.getTime() - index * 86_400_000).toISOString();
}

/**
 * 태그가 붙은 시드 프로젝트를 일괄 제거한다.
 * `roadmap_versions` 는 `projects` 삭제 시 CASCADE 로 함께 사라진다.
 *
 * beforeAll 선청소와 afterAll 정리 양쪽에서 호출하므로 **멱등**이어야 한다.
 */
export async function purgeSeededProjects(): Promise<void> {
  const { error } = await supabase.from('projects').delete().like('company_name', `${SEED_TAG}%`);
  if (error) {
    throw new Error(`[purgeSeededProjects] 정리 실패: ${error.message}`);
  }
}

/**
 * 갤러리에 노출되는 FINAL·공유 로드맵을 `count` 개 만든다.
 *
 * 갤러리 목록은 `roadmap_versions` 를 기준으로 조회하고
 * (`gallery/actions/queries.ts:163`), 컨설턴트에게는 `is_shared=true AND
 * status='FINAL'` 만 보인다. 「내 산출물」(`scope=mine`)은 `created_by` 를 보므로
 * **`ownerId` 에 컨설턴트를 넘겨야** 그 필터에서도 목록이 남는다.
 *
 * `assigned_consultant_id` 는 **일부러 비운다** — 갤러리 조회가 쓰지 않는 값인데,
 * 채우면 컨설턴트 프로젝트 목록에 시드 전량이 끼어들어 `findFirstLinkHref` 기반
 * spec 9개의 전제를 흔든다.
 *
 * @param count  생성 개수. 갤러리는 limit=12 라 2페이지까지 채우려면 24개가 필요하다
 * @param ownerId  `roadmap_versions.created_by` — 컨설턴트 사용자 ID
 * @param createdById  `projects.created_by` — 보통 운영관리자 ID
 */
export async function seedGalleryItems(
  count: number,
  ownerId: string,
  createdById: string
): Promise<string[]> {
  await purgeSeededProjects();

  const projectRows = Array.from({ length: count }, (_, i) => ({
    company_name: `${SEED_TAG}기업${String(i + 1).padStart(2, '0')}`,
    industry: INDUSTRIES[i % INDUSTRIES.length],
    company_size: '50~299명',
    contact_name: `${SEED_TAG}담당${i + 1}`,
    contact_email: `scroll-seed-${i + 1}@e2e.local`,
    status: 'FINALIZED',
    track: 'ROADMAP',
    created_by: createdById,
    created_at: seedCreatedAt(i),
  }));

  const { data: projects, error: pErr } = await supabase
    .from('projects')
    .insert(projectRows)
    .select('id');
  if (pErr || !projects || projects.length !== count) {
    throw new Error(`[seedGalleryItems] 프로젝트 생성 실패: ${pErr?.message ?? '개수 불일치'}`);
  }

  const roadmapRows = projects.map((p, i) => ({
    project_id: p.id as string,
    version_number: 1,
    status: 'FINAL',
    is_shared: true,
    // 카드에 요약이 렌더되고 검색 대상(diagnosis_summary)이기도 하다
    diagnosis_summary: `${SEED_TAG} 진단 요약 ${i + 1} — 스크롤 회귀 감시를 위한 시드 데이터입니다.`,
    created_by: ownerId,
    finalized_by: createdById,
    finalized_at: seedCreatedAt(i),
    created_at: seedCreatedAt(i),
  }));

  const { error: rErr } = await supabase.from('roadmap_versions').insert(roadmapRows);
  if (rErr) {
    await purgeSeededProjects();
    throw new Error(`[seedGalleryItems] 로드맵 생성 실패: ${rErr.message}`);
  }

  return projects.map((p) => p.id as string);
}

/**
 * 갤러리 시드의 생성·정리를 현재 파일에 등록한다. spec 최상단에서 한 번 호출.
 *
 * 갤러리 스크롤 감시 8건이 모두 같은 조건(공유된 FINAL 로드맵 다수)을 요구하므로
 * beforeAll/afterAll 을 8곳에 복붙하는 대신 여기로 모은다.
 *
 * 기본 **24개**인 이유: 13개면 2페이지가 생기긴 하지만 2페이지에 카드가 1장뿐이라
 * 문서가 뷰포트보다 짧아져 스크롤이 사라진다(페이지네이션 감시가 다시 무력화된다).
 * 24개면 2페이지도 12장이 차서 양쪽 페이지 모두 스크롤이 남는다.
 */
export function registerGallerySeed(count = 24): void {
  test.beforeAll(async () => {
    const [ownerId, createdById] = await Promise.all([
      fetchUserIdByEmail(process.env.E2E_CONSULTANT_EMAIL),
      fetchUserIdByEmail(process.env.E2E_OPS_ADMIN_EMAIL),
    ]);
    await seedGalleryItems(count, ownerId, createdById);
  });

  test.afterAll(async () => {
    await purgeSeededProjects();
  });
}

// ─── 컨설턴트 담당 프로젝트 ────────────────────────────────────────────────────

/** 컨설턴트 담당 프로젝트 시드의 상태 — 배정 완료가 자연스러운 기본값. */
export const CONSULTANT_PROJECT_STATUS = 'ASSIGNED';

/**
 * 컨설턴트에게 **배정된** 프로젝트를 `count` 개 만든다.
 *
 * `seedGalleryItems` 와 달리 `assigned_consultant_id` 를 **채운다** — 컨설턴트 프로젝트
 * 목록에 나타나야 그 화면의 스크롤 감시가 살아나기 때문이다. 대신 `created_at` 을 2025년으로
 * 고정해 `findFirstLinkHref` 가 집는 "첫 프로젝트"(시드기업B)를 밀어내지 않는다 —
 * 이 전제에 기대는 spec 이 9개 있다.
 *
 * 목록은 `created_at DESC` 정렬이고 **페이지네이션이 없다**
 * (`consultant/projects/actions.ts:82`) → 개수를 늘리면 그만큼 문서가 길어진다.
 * 상태 필터는 워크플로 단계 키가 아니라 **실제 status 값**을 그대로 쓴다(같은 파일 L76).
 *
 * ⚠️ **`project_assignments` 행이 없으면 목록에 나타나지 않는다.** 조회가
 * `project_assignments!inner(...)` + `.eq('project_assignments.is_current', true)` 로
 * **inner join** 하기 때문이다(같은 파일 L64-68). `projects` 만 만들면 12개를 넣어도
 * 화면에는 기존 3건만 보인다(2026-07-30 계측으로 확인).
 */
export async function seedConsultantProjects(
  count: number,
  consultantId: string,
  createdById: string
): Promise<string[]> {
  await purgeSeededProjects();

  const rows = Array.from({ length: count }, (_, i) => ({
    company_name: `${SEED_TAG}담당기업${String(i + 1).padStart(2, '0')}`,
    industry: INDUSTRIES[i % INDUSTRIES.length],
    company_size: '50~299명',
    contact_name: `${SEED_TAG}담당자${i + 1}`,
    contact_email: `scroll-consultant-proj-${i + 1}@e2e.local`,
    status: CONSULTANT_PROJECT_STATUS,
    track: 'ROADMAP',
    assigned_consultant_id: consultantId,
    created_by: createdById,
    created_at: seedCreatedAt(i),
  }));

  const { data, error } = await supabase.from('projects').insert(rows).select('id');
  if (error || !data || data.length !== count) {
    throw new Error(`[seedConsultantProjects] 생성 실패: ${error?.message ?? '개수 불일치'}`);
  }

  // 배정 이력 — 위 주석 참고. projects 삭제 시 CASCADE 로 함께 사라진다.
  const assignmentRows = data.map((p, i) => ({
    project_id: p.id as string,
    consultant_id: consultantId,
    assigned_by: createdById,
    assignment_reason: `${SEED_TAG} 스크롤 감시용 시드 배정`,
    is_current: true,
    assigned_at: seedCreatedAt(i),
  }));

  const { error: aErr } = await supabase.from('project_assignments').insert(assignmentRows);
  if (aErr) {
    await purgeSeededProjects();
    throw new Error(`[seedConsultantProjects] 배정 이력 생성 실패: ${aErr.message}`);
  }

  return data.map((r) => r.id as string);
}

/** 컨설턴트 담당 프로젝트 시드의 생성·정리를 현재 파일에 등록한다. */
export function registerConsultantProjectSeed(count = 12): void {
  test.beforeAll(async () => {
    const [consultantId, createdById] = await Promise.all([
      fetchUserIdByEmail(process.env.E2E_CONSULTANT_EMAIL),
      fetchUserIdByEmail(process.env.E2E_OPS_ADMIN_EMAIL),
    ]);
    await seedConsultantProjects(count, consultantId, createdById);
  });

  test.afterAll(async () => {
    await purgeSeededProjects();
  });
}

// ─── 메시지(DM) ────────────────────────────────────────────────────────────────

/**
 * 두 사용자 사이의 대화방을 확보하고 메시지를 `messageCount` 개 채운다.
 *
 * 메시지 스레드 감시는 **스레드 내부**가 스크롤 가능해야 실행된다
 * (`scrollHeight - clientHeight > 250`). 기존 `ensureTestConversation`
 * (`cleanup.helper.ts:32`)은 대화방과 초기 메시지 1건만 만들어 그 조건에 못 미친다.
 *
 * 대화방은 재사용하고 **시드 메시지만 지웠다 다시 채운다** — 대화방을 지우면
 * `conversation_participants` 의 읽음 시점 등 다른 spec 이 기대는 상태까지 사라진다.
 */
export async function seedConversationMessages(
  opsEmail: string | undefined,
  consultantEmail: string | undefined,
  messageCount = 40
): Promise<string> {
  const [opsId, consultantId] = await Promise.all([
    fetchUserIdByEmail(opsEmail),
    fetchUserIdByEmail(consultantEmail),
  ]);

  // 두 사람이 모두 참여하는 대화방 찾기
  const { data: opsRooms } = await supabase
    .from('conversation_participants')
    .select('conversation_id')
    .eq('user_id', opsId);

  let conversationId: string | null = null;
  for (const row of opsRooms ?? []) {
    const { data: partner } = await supabase
      .from('conversation_participants')
      .select('user_id')
      .eq('conversation_id', row.conversation_id)
      .eq('user_id', consultantId)
      .maybeSingle();
    if (partner) {
      conversationId = row.conversation_id as string;
      break;
    }
  }

  if (!conversationId) {
    const { data: conv, error } = await supabase
      .from('conversations')
      .insert({ last_message_at: new Date().toISOString() })
      .select('id')
      .single();
    if (error || !conv) {
      throw new Error(`[seedConversationMessages] 대화방 생성 실패: ${error?.message}`);
    }
    conversationId = conv.id as string;

    const { error: pErr } = await supabase.from('conversation_participants').insert([
      { conversation_id: conversationId, user_id: opsId },
      { conversation_id: conversationId, user_id: consultantId },
    ]);
    if (pErr) {
      throw new Error(`[seedConversationMessages] 참여자 등록 실패: ${pErr.message}`);
    }
  }

  await purgeSeededMessages();

  const rows = Array.from({ length: messageCount }, (_, i) => ({
    conversation_id: conversationId as string,
    // 양쪽이 번갈아 말해야 실제 대화처럼 렌더된다(정렬·말풍선 방향)
    sender_id: i % 2 === 0 ? opsId : consultantId,
    content: `${SEED_TAG} 시드 메시지 ${String(i + 1).padStart(2, '0')}`,
  }));

  const { error: mErr } = await supabase.from('messages').insert(rows);
  if (mErr) {
    throw new Error(`[seedConversationMessages] 메시지 생성 실패: ${mErr.message}`);
  }
  return conversationId as string;
}

/** 태그가 붙은 시드 메시지만 제거한다(대화방·참여자는 보존). */
export async function purgeSeededMessages(): Promise<void> {
  const { error } = await supabase.from('messages').delete().like('content', `${SEED_TAG}%`);
  if (error) {
    throw new Error(`[purgeSeededMessages] 정리 실패: ${error.message}`);
  }
}

/** 메시지 시드의 생성·정리를 현재 파일에 등록한다. */
export function registerMessageSeed(messageCount = 40): void {
  test.beforeAll(async () => {
    await seedConversationMessages(
      process.env.E2E_OPS_ADMIN_EMAIL,
      process.env.E2E_CONSULTANT_EMAIL,
      messageCount
    );
  });

  test.afterAll(async () => {
    await purgeSeededMessages();
  });
}

// ─── 공지사항 ──────────────────────────────────────────────────────────────────

/** 태그가 붙은 시드 공지를 제거한다. 첨부(`notice_attachments`)는 CASCADE. */
export async function purgeSeededNotices(): Promise<void> {
  const { error } = await supabase.from('notices').delete().like('title', `${SEED_TAG}%`);
  if (error) {
    throw new Error(`[purgeSeededNotices] 정리 실패: ${error.message}`);
  }
}

/**
 * 공지를 `count` 개 만든다.
 *
 * 목록은 `per_page=10`(`notices/page.tsx:49`)이므로 **24개**면 2페이지도 가득 차
 * 페이지네이션 감시까지 살아난다. 13개처럼 애매한 수는 2페이지가 짧아져 다시 skip 된다.
 */
export async function seedNotices(count: number, authorId: string): Promise<string[]> {
  await purgeSeededNotices();

  const rows = Array.from({ length: count }, (_, i) => ({
    title: `${SEED_TAG} 공지 ${String(i + 1).padStart(2, '0')}`,
    body: `스크롤 회귀 감시를 위한 시드 공지 본문입니다. (${i + 1}번)`,
    author_id: authorId,
    created_at: seedCreatedAt(i),
  }));

  const { data, error } = await supabase.from('notices').insert(rows).select('id');
  if (error || !data || data.length !== count) {
    throw new Error(`[seedNotices] 생성 실패: ${error?.message ?? '개수 불일치'}`);
  }
  return data.map((r) => r.id as string);
}

/** 공지 시드의 생성·정리를 현재 파일에 등록한다. spec 최상단에서 한 번 호출. */
export function registerNoticeSeed(count = 24): void {
  test.beforeAll(async () => {
    const authorId = await fetchUserIdByEmail(process.env.E2E_OPS_ADMIN_EMAIL);
    await seedNotices(count, authorId);
  });

  test.afterAll(async () => {
    await purgeSeededNotices();
  });
}

// ─── 감사 로그 ─────────────────────────────────────────────────────────────────

/**
 * 시드 감사 로그 식별자 — `target_type` 에 태그를 넣어 정리 기준으로 쓴다.
 *
 * spec 에서도 쓴다: 감사 화면의 "필터 초기화" 버튼은 `hasFilters` 가
 * `action||target||user||start||end` 일 때만 렌더되고 **`search` 는 포함되지 않는다**
 * (`AuditLogClient.tsx:328`). 그래서 초기화 감시는 `?target=<이 값>` 으로 진입해야 한다.
 */
export const AUDIT_TARGET_TYPE = `${SEED_TAG}대상`;

/** 태그가 붙은 시드 감사 로그를 제거한다. */
export async function purgeSeededAuditLogs(): Promise<void> {
  const { error } = await supabase.from('audit_logs').delete().eq('target_type', AUDIT_TARGET_TYPE);
  if (error) {
    throw new Error(`[purgeSeededAuditLogs] 정리 실패: ${error.message}`);
  }
}

/**
 * 감사 로그를 `count` 개 만든다. `AUDIT_PAGE_SIZE=20` 이므로 40개면 2페이지가 찬다.
 *
 * `actor_user_id` 를 **한 사람으로 통일하는 것이 중요하다** — 감사 로그 검색은 서버가
 * 아니라 클라이언트에서 `actor.name`/`actor.email`/`target_id` 로 필터한다
 * (`AuditLogClient.tsx:228-233`). 작성자를 통일해 두면 spec 이 그 이메일로 검색해 목록을
 * 남길 수 있고, 결과가 0건이 되어 문서가 짧아지는 바람에 감시가 다시 skip 되는 일을 막는다.
 *
 * `actor_user_id` 는 FK `ON DELETE RESTRICT` 이므로 **기존 사용자를 재사용**한다.
 */
export async function seedAuditLogs(count: number, actorId: string): Promise<void> {
  await purgeSeededAuditLogs();

  const rows = Array.from({ length: count }, (_, i) => ({
    actor_user_id: actorId,
    action: 'PROJECT_UPDATE' as const,
    target_type: AUDIT_TARGET_TYPE,
    // target_id 는 UUID NOT NULL — 실제 행을 가리키지 않아도 스키마상 문제없다
    target_id: crypto.randomUUID(),
    meta: { seed: SEED_TAG, index: i + 1 },
    success: true,
    created_at: seedCreatedAt(i),
  }));

  const { error } = await supabase.from('audit_logs').insert(rows);
  if (error) {
    throw new Error(`[seedAuditLogs] 생성 실패: ${error.message}`);
  }
}

/** 감사 로그 시드의 생성·정리를 현재 파일에 등록한다. */
export function registerAuditLogSeed(count = 40): void {
  test.beforeAll(async () => {
    const actorId = await fetchUserIdByEmail(process.env.E2E_OPS_ADMIN_EMAIL);
    await seedAuditLogs(count, actorId);
  });

  test.afterAll(async () => {
    await purgeSeededAuditLogs();
  });
}

// ─── 더미 컨설턴트 (사용자 관리 목록) ──────────────────────────────────────────

/**
 * 시드 컨설턴트 이메일 접두. 실 사용자·다른 spec 의 더미와 구분된다
 * (`dummy-user.helper.ts` 는 `e2e-dummy-consultant@e2e.local` 하나만 쓴다).
 */
const CONSULTANT_EMAIL_PREFIX = 'e2e-scroll-consultant-';

/**
 * 접두가 붙은 더미 컨설턴트를 전량 제거한다.
 *
 * `public.users` → `auth.users` 순서를 지켜야 한다(FK). `consultant_profiles` 는 CASCADE.
 */
export async function purgeSeededConsultants(): Promise<void> {
  const { data: rows, error } = await supabase
    .from('users')
    .select('id')
    .like('email', `${CONSULTANT_EMAIL_PREFIX}%`);
  if (error) {
    throw new Error(`[purgeSeededConsultants] 조회 실패: ${error.message}`);
  }

  for (const row of rows ?? []) {
    const id = row.id as string;
    await supabase.from('notifications').delete().eq('user_id', id);
    await supabase.from('projects').delete().eq('assigned_consultant_id', id);
    await supabase.from('users').delete().eq('id', id);
    await supabase.auth.admin.deleteUser(id);
  }
}

/**
 * 승인된 더미 컨설턴트를 `count` 명 만든다.
 *
 * 사용자 관리 목록은 운영관리자에게 **컨설턴트 역할만** 보여주므로
 * (`OPS_ADMIN_MANAGEABLE_ROLES = CONSULTANT_ROLES`) 역할을 `CONSULTANT_APPROVED` 로 둔다.
 * `public.users` 는 `auth.users(id)` 를 참조하므로 양쪽을 함께 만들어야 한다
 * (auto-sync 트리거는 없다 — `dummy-user.helper.ts:9` 와 같은 이유).
 */
export async function seedConsultants(count: number): Promise<string[]> {
  await purgeSeededConsultants();

  const ids: string[] = [];
  for (let i = 0; i < count; i++) {
    const email = `${CONSULTANT_EMAIL_PREFIX}${String(i + 1).padStart(2, '0')}@e2e.local`;
    const created = await supabase.auth.admin.createUser({
      email,
      password: 'dummy-e2e-pw-!1',
      email_confirm: true,
    });
    if (created.error || !created.data.user) {
      throw new Error(`[seedConsultants] auth 생성 실패(${email}): ${created.error?.message}`);
    }
    const id = created.data.user.id;

    const { error } = await supabase.from('users').insert({
      id,
      email,
      name: `${SEED_TAG}컨설턴트${String(i + 1).padStart(2, '0')}`,
      role: 'CONSULTANT_APPROVED',
      status: 'ACTIVE',
    });
    if (error) {
      await supabase.auth.admin.deleteUser(id);
      throw new Error(`[seedConsultants] public.users INSERT 실패(${email}): ${error.message}`);
    }
    ids.push(id);
  }
  return ids;
}

/** 더미 컨설턴트 시드의 생성·정리를 현재 파일에 등록한다. */
export function registerConsultantSeed(count = 12): void {
  test.beforeAll(async () => {
    await seedConsultants(count);
  });

  test.afterAll(async () => {
    await purgeSeededConsultants();
  });
}

/** 이메일로 사용자 ID 조회 — 시드 소유자 지정에 사용. */
export async function fetchUserIdByEmail(email: string | undefined): Promise<string> {
  if (!email) {
    throw new Error('[fetchUserIdByEmail] 이메일이 비어 있습니다 — E2E_* 환경변수를 확인하세요.');
  }
  const { data, error } = await supabase.from('users').select('id').eq('email', email).single();
  if (error || !data) {
    throw new Error(`[fetchUserIdByEmail] ${email} 조회 실패: ${error?.message ?? '없음'}`);
  }
  return data.id as string;
}
