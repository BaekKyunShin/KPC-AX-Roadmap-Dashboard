'use client';

import { useRef, useEffect } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { Users, Building2, ClipboardCheck, Route, FileText, BarChart3 } from 'lucide-react';
import { cn } from '@/lib/utils';

if (typeof window !== 'undefined') {
  gsap.registerPlugin(ScrollTrigger);
}

const features = [
  {
    category: '컨설턴트',
    title: '전문가와 함께하는\nAI 교육 설계',
    description: '배정된 프로젝트를 관리하고 현장 인터뷰를 통해 기업 맞춤형 로드맵을 생성합니다.',
    items: [
      { icon: ClipboardCheck, label: '현장 인터뷰 진행' },
      { icon: Route, label: 'AI 로드맵 생성' },
      { icon: FileText, label: 'PDF/Excel 내보내기' },
    ],
    cta: '로그인하여 시작하기',
    ctaLink: '/login',
    badge: '전문가용',
  },
  {
    category: '운영관리자',
    title: '효율적인\n프로젝트 관리',
    description: '기업 프로젝트를 생성하고 최적의 컨설턴트를 매칭하여 교육 품질을 높입니다.',
    items: [
      { icon: Building2, label: '기업 프로젝트 생성' },
      { icon: Users, label: '컨설턴트 매칭' },
      { icon: BarChart3, label: '진행 상황 모니터링' },
    ],
    cta: '관리자 로그인',
    ctaLink: '/login',
    badge: '관리자용',
  },
];

export default function FeaturesSection() {
  const sectionRef = useRef<HTMLElement>(null);
  const cardsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!cardsRef.current) return;

    const cards = cardsRef.current.children;

    gsap.fromTo(
      cards,
      { opacity: 0, y: 80 },
      {
        opacity: 1,
        y: 0,
        duration: 0.8,
        stagger: 0.2,
        ease: 'power3.out',
        scrollTrigger: {
          trigger: sectionRef.current,
          start: 'top 70%',
          toggleActions: 'play none none reverse',
        },
      }
    );
  }, []);

  return (
    <section
      id="features"
      ref={sectionRef}
      className="py-24 sm:py-32 px-4"
    >
      <div className="max-w-7xl mx-auto">
        {/* Section Header */}
        <div className="text-center mb-16">
          <span className="inline-block px-4 py-1.5 bg-blue-50 text-blue-600 text-sm font-medium rounded-full mb-4">
            서비스 소개
          </span>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-semibold text-gray-800">
            역할에 맞는 기능을 제공합니다
          </h2>
        </div>

        {/* Bento Grid Feature Cards */}
        <div
          ref={cardsRef}
          className="mx-auto grid max-w-7xl grid-cols-1 gap-4 md:auto-rows-auto md:grid-cols-2"
        >
          {features.map((feature, index) => (
            <div
              key={index}
              className={cn(
                "group/bento row-span-1 flex flex-col justify-between space-y-4 rounded-xl border border-neutral-200 bg-white p-6 sm:p-8 transition duration-200 hover:shadow-xl",
                "relative overflow-hidden"
              )}
            >
              {/* Gradient overlay on hover */}
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-blue-50/50 via-transparent to-purple-50/50 opacity-0 transition-opacity duration-300 group-hover/bento:opacity-100" />

              {/* Content */}
              <div className="relative z-10">
                {/* Badge */}
                <span className="inline-block px-3 py-1 bg-neutral-100 text-neutral-600 text-xs font-medium rounded-full mb-6">
                  {feature.badge}
                </span>

                {/* Title & Description with hover animation */}
                <div className="transition duration-200 group-hover/bento:translate-x-2">
                  <h3 className="text-2xl sm:text-3xl font-bold text-neutral-800 whitespace-pre-line mb-4">
                    {feature.title}
                  </h3>
                  <p className="text-neutral-600 mb-8">{feature.description}</p>
                </div>

                {/* Feature Items */}
                <div className="space-y-4 mb-8">
                  {feature.items.map((item, itemIndex) => (
                    <div
                      key={itemIndex}
                      className="flex items-center gap-3 transition duration-200 group-hover/bento:translate-x-2"
                      style={{ transitionDelay: `${itemIndex * 50}ms` }}
                    >
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-neutral-100 group-hover/bento:bg-white group-hover/bento:shadow-sm transition-all duration-200">
                        <item.icon className="h-5 w-5 text-neutral-700" />
                      </div>
                      <span className="text-neutral-700 font-medium">{item.label}</span>
                    </div>
                  ))}
                </div>

                {/* CTA */}
                <a
                  href={feature.ctaLink}
                  className="inline-flex items-center gap-2 text-neutral-900 font-semibold hover:gap-3 transition-all group-hover/bento:translate-x-2"
                  data-cursor-hover
                >
                  {feature.cta}
                  <span className="text-lg transition-transform duration-200 group-hover/bento:translate-x-1">→</span>
                </a>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
