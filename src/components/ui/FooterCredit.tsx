'use client';

import { useState } from 'react';
import { Heart } from 'lucide-react';
import { cn } from '@/lib/utils';
import { CREDIT_ORG, CREDIT_DEVELOPER } from '@/lib/constants/site';

// ============================================================================
// 타입 정의
// ============================================================================

interface FooterCreditProps {
  className?: string;
}

// ============================================================================
// 컴포넌트
// ============================================================================

export function FooterCredit({ className }: FooterCreditProps) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <p
      data-testid="footer-credit"
      className={cn('text-center text-sm text-gray-400', className)}
    >
      {CREDIT_ORG}
      <span className="mx-1.5">&middot;</span>
      <span
        data-testid="footer-credit-interactive"
        className="inline-flex items-center gap-0.5 cursor-default transition-colors duration-300 hover:text-gray-600"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {isHovered ? (
          <>
            Crafted with
            <Heart
              data-testid="footer-credit-heart"
              aria-hidden="true"
              className="mx-0.5 h-3.5 w-3.5 fill-red-400 text-red-400 motion-safe:animate-pulse"
            />
            by
          </>
        ) : (
          'Developed by'
        )}
        <span
          className={cn(
            'ml-1 transition-all duration-300',
            isHovered && 'underline decoration-gray-400 underline-offset-2'
          )}
        >
          {CREDIT_DEVELOPER}
        </span>
      </span>
    </p>
  );
}
