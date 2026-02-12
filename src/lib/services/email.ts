import nodemailer from 'nodemailer';
import { createAdminClient } from '@/lib/supabase/admin';
import { EMAIL_NOTIFY_ROLES } from '@/lib/constants/message';

// =============================================================================
// SMTP 클라이언트 (Gmail)
// =============================================================================

const transporter =
  process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS
    ? nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT) || 465,
        secure: true,
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
      })
    : null;

const EMAIL_FROM = process.env.EMAIL_FROM || process.env.SMTP_USER || '';
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
  return !!lastSent && Date.now() - lastSent < THROTTLE_DURATION_MS;
}

export function recordSend(senderId: string, recipientId: string): void {
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
  if (!transporter) {
    console.warn('[sendNewMessageEmail] SMTP 미설정, 이메일 건너뜀');
    return;
  }

  const preview = escapeHtml(
    params.messagePreview.length > 100
      ? params.messagePreview.slice(0, 100) + '...'
      : params.messagePreview,
  );
  const senderName = escapeHtml(params.senderName);
  const link = `${APP_URL}/dashboard/messages?conversation=${params.conversationId}`;
  const uniqueId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  try {
    await transporter.sendMail({
      from: EMAIL_FROM,
      to: params.to,
      subject: `[KPC] ${params.senderName}님이 메시지를 보냈습니다`,
      html: `
        <div style="font-family: 'Apple SD Gothic Neo', 'Malgun Gothic', sans-serif; max-width: 520px; margin: 0 auto; background: #ffffff;">
          <!-- 헤더 -->
          <div style="background: #1e293b; padding: 20px 24px; border-radius: 8px 8px 0 0;">
            <span style="color: #ffffff; font-size: 15px; font-weight: 600; letter-spacing: -0.2px;">KPC AI 훈련 로드맵</span>
          </div>

          <!-- 본문 -->
          <div style="border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 8px 8px; padding: 28px 24px;">
            <p style="color: #334155; font-size: 15px; margin: 0 0 16px; line-height: 1.6;">
              <strong>${senderName}</strong>님이 새 메시지를 보냈습니다.
            </p>

            <div style="background: #f8fafc; border-left: 3px solid #2563eb; padding: 14px 16px; border-radius: 0 6px 6px 0; color: #475569; font-size: 14px; line-height: 1.6; margin: 0 0 24px;">
              ${preview}
            </div>

            <a href="${link}" style="display: inline-block; background: #2563eb; color: #ffffff; padding: 11px 28px; border-radius: 6px; text-decoration: none; font-size: 14px; font-weight: 500;">
              메시지 확인하기
            </a>

            <!-- 푸터 -->
            <div style="border-top: 1px solid #e2e8f0; margin-top: 28px; padding-top: 16px;">
              <p style="color: #94a3b8; font-size: 12px; margin: 0; line-height: 1.6;">
                이 알림은 KPC AI 훈련 로드맵 대시보드에서 발송되었습니다.<br/>
                계정 설정에서 이메일 알림을 끌 수 있습니다.
              </p>
            </div>
          </div>
        </div>
        <div style="display:none;font-size:0;line-height:0;max-height:0;overflow:hidden;">${uniqueId}</div>
      `,
    });
  } catch (err) {
    console.error('[sendNewMessageEmail] 발송 실패:', err);
  }
}

// =============================================================================
// 메시지 이메일 알림 오케스트레이션
// =============================================================================

/**
 * 수신자가 이메일 알림 대상 역할이고 설정을 활성화한 경우 이메일을 발송한다.
 * - 5분 throttle로 동일 발신자→수신자 중복 방지
 * - 실패해도 메시지 전송에 영향 없음 (fire-and-forget)
 */
export async function notifyRecipientByEmail(
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
  if (!EMAIL_NOTIFY_ROLES.includes(recipient.role)) return;
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
  const {
    data: { user: authUser },
  } = await adminSupabase.auth.admin.getUserById(recipientId);

  if (!authUser?.email) return;

  // 6. throttle 기록 + 이메일 발송
  recordSend(senderId, recipientId);
  await sendNewMessageEmail({
    to: authUser.email,
    senderName: sender?.name || '(알 수 없음)',
    messagePreview: content,
    conversationId,
  });
}
