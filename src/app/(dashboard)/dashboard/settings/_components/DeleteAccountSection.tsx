'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { deleteAccount } from '@/app/(auth)/actions';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { AlertTriangle, Loader2 } from 'lucide-react';

export default function DeleteAccountSection() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [confirmText, setConfirmText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  const isConfirmValid = confirmText === '회원탈퇴' && password.length > 0;

  function handleOpenChange(open: boolean) {
    setIsOpen(open);
    if (!open) {
      // 다이얼로그 닫힐 때 상태 초기화
      setPassword('');
      setConfirmText('');
      setError(null);
    }
  }

  async function handleDelete(e: React.MouseEvent) {
    e.preventDefault();
    if (!isConfirmValid || isLoading) return;

    setIsLoading(true);
    setError(null);

    try {
      const result = await deleteAccount(password, confirmText);

      if (!result.success) {
        setError(result.error || '계정 삭제에 실패했습니다.');
        setIsLoading(false);
        return;
      }

      // 성공 시 로그인 페이지로 이동 (Server Action의 redirect가 동작하지 않을 경우 대비)
      router.push('/login');
    } catch {
      // redirect()는 NEXT_REDIRECT 에러를 throw하므로 정상 동작
      // 그 외 에러만 처리
      router.push('/login');
    }
  }

  return (
    <Card className="border-red-200 bg-red-50/30">
      <CardHeader>
        <CardTitle className="text-red-700">계정 삭제</CardTitle>
        <CardDescription className="text-red-600/80">
          계정을 삭제하면 모든 개인정보가 영구적으로 삭제되며, 이 작업은 되돌릴 수 없습니다.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <AlertDialog open={isOpen} onOpenChange={handleOpenChange}>
          <AlertDialogTrigger asChild>
            <Button variant="destructive" className="w-full sm:w-auto">
              <AlertTriangle className="h-4 w-4 mr-2" />
              회원 탈퇴
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>정말 탈퇴하시겠습니까?</AlertDialogTitle>
              <AlertDialogDescription asChild>
                <div className="space-y-2">
                  <p>탈퇴 시 다음 데이터가 영구적으로 삭제됩니다:</p>
                  <ul className="list-disc pl-5 space-y-1">
                    <li>이름, 이메일, 연락처 등 개인정보</li>
                    <li>컨설턴트 프로필 정보 (해당 시)</li>
                    <li>담당 프로젝트 배정 해제</li>
                  </ul>
                  <p className="font-medium text-red-600">이 작업은 되돌릴 수 없습니다.</p>
                </div>
              </AlertDialogDescription>
            </AlertDialogHeader>

            <div className="space-y-4 py-2">
              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <div className="space-y-2">
                <Label htmlFor="delete-password">비밀번호 확인</Label>
                <Input
                  id="delete-password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="현재 비밀번호를 입력하세요"
                  disabled={isLoading}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="delete-confirm">
                  확인을 위해 <span className="font-semibold text-red-600">회원탈퇴</span>를
                  입력하세요
                </Label>
                <Input
                  id="delete-confirm"
                  type="text"
                  value={confirmText}
                  onChange={(e) => setConfirmText(e.target.value)}
                  placeholder="회원탈퇴"
                  disabled={isLoading}
                />
              </div>
            </div>

            <AlertDialogFooter>
              <AlertDialogCancel disabled={isLoading}>취소</AlertDialogCancel>
              <AlertDialogAction
                variant="destructive"
                disabled={!isConfirmValid || isLoading}
                onClick={handleDelete}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    처리 중...
                  </>
                ) : (
                  '탈퇴하기'
                )}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardContent>
    </Card>
  );
}
