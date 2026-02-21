'use client';

import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';

interface BackButtonProps {
  label: string;
  fallbackHref: string;
}

/**
 * 브라우저 히스토리 기반 뒤로가기 버튼
 *
 * router.back()을 사용하여 이전 페이지로 이동합니다.
 * URL searchParams가 포함된 이전 URL로 정확히 복원됩니다.
 */
export function BackButton({ label, fallbackHref }: BackButtonProps) {
  const router = useRouter();

  const handleClick = () => {
    if (window.history.length > 1) {
      router.back();
    } else {
      router.push(fallbackHref);
    }
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 transition-colors mb-2"
    >
      <ArrowLeft className="h-4 w-4" />
      {label}
    </button>
  );
}
