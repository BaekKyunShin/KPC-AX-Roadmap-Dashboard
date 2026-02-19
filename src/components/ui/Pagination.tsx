'use client';

/** 현재 페이지 기준으로 표시할 페이지 번호 배열을 계산 */
function getVisiblePages(currentPage: number, totalPages: number, maxVisible: number): number[] {
  const half = Math.floor(maxVisible / 2);

  let start: number;
  let end: number;

  if (totalPages <= maxVisible) {
    start = 1;
    end = totalPages;
  } else if (currentPage <= half + 1) {
    start = 1;
    end = maxVisible;
  } else if (currentPage >= totalPages - half) {
    start = totalPages - maxVisible + 1;
    end = totalPages;
  } else {
    start = currentPage - half;
    end = currentPage + half;
  }

  const pages: number[] = [];
  for (let i = start; i <= end; i++) {
    pages.push(i);
  }
  return pages;
}

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  itemsPerPage: number;
  onPageChange: (page: number) => void;
  maxVisiblePages?: number;
}

/** 네비게이션 버튼(처음/이전/다음/마지막) 공통 스타일 */
const NAV_BUTTON =
  'py-1 min-h-[36px] text-sm border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed';

/**
 * 재사용 가능한 페이지네이션 컴포넌트
 */
export function Pagination({
  currentPage,
  totalPages,
  totalItems,
  itemsPerPage,
  onPageChange,
  maxVisiblePages = 5,
}: PaginationProps) {
  const pageNumbers = getVisiblePages(currentPage, totalPages, maxVisiblePages);

  if (totalPages <= 1) return null;

  const startItem = (currentPage - 1) * itemsPerPage + 1;
  const endItem = Math.min(currentPage * itemsPerPage, totalItems);

  return (
    <div className="px-2 sm:px-4 py-3 border-t border-gray-200 flex items-center justify-between">
      <div className="flex items-center text-sm text-gray-500">
        <span>
          {startItem.toLocaleString()} - {endItem.toLocaleString()} / {totalItems.toLocaleString()}
        </span>
      </div>
      <div className="flex items-center space-x-1 sm:space-x-2">
        <button
          onClick={() => onPageChange(1)}
          disabled={currentPage <= 1}
          className={`px-2 ${NAV_BUTTON}`}
        >
          처음
        </button>
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage <= 1}
          className={`px-3 ${NAV_BUTTON}`}
        >
          이전
        </button>

        <div className="flex items-center space-x-1">
          {pageNumbers.map((pageNum) => (
            <button
              key={pageNum}
              onClick={() => onPageChange(pageNum)}
              className={`px-3 py-1 min-h-[36px] min-w-[36px] text-sm rounded ${
                currentPage === pageNum
                  ? 'bg-blue-600 text-white'
                  : 'border border-gray-300 hover:bg-gray-50'
              }`}
            >
              {pageNum}
            </button>
          ))}
        </div>

        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage >= totalPages}
          className={`px-3 ${NAV_BUTTON}`}
        >
          다음
        </button>
        <button
          onClick={() => onPageChange(totalPages)}
          disabled={currentPage >= totalPages}
          className={`px-2 ${NAV_BUTTON}`}
        >
          마지막
        </button>
      </div>
    </div>
  );
}
