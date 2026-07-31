'use client';

import { WarningIcon, CloseIcon } from './Icons';

interface AlertMessageProps {
  message: string;
  onDismiss?: () => void;
  variant?: 'warning' | 'error';
}

const variantStyles = {
  warning: {
    container: 'bg-amber-50 border-amber-200 text-amber-800',
    icon: 'text-amber-500',
    button: 'text-amber-600 hover:text-amber-800',
  },
  error: {
    container: 'bg-red-50 border-red-200 text-red-700',
    icon: 'text-red-500',
    button: 'text-red-600 hover:text-red-800',
  },
};

export default function AlertMessage({
  message,
  onDismiss,
  variant = 'warning',
}: AlertMessageProps) {
  const styles = variantStyles[variant];

  return (
    <div className={`mb-4 border px-4 py-3 rounded flex items-center ${styles.container}`}>
      <WarningIcon className={`w-5 h-5 mr-3 flex-shrink-0 ${styles.icon}`} />
      <p className="flex-1">{message}</p>
      {onDismiss && (
        <button onClick={onDismiss} className={`ml-3 ${styles.button}`}>
          <CloseIcon className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}
