interface ProgressBarProps {
  answeredCount: number;
  totalCount: number;
}

export function ProgressBar({ answeredCount, totalCount }: ProgressBarProps) {
  // totalCount가 0인 edge case 방어
  const percentage = totalCount > 0 ? Math.round((answeredCount / totalCount) * 100) : 0;

  return (
    <div className="mb-4 bg-gray-50 rounded-lg p-3">
      <div className="flex justify-between items-center mb-1.5">
        <span className="text-xs font-medium text-gray-600">전체 진행률</span>
        <span className="text-xs text-gray-500">
          {answeredCount} / {totalCount} 문항 ({percentage}%)
        </span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-2">
        <div
          className="bg-blue-600 h-2 rounded-full transition-all duration-300"
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}
