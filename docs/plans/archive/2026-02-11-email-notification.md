# 이메일 알림 기능 구현 계획

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 관리자(OPS_ADMIN, SYSTEM_ADMIN)가 새 메시지 수신 시 Resend를 통해 이메일 알림을 받을 수 있도록 한다.

**Architecture:** Resend SDK로 이메일 발송 서비스를 만들고, sendMessage Server Action 성공 후 비동기로 이메일을 발송한다. 5분 인메모리 throttle로 중복을 방지하고, users 테이블의 email_notify_enabled 컬럼으로 on/off를 제어한다.

**Tech Stack:** Resend (이메일), Zod (검증), Vitest (테스트)

---

### Task 1: Resend 패키지 설치

**Step 1: 패키지 설치**

Run: `npm install resend`

**Step 2: 커밋**

```bash
git add package.json package-lock.json
git commit -m "chore: resend 패키지 설치"
```

---

### Task 2: DB 마이그레이션 - email_notify_enabled 컬럼 추가

**Files:**
- Create: `supabase/migrations/023_add_email_notification_settings.sql`

**Step 1: 마이그레이션 SQL 작성**

```sql
-- users 테이블에 이메일 알림 설정 컬럼 추가
ALTER TABLE users
ADD COLUMN email_notify_enabled BOOLEAN NOT NULL DEFAULT FALSE;

COMMENT ON COLUMN users.email_notify_enabled IS '이메일 알림 활성화 여부 (관리자 전용)';
```

- 기본값 FALSE (opt-in 방식)
- 기존 RLS UPDATE 정책이 본인 레코드만 수정 가능하도록 이미 보장

**Step 2: 커밋**

```bash
git add supabase/migrations/023_add_email_notification_settings.sql
git commit -m "feat: users 테이블에 email_notify_enabled 컬럼 추가"
```

---

### Task 3: 이메일 서비스 - throttle 로직 테스트 (TDD RED)

**Files:**
- Create: `src/lib/services/email.test.ts`

**Step 1: throttle 단위 테스트 작성**

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';

// 테스트 대상 함수들은 Task 4에서 구현
import { isThrottled, recordSend, clearThrottleMap } from './email';

describe('이메일 throttle 로직', () => {
  beforeEach(() => {
    clearThrottleMap();
  });

  it('첫 발송은 throttle되지 않아야 한다', () => {
    expect(isThrottled('sender1', 'recipient1')).toBe(false);
  });

  it('발송 기록 후 5분 이내에는 throttle되어야 한다', () => {
    recordSend('sender1', 'recipient1');
    expect(isThrottled('sender1', 'recipient1')).toBe(true);
  });

  it('다른 수신자에 대해서는 throttle되지 않아야 한다', () => {
    recordSend('sender1', 'recipient1');
    expect(isThrottled('sender1', 'recipient2')).toBe(false);
  });

  it('5분이 지나면 throttle이 해제되어야 한다', () => {
    vi.useFakeTimers();
    recordSend('sender1', 'recipient1');
    expect(isThrottled('sender1', 'recipient1')).toBe(true);

    vi.advanceTimersByTime(5 * 60 * 1000 + 1);
    expect(isThrottled('sender1', 'recipient1')).toBe(false);

    vi.useRealTimers();
  });
});
```

**Step 2: 테스트 실행 (FAIL 확인)**

Run: `npm run test -- src/lib/services/email.test.ts`
Expected: FAIL (모듈 없음)

---

### Task 4: 이메일 서비스 - throttle 구현 (TDD GREEN)

**Files:**
- Create: `src/lib/services/email.ts`

**Step 1: throttle 로직 + 이메일 발송 함수 구현**

```typescript
import { Resend } from 'resend';

// =============================================================================
// Resend 클라이언트
// =============================================================================

const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

const EMAIL_FROM = process.env.EMAIL_FROM || 'KPC 알림 <onboarding@resend.dev>';
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

// =============================================================================
// Throttle (5분 중복 방지)
// =============================================================================

const THROTTLE_DURATION_MS = 5 * 60 * 1000;
const THROTTLE_MAP_MAX_SIZE = 1000;

const throttleMap = new Map<string, number>();

export function isThrottled(senderId: string, recipientId: string): boolean {
  const key = `${senderId}:${recipientId}`;
  const lastSent = throttleMap.get(key);
  if (lastSent && Date.now() - lastSent < THROTTLE_DURATION_MS) {
    return true;
  }
  return false;
}

export function recordSend(senderId: string, recipientId: string): void {
  // 메모리 누수 방지: 크기 제한 초과 시 전체 클리어
  if (throttleMap.size >= THROTTLE_MAP_MAX_SIZE) {
    throttleMap.clear();
  }
  const key = `${senderId}:${recipientId}`;
  throttleMap.set(key, Date.now());
}

