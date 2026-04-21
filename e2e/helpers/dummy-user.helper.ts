// e2e/helpers/dummy-user.helper.ts
//
// E2E에서 "다른 컨설턴트"가 필요한 spec(재배정·격리 검증 등)을 위해
// 일시적인 더미 사용자를 생성/삭제한다.
//
// 설계 원칙:
// - **선청소 → 생성**: 이전 실행이 afterAll 도달 전 중단돼 잔여가 남아도
//   동일 email로 재실행이 가능하도록 beforeAll에서 먼저 지운다.
// - auth.users INSERT 후 public.users row는 auto-sync 트리거가 없으므로 수동 INSERT.
// - 이메일 prefix에 'e2e-' 접두를 붙여 실 사용자와 식별.
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

export interface DummyConsultant {
  id: string;
  email: string;
  name: string;
}

/**
 * 동일 email을 가진 기존 더미 사용자(auth + public)를 제거한다.
 * 중간 단계 실패에도 멱등적으로 동작.
 */
async function purgeExisting(email: string): Promise<void> {
  // public.users 먼저 (FK 참조 정리)
  const { data: pub } = await supabase
    .from('users')
    .select('id')
    .eq('email', email)
    .maybeSingle();
  if (pub?.id) {
    // 해당 user가 남긴 프로젝트·알림 등도 함께 제거
    await supabase.from('notifications').delete().eq('user_id', pub.id);
    await supabase.from('projects').delete().eq('assigned_consultant_id', pub.id);
    await supabase.from('users').delete().eq('id', pub.id);
  }

  // auth.users 검색 후 제거
  const { data } = await supabase.auth.admin.listUsers({ perPage: 1000 });
  const match = data?.users.find((u) => u.email === email);
  if (match?.id) {
    await supabase.auth.admin.deleteUser(match.id);
  }
}

/**
 * 선청소 후 더미 CONSULTANT_APPROVED 사용자를 생성한다.
 * @returns 생성된 사용자(id/email/name)
 */
export async function createDummyConsultant(
  emailSeed = 'e2e-dummy-consultant',
): Promise<DummyConsultant> {
  const email = `${emailSeed}@e2e.local`;
  const name = 'E2E더미컨설턴트';
  const password = 'dummy-e2e-pw-!1';

  // 선청소: 잔여 auth + public rows 제거
  await purgeExisting(email);

  // auth.users 생성
  const created = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (created.error || !created.data.user) {
    throw new Error(`[createDummyConsultant] auth 생성 실패: ${created.error?.message}`);
  }
  const id = created.data.user.id;

  // public.users 수동 INSERT (auto-sync 트리거 부재)
  const { error: pubErr } = await supabase.from('users').insert({
    id,
    email,
    name,
    role: 'CONSULTANT_APPROVED',
    status: 'ACTIVE',
  });
  if (pubErr) {
    // 롤백
    await supabase.auth.admin.deleteUser(id);
    throw new Error(`[createDummyConsultant] public.users INSERT 실패: ${pubErr.message}`);
  }

  return { id, email, name };
}

/**
 * 더미 사용자와 연관된 데이터 일괄 제거. afterAll에서 호출.
 */
export async function deleteDummyConsultant(userId: string): Promise<void> {
  // public.users의 FK 연관 데이터부터 정리
  await supabase.from('notifications').delete().eq('user_id', userId);
  await supabase.from('projects').delete().eq('assigned_consultant_id', userId);
  await supabase.from('users').delete().eq('id', userId);
  await supabase.auth.admin.deleteUser(userId);
}
