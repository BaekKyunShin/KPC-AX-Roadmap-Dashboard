'use client';

import { useState } from 'react';
import { Check, Copy, ExternalLink, Loader2, RefreshCw } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { showErrorToast, showSuccessToast } from '@/lib/utils';
import {
  createAssessmentToken,
  type LatestTokenInfo,
} from '@/app/(dashboard)/ops/projects/actions';

// ============================================================================
// 타입 정의
// ============================================================================

interface AssessmentTokenSectionProps {
  projectId: string;
  latestToken: LatestTokenInfo | null;
}

const EXPIRY_OPTIONS = [
  { value: '7', label: '7일' },
  { value: '14', label: '14일 (기본)' },
  { value: '30', label: '30일' },
  { value: '60', label: '60일' },
];

// ============================================================================
// 메인 컴포넌트
// ============================================================================

export default function AssessmentTokenSection({
  projectId,
  latestToken: initialToken,
}: AssessmentTokenSectionProps) {
  const [latestToken, setLatestToken] = useState(initialToken);
  const [isLoading, setIsLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [expiryDays, setExpiryDays] = useState('14');

  const appUrl = typeof window !== 'undefined'
    ? window.location.origin
    : process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

  const tokenUrl = latestToken
    ? `${appUrl}/assessment/${latestToken.token}`
    : null;

  const isExpired = latestToken
    ? new Date(latestToken.expiresAt) < new Date()
    : false;

  async function handleCreateToken() {
    setIsLoading(true);
    try {
      const formData = new FormData();
      formData.set('project_id', projectId);
      formData.set('expires_in_days', expiryDays);

      const result = await createAssessmentToken(formData);

      if (result.success) {
        setLatestToken({
          id: '',
          token: result.data.token,
          expiresAt: result.data.expiresAt,
          isUsed: false,
          usedAt: null,
          createdAt: new Date().toISOString(),
        });
        showSuccessToast('진단 링크 생성', '진단 링크가 생성되었습니다.');
      } else {
        showErrorToast('생성 실패', result.error);
      }
    } catch {
      showErrorToast('생성 실패', '서버와 통신 중 오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  }

  async function handleCopy() {
    if (!tokenUrl) return;
    try {
      await navigator.clipboard.writeText(tokenUrl);
      setCopied(true);
      showSuccessToast('복사 완료', '링크가 클립보드에 복사되었습니다.');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      showErrorToast('복사 실패', '클립보드 접근 권한이 없습니다.');
    }
  }

  // 토큰이 사용됨 (고객사 제출 완료)
  if (latestToken?.isUsed) {
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2 text-green-600">
          <Check className="w-4 h-4" />
          <span className="text-sm font-medium">
            고객사가 직접 진단을 완료했습니다
          </span>
        </div>
        {latestToken.usedAt && (
          <p className="text-xs text-gray-500">
            완료 시간:{' '}
            {new Date(latestToken.usedAt).toLocaleString('ko-KR')}
          </p>
        )}
      </div>
    );
  }

  // 활성 토큰이 있음 (미사용, 미만료)
  if (latestToken && !isExpired) {
    return (
      <div className="space-y-3">
        <div>
          <Label className="text-xs text-gray-500">진단 링크</Label>
          <div className="flex items-center gap-2 mt-1">
            <code className="flex-1 text-xs bg-gray-50 border border-gray-200 rounded px-3 py-2 truncate">
              {tokenUrl}
            </code>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleCopy}
              className="flex-shrink-0"
            >
              {copied ? (
                <Check className="w-4 h-4" />
              ) : (
                <Copy className="w-4 h-4" />
              )}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => window.open(tokenUrl!, '_blank')}
              className="flex-shrink-0"
            >
              <ExternalLink className="w-4 h-4" />
            </Button>
          </div>
        </div>
        <p className="text-xs text-gray-500">
          만료일:{' '}
          {new Date(latestToken.expiresAt).toLocaleDateString('ko-KR')}
        </p>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={handleCreateToken}
          disabled={isLoading}
          className="text-xs"
        >
          {isLoading ? (
            <Loader2 className="w-3 h-3 animate-spin mr-1" />
          ) : (
            <RefreshCw className="w-3 h-3 mr-1" />
          )}
          새 링크 생성
        </Button>
      </div>
    );
  }

  // 토큰 없음 또는 만료됨 → 생성 UI
  return (
    <div className="space-y-3">
      {isExpired && (
        <p className="text-xs text-amber-600">
          이전 링크가 만료되었습니다. 새 링크를 생성해 주세요.
        </p>
      )}
      <div className="flex items-end gap-3">
        <div className="space-y-1">
          <Label className="text-xs text-gray-500">만료일</Label>
          <Select value={expiryDays} onValueChange={setExpiryDays}>
            <SelectTrigger className="w-[140px] h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {EXPIRY_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button
          type="button"
          size="sm"
          onClick={handleCreateToken}
          disabled={isLoading}
        >
          {isLoading && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
          진단 링크 생성
        </Button>
      </div>
    </div>
  );
}
