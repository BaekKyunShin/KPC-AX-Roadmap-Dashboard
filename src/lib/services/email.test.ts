import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ─── vi.hoisted: 모듈 로드 전에 환경변수 설정 + 모킹 준비 ─────────────────────
const { mockSendMail, mockCreateTransport, mockAdminClient, resultQueue } =
  vi.hoisted(() => {
    // SMTP 환경변수 설정 (email.ts 모듈 로드 시 transporter 생성에 필요)
    process.env.SMTP_HOST = 'smtp.test.com';
    process.env.SMTP_PORT = '465';
    process.env.SMTP_USER = 'test@test.com';
    process.env.SMTP_PASS = 'test-pass';
    process.env.EMAIL_FROM = 'noreply@test.com';
    process.env.NEXT_PUBLIC_APP_URL = 'https://app.test.com';

    const mockSendMail = vi.fn().mockResolvedValue({ messageId: 'test-id' });
    const mockCreateTransport = vi.fn(() => ({ sendMail: mockSendMail }));

    // ─── 큐 기반 결과 관리 ──────────────────────────────────────────────
    const resultQueue: Array<{ data: unknown; error: unknown }>= [];

    function nextResult() {
      if (resultQueue.length > 0) {
        return resultQueue.shift()!;
      }
      return { data: null, error: null };
    }

    // admin client mock 체이너블
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const mockChainable: Record<string, any> = {};
    const chainMethods = [
      'select',
      'eq',
      'neq',
      'in',
      'not',
      'or',
      'limit',
      'order',
    ];
    for (const m of chainMethods) {
      mockChainable[m] = vi.fn(() => mockChainable);
    }

    // single()과 thenable은 같은 큐에서 소비
    mockChainable.single = vi.fn(() => nextResult());
    mockChainable.maybeSingle = vi.fn(() => nextResult());
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mockChainable.then = (resolve: (v: any) => void, reject?: (e: any) => void) => {
      return Promise.resolve(nextResult()).then(resolve, reject);
    };

    const mockAdminClient = {
      from: vi.fn(() => mockChainable),
      auth: {
        admin: {
          getUserById: vi.fn().mockResolvedValue({ data: { user: null } }),
        },
      },
      _chainable: mockChainable,
    };

    return { mockSendMail, mockCreateTransport, mockAdminClient, resultQueue };
  });

// ─── 모듈 모킹 (vi.mock은 자동으로 호이스팅됨) ────────────────────────────────
vi.mock('nodemailer', () => ({
  default: { createTransport: mockCreateTransport },
}));

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: vi.fn(() => mockAdminClient),
}));

vi.mock('@/lib/constants/message', () => ({
  EMAIL_NOTIFY_ROLES: ['SYSTEM_ADMIN', 'OPS_ADMIN', 'CONSULTANT_APPROVED'],
}));

// ─── 모킹 후 import ────────────────────────────────────────────────────────────
import {
  isThrottled,
  recordSend,
  clearThrottleMap,
  sendNewMessageEmail,
  notifyRecipientByEmail,
} from './email';

// =============================================================================
// 1. 기존 throttle 테스트
// =============================================================================

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

  it('다른 발신자에 대해서는 throttle되지 않아야 한다', () => {
    recordSend('sender1', 'recipient1');
    expect(isThrottled('sender2', 'recipient1')).toBe(false);
  });

  it('5분이 지나면 throttle이 해제되어야 한다', () => {
    vi.useFakeTimers();
    try {
      recordSend('sender1', 'recipient1');
      expect(isThrottled('sender1', 'recipient1')).toBe(true);

      vi.advanceTimersByTime(5 * 60 * 1000 + 1);
      expect(isThrottled('sender1', 'recipient1')).toBe(false);
    } finally {
      vi.useRealTimers();
    }
  });

  it('clearThrottleMap 호출 후 모든 throttle이 해제되어야 한다', () => {
    recordSend('sender1', 'recipient1');
    recordSend('sender2', 'recipient2');
    clearThrottleMap();
    expect(isThrottled('sender1', 'recipient1')).toBe(false);
    expect(isThrottled('sender2', 'recipient2')).toBe(false);
  });
});

