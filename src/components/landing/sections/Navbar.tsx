'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { Menu, X, ChevronRight, LayoutDashboard } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Logo } from '@/components/ui/logo';
import { createClient } from '@/lib/supabase/client';

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

interface MobileMenuOverlayProps {
  isOpen: boolean;
  onClose: () => void;
}

function MobileMenuOverlay({ isOpen, onClose }: MobileMenuOverlayProps) {
  return (
    <div
      className={`md:hidden fixed inset-0 bg-black/35 z-40 ${MOBILE_MENU_TRANSITION} ${
        isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
      }`}
      onClick={onClose}
      aria-hidden="true"
    />
  );
}

interface AuthButtonsProps {
  isLoggedIn: boolean;
  variant: 'desktop' | 'mobile';
  onNavigate?: () => void;
}

function AuthButtons({ isLoggedIn, variant, onNavigate }: AuthButtonsProps) {
  if (isLoggedIn) {
    return (
      <Link href="/dashboard" onClick={onNavigate}>
        <Button
          className={
            variant === 'desktop'
              ? 'text-sm bg-gray-900 hover:bg-gray-800 text-white'
              : 'w-full h-11 text-base bg-gray-900 hover:bg-gray-800 text-white'
          }
          data-cursor-hover={variant === 'desktop' || undefined}
        >
          <LayoutDashboard className="mr-2 h-4 w-4" />
          대시보드
        </Button>
      </Link>
    );
  }

  return (
    <>
      <Link href="/login" onClick={onNavigate}>
        <Button
          variant={variant === 'desktop' ? 'ghost' : 'outline'}
          className={variant === 'desktop' ? 'text-sm' : 'w-full h-11 text-base'}
          data-cursor-hover={variant === 'desktop' || undefined}
        >
          로그인
        </Button>
      </Link>
      <Link href="/register" onClick={onNavigate}>
        <Button
          className={
            variant === 'desktop'
              ? 'text-sm bg-gray-900 hover:bg-gray-800 text-white'
              : 'w-full h-11 text-base bg-gray-900 hover:bg-gray-800 text-white'
          }
          data-cursor-hover={variant === 'desktop' || undefined}
        >
          회원가입
        </Button>
      </Link>
    </>
  );
}

interface MobileMenuProps {
  isOpen: boolean;
  onClose: () => void;
  isLoggedIn: boolean;
  isAuthChecked: boolean;
}

function MobileMenu({ isOpen, onClose, isLoggedIn, isAuthChecked }: MobileMenuProps) {
  return (
    <div
      className={`md:hidden overflow-hidden ${MOBILE_MENU_TRANSITION} ${
        isOpen ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
      }`}
    >
      <div className="bg-white border-t border-gray-200">
        {/* Navigation Links */}
        <div className="divide-y divide-gray-100">
          {NAV_LINKS.map((link) => (
            <MobileNavLink key={link.href} link={link} onClick={onClose} />
          ))}
        </div>

        {/* CTA Buttons */}
        <div className="border-t border-gray-200 bg-gray-50 px-4 py-4 flex flex-col gap-3">
          {isAuthChecked && (
            <AuthButtons isLoggedIn={isLoggedIn} variant="mobile" onNavigate={onClose} />
          )}
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
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isAuthChecked, setIsAuthChecked] = useState(false);

  useEffect(() => {
    const supabase = createClient();

    supabase.auth.getUser().then(({ data: { user } }) => {
      setIsLoggedIn(!!user);
      setIsAuthChecked(true);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsLoggedIn(!!session?.user);
      setIsAuthChecked(true);
    });

    return () => subscription.unsubscribe();
  }, []);

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
    <>
      {/* Mobile Menu Overlay */}
      <MobileMenuOverlay isOpen={isMobileMenuOpen} onClose={closeMobileMenu} />

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
              {isAuthChecked && (
                <AuthButtons isLoggedIn={isLoggedIn} variant="desktop" />
              )}
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
        <MobileMenu isOpen={isMobileMenuOpen} onClose={closeMobileMenu} isLoggedIn={isLoggedIn} isAuthChecked={isAuthChecked} />
      </nav>
    </>
  );
}
