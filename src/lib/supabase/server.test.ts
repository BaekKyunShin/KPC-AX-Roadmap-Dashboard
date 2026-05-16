/**
 * server supabase client 테스트
 *
 * 비번 재설정 메일 흐름이 PKCE(default) 가 아닌 implicit grant 로 동작하려면
 * createServerClient 호출 시 `auth: { flowType: 'implicit' }` 옵션이 필수다.
 * PKCE 는 code_verifier 를 요청자 디바이스 cookie 에 저장하므로 다른 디바이스/
 * 시크릿창/모바일에서 메일 링크 클릭 시 verifier 부재로 실패한다.
 *
 * client.ts(브라우저) 와 server.ts(서버) 모두 implicit 로 통일되어야 메일 링크가
 * fragment(#access_token=...) 형식으로 발송되어 디바이스 격리 문제가 사라진다.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

const createServerClientMock = vi.fn();
vi.mock('@supabase/ssr', () => ({
  createServerClient: (...args: unknown[]) => createServerClientMock(...args),
}));
vi.mock('next/headers', () => ({
  cookies: async () => ({ getAll: () => [], set: vi.fn() }),
}));

import { createClient } from './server';

beforeEach(() => {
  createServerClientMock.mockReset();
  createServerClientMock.mockReturnValue({});
});

describe('server supabase client', () => {
  it('createServerClient 호출 시 auth.flowType: implicit 설정을 포함한다', async () => {
    await createClient();

    expect(createServerClientMock).toHaveBeenCalledTimes(1);
    const lastCall = createServerClientMock.mock.calls.at(-1)!;
    const config = lastCall[2] as { auth?: { flowType?: string } };
    expect(config.auth?.flowType).toBe('implicit');
  });

  it('SUPABASE_URL · ANON_KEY 를 env 에서 그대로 전달한다', async () => {
    await createClient();

    const lastCall = createServerClientMock.mock.calls.at(-1)!;
    expect(lastCall[0]).toBe(process.env.NEXT_PUBLIC_SUPABASE_URL);
    expect(lastCall[1]).toBe(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  });
});