// =============================================================================
// 2. sendNewMessageEmail 테스트
// =============================================================================

describe('sendNewMessageEmail', () => {
  beforeEach(() => {
    mockSendMail.mockClear();
    mockSendMail.mockResolvedValue({ messageId: 'test-id' });
  });

  it('정상 발송 → sendMail이 올바른 인자로 호출되어야 한다', async () => {
    await sendNewMessageEmail({
      to: 'recipient@test.com',
      senderName: '홍길동',
      messagePreview: '안녕하세요, 테스트 메시지입니다.',
      conversationId: 'conv-123',
    });

    expect(mockSendMail).toHaveBeenCalledOnce();
    const callArgs = mockSendMail.mock.calls[0][0];
    expect(callArgs.from).toBe('noreply@test.com');
    expect(callArgs.to).toBe('recipient@test.com');
    expect(callArgs.subject).toBe('[KPC] 홍길동님이 메시지를 보냈습니다');
    expect(callArgs.html).toContain('안녕하세요, 테스트 메시지입니다.');
    expect(callArgs.html).toContain(
      'https://app.test.com/dashboard/messages?conversation=conv-123',
    );
  });

  it('긴 메시지 → preview 텍스트가 100자에서 truncate + "..." 처리되어야 한다', async () => {
    const longMessage = 'A'.repeat(150);

    await sendNewMessageEmail({
      to: 'recipient@test.com',
      senderName: '김철수',
      messagePreview: longMessage,
      conversationId: 'conv-456',
    });

    expect(mockSendMail).toHaveBeenCalledOnce();
    const callArgs = mockSendMail.mock.calls[0][0];
    expect(callArgs.html).toContain('A'.repeat(100) + '...');
    expect(callArgs.html).not.toContain('A'.repeat(101));
  });

  it('HTML 특수문자 → 이스케이프 처리가 되어야 한다', async () => {
    await sendNewMessageEmail({
      to: 'recipient@test.com',
      senderName: '<script>alert("XSS")</script>',
      messagePreview: 'Tom & Jerry <b>bold</b> "quoted"',
      conversationId: 'conv-789',
    });

    expect(mockSendMail).toHaveBeenCalledOnce();
    const callArgs = mockSendMail.mock.calls[0][0];
    expect(callArgs.html).toContain(
      'Tom &amp; Jerry &lt;b&gt;bold&lt;/b&gt; &quot;quoted&quot;',
    );
    expect(callArgs.html).toContain(
      '&lt;script&gt;alert(&quot;XSS&quot;)&lt;/script&gt;',
    );
    // subject는 이스케이프하지 않음 (원본 그대로)
    expect(callArgs.subject).toBe(
      '[KPC] <script>alert("XSS")</script>님이 메시지를 보냈습니다',
    );
  });

  it('sendMail 실패 → 예외를 전파하지 않고 console.error를 출력해야 한다', async () => {
    const smtpError = new Error('SMTP connection refused');
    mockSendMail.mockRejectedValueOnce(smtpError);
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    await expect(
      sendNewMessageEmail({
        to: 'recipient@test.com',
        senderName: '테스트',
        messagePreview: '메시지',
        conversationId: 'conv-err',
      }),
    ).resolves.toBeUndefined();

    expect(consoleSpy).toHaveBeenCalledWith(
      '[sendNewMessageEmail Error]',
      smtpError,
    );
    consoleSpy.mockRestore();
  });

  it('100자 이하 메시지 → truncate 없이 그대로 표시되어야 한다', async () => {
    const shortMessage = '짧은 메시지';

    await sendNewMessageEmail({
      to: 'recipient@test.com',
      senderName: '발신자',
      messagePreview: shortMessage,
      conversationId: 'conv-short',
    });

    expect(mockSendMail).toHaveBeenCalledOnce();
    const callArgs = mockSendMail.mock.calls[0][0];
    expect(callArgs.html).toContain('짧은 메시지');
    expect(callArgs.html).not.toContain('...');
  });
});

