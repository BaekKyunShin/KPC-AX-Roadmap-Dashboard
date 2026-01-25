'use client';

import { useRef, useEffect } from 'react';
import Link from 'next/link';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { Button } from '@/components/ui/button';
import { Logo } from '@/components/ui/logo';

if (typeof window !== 'undefined') {
  gsap.registerPlugin(ScrollTrigger);
}

export default function FooterSection() {
  const sectionRef = useRef<HTMLElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const ctaRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    gsap.fromTo(
      titleRef.current,
      { opacity: 0, y: 50 },
      {
        opacity: 1,
        y: 0,
        duration: 0.8,
        ease: 'power3.out',
        scrollTrigger: {
          trigger: sectionRef.current,
          start: 'top 70%',
          toggleActions: 'play none none reverse',
        },
      }
    );

    gsap.fromTo(
      ctaRef.current,
      { opacity: 0, y: 30 },
      {
        opacity: 1,
        y: 0,
        duration: 0.6,
        ease: 'power3.out',
        scrollTrigger: {
          trigger: sectionRef.current,
          start: 'top 60%',
          toggleActions: 'play none none reverse',
        },
      }
    );
  }, []);

  const footerLinks = {
    product: [
      { label: '서비스 소개', href: '#features' },
      { label: '워크플로우', href: '#workflow' },
      { label: '데모', href: '#demo' },
    ],
    resources: [
      { label: '블로그', href: '#' },
      { label: '도움말', href: '#' },
      { label: '문의하기', href: '#' },
    ],
  };

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
                무료로 시작하기
              </Button>
            </Link>
            <Link href="/login">
              <Button
                size="lg"
                variant="outline"
                className="px-8 py-6 text-base rounded-full border-gray-300 hover:bg-gray-50"
                data-cursor-hover
              >
                로그인
              </Button>
            </Link>
          </div>
        </div>

        {/* Footer Content */}
        <div className="border-t border-gray-200 pt-12">
          <div className="grid md:grid-cols-4 gap-8">
            {/* Logo & Description */}
            <div className="md:col-span-2">
              <Link href="/" className="mb-4 inline-block" data-cursor-hover>
                <Logo iconSize={22} />
              </Link>
              <p className="text-gray-600 text-sm max-w-xs">
                기업 AI 교육 진단, 컨설턴트 매칭, 로드맵 생성을 위한 KPC AI 훈련 확산센터의
                차세대 B2B 솔루션입니다.
              </p>
            </div>

            {/* Links */}
            <div>
              <h4 className="font-semibold text-gray-800 mb-4">Product</h4>
              <ul className="space-y-2">
                {footerLinks.product.map((link) => (
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

            <div>
              <h4 className="font-semibold text-gray-800 mb-4">Resources</h4>
              <ul className="space-y-2">
                {footerLinks.resources.map((link) => (
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
          </div>

          {/* Bottom */}
          <div className="flex flex-col sm:flex-row justify-between items-center mt-12 pt-8 border-t border-gray-100">
            <p className="text-gray-500 text-sm">
              © 2025 KPC AI 훈련 확산센터. All rights reserved.
            </p>
            <div className="flex gap-6 mt-4 sm:mt-0">
              <a href="#" className="text-gray-500 text-sm hover:text-gray-900" data-cursor-hover>
                이용약관
              </a>
              <a href="#" className="text-gray-500 text-sm hover:text-gray-900" data-cursor-hover>
                개인정보처리방침
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
