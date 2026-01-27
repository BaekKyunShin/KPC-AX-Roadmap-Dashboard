'use client';

import { useEffect, useRef, useState } from 'react';
import gsap from 'gsap';

export default function CustomCursor() {
  const cursorRef = useRef<HTMLDivElement>(null);
  const cursorDotRef = useRef<HTMLDivElement>(null);
  const [isHovering, setIsHovering] = useState(false);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // 터치 디바이스에서는 커서 숨기기
    const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    if (isTouchDevice) return;

    // eslint-disable-next-line react-hooks/set-state-in-effect -- 클라이언트 초기화 패턴: 터치 디바이스 확인 후 커서 표시
    setIsVisible(true);

    const handleMouseMove = (e: MouseEvent) => {
      // 외곽 원 (부드럽게 따라감)
      gsap.to(cursorRef.current, {
        x: e.clientX,
        y: e.clientY,
        duration: 0.5,
        ease: 'power3.out',
      });

      // 중심 점 (빠르게 따라감)
      gsap.to(cursorDotRef.current, {
        x: e.clientX,
        y: e.clientY,
        duration: 0.1,
      });
    };

    const handleMouseEnter = () => setIsVisible(true);
    const handleMouseLeave = () => setIsVisible(false);

    // 호버 가능한 요소 감지
    const addHoverListeners = () => {
      const hoverables = document.querySelectorAll('a, button, [data-cursor-hover]');
      hoverables.forEach((el) => {
        el.addEventListener('mouseenter', () => setIsHovering(true));
        el.addEventListener('mouseleave', () => setIsHovering(false));
      });
    };

    window.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseenter', handleMouseEnter);
    document.addEventListener('mouseleave', handleMouseLeave);

    // DOM이 로드된 후 호버 리스너 추가
    setTimeout(addHoverListeners, 100);

    // MutationObserver로 동적으로 추가되는 요소에도 리스너 추가
    const observer = new MutationObserver(() => {
      addHoverListeners();
    });
    observer.observe(document.body, { childList: true, subtree: true });

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseenter', handleMouseEnter);
      document.removeEventListener('mouseleave', handleMouseLeave);
      observer.disconnect();
    };
  }, []);

  if (!isVisible) return null;

  return (
    <>
      {/* 외곽 원 */}
      <div
        ref={cursorRef}
        className={`fixed top-0 left-0 pointer-events-none z-[9999] -translate-x-1/2 -translate-y-1/2 transition-transform duration-200 ${
          isHovering ? 'scale-150' : 'scale-100'
        }`}
        style={{
          width: '40px',
          height: '40px',
          border: '1px solid rgba(59, 130, 246, 0.5)',
          borderRadius: '50%',
          opacity: isVisible ? 1 : 0,
        }}
      />

      {/* 중심 점 */}
      <div
        ref={cursorDotRef}
        className="fixed top-0 left-0 pointer-events-none z-[9999] -translate-x-1/2 -translate-y-1/2"
        style={{
          width: '8px',
          height: '8px',
          backgroundColor: '#3B82F6',
          borderRadius: '50%',
          opacity: isVisible ? 1 : 0,
        }}
      />
    </>
  );
}
