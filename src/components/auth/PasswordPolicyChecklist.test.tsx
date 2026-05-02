import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';

import { PasswordPolicyChecklist } from './PasswordPolicyChecklist';

describe('PasswordPolicyChecklist', () => {
  it('3개 정책 항목을 렌더한다', () => {
    render(<PasswordPolicyChecklist password="" />);
    expect(screen.getByText(/8자 이상/)).toBeInTheDocument();
    expect(screen.getByText(/영문자 포함/)).toBeInTheDocument();
    expect(screen.getByText(/숫자 포함/)).toBeInTheDocument();
  });

  it('빈 입력 시 모든 항목이 미충족(role=listitem 의 data-met=false)', () => {
    render(<PasswordPolicyChecklist password="" />);
    const items = screen.getAllByRole('listitem');
    expect(items).toHaveLength(3);
    items.forEach((item) => {
      expect(item).toHaveAttribute('data-met', 'false');
    });
  });

  it('모든 정책 충족 시 모든 항목이 data-met=true', () => {
    render(<PasswordPolicyChecklist password="kpc12345" />);
    const items = screen.getAllByRole('listitem');
    items.forEach((item) => {
      expect(item).toHaveAttribute('data-met', 'true');
    });
  });

  it('영문만 8자 이상 입력 시: 길이/영문 충족, 숫자 미충족', () => {
    render(<PasswordPolicyChecklist password="abcdefgh" />);
    const items = screen.getAllByRole('listitem');
    expect(items[0]).toHaveAttribute('data-met', 'true'); // 8자 이상
    expect(items[1]).toHaveAttribute('data-met', 'true'); // 영문자
    expect(items[2]).toHaveAttribute('data-met', 'false'); // 숫자
  });

  it('숫자만 8자 이상 입력 시: 길이/숫자 충족, 영문 미충족', () => {
    render(<PasswordPolicyChecklist password="12345678" />);
    const items = screen.getAllByRole('listitem');
    expect(items[0]).toHaveAttribute('data-met', 'true');
    expect(items[1]).toHaveAttribute('data-met', 'false');
    expect(items[2]).toHaveAttribute('data-met', 'true');
  });
});
