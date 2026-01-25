'use client';

import { useRef, useEffect } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { Search, Users, ClipboardList, Route } from 'lucide-react';

if (typeof window !== 'undefined') {
  gsap.registerPlugin(ScrollTrigger);
}

const steps = [
  {
    number: '01',
    icon: Search,
    title: '기업 진단',
    description: '30문항 자가진단으로 기업의 AI 활용 역량과 교육 필요 분야를 파악합니다.',
  },
  {
    number: '02',
    icon: Users,
    title: '컨설턴트 매칭',
    description: '기업 특성에 맞는 최적의 컨설턴트를 AI 알고리즘으로 추천하고 배정합니다.',
  },
  {
    number: '03',
    icon: ClipboardList,
    title: '현장 인터뷰',
    description: '컨설턴트가 기업을 방문하여 심층 인터뷰를 진행하고 교육 니즈를 분석합니다.',
  },
  {
    number: '04',
    icon: Route,
    title: '로드맵 생성',
    description: 'LLM 기반으로 맞춤형 AI 훈련 로드맵을 자동 생성하고 PDF/Excel로 내보냅니다.',
  },
];

export default function WorkflowSection() {
  const sectionRef = useRef<HTMLElement>(null);
  const stepsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!stepsRef.current) return;

    const stepElements = stepsRef.current.children;

    gsap.fromTo(
      stepElements,
      { opacity: 0, x: -50 },
      {
        opacity: 1,
        x: 0,
        duration: 0.6,
        stagger: 0.15,
        ease: 'power3.out',
        scrollTrigger: {
          trigger: sectionRef.current,
          start: 'top 65%',
          toggleActions: 'play none none reverse',
        },
      }
    );
  }, []);

  return (
    <section
      id="workflow"
      ref={sectionRef}
      className="py-24 sm:py-32 px-4 bg-gray-50"
    >
      <div className="max-w-7xl mx-auto">
        {/* Section Header */}
        <div className="text-center mb-16">
          <span className="inline-block px-4 py-1.5 bg-orange-50 text-orange-600 text-sm font-medium rounded-full mb-4">
            워크플로우
          </span>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-semibold text-gray-800 mb-4">
            4단계로 완성되는 AI 교육
          </h2>
          <p className="text-gray-600 max-w-2xl mx-auto">
            체계적인 프로세스로 기업 맞춤형 AI 훈련 로드맵을 제공합니다
          </p>
        </div>

        {/* Steps */}
        <div ref={stepsRef} className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {steps.map((step, index) => (
            <div
              key={index}
              className="relative bg-white rounded-2xl p-6 border border-gray-100 shadow-sm hover:shadow-md transition-shadow group"
            >
              {/* Step Number */}
              <span className="text-5xl font-bold text-gray-100 absolute top-4 right-4 group-hover:text-blue-50 transition-colors">
                {step.number}
              </span>

              {/* Icon */}
              <div className="relative z-10 mb-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-indigo-500 shadow-md">
                  <step.icon className="h-6 w-6 text-white" />
                </div>
              </div>

              {/* Content */}
              <h3 className="text-xl font-semibold text-gray-800 mb-2 relative z-10">
                {step.title}
              </h3>
              <p className="text-gray-600 text-sm relative z-10">{step.description}</p>

              {/* Connection Line (except last) */}
              {index < steps.length - 1 && (
                <div className="hidden lg:block absolute top-1/2 -right-3 w-6 h-0.5 bg-gray-200" />
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
