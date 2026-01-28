/**
 * 인증 페이지용 배경 장식 컴포넌트
 * 로그인/회원가입 페이지에서 공통으로 사용하는 블러 처리된 원형 배경
 */

interface AuthBackgroundDecorationProps {
  /** 애니메이션 활성화 여부 (기본값: false) */
  animated?: boolean;
}

export function AuthBackgroundDecoration({ animated = false }: AuthBackgroundDecorationProps) {
  const animationClass = animated ? 'animate-pulse' : '';

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      <div
        className={`absolute -top-20 -right-20 w-40 h-40 sm:-top-40 sm:-right-40 sm:w-80 sm:h-80 bg-blue-200 rounded-full mix-blend-multiply filter blur-3xl opacity-30 ${animationClass}`}
      />
      <div
        className={`absolute -bottom-20 -left-20 w-40 h-40 sm:-bottom-40 sm:-left-40 sm:w-80 sm:h-80 bg-indigo-200 rounded-full mix-blend-multiply filter blur-3xl opacity-30 ${animationClass}`}
      />
    </div>
  );
}