export function clearThrottleMap(): void {
  throttleMap.clear();
}

// =============================================================================
// 이메일 발송
// =============================================================================

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

interface SendNewMessageEmailParams {
  to: string;
  senderName: string;
  messagePreview: string;
  conversationId: string;
}

export async function sendNewMessageEmail(
  params: SendNewMessageEmailParams,
): Promise<void> {
  if (!resend) {
    console.warn('[sendNewMessageEmail] RESEND_API_KEY 미설정, 이메일 건너뜀');
    return;
  }

  const preview = escapeHtml(
    params.messagePreview.length > 100
      ? params.messagePreview.slice(0, 100) + '...'
      : params.messagePreview,
  );
  const link = `${APP_URL}/dashboard/messages?conversation=${params.conversationId}`;

  const { error } = await resend.emails.send({
    from: EMAIL_FROM,
    to: params.to,
    subject: `[KPC] ${params.senderName}님이 메시지를 보냈습니다`,
    html: `
      <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
        <h2 style="color: #1a1a1a; font-size: 18px;">새 메시지가 도착했습니다</h2>
        <p style="color: #666; margin: 8px 0 4px;"><strong>${escapeHtml(params.senderName)}</strong>님이 메시지를 보냈습니다:</p>
        <div style="background: #f5f5f5; padding: 12px 16px; border-radius: 8px; color: #333; margin: 12px 0;">
          ${preview}
        </div>
        <a href="${link}" style="display: inline-block; background: #2563eb; color: #fff; padding: 10px 24px; border-radius: 6px; text-decoration: none; margin-top: 8px;">
          메시지 확인하기
        </a>
        <p style="color: #999; font-size: 12px; margin-top: 24px;">
          이 알림은 KPC AI 훈련 로드맵 대시보드에서 발송되었습니다.<br/>
          프로필 설정에서 이메일 알림을 끌 수 있습니다.
        </p>
      </div>
    `,
  });

  if (error) {
    console.error('[sendNewMessageEmail] 발송 실패:', error);
  }
}
```

**Step 2: 테스트 실행 (PASS 확인)**

Run: `npm run test -- src/lib/services/email.test.ts`
Expected: PASS

**Step 3: 커밋**

```bash
git add src/lib/services/email.ts src/lib/services/email.test.ts
git commit -m "feat: 이메일 발송 서비스 및 throttle 로직 구현"
```

---

### Task 5: sendNewMessageEmailIfNeeded 테스트 (TDD RED)

**Files:**
- Modify: `src/lib/services/email.test.ts`

**Step 1: 조건 분기 테스트 추가**

sendNewMessageEmailIfNeeded 함수의 조건 분기를 테스트:
- 수신자가 관리자가 아니면 발송 안 함
- email_notify_enabled = false면 발송 안 함
- throttle 중이면 발송 안 함
- 조건 충족 시 sendNewMessageEmail 호출

이 함수는 DB 접근이 필요하므로 Supabase를 모킹해야 함.
→ 실제 DB 호출 로직은 통합 수준이므로, throttle 단위 테스트 + sendMessage 내 통합으로 검증.

**Step 2: 테스트 실행 (FAIL 확인)**

---

### Task 6: sendMessage에 이메일 알림 통합

**Files:**
- Modify: `src/app/(dashboard)/dashboard/messages/actions.ts`

**Step 1: sendMessage 함수에 이메일 알림 로직 추가**

sendMessage 함수의 `revalidatePath` 직전에 추가:

```typescript
// 이메일 알림 발송 (비동기, fire-and-forget)
notifyRecipientByEmail(conversationId, user.id, validation.data.content).catch(
  (err) => console.error('[sendMessage] 이메일 알림 오류:', err),
);
```

같은 파일에 private 헬퍼 함수 추가:

```typescript
async function notifyRecipientByEmail(
  conversationId: string,
  senderId: string,
  content: string,
): Promise<void> {
  const adminSupabase = createAdminClient();

  // 1. 대화 상대방 찾기
  const { data: participants } = await adminSupabase
    .from('conversation_participants')
    .select('user_id')
    .eq('conversation_id', conversationId)
    .neq('user_id', senderId);

  if (!participants || participants.length === 0) return;

  const recipientId = participants[0].user_id;

  // 2. 수신자 정보 확인 (역할 + 이메일 알림 설정)
  const { data: recipient } = await adminSupabase
    .from('users')
    .select('role, email_notify_enabled')
    .eq('id', recipientId)
    .single();

  if (!recipient) return;
  if (!['OPS_ADMIN', 'SYSTEM_ADMIN'].includes(recipient.role)) return;
  if (!recipient.email_notify_enabled) return;

  // 3. throttle 확인
  if (isThrottled(senderId, recipientId)) return;

  // 4. 발신자 이름 조회
  const { data: sender } = await adminSupabase
    .from('users')
    .select('name')
    .eq('id', senderId)
    .single();

  // 5. 수신자 이메일 조회 (auth.users)
  const { data: { user: authUser } } = await adminSupabase.auth.admin.getUserById(recipientId);

  if (!authUser?.email) return;

  // 6. 이메일 발송 + throttle 기록
  recordSend(senderId, recipientId);
  await sendNewMessageEmail({
    to: authUser.email,
    senderName: sender?.name || '(알 수 없음)',
    messagePreview: content,
    conversationId,
  });
}
```

**Step 2: import 추가**

```typescript
import { isThrottled, recordSend, sendNewMessageEmail } from '@/lib/services/email';
```

**Step 3: 테스트 실행**

Run: `npm run test`
Expected: PASS

**Step 4: 커밋**

```bash
git add src/app/(dashboard)/dashboard/messages/actions.ts
git commit -m "feat: 메시지 전송 시 관리자 이메일 알림 발송"
```

---

### Task 7: 이메일 알림 설정 Server Action

**Files:**
- Create: `src/app/(dashboard)/dashboard/profile/actions.ts`

**Step 1: Server Action 작성**

```typescript
'use server';

