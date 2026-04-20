import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { NcsMethodologyBox } from './NcsMethodologyBox';

// ============================================================================
// NcsMethodologyBox 컴포넌트 테스트
// NCS 활용 여부 토글 + textarea 입력 내부 함수 커버리지 확보
// ============================================================================

describe('NcsMethodologyBox', () => {
  describe('기본 렌더링', () => {
    it('ncsUsed=true이면 "NCS 활용 방법" 라벨과 힌트를 표시한다', () => {
      render(
        <NcsMethodologyBox
          ncsUsed={true}
          ncsMethodology="활용 설명"
          ncsDerivationMethod=""
          canEdit={false}
        />,
      );
      expect(screen.getByText('NCS 활용 방법')).toBeInTheDocument();
      expect(screen.getByText(/NCS\(국가직무능력표준\)/)).toBeInTheDocument();
    });

    it('ncsUsed=false이면 "역량별 도출 방법" 라벨과 힌트를 표시한다', () => {
      render(
        <NcsMethodologyBox
          ncsUsed={false}
          ncsMethodology=""
          ncsDerivationMethod="도출 설명"
          canEdit={false}
        />,
      );
      expect(screen.getByText('역량별 도출 방법')).toBeInTheDocument();
      expect(screen.getByText(/NCS를 활용하지 않은 경우/)).toBeInTheDocument();
    });

    it('ncsUsed=true이면 "NCS 활용" 라벨을 Switch 옆에 표시한다', () => {
      render(
        <NcsMethodologyBox
          ncsUsed={true}
          ncsMethodology=""
          ncsDerivationMethod=""
          canEdit={false}
        />,
      );
      expect(screen.getByText('NCS 활용')).toBeInTheDocument();
    });

    it('ncsUsed=false이면 "NCS 미활용" 라벨을 Switch 옆에 표시한다', () => {
      render(
        <NcsMethodologyBox
          ncsUsed={false}
          ncsMethodology=""
          ncsDerivationMethod=""
          canEdit={false}
        />,
      );
      expect(screen.getByText('NCS 미활용')).toBeInTheDocument();
    });
  });

  describe('읽기 전용 모드 (canEdit=false)', () => {
    it('ncsUsed=true이면 ncsMethodology 값을 표시한다', () => {
      render(
        <NcsMethodologyBox
          ncsUsed={true}
          ncsMethodology="NCS 세분류 활용"
          ncsDerivationMethod="비NCS 도출"
          canEdit={false}
        />,
      );
      expect(screen.getByText('NCS 세분류 활용')).toBeInTheDocument();
      // ncsDerivationMethod는 ncsUsed=true이므로 미표시
      expect(screen.queryByText('비NCS 도출')).not.toBeInTheDocument();
    });

    it('ncsUsed=false이면 ncsDerivationMethod 값을 표시한다', () => {
      render(
        <NcsMethodologyBox
          ncsUsed={false}
          ncsMethodology="NCS 세분류 활용"
          ncsDerivationMethod="비NCS 도출"
          canEdit={false}
        />,
      );
      expect(screen.getByText('비NCS 도출')).toBeInTheDocument();
      expect(screen.queryByText('NCS 세분류 활용')).not.toBeInTheDocument();
    });

    it('값이 비어있으면 "(내용 없음)"을 표시한다', () => {
      render(
        <NcsMethodologyBox
          ncsUsed={true}
          ncsMethodology=""
          ncsDerivationMethod=""
          canEdit={false}
        />,
      );
      expect(screen.getByText('(내용 없음)')).toBeInTheDocument();
    });
  });

  describe('편집 모드 (canEdit=true)', () => {
    it('textarea가 표시된다', () => {
      render(
        <NcsMethodologyBox
          ncsUsed={true}
          ncsMethodology=""
          ncsDerivationMethod=""
          canEdit={true}
          onChange={vi.fn()}
        />,
      );
      expect(screen.getByRole('textbox', { name: 'NCS 활용 방법' })).toBeInTheDocument();
    });

    it('ncsUsed=true 상태에서 textarea 입력 시 ncs_methodology로 onChange 호출 (handleTextChange)', async () => {
      const onChange = vi.fn();
      const user = userEvent.setup();
      render(
        <NcsMethodologyBox
          ncsUsed={true}
          ncsMethodology=""
          ncsDerivationMethod=""
          canEdit={true}
          onChange={onChange}
        />,
      );
      const textarea = screen.getByRole('textbox', { name: 'NCS 활용 방법' });
      await user.type(textarea, 'X');
      expect(onChange).toHaveBeenCalledWith({ ncs_methodology: 'X' });
    });

    it('ncsUsed=false 상태에서 textarea 입력 시 ncs_derivation_method로 onChange 호출 (handleTextChange 분기)', async () => {
      const onChange = vi.fn();
      const user = userEvent.setup();
      render(
        <NcsMethodologyBox
          ncsUsed={false}
          ncsMethodology=""
          ncsDerivationMethod=""
          canEdit={true}
          onChange={onChange}
        />,
      );
      const textarea = screen.getByRole('textbox', { name: '역량별 도출 방법' });
      await user.type(textarea, 'Y');
      expect(onChange).toHaveBeenCalledWith({ ncs_derivation_method: 'Y' });
    });

    it('Switch 토글 클릭 시 handleToggle → ncs_used 반전 호출', async () => {
      const onChange = vi.fn();
      const user = userEvent.setup();
      render(
        <NcsMethodologyBox
          ncsUsed={true}
          ncsMethodology=""
          ncsDerivationMethod=""
          canEdit={true}
          onChange={onChange}
        />,
      );
      const switchEl = screen.getByRole('switch', { name: 'NCS 활용 여부' });
      await user.click(switchEl);
      expect(onChange).toHaveBeenCalledWith({ ncs_used: false });
    });

    it('ncsUsed=false에서 Switch 토글 클릭 시 ncs_used=true 호출', async () => {
      const onChange = vi.fn();
      const user = userEvent.setup();
      render(
        <NcsMethodologyBox
          ncsUsed={false}
          ncsMethodology=""
          ncsDerivationMethod=""
          canEdit={true}
          onChange={onChange}
        />,
      );
      const switchEl = screen.getByRole('switch', { name: 'NCS 활용 여부' });
      await user.click(switchEl);
      expect(onChange).toHaveBeenCalledWith({ ncs_used: true });
    });

    it('canEdit=false이면 Switch가 비활성화된다', () => {
      render(
        <NcsMethodologyBox
          ncsUsed={true}
          ncsMethodology=""
          ncsDerivationMethod=""
          canEdit={false}
        />,
      );
      const switchEl = screen.getByRole('switch', { name: 'NCS 활용 여부' });
      expect(switchEl).toBeDisabled();
    });
  });
});
