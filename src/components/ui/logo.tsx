import { cn } from '@/lib/utils';

interface LogoIconProps {
  className?: string;
  size?: number;
}

/**
 * KPC 로고 아이콘 - 로드맵/경로를 상징하는 미니멀한 디자인
 * 세 개의 노드가 연결된 형태로 AI 훈련 경로를 표현
 */
export function LogoIcon({ className, size = 24 }: LogoIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* 연결선 */}
      <path
        d="M8 24L16 8L24 24"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* 가로선 */}
      <path
        d="M11 18H21"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

interface LogoProps {
  className?: string;
  iconSize?: number;
  showText?: boolean;
  textClassName?: string;
}

/**
 * KPC AI 훈련 로드맵 전체 로고
 */
export function Logo({
  className,
  iconSize = 20,
  showText = true,
  textClassName
}: LogoProps) {
  return (
    <div className={cn('flex items-center gap-2', className)}>
      <LogoIcon size={iconSize} className="text-gray-900" />
      {showText && (
        <span className={cn(
          'text-[17px] tracking-tight text-gray-900',
          textClassName
        )}>
          <span className="font-semibold">KPC</span>
          <span className="font-normal text-gray-600"> AI 훈련 로드맵</span>
        </span>
      )}
    </div>
  );
}

/**
 * Hero 섹션용 로고 배지
 */
export function LogoBadge({ className }: { className?: string }) {
  return (
    <div className={cn(
      'flex items-center gap-2.5 px-4 py-2 rounded-full border border-gray-200 bg-white/80 backdrop-blur-sm',
      className
    )}>
      <LogoIcon size={18} className="text-gray-900" />
      <span className="text-[15px] tracking-tight">
        <span className="font-semibold text-gray-900">KPC</span>
        <span className="font-normal text-gray-600"> AI 훈련 로드맵</span>
      </span>
    </div>
  );
}
