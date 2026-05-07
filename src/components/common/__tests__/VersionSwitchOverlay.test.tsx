import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';

import { VersionSwitchOverlay } from '../VersionSwitchOverlay';

describe('VersionSwitchOverlay', () => {
  it('open=false 면 렌더되지 않는다', () => {
    render(<VersionSwitchOverlay open={false} />);
    expect(screen.queryByText(/불러오는|로딩/)).not.toBeInTheDocument();
  });

  it('open=true 면 "이전 버전을 불러오는 중" 메시지를 노출한다', () => {
    render(<VersionSwitchOverlay open={true} />);
    expect(screen.getByText(/불러오는 중/)).toBeInTheDocument();
  });

  it('aria-live 영역으로 스크린 리더에 상태 변화를 알린다', () => {
    render(<VersionSwitchOverlay open={true} />);
    const live = screen.getByRole('status');
    expect(live).toBeInTheDocument();
  });

  it('label prop 으로 메시지를 커스터마이즈할 수 있다', () => {
    render(<VersionSwitchOverlay open={true} label="다른 버전을 불러오고 있습니다" />);
    expect(screen.getByText('다른 버전을 불러오고 있습니다')).toBeInTheDocument();
  });
});
