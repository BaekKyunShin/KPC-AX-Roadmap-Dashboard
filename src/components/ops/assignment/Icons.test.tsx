import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';

import { SpinnerIcon, RefreshIcon, WarningIcon, CloseIcon, CheckIcon } from './Icons';

describe('Icons', () => {
  describe('SpinnerIcon', () => {
    it('기본 렌더링이 된다', () => {
      const { container } = render(<SpinnerIcon />);
      expect(container.querySelector('svg')).toBeInTheDocument();
    });

    it('기본 className(h-4 w-4)을 적용한다', () => {
      const { container } = render(<SpinnerIcon />);
      const svg = container.querySelector('svg');
      expect(svg).toHaveClass('h-4', 'w-4');
    });

    it('animate-spin 클래스를 항상 적용한다', () => {
      const { container } = render(<SpinnerIcon />);
      const svg = container.querySelector('svg');
      expect(svg).toHaveClass('animate-spin');
    });

    it('커스텀 className prop을 전달하면 적용된다', () => {
      const { container } = render(<SpinnerIcon className="h-6 w-6 text-blue-500" />);
      const svg = container.querySelector('svg');
      expect(svg).toHaveClass('h-6', 'w-6', 'text-blue-500');
    });
  });

  describe('RefreshIcon', () => {
    it('기본 렌더링이 된다', () => {
      const { container } = render(<RefreshIcon />);
      expect(container.querySelector('svg')).toBeInTheDocument();
    });

    it('기본 className(h-4 w-4)을 적용한다', () => {
      const { container } = render(<RefreshIcon />);
      const svg = container.querySelector('svg');
      expect(svg).toHaveClass('h-4', 'w-4');
    });

    it('커스텀 className prop을 전달하면 적용된다', () => {
      const { container } = render(<RefreshIcon className="h-5 w-5 text-green-500" />);
      const svg = container.querySelector('svg');
      expect(svg).toHaveClass('h-5', 'w-5', 'text-green-500');
    });
  });

  describe('WarningIcon', () => {
    it('기본 렌더링이 된다', () => {
      const { container } = render(<WarningIcon />);
      expect(container.querySelector('svg')).toBeInTheDocument();
    });

    it('기본 className(w-5 h-5)을 적용한다', () => {
      const { container } = render(<WarningIcon />);
      const svg = container.querySelector('svg');
      expect(svg).toHaveClass('w-5', 'h-5');
    });

    it('커스텀 className prop을 전달하면 적용된다', () => {
      const { container } = render(<WarningIcon className="w-8 h-8 text-yellow-500" />);
      const svg = container.querySelector('svg');
      expect(svg).toHaveClass('w-8', 'h-8', 'text-yellow-500');
    });
  });

  describe('CloseIcon', () => {
    it('기본 렌더링이 된다', () => {
      const { container } = render(<CloseIcon />);
      expect(container.querySelector('svg')).toBeInTheDocument();
    });

    it('기본 className(w-4 h-4)을 적용한다', () => {
      const { container } = render(<CloseIcon />);
      const svg = container.querySelector('svg');
      expect(svg).toHaveClass('w-4', 'h-4');
    });

    it('커스텀 className prop을 전달하면 적용된다', () => {
      const { container } = render(<CloseIcon className="w-6 h-6 text-red-500" />);
      const svg = container.querySelector('svg');
      expect(svg).toHaveClass('w-6', 'h-6', 'text-red-500');
    });
  });

  describe('CheckIcon', () => {
    it('기본 렌더링이 된다', () => {
      const { container } = render(<CheckIcon />);
      expect(container.querySelector('svg')).toBeInTheDocument();
    });

    it('기본 className(w-3 h-3)을 적용한다', () => {
      const { container } = render(<CheckIcon />);
      const svg = container.querySelector('svg');
      expect(svg).toHaveClass('w-3', 'h-3');
    });

    it('커스텀 className prop을 전달하면 적용된다', () => {
      const { container } = render(<CheckIcon className="w-5 h-5 text-green-600" />);
      const svg = container.querySelector('svg');
      expect(svg).toHaveClass('w-5', 'h-5', 'text-green-600');
    });
  });
});
