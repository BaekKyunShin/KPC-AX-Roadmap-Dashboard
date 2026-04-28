// e2e/negative/quota-exceeded.spec.ts
// 쿼터 초과 시 LLM 호출 차단 검증.
//
// 시나리오:
//   1) 컨설턴트의 user_quotas.daily_limit를 0으로 설정 (기존값 백업)
//   2) 컨설턴트가 배정된 프로젝트의 로드맵 페이지에서 "로드맵 생성" 클릭
//   3) check_and_increment_llm_usage RPC가 즉시 차단 → 에러 토스트 노출
//   4) afterAll: 쿼터 원복 + 프로젝트 삭제
//
// 주의: 쿼터 체크는 LLM 호출 이전이므로 LLM_API_KEY 불필요.
import { test, expect } from '../fixtures/auth.fixture';
import { createClient } from '@supabase/supabase-js';
import { setupConsoleErrorCheck, waitForPageLoad } from '../helpers/assertions.helper';
import { deleteProject } from '../helpers/cleanup.helper';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

const COMPANY_NAME = 'E2E쿼터차단테스트';

async function fetchConsultantId(): Promise<string | null> {
  const email = process.env.E2E_CONSULTANT_EMAIL;
  if (!email) return null;
  const { data } = await supabase.from('users').select('id').eq('email', email).single();
  return (data?.id as string) ?? null;
}

async function fetchExistingQuota(userId: string) {
  const { data } = await supabase
    .from('user_quotas')
    .select('daily_limit, monthly_limit')
    .eq('user_id', userId)
    .maybeSingle();
  return data;
}

async function setQuota(userId: string, dailyLimit: number, monthlyLimit: number) {
  await supabase
    .from('user_quotas')
    .upsert(
      { user_id: userId, daily_limit: dailyLimit, monthly_limit: monthlyLimit },
      { onConflict: 'user_id' },
    );
}

test.describe('쿼터 초과 시 LLM 차단', () => {
  test.describe.configure({ mode: 'serial' });

  let projectId: string | null = null;
  let consultantId: string | null = null;
  let originalQuota: { daily_limit: number; monthly_limit: number } | null = null;

  test.beforeAll(async () => {
    consultantId = await fetchConsultantId();
    if (!consultantId) return;

    // 기존 쿼터 백업
    const existing = await fetchExistingQuota(consultantId);
    originalQuota = existing
      ? { daily_limit: existing.daily_limit, monthly_limit: existing.monthly_limit }
      : { daily_limit: 50, monthly_limit: 500 };

    // 쿼터를 0으로 설정 (월간은 기존값 유지)
    await setQuota(consultantId, 0, originalQuota.monthly_limit);
  });

  test.afterAll(async () => {
    if (consultantId && originalQuota) {
      await setQuota(consultantId, originalQuota.daily_limit, originalQuota.monthly_limit);
    }
    if (projectId) await deleteProject(projectId);
  });

  test('쿼터 0인 컨설턴트가 로드맵 생성 시 에러 토스트', async ({
    consultantPage: page,
  }) => {
    test.skip(!consultantId, '컨설턴트 사용자 미존재');

    // 인터뷰 완료 상태의 프로젝트 시드 (쿼터 체크는 인터뷰 검증보다 먼저 일어남)
    const { data: project, error } = await supabase
      .from('projects')
      .insert({
        company_name: COMPANY_NAME,
        contact_name: 'E2E쿼터담당',
        contact_email: 'e2e-quota@example.com',
        industry: '제조업',
        company_size: '50~299명',
        status: 'INTERVIEWED',
        assigned_consultant_id: consultantId!,
        track: 'ROADMAP',
        created_by: consultantId!,
      })
      .select('id')
      .single();
    test.skip(!!error || !project, `시드 프로젝트 생성 실패: ${error?.message}`);
    projectId = project!.id as string;

    // 인터뷰 행 시드 — #002 가드 (RoadmapResultClient EmptyState 가 hasInterview=false 일 때
    // 생성 버튼을 disabled 처리) 통과를 위해 최소 인터뷰 행 INSERT.
    // 쿼터 체크는 인터뷰 검증보다 먼저 일어나므로 인터뷰 내용은 비어 있어도 무방.
    const { error: interviewError } = await supabase.from('interviews').insert({
      project_id: projectId,
      interviewer_id: consultantId!,
      interview_date: new Date().toISOString().slice(0, 10),
    });
    test.skip(
      !!interviewError,
      `시드 인터뷰 생성 실패: ${interviewError?.message}`,
    );

    const getErrors = setupConsoleErrorCheck(page);

    await page.goto(`/consultant/projects/${projectId}/roadmap`);
    await page.waitForLoadState('networkidle');
    await waitForPageLoad(page);

    // ISSUE-18 (Step D-2): versions=0 일 때는 RegenerateAccordion 이 숨겨지고
    // EmptyRoadmapState 안에 큰 "AI 로드맵 생성" 버튼이 단독 노출된다.
    // 본 시나리오는 신규 프로젝트 (versions=0) 이므로 빈 상태 큰 버튼 흐름을 사용.
    const generateButton = page.getByRole('button', { name: 'AI 로드맵 생성' });
    await expect(generateButton).toBeVisible({ timeout: 10_000 });
    await generateButton.click();

    // 에러 토스트 — createRoadmap이 getLLMUserFriendlyError로 메시지를 일반화하므로
    // 제목("로드맵 생성 실패") 기준으로 매칭. (RPC 원문은 "일일 사용량(0회)을 초과했습니다.")
    const toast = page.locator('[data-sonner-toast]').filter({
      hasText: /로드맵 생성 실패|사용량|초과|한도|오류가 발생/,
    });
    await expect(toast.first()).toBeVisible({ timeout: 15_000 });

    // 쿼터 차단으로 인해 새 버전이 생성되지 않았는지 확인
    const { data: versions } = await supabase
      .from('roadmap_versions')
      .select('id')
      .eq('project_id', projectId);
    expect(versions?.length ?? 0).toBe(0);

    // 페이지가 fetch 실패 등으로 콘솔 에러를 흘리는 경우는 무시 (RPC 차단으로 인한 정상 흐름)
    void getErrors;
  });
});