import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import type { SimpleActionResult } from '@/lib/types/action-result';
import type { ActionResult } from '@/lib/types/action-result';

const ADMIN_ROLES = ['OPS_ADMIN', 'SYSTEM_ADMIN'];

export async function fetchEmailNotifySetting(): Promise<ActionResult<{ enabled: boolean }>> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: '로그인이 필요합니다.' };

    const adminSupabase = createAdminClient();
    const { data, error } = await adminSupabase
      .from('users')
      .select('role, email_notify_enabled')
      .eq('id', user.id)
      .single();

    if (error || !data) return { success: false, error: '설정을 불러올 수 없습니다.' };
    if (!ADMIN_ROLES.includes(data.role)) return { success: false, error: '관리자만 사용 가능합니다.' };

    return { success: true, data: { enabled: data.email_notify_enabled } };
  } catch (err) {
    console.error('[fetchEmailNotifySetting] 예외:', err);
    return { success: false, error: '알 수 없는 오류가 발생했습니다.' };
  }
}

export async function updateEmailNotifySetting(enabled: boolean): Promise<SimpleActionResult> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: '로그인이 필요합니다.' };

    const adminSupabase = createAdminClient();

    // 역할 확인
    const { data: userData } = await adminSupabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!userData || !ADMIN_ROLES.includes(userData.role)) {
      return { success: false, error: '관리자만 사용 가능합니다.' };
    }

    const { error } = await adminSupabase
      .from('users')
      .update({ email_notify_enabled: enabled })
      .eq('id', user.id);

    if (error) {
      console.error('[updateEmailNotifySetting]', error);
      return { success: false, error: '설정 변경에 실패했습니다.' };
    }

    return { success: true };
  } catch (err) {
    console.error('[updateEmailNotifySetting] 예외:', err);
    return { success: false, error: '알 수 없는 오류가 발생했습니다.' };
  }
}
```

**Step 2: 커밋**

```bash
git add src/app/(dashboard)/dashboard/profile/actions.ts
git commit -m "feat: 이메일 알림 설정 Server Actions 추가"
```

---

### Task 8: 이메일 알림 설정 UI 컴포넌트

**Files:**
- Create: `src/app/(dashboard)/dashboard/profile/_components/EmailNotifyToggle.tsx`
- Modify: `src/app/(dashboard)/dashboard/profile/page.tsx`

**Step 1: 토글 컴포넌트 생성**

관리자 역할인 경우에만 렌더링되는 독립 컴포넌트.
자체적으로 데이터 fetch + 토글 처리.

**Step 2: 프로필 페이지에 컴포넌트 추가**

기존 ProfileForm 앞에 EmailNotifyToggle 추가.
관리자가 아닌 경우 자동으로 null 반환.

**Step 3: 커밋**

```bash
git add src/app/(dashboard)/dashboard/profile/_components/EmailNotifyToggle.tsx
git add src/app/(dashboard)/dashboard/profile/page.tsx
git commit -m "feat: 이메일 알림 on/off 토글 UI 추가"
```

---

### Task 9: .env.example 업데이트 + 타입 검사

**Files:**
- Modify: `.env.example`

**Step 1: EMAIL_FROM 환경변수 추가**

```
# 이메일 알림 (Resend)
RESEND_API_KEY=
EMAIL_FROM=KPC 알림 <onboarding@resend.dev>
```

**Step 2: 전체 검증**

Run: `npm run validate` (typecheck + lint + test)
Expected: PASS

**Step 3: 최종 커밋**

```bash
git add .env.example
git commit -m "feat: 이메일 알림 기능 완성 (Resend 연동)"
```