// =============================================================================
// 3. notifyRecipientByEmail 테스트
// =============================================================================

describe('notifyRecipientByEmail', () => {
  const SENDER_ID = 'sender-uuid';
  const RECIPIENT_ID = 'recipient-uuid';
  const CONVERSATION_ID = 'conv-uuid';
  const MESSAGE_CONTENT = '테스트 메시지 내용';

  beforeEach(() => {
    clearThrottleMap();
    mockSendMail.mockClear();
    mockSendMail.mockResolvedValue({ messageId: 'test-id' });
    resultQueue.length = 0;

    mockAdminClient.from.mockClear();
    mockAdminClient.from.mockReturnValue(mockAdminClient._chainable);
    mockAdminClient.auth.admin.getUserById.mockClear();
    mockAdminClient.auth.admin.getUserById.mockResolvedValue({
      data: { user: null },
    });
  });

  afterEach(() => {
    clearThrottleMap();
    resultQueue.length = 0;
  });

  it('대화 참여자 조회 실패(null) → 발송하지 않아야 한다', async () => {
    // 큐에 1번째 결과: participants = null
    resultQueue.push({ data: null, error: { message: 'error' } });

    await notifyRecipientByEmail(CONVERSATION_ID, SENDER_ID, MESSAGE_CONTENT);

    expect(mockSendMail).not.toHaveBeenCalled();
  });

  it('대화 참여자가 없는 경우(빈 배열) → 발송하지 않아야 한다', async () => {
    resultQueue.push({ data: [], error: null });

    await notifyRecipientByEmail(CONVERSATION_ID, SENDER_ID, MESSAGE_CONTENT);

    expect(mockSendMail).not.toHaveBeenCalled();
  });

  it('수신자 역할이 EMAIL_NOTIFY_ROLES에 미포함 → 발송하지 않아야 한다', async () => {
    // 1) 참여자 조회 → 수신자 발견
    resultQueue.push({
      data: [{ user_id: RECIPIENT_ID }],
      error: null,
    });
    // 2) 수신자 정보 → USER_PENDING (알림 대상 아님)
    resultQueue.push({
      data: { role: 'USER_PENDING', email_notify_enabled: true },
      error: null,
    });

    await notifyRecipientByEmail(CONVERSATION_ID, SENDER_ID, MESSAGE_CONTENT);

    expect(mockSendMail).not.toHaveBeenCalled();
  });

  it('수신자의 email_notify_enabled=false → 발송하지 않아야 한다', async () => {
    resultQueue.push({
      data: [{ user_id: RECIPIENT_ID }],
      error: null,
    });
    resultQueue.push({
      data: { role: 'CONSULTANT_APPROVED', email_notify_enabled: false },
      error: null,
    });

    await notifyRecipientByEmail(CONVERSATION_ID, SENDER_ID, MESSAGE_CONTENT);

    expect(mockSendMail).not.toHaveBeenCalled();
  });

  it('스로틀 상태 → 발송하지 않아야 한다 (이미 5분 내 발송)', async () => {
    // 사전에 스로틀 기록
    recordSend(SENDER_ID, RECIPIENT_ID);

    resultQueue.push({
      data: [{ user_id: RECIPIENT_ID }],
      error: null,
    });
    resultQueue.push({
      data: { role: 'CONSULTANT_APPROVED', email_notify_enabled: true },
      error: null,
    });

    await notifyRecipientByEmail(CONVERSATION_ID, SENDER_ID, MESSAGE_CONTENT);

    expect(mockSendMail).not.toHaveBeenCalled();
  });

  it('수신자 이메일 없음 → 발송하지 않아야 한다', async () => {
    resultQueue.push({
      data: [{ user_id: RECIPIENT_ID }],
      error: null,
    });
    resultQueue.push({
      data: { role: 'OPS_ADMIN', email_notify_enabled: true },
      error: null,
    });
    // 발신자 이름 (Promise.all 내 single() 호출)
    resultQueue.push({ data: { name: '발신자' }, error: null });
    // auth.admin.getUserById → 이메일 없음
    mockAdminClient.auth.admin.getUserById.mockResolvedValue({
      data: { user: null },
    });

    await notifyRecipientByEmail(CONVERSATION_ID, SENDER_ID, MESSAGE_CONTENT);

    expect(mockSendMail).not.toHaveBeenCalled();
  });

  it('발신자 정보 없음 → "(알 수 없음)" 이름으로 발송해야 한다', async () => {
    resultQueue.push({
      data: [{ user_id: RECIPIENT_ID }],
      error: null,
    });
    resultQueue.push({
      data: { role: 'CONSULTANT_APPROVED', email_notify_enabled: true },
      error: null,
    });
    // 발신자 조회 실패 (null)
    resultQueue.push({ data: null, error: null });
    // auth.admin.getUserById → 이메일 있음
    mockAdminClient.auth.admin.getUserById.mockResolvedValue({
      data: { user: { email: 'recipient@example.com' } },
    });

    await notifyRecipientByEmail(CONVERSATION_ID, SENDER_ID, MESSAGE_CONTENT);

    expect(mockSendMail).toHaveBeenCalledOnce();
    const callArgs = mockSendMail.mock.calls[0][0];
    expect(callArgs.subject).toBe('[KPC] (알 수 없음)님이 메시지를 보냈습니다');
    expect(callArgs.to).toBe('recipient@example.com');
  });

  it('정상 흐름 → sendNewMessageEmail 호출 + recordSend 기록', async () => {
    resultQueue.push({
      data: [{ user_id: RECIPIENT_ID }],
      error: null,
    });
    resultQueue.push({
      data: { role: 'SYSTEM_ADMIN', email_notify_enabled: true },
      error: null,
    });
    // 발신자 이름
    resultQueue.push({ data: { name: '홍길동' }, error: null });
    // auth.admin.getUserById → 이메일 있음
    mockAdminClient.auth.admin.getUserById.mockResolvedValue({
      data: { user: { email: 'admin@example.com' } },
    });

    await notifyRecipientByEmail(CONVERSATION_ID, SENDER_ID, MESSAGE_CONTENT);

    expect(mockSendMail).toHaveBeenCalledOnce();
    const callArgs = mockSendMail.mock.calls[0][0];
    expect(callArgs.to).toBe('admin@example.com');
    expect(callArgs.subject).toBe('[KPC] 홍길동님이 메시지를 보냈습니다');
    expect(callArgs.html).toContain(MESSAGE_CONTENT);

    // throttle이 기록되었는지 확인
    expect(isThrottled(SENDER_ID, RECIPIENT_ID)).toBe(true);
  });

  it('연속 2회 호출 → 두 번째는 스로틀로 차단되어야 한다', async () => {
    // 첫 번째 호출: 정상 발송
    resultQueue.push({
      data: [{ user_id: RECIPIENT_ID }],
      error: null,
    });
    resultQueue.push({
      data: { role: 'CONSULTANT_APPROVED', email_notify_enabled: true },
      error: null,
    });
    resultQueue.push({ data: { name: '김철수' }, error: null });
    mockAdminClient.auth.admin.getUserById.mockResolvedValue({
      data: { user: { email: 'consultant@example.com' } },
    });

    await notifyRecipientByEmail(CONVERSATION_ID, SENDER_ID, MESSAGE_CONTENT);
    expect(mockSendMail).toHaveBeenCalledOnce();

    // 두 번째 호출: 큐 재설정, 스로틀 상태 유지
    mockSendMail.mockClear();
    resultQueue.push({
      data: [{ user_id: RECIPIENT_ID }],
      error: null,
    });
    resultQueue.push({
      data: { role: 'CONSULTANT_APPROVED', email_notify_enabled: true },
      error: null,
    });

    await notifyRecipientByEmail(CONVERSATION_ID, SENDER_ID, MESSAGE_CONTENT);
    expect(mockSendMail).not.toHaveBeenCalled();
  });
});
