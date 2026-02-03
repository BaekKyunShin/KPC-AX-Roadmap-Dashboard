'use client';

const BUTTON_LABEL = '예시 채우기';

// 전구 아이콘 SVG path
const LIGHTBULB_ICON_PATH =
  'M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z';

interface FillExampleButtonProps {
  onClick: () => void;
}

export default function FillExampleButton({ onClick }: FillExampleButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="text-xs text-blue-600 hover:text-blue-800 flex items-center"
      title={BUTTON_LABEL}
    >
      <svg
        className="w-4 h-4 mr-1"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d={LIGHTBULB_ICON_PATH}
        />
      </svg>
      {BUTTON_LABEL}
    </button>
  );
}
