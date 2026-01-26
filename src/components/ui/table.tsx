'use client';

import * as React from 'react';

import { cn } from '@/lib/utils';

// =============================================================================
// Table Container
// =============================================================================

function Table({ className, ...props }: React.ComponentProps<'table'>) {
  return (
    <div data-slot="table-container" className="relative w-full overflow-x-auto">
      <table
        data-slot="table"
        className={cn('w-full table-fixed caption-bottom text-sm divide-y divide-gray-200', className)}
        {...props}
      />
    </div>
  );
}

// =============================================================================
// Table Header
// =============================================================================

function TableHeader({ className, ...props }: React.ComponentProps<'thead'>) {
  return <thead data-slot="table-header" className={cn('bg-gray-50', className)} {...props} />;
}

// =============================================================================
// Table Body
// =============================================================================

function TableBody({ className, ...props }: React.ComponentProps<'tbody'>) {
  return (
    <tbody
      data-slot="table-body"
      className={cn('bg-white divide-y divide-gray-200', className)}
      {...props}
    />
  );
}

// =============================================================================
// Table Footer
// =============================================================================

function TableFooter({ className, ...props }: React.ComponentProps<'tfoot'>) {
  return (
    <tfoot
      data-slot="table-footer"
      className={cn('bg-muted/50 border-t font-medium [&>tr]:last:border-b-0', className)}
      {...props}
    />
  );
}

// =============================================================================
// Table Row
// =============================================================================

function TableRow({ className, ...props }: React.ComponentProps<'tr'>) {
  return (
    <tr
      data-slot="table-row"
      className={cn('hover:bg-gray-50 transition-colors', className)}
      {...props}
    />
  );
}

// =============================================================================
// Table Head (Header Cell)
// =============================================================================

function TableHead({ className, ...props }: React.ComponentProps<'th'>) {
  return (
    <th
      data-slot="table-head"
      className={cn(
        'px-6 py-3 text-center align-middle text-sm font-medium text-gray-500 uppercase tracking-wider',
        className
      )}
      {...props}
    />
  );
}

// =============================================================================
// Table Cell
// =============================================================================

function TableCell({ className, ...props }: React.ComponentProps<'td'>) {
  return (
    <td
      data-slot="table-cell"
      className={cn('px-6 py-4 align-top text-center text-sm', className)}
      {...props}
    />
  );
}

// =============================================================================
// Table Caption
// =============================================================================

function TableCaption({ className, ...props }: React.ComponentProps<'caption'>) {
  return (
    <caption
      data-slot="table-caption"
      className={cn('text-muted-foreground mt-4 text-sm', className)}
      {...props}
    />
  );
}

// =============================================================================
// Action Link (for clickable text in tables)
// =============================================================================

interface TableActionLinkProps extends React.ComponentProps<'button'> {
  variant?: 'primary' | 'danger' | 'success' | 'secondary';
}

function TableActionLink({
  className,
  variant = 'primary',
  ...props
}: TableActionLinkProps) {
  const variantStyles = {
    primary: 'text-blue-600 hover:text-blue-800',
    danger: 'text-red-600 hover:text-red-800',
    success: 'text-green-600 hover:text-green-800',
    secondary: 'text-gray-600 hover:text-gray-800',
  };

  return (
    <button
      data-slot="table-action-link"
      className={cn(
        variantStyles[variant],
        'underline-offset-2 hover:underline cursor-pointer transition-colors duration-150',
        'disabled:opacity-50 disabled:cursor-not-allowed disabled:no-underline',
        className
      )}
      {...props}
    />
  );
}

// =============================================================================
// Exports
// =============================================================================

export {
  Table,
  TableHeader,
  TableBody,
  TableFooter,
  TableHead,
  TableRow,
  TableCell,
  TableCaption,
  TableActionLink,
};
