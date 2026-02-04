import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

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
 */
export function PageHeader({ title, description, actions, backLink }: PageHeaderProps) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        {backLink && (
          <Link
            href={backLink.href}
            className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 transition-colors mb-2"
          >
            <ArrowLeft className="h-4 w-4" />
            {backLink.label}
          </Link>
        )}
        <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
        {description && <p className="mt-1 text-sm text-gray-500">{description}</p>}
      </div>
      {actions && <div className="flex-shrink-0">{actions}</div>}
    </div>
  );
}
