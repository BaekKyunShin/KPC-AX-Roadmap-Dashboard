'use client';

import { Download, Loader2 } from 'lucide-react';

export interface DownloadButtonProps {
  onClick: () => void;
  loading: boolean;
  type: 'PDF' | 'Excel';
  disabled: boolean;
}

export function DownloadButton({ onClick, loading, type, disabled }: DownloadButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 disabled:opacity-50 text-sm flex items-center"
    >
      {loading ? (
        <>
          <Loader2 className="w-4 h-4 mr-1 animate-spin" />
          <span>다운로드 중...</span>
        </>
      ) : (
        <>
          <Download className="w-4 h-4 mr-1" />
          {type}
        </>
      )}
    </button>
  );
}
