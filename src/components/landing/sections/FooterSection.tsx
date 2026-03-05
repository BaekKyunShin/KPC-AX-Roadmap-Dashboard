'use client';

import { useRef, useEffect, useState } from 'react';
import Link from 'next/link';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { Mail, Phone, ExternalLink, Copy, type LucideIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Logo } from '@/components/ui/logo';
import { cn } from '@/lib/utils';
import { showSuccessToast } from '@/lib/utils/toast';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { FooterCredit } from '@/components/ui/FooterCredit';

if (typeof window !== 'undefined') {
  gsap.registerPlugin(ScrollTrigger);
}

// ============================================================================
// 타입 정의
// ============================================================================

interface ContactLink {
  type: 'email' | 'phone';
  value: string;
}

interface ContactPerson {
  id: string;
  label: string;
  name: string;
  description: string;
  links: ContactLink[];
}

// ============================================================================
// 상수
// ============================================================================

const CONTACT_PERSONS: ContactPerson[] = [
  {
    id: 'operations',
    label: '운영 담당자',
    name: '김유근 위원',
    description: '서비스 이용 및 컨설턴트 배정 관련',
    links: [
      { type: 'email', value: 'ykkim@kpc.or.kr' },
      { type: 'phone', value: '02-398-4311' },
    ],
  },
  {
    id: 'developer',
    label: '개발자',
    name: '신백균 팀장',
    description: '개발 관련 문의 및 기술 협업 제안',
    links: [
      { type: 'email', value: 'bkshin@kpc.or.kr' },
    ],
  },
];

const CONTACT_LINK_ICONS: Record<ContactLink['type'], LucideIcon> = {
  email: Mail,
  phone: Phone,
};

const CONTACT_LINK_TOAST_MESSAGES: Record<ContactLink['type'], { title: string; description: string }> = {
  email: { title: '복사 완료', description: '이메일이 클립보드에 복사되었습니다.' },
  phone: { title: '복사 완료', description: '전화번호가 클립보드에 복사되었습니다.' },
};

const CONTACT_LINK_HOVER_COLORS: Record<ContactLink['type'], string> = {
  email: 'group-hover:text-blue-500',
  phone: 'group-hover:text-emerald-500',
};

const KPC_HOMEPAGE_URL = 'https://www.kpc.or.kr';

const PRODUCT_LINKS = [
  { label: '서비스 소개', href: '#features' },
  { label: '워크플로우', href: '#workflow' },
  { label: '데모', href: '#demo' },
] as const;

const ANIMATION_CONFIG = {
  title: {
    initial: { opacity: 0, y: 50 },
    animate: { opacity: 1, y: 0 },
    duration: 0.8,
    ease: 'power3.out',
    scrollTrigger: { start: 'top 70%', toggleActions: 'play none none reverse' },
  },
  cta: {
    initial: { opacity: 0, y: 30 },
    animate: { opacity: 1, y: 0 },
    duration: 0.6,
    ease: 'power3.out',
    scrollTrigger: { start: 'top 60%', toggleActions: 'play none none reverse' },
  },
} as const;

// ============================================================================
// 서브 컴포넌트
// ============================================================================

interface ContactCardProps {
  person: ContactPerson;
}

function ContactCard({ person }: ContactCardProps) {
  return (
    <div className="rounded-xl border border-gray-200 p-4">
      <div className="mb-4">
        <p className="text-xs text-gray-500 mb-1">{person.label}</p>
        <h4 className="text-base font-semibold text-gray-900">{person.name}</h4>
        <p className="text-sm text-gray-500 mt-1">{person.description}</p>
      </div>
      <div className="flex flex-col gap-2">
        {person.links.map((link) => {
          const Icon = CONTACT_LINK_ICONS[link.type];
          return (
            <button
              key={`${link.type}-${link.value}`}
              onClick={() => {
                navigator.clipboard.writeText(link.value);
                const msg = CONTACT_LINK_TOAST_MESSAGES[link.type];
                showSuccessToast(msg.title, msg.description);
              }}
              className="flex items-center gap-2 px-2 py-1 -mx-2 rounded-md text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-50 transition-all group cursor-pointer"
            >
              <Icon className={cn("h-4 w-4 transition-colors", CONTACT_LINK_HOVER_COLORS[link.type])} />
              <span>{link.value}</span>
              <Copy className="h-3 w-3 opacity-0 group-hover:opacity-50 transition-opacity" />
            </button>
          );
        })}
      </div>
    </div>
  );
}

