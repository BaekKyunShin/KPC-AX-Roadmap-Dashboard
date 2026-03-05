'use client';

import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { Card, CardAction, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { showSuccessToast, showErrorToast } from '@/lib/utils/toast';
import { TOAST_ERROR } from '@/lib/constants/toast-messages';
import { updateEmailNotifySetting } from '../actions';

interface EmailNotifyToggleProps {
  initialEnabled: boolean;
}

/**
 * 이메일 알림 토글 (관리자·컨설턴트)
 * - 서버에서 초기값을 받아 토글 처리
 * - 대상 역할 필터링은 서버 컴포넌트에서 수행
 */
export default function EmailNotifyToggle({ initialEnabled }: EmailNotifyToggleProps) {
  const [enabled, setEnabled] = useState(initialEnabled);
  const [isUpdating, setIsUpdating] = useState(false);

  async function handleToggle(checked: boolean) {
    setIsUpdating(true);
    const prev = enabled;
    setEnabled(checked);

    try {
      const result = await updateEmailNotifySetting(checked);
      if (result.success) {
        showSuccessToast('알림 설정 변경', checked ? '이메일 알림이 활성화되었습니다.' : '이메일 알림이 비활성화되었습니다.');
      } else {
        setEnabled(prev);
        showErrorToast('설정 변경 실패', result.error);
      }
    } catch {
      setEnabled(prev);
      showErrorToast('설정 변경 실패', TOAST_ERROR.NETWORK);
    } finally {
      setIsUpdating(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>메시지 알림 설정</CardTitle>
        <CardDescription>새 메시지 수신 시 가입 이메일로 알림을 받습니다.</CardDescription>
        <CardAction>
          <div className="flex items-center gap-2">
            {isUpdating && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
            <Switch
              id="email-notify"
              checked={enabled}
              onCheckedChange={handleToggle}
              disabled={isUpdating}
            />
          </div>
        </CardAction>
      </CardHeader>
    </Card>
  );
}
