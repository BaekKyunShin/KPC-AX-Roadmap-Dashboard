import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { BackButton, BACK_LINK_STYLES } from '@/components/ui/back-button';

interface PageHeaderProps {
  /** 페이지 제목 */
  title: string;
  /** 페이지 설명 (선택) */
  description?: string;
  /** 우측 액션 영역 (선택) */
  actions?: React.ReactNode;
  /** 뒤로가기 링크 (선택, 상세 페이지용) */
  backLink?: {
    href: string;
    label: string;
    /** true이면 router.back() 사용 (필터 상태 유지) */
    useBack?: boolean;
  };
}

/**
 * 페이지 헤더 공통 컴포넌트
 *
 * 모든 대시보드 페이지에서 일관된 스타일의 제목과 설명을 표시합니다.
 *
 * @example
 * // 기본 사용
 * <PageHeader title="프로젝트 관리" description="기업 프로젝트를 생성하고 관리합니다" />
 *
 * @example
 * // 액션 버튼 포함
 * <PageHeader
 *   title="프로젝트 관리"
 *   description="기업 프로젝트를 생성하고 관리합니다"
 *   actions={<Button>새 프로젝트</Button>}
 * />
 *
 * @example
 * // 뒤로가기 링크 포함 (상세 페이지)
 * <PageHeader
 *   title="프로젝트 상세"
 *   backLink={{ href: "/ops/projects", label: "프로젝트 목록" }}
 * />
 *
 * @example
 * // router.back() 사용 (필터 상태 유지)
 * <PageHeader
 *   title="프로젝트 상세"
 *   backLink={{ href: "/ops/projects", label: "프로젝트 목록", useBack: true }}
 * />
 */
export function PageHeader({ title, description, actions, backLink }: PageHeaderProps) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        {backLink && (
          backLink.useBack ? (
            <BackButton label={backLink.label} fallbackHref={backLink.href} />
          ) : (
            <Link
              href={backLink.href}
              className={BACK_LINK_STYLES}
            >
              <ArrowLeft className="h-4 w-4" />
              {backLink.label}
            </Link>
          )
        )}
        <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
        {description && <p className="mt-1 text-sm text-gray-500">{description}</p>}
      </div>
      {/* actions가 undefined일 때도 div를 렌더해 server/client DOM 트리 shape을 고정한다.
          (conditional 렌더 시 브라우저 확장 프로그램 등 외부 요인으로 hydration mismatch 발생 가능) */}
      <div className="flex-shrink-0">{actions}</div>
    </div>
  );
}
