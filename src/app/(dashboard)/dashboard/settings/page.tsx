'use client';

import { useState } from 'react';
import { changePassword } from '@/app/(auth)/actions';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { FieldError } from '@/components/ui/field-error';
import DeleteAccountSection from '@/components/auth/DeleteAccountSection';
import { Loader2, Eye, EyeOff, CheckCircle2 } from 'lucide-react';

// =============================================================================
// PasswordField (파일-로컬 컴포넌트)
// =============================================================================

function PasswordField({
  id,
  label,
  value,
  onChange,
  error,
  disabled,
  hint,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  error?: string;
  disabled?: boolean;
  hint?: string;
}) {
  const [show, setShow] = useState(false);

  return (
    <div className="space-y-2" data-error={!!error}>
      <Label htmlFor={id}>{label}</Label>
      <div className="relative">
        <Input
          id={id}
          type={show ? 'text' : 'password'}
          value={value}
          onChange={onChange}
          disabled={disabled}
          className={`pr-10 ${error ? 'border-destructive' : ''}`}
        />
        <button
          type="button"
          onClick={() => setShow(!show)}
          className="absolute inset-y-0 right-0 flex items-center pr-3 text-muted-foreground hover:text-foreground transition-colors"
        >
          {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
      {hint && <p className="text-sm text-muted-foreground">{hint}</p>}
      <FieldError message={error} />
    </div>
  );
}

// =============================================================================
// SettingsPage
// =============================================================================

// 필드별 에러 타입
type PasswordErrors = {
  currentPassword?: string;
  newPassword?: string;
  confirmPassword?: string;
};

export default function SettingsPage() {
  // 비밀번호 변경 상태
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordErrors, setPasswordErrors] = useState<PasswordErrors>({});
  const [passwordServerError, setPasswordServerError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState(false);
  const [isPasswordLoading, setIsPasswordLoading] = useState(false);

  async function handlePasswordChange(e: React.FormEvent) {
    e.preventDefault();
    setPasswordErrors({});
    setPasswordServerError(null);
    setPasswordSuccess(false);

    // 클라이언트 기본 검증
    const errors: PasswordErrors = {};
    if (!currentPassword) errors.currentPassword = '현재 비밀번호를 입력해주세요.';
    if (!newPassword) errors.newPassword = '새 비밀번호를 입력해주세요.';
    else if (newPassword.length < 8) errors.newPassword = '비밀번호는 최소 8자 이상이어야 합니다.';
    else if (!/[a-zA-Z]/.test(newPassword)) errors.newPassword = '비밀번호에 영문자가 포함되어야 합니다.';
    else if (!/[0-9]/.test(newPassword)) errors.newPassword = '비밀번호에 숫자가 포함되어야 합니다.';
    else if (currentPassword === newPassword) errors.newPassword = '새 비밀번호는 현재 비밀번호와 달라야 합니다.';
    if (!confirmPassword) errors.confirmPassword = '비밀번호 확인을 입력해주세요.';
    else if (newPassword !== confirmPassword) errors.confirmPassword = '비밀번호가 일치하지 않습니다.';

    if (Object.keys(errors).length > 0) {
      setPasswordErrors(errors);
      return;
    }

    setIsPasswordLoading(true);

    const result = await changePassword(currentPassword, newPassword, confirmPassword);

    if (!result.success) {
      setPasswordServerError(result.error || '비밀번호 변경에 실패했습니다.');
      setIsPasswordLoading(false);
      return;
    }

    setPasswordSuccess(true);
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setIsPasswordLoading(false);
  }

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <PageHeader
        title="계정 설정"
        description="비밀번호 변경 및 계정 관리"
        backLink={{ href: '/dashboard', label: '대시보드' }}
      />

      {/* 비밀번호 변경 섹션 */}
      <Card>
        <CardHeader>
          <CardTitle>비밀번호 변경</CardTitle>
          <CardDescription>계정 보안을 위해 주기적으로 비밀번호를 변경해주세요.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handlePasswordChange} className="space-y-4">
            {passwordServerError && (
              <Alert variant="destructive">
                <AlertDescription>{passwordServerError}</AlertDescription>
              </Alert>
            )}

            {passwordSuccess && (
              <Alert className="border-green-200 bg-green-50 text-green-800">
                <CheckCircle2 className="h-4 w-4" />
                <AlertDescription>비밀번호가 변경되었습니다.</AlertDescription>
              </Alert>
            )}

            <PasswordField
              id="currentPassword"
              label="현재 비밀번호"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              error={passwordErrors.currentPassword}
              disabled={isPasswordLoading}
            />

            <PasswordField
              id="newPassword"
              label="새 비밀번호"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              error={passwordErrors.newPassword}
              disabled={isPasswordLoading}
              hint="8자 이상, 영문과 숫자 포함"
            />

            <PasswordField
              id="confirmPassword"
              label="새 비밀번호 확인"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              error={passwordErrors.confirmPassword}
              disabled={isPasswordLoading}
            />

            <Button type="submit" disabled={isPasswordLoading} className="w-full sm:w-auto">
              {isPasswordLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  변경 중...
                </>
              ) : (
                '비밀번호 변경'
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* 계정 삭제 섹션 */}
      <DeleteAccountSection />
    </div>
  );
}
