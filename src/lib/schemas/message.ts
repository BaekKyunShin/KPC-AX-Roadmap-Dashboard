import { z } from 'zod';

/** 메시지 전송 스키마 */
export const sendMessageSchema = z.object({
  conversation_id: z.string().uuid('유효한 대화 ID가 필요합니다.'),
  content: z
    .string()
    .trim()
    .min(1, '메시지를 입력하세요.')
    .max(2000, '메시지는 2000자 이내로 입력하세요.'),
});

export type SendMessageInput = z.infer<typeof sendMessageSchema>;

/** 새 대화 생성 스키마 */
export const createConversationSchema = z.object({
  recipient_id: z.string().uuid('유효한 사용자 ID가 필요합니다.'),
});

export type CreateConversationInput = z.infer<typeof createConversationSchema>;