interface ContactDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function ContactDialog({ open, onOpenChange }: ContactDialogProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // Hydration 불일치를 방지하기 위한 표준 패턴
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, []);

  // SSR 중에는 버튼만 렌더링하여 hydration 불일치 방지
  if (!mounted) {
    return (
      <button
        className="text-gray-600 text-sm hover:text-gray-900 transition-colors"
        data-cursor-hover
      >
        문의하기
      </button>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <button
          className="text-gray-600 text-sm hover:text-gray-900 transition-colors"
          data-cursor-hover
        >
          문의하기
        </button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>문의하기</DialogTitle>
          <DialogDescription>
            문의 유형에 따라 아래 연락처로 연락해 주세요.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-5 pt-4">
          {CONTACT_PERSONS.map((person) => (
            <ContactCard key={person.id} person={person} />
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ============================================================================
// 메인 컴포넌트
// ============================================================================

export default function FooterSection() {
  const sectionRef = useRef<HTMLElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const ctaRef = useRef<HTMLDivElement>(null);
  const [isContactOpen, setIsContactOpen] = useState(false);

  useEffect(() => {
    // Title animation
    gsap.fromTo(titleRef.current, ANIMATION_CONFIG.title.initial, {
      ...ANIMATION_CONFIG.title.animate,
      duration: ANIMATION_CONFIG.title.duration,
      ease: ANIMATION_CONFIG.title.ease,
      scrollTrigger: {
        trigger: sectionRef.current,
        ...ANIMATION_CONFIG.title.scrollTrigger,
      },
    });

    // CTA animation
    gsap.fromTo(ctaRef.current, ANIMATION_CONFIG.cta.initial, {
      ...ANIMATION_CONFIG.cta.animate,
      duration: ANIMATION_CONFIG.cta.duration,
      ease: ANIMATION_CONFIG.cta.ease,
      scrollTrigger: {
        trigger: sectionRef.current,
        ...ANIMATION_CONFIG.cta.scrollTrigger,
      },
    });
  }, []);

  return (
    <section ref={sectionRef} className="py-24 sm:py-32 px-4">
      <div className="max-w-7xl mx-auto">
        {/* CTA Section */}
        <div className="text-center mb-24">
          <h2
            ref={titleRef}
            className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-semibold text-gray-800 mb-8"
          >
            지금 시작하세요
          </h2>
          <div ref={ctaRef} className="flex flex-col sm:flex-row justify-center gap-4">
            <Link href="/register">
              <Button
                size="lg"
                className="bg-gray-900 hover:bg-gray-800 text-white px-8 py-6 text-base rounded-full"
                data-cursor-hover
              >
                서비스 이용하기
              </Button>
            </Link>
            <a href="#demo">
              <Button
                size="lg"
                variant="outline"
                className="px-8 py-6 text-base rounded-full border-gray-300 hover:bg-gray-50"
                data-cursor-hover
              >
                데모 살펴보기
              </Button>
            </a>
          </div>
        </div>

        {/* Footer Content */}
        <div className="border-t border-gray-200 pt-12">
          <div className="grid md:grid-cols-4 gap-8">
            {/* Logo & Description */}
            <div className="md:col-span-2">
              <Link href="/" className="mb-4 inline-block" data-cursor-hover>
                <Logo height={24} priority={false} />
              </Link>
              <p className="text-gray-600 text-sm max-w-xs">
                기업 AI 교육 진단, 컨설턴트 매칭, 로드맵 생성을 위한 KPC AI 훈련 확산센터의
                차세대 B2B 솔루션입니다.
              </p>
            </div>

            {/* Product Links */}
            <div>
              <h4 className="font-semibold text-gray-800 mb-4">Product</h4>
              <ul className="space-y-2">
                {PRODUCT_LINKS.map((link) => (
                  <li key={link.label}>
                    <a
                      href={link.href}
                      className="text-gray-600 text-sm hover:text-gray-900 transition-colors"
                      data-cursor-hover
                    >
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>

            {/* External Links */}
            <div>
              <h4 className="font-semibold text-gray-800 mb-4">Links</h4>
              <ul className="space-y-2">
                <li>
                  <a
                    href={KPC_HOMEPAGE_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-gray-600 text-sm hover:text-gray-900 transition-colors inline-flex items-center gap-1"
                    data-cursor-hover
                  >
                    KPC 홈페이지
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </li>
                <li>
                  <ContactDialog open={isContactOpen} onOpenChange={setIsContactOpen} />
                </li>
              </ul>
            </div>
          </div>

          {/* Bottom */}
          <div className="flex flex-col sm:flex-row justify-center items-center mt-12 pt-8 border-t border-gray-100">
            <FooterCredit className="text-gray-500" />
          </div>
        </div>
      </div>
    </section>
  );
}
