import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { ConfirmDialog } from '../ConfirmDialog';

describe('ConfirmDialog', () => {
  it('open=false 면 렌더되지 않는다', () => {
    render(
      <ConfirmDialog
        open={false}
        onOpenChange={vi.fn()}
        title="삭제하시겠습니까?"
        actionLabel="삭제"
        onConfirm={vi.fn()}
      />,
    );
    expect(screen.queryByText('삭제하시겠습니까?')).not.toBeInTheDocument();
  });

  it('open=true 면 제목·기본 취소 라벨·액션 라벨을 렌더한다', () => {
    render(
      <ConfirmDialog
        open={true}
        onOpenChange={vi.fn()}
        title="활동 기록을 삭제하시겠습니까?"
        actionLabel="삭제"
        onConfirm={vi.fn()}
      />,
    );
    expect(
      screen.getByText('활동 기록을 삭제하시겠습니까?'),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '취소' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '삭제' })).toBeInTheDocument();
  });

  it('description 이 주어지면 노출한다', () => {
    render(
      <ConfirmDialog
        open={true}
        onOpenChange={vi.fn()}
        title="공지를 삭제하시겠습니까?"
        description="첨부 파일도 함께 제거됩니다."
        actionLabel="삭제"
        onConfirm={vi.fn()}
      />,
    );
    expect(
      screen.getByText('첨부 파일도 함께 제거됩니다.'),
    ).toBeInTheDocument();
  });

  it('description 이 없으면 시각적으로 보이는 description 이 없다 (a11y 용 sr-only 만 존재)', () => {
    render(
      <ConfirmDialog
        open={true}
        onOpenChange={vi.fn()}
        title="활동 기록을 삭제하시겠습니까?"
        actionLabel="삭제"
        onConfirm={vi.fn()}
      />,
    );
    // AlertDialog 는 portal 로 document.body 에 마운트되므로 screen 으로 찾는다
    const desc = document.querySelector(
      '[data-slot="alert-dialog-description"]',
    );
    expect(desc).not.toBeNull();
    expect(desc?.className).toMatch(/sr-only/);
  });

  it('cancelLabel 로 취소 버튼 라벨을 커스터마이즈할 수 있다', () => {
    render(
      <ConfirmDialog
        open={true}
        onOpenChange={vi.fn()}
        title="이동하시겠습니까?"
        cancelLabel="머무르기"
        actionLabel="이동"
        onConfirm={vi.fn()}
      />,
    );
    expect(screen.getByRole('button', { name: '머무르기' })).toBeInTheDocument();
  });

  it('확인 클릭 시 onConfirm 을 호출한다', async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn();
    render(
      <ConfirmDialog
        open={true}
        onOpenChange={vi.fn()}
        title="삭제하시겠습니까?"
        actionLabel="삭제"
        onConfirm={onConfirm}
      />,
    );
    await user.click(screen.getByRole('button', { name: '삭제' }));
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it('취소 클릭 시 onOpenChange(false) 가 호출된다', async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();
    render(
      <ConfirmDialog
        open={true}
        onOpenChange={onOpenChange}
        title="삭제하시겠습니까?"
        actionLabel="삭제"
        onConfirm={vi.fn()}
      />,
    );
    await user.click(screen.getByRole('button', { name: '취소' }));
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('variant="destructive" 인 경우 액션 버튼에 destructive 스타일이 적용된다', () => {
    render(
      <ConfirmDialog
        open={true}
        onOpenChange={vi.fn()}
        title="삭제하시겠습니까?"
        actionLabel="삭제"
        variant="destructive"
        onConfirm={vi.fn()}
      />,
    );
    const actionButton = screen.getByRole('button', { name: '삭제' });
    // shadcn Button 의 destructive variant 는 bg-destructive 클래스를 포함한다
    expect(actionButton.className).toMatch(/bg-destructive|destructive/);
  });

  it('loading=true 일 때 액션·취소 버튼이 모두 비활성화된다', () => {
    render(
      <ConfirmDialog
        open={true}
        onOpenChange={vi.fn()}
        title="삭제 중"
        actionLabel="삭제"
        loading={true}
        onConfirm={vi.fn()}
      />,
    );
    expect(screen.getByRole('button', { name: /삭제/ })).toBeDisabled();
    expect(screen.getByRole('button', { name: '취소' })).toBeDisabled();
  });

  it('description 에 ReactNode (다중 라인) 을 전달할 수 있다', () => {
    render(
      <ConfirmDialog
        open={true}
        onOpenChange={vi.fn()}
        title="공지를 삭제하시겠습니까?"
        description={
          <>
            <span>&quot;공지 제목 예시&quot;</span>
            <br />
            첨부 파일도 함께 제거됩니다.
          </>
        }
        actionLabel="삭제"
        onConfirm={vi.fn()}
      />,
    );
    expect(screen.getByText(/공지 제목 예시/)).toBeInTheDocument();
    expect(
      screen.getByText(/첨부 파일도 함께 제거됩니다/),
    ).toBeInTheDocument();
  });
});
