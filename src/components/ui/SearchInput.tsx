'use client';

interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  label?: string;
}

/**
 * 검색 입력 컴포넌트
 */
export function SearchInput({
  value,
  onChange,
  placeholder = '검색...',
  label = '검색',
}: SearchInputProps) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-500 mb-1">{label}</label>
      <div className="relative">
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
        />
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <svg className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
        </div>
      </div>
    </div>
  );
}

interface SelectFilterProps {
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
  label?: string;
  placeholder?: string;
}

/**
 * 셀렉트 필터 컴포넌트
 */
export function SelectFilter({
  value,
  onChange,
  options,
  label = '필터',
  placeholder = '전체',
}: SelectFilterProps) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-500 mb-1">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="block w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
      >
        <option value="">{placeholder}</option>
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
}

interface FilterBadgeProps {
  filters: { label: string; value: string; color?: string }[];
  onReset?: () => void;
}

/**
 * 활성 필터 배지 표시 컴포넌트
 */
export function ActiveFilterBadges({ filters, onReset }: FilterBadgeProps) {
  const activeFilters = filters.filter((f) => f.value);

  if (activeFilters.length === 0) return null;

  return (
    <div className="mt-3 flex items-center justify-between">
      <div className="flex items-center flex-wrap gap-2">
        <span className="text-xs text-gray-500">필터:</span>
        {activeFilters.map((filter, index) => (
          <span
            key={index}
            className={`inline-flex items-center px-2 py-1 rounded-full text-xs ${filter.color || 'bg-blue-100 text-blue-800'}`}
          >
            {filter.label}: {filter.value}
          </span>
        ))}
      </div>
      {onReset && (
        <button onClick={onReset} className="text-xs text-gray-500 hover:text-gray-700 underline">
          필터 초기화
        </button>
      )}
    </div>
  );
}
