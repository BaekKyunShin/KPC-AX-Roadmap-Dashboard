'use client';

import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';

type ColorVariant = 'blue' | 'indigo' | 'emerald' | 'purple' | 'amber';

const colorClasses: Record<ColorVariant, { selected: string; hover: string }> = {
  blue: {
    selected: 'bg-blue-600 text-white border-blue-600',
    hover: 'hover:bg-blue-50',
  },
  indigo: {
    selected: 'bg-indigo-600 text-white border-indigo-600',
    hover: 'hover:bg-indigo-50',
  },
  emerald: {
    selected: 'bg-emerald-600 text-white border-emerald-600',
    hover: 'hover:bg-emerald-50',
  },
  purple: {
    selected: 'bg-purple-600 text-white border-purple-600',
    hover: 'hover:bg-purple-50',
  },
  amber: {
    selected: 'bg-amber-600 text-white border-amber-600',
    hover: 'hover:bg-amber-50',
  },
};

interface BadgeSelectorProps {
  /** 문항 번호 (1~9) */
  number: number;
  /** 라벨 텍스트 */
  label: string;
  /** 설명 텍스트 */
  description: string;
  /** 선택 가능한 옵션들 (문자열 배열 또는 value/label 객체 배열) */
  options: readonly string[] | readonly { value: string; label: string; description?: string }[];
  /** 현재 선택된 값들 */
  selected: string[];
  /** 선택 변경 핸들러 */
  onSelectionChange: (selected: string[]) => void;
  /** 색상 테마 */
  color: ColorVariant;
  /** 옵션 설명 표시 여부 (교육 대상 수준에서 사용) */
  showOptionDescriptions?: boolean;
}

export default function BadgeSelector({
  number,
  label,
  description,
  options,
  selected,
  onSelectionChange,
  color,
  showOptionDescriptions = false,
}: BadgeSelectorProps) {
  const toggleSelection = (value: string) => {
    if (selected.includes(value)) {
      onSelectionChange(selected.filter((v) => v !== value));
    } else {
      onSelectionChange([...selected, value]);
    }
  };

  const isObjectOption = (
    option: string | { value: string; label: string; description?: string }
  ): option is { value: string; label: string; description?: string } => {
    return typeof option === 'object' && 'value' in option;
  };

  const classes = colorClasses[color];

  return (
    <div className="space-y-3">
      <div>
        <Label>
          {number}. {label} <span className="text-red-500">*</span>
        </Label>
        <p className="text-sm text-muted-foreground mt-1">{description}</p>
      </div>
      <div className="flex flex-wrap gap-2">
        {options.map((option) => {
          const value = isObjectOption(option) ? option.value : option;
          const displayLabel = isObjectOption(option) ? option.label : option;
          const title = isObjectOption(option) ? option.description : undefined;
          const isSelected = selected.includes(value);

          return (
            <Badge
              key={value}
              variant="outline"
              className={`cursor-pointer transition-colors ${
                isSelected ? classes.selected : classes.hover
              }`}
              onClick={() => toggleSelection(value)}
              title={title}
            >
              {displayLabel}
            </Badge>
          );
        })}
      </div>
      {showOptionDescriptions && isObjectOption(options[0]) && (
        <div className="text-xs text-muted-foreground space-y-1">
          {(options as readonly { value: string; label: string; description?: string }[]).map(
            (option) => (
              <div key={option.value}>
                <span className="font-medium">{option.label}</span>: {option.description}
              </div>
            )
          )}
        </div>
      )}
    </div>
  );
}
