interface DimensionHeaderProps {
  dimension: string;
  answeredCount: number;
  totalCount: number;
}

export function DimensionHeader({ dimension, answeredCount, totalCount }: DimensionHeaderProps) {
  return (
    <div className="mb-4">
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-xs text-gray-500 font-medium">평가 영역</span>
        <span className="text-xs text-gray-500">
          {answeredCount} / {totalCount} 완료
        </span>
      </div>
      <div className="inline-flex items-center px-3 py-1.5 bg-indigo-50 border border-indigo-100 rounded-lg">
        <span className="text-sm font-medium text-indigo-700">{dimension}</span>
      </div>
    </div>
  );
}
