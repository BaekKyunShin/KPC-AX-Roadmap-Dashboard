'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { Menu, X, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Logo } from '@/components/ui/logo';

// ============================================================================
// 타입
// ============================================================================

interface NavLink {
  readonly href: string;
  readonly label: string;
}

// ============================================================================
// 상수
// ============================================================================

const SCROLL_THRESHOLD = 50;

const NAV_LINKS: readonly NavLink[] = [
  { href: '#features', label: '서비스 소개' },
  { href: '#workflow', label: '워크플로우' },
  { href: '#demo', label: '데모' },
] as const;

const MOBILE_MENU_TRANSITION = 'transition-all duration-300 ease-in-out';

// ============================================================================
// 서브 컴포넌트
// ============================================================================

interface MobileNavLinkProps {
  link: NavLink;
  onClick: () => void;
}

function MobileNavLink({ link, onClick }: MobileNavLinkProps) {
  return (
    <a
      href={link.href}
      onClick={onClick}
      className="flex items-center justify-between px-4 py-4 text-gray-700 hover:bg-gray-50 hover:text-gray-900 transition-colors"
    >
      <span className="font-medium">{link.label}</span>
      <ChevronRight className="w-4 h-4 text-gray-400" />
    </a>
  );
}

interface MobileMenuProps {
  isOpen: boolean;
  onClose: () => void;
}

function MobileMenu({ isOpen, onClose }: MobileMenuProps) {
  return (
    <div
      className={`md:hidden overflow-hidden ${MOBILE_MENU_TRANSITION} ${
        isOpen ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
      }`}
    >
      <div className="bg-white border-t border-gray-200 shadow-xl">
        {/* Navigation Links */}
        <div className="divide-y divide-gray-100">
          {NAV_LINKS.map((link) => (
            <MobileNavLink key={link.href} link={link} onClick={onClose} />
          ))}
        </div>

        {/* CTA Buttons */}
        <div className="border-t border-gray-200 bg-gray-50 px-4 py-4 flex flex-col gap-3">
          <Link href="/login" onClick={onClose}>
            <Button variant="outline" className="w-full h-11 text-base">
              로그인
            </Button>
          </Link>
          <Link href="/register" onClick={onClose}>
            <Button className="w-full h-11 text-base bg-gray-900 hover:bg-gray-800 text-white">
              회원가입
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// 메인 컴포넌트
// ============================================================================

export default function Navbar() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > SCROLL_THRESHOLD);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleLogoClick = useCallback((e: React.MouseEvent) => {
    if (window.location.pathname === '/') {
      e.preventDefault();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, []);

  const closeMobileMenu = useCallback(() => {
    setIsMobileMenuOpen(false);
  }, []);

  const toggleMobileMenu = useCallback(() => {
    setIsMobileMenuOpen((prev) => !prev);
  }, []);

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        isScrolled
          ? 'bg-white/80 backdrop-blur-lg border-b border-gray-200/50 shadow-sm'
          : 'bg-transparent'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <Link
            href="/"
            onClick={handleLogoClick}
            className="transition-opacity hover:opacity-70"
            data-cursor-hover
          >
            <Logo height={26} />
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-8">
            {NAV_LINKS.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
                data-cursor-hover
              >
                {link.label}
              </a>
            ))}
          </div>

          {/* Desktop CTA */}
          <div className="hidden md:flex items-center gap-3">
            <Link href="/login">
              <Button variant="ghost" className="text-sm" data-cursor-hover>
                로그인
              </Button>
            </Link>
            <Link href="/register">
              <Button className="text-sm bg-gray-900 hover:bg-gray-800 text-white" data-cursor-hover>
                회원가입
              </Button>
            </Link>
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={toggleMobileMenu}
            className="md:hidden p-2 rounded-lg hover:bg-gray-100 transition-colors"
            data-cursor-hover
            aria-label={isMobileMenuOpen ? '메뉴 닫기' : '메뉴 열기'}
          >
            {isMobileMenuOpen ? (
              <X className="h-6 w-6 text-gray-600" />
            ) : (
              <Menu className="h-6 w-6 text-gray-600" />
            )}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      <MobileMenu isOpen={isMobileMenuOpen} onClose={closeMobileMenu} />
    </nav>
  );
}
