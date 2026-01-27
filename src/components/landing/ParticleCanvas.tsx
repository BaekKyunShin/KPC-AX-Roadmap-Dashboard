'use client';

import { useRef, useEffect, useCallback } from 'react';

// 색상 팔레트
const COLORS = [
  '#4285F4', // 파랑
  '#5E35B1', // 보라
  '#7B1FA2', // 마젠타
  '#C62828', // 빨강
  '#EF6C00', // 주황
  '#F9A825', // 노랑
  '#546E7A', // 회색
];

interface Particle {
  // 기준 위치 (극좌표)
  baseAngle: number;
  baseRadius: number;
  // 현재 오프셋 (마우스 기준)
  currentOffsetX: number;
  currentOffsetY: number;
  // 개별 부유 효과 (각 파티클 독립적)
  floatPhaseX: number;
  floatPhaseY: number;
  floatSpeedX: number;
  floatSpeedY: number;
  floatAmplitudeX: number;
  floatAmplitudeY: number;
  // 시각적 속성
  color: string;
  rotation: number;
  rotationSpeed: number;
  length: number;
  size: number;
  alpha: number;
}

export default function ParticleCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<Particle[]>([]);
  const mouseRef = useRef({ x: -9999, y: -9999 });
  const smoothMouseRef = useRef({ x: -9999, y: -9999 });
  const animationRef = useRef<number>(0);
  const timeRef = useRef(0);
  const isMouseInRef = useRef(false);

  // 파티클 초기화 (도넛 형태)
  const initParticles = useCallback(() => {
    const particles: Particle[] = [];
    const count = 200;
    const innerRadius = 80;
    const outerRadius = 380;

    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const radiusRange = outerRadius - innerRadius;
      const radius = innerRadius + Math.sqrt(Math.random()) * radiusRange;

      const isDot = Math.random() < 0.35;
      const distRatio = (radius - innerRadius) / radiusRange;
      const alpha = 0.7 - distRatio * 0.35;
      const size = isDot ? Math.random() * 2 + 1.5 : Math.random() * 1.5 + 1;
      const length = isDot ? 0 : Math.random() * 12 + 6;

      particles.push({
        baseAngle: angle,
        baseRadius: radius,
        currentOffsetX: Math.cos(angle) * radius,
        currentOffsetY: Math.sin(angle) * radius,
        // 개별 부유 효과 - 각 파티클마다 다른 속도와 진폭
        floatPhaseX: Math.random() * Math.PI * 2,
        floatPhaseY: Math.random() * Math.PI * 2,
        floatSpeedX: 0.3 + Math.random() * 0.4, // 느린 속도
        floatSpeedY: 0.3 + Math.random() * 0.4,
        floatAmplitudeX: 2 + Math.random() * 4, // 작은 진폭 (2~6px)
        floatAmplitudeY: 2 + Math.random() * 4,
        color: COLORS[Math.floor(Math.random() * COLORS.length)],
        rotation: Math.random() * Math.PI * 2,
        rotationSpeed: (Math.random() - 0.5) * 0.01,
        length,
        size,
        alpha,
      });
    }

    return particles;
  }, []);

  const draw = useCallback((ctx: CanvasRenderingContext2D, time: number) => {
    const dpr = window.devicePixelRatio || 1;
    const width = ctx.canvas.width / dpr;
    const height = ctx.canvas.height / dpr;

    ctx.clearRect(0, 0, width * dpr, height * dpr);

    if (!isMouseInRef.current) return;

    const mouseX = smoothMouseRef.current.x;
    const mouseY = smoothMouseRef.current.y;

    particlesRef.current.forEach((p) => {
      // 개별 부유 효과 - 각 파티클이 독립적으로 미세하게 떠다님
      const floatX = Math.sin(time * p.floatSpeedX + p.floatPhaseX) * p.floatAmplitudeX;
      const floatY = Math.sin(time * p.floatSpeedY + p.floatPhaseY) * p.floatAmplitudeY;

      // 위치 계산 (마우스 기준 + 개별 부유)
      const x = mouseX + p.currentOffsetX + floatX;
      const y = mouseY + p.currentOffsetY + floatY;

      // 회전 (천천히)
      p.rotation += p.rotationSpeed;

      ctx.save();
      ctx.translate(x, y);
      ctx.globalAlpha = p.alpha;

      if (p.length === 0) {
        // 점 형태
        ctx.beginPath();
        ctx.arc(0, 0, p.size, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.fill();
      } else {
        // 선(dash) 형태
        ctx.rotate(p.rotation);
        ctx.beginPath();
        ctx.moveTo(-p.length / 2, 0);
        ctx.lineTo(p.length / 2, 0);
        ctx.strokeStyle = p.color;
        ctx.lineWidth = p.size;
        ctx.lineCap = 'round';
        ctx.stroke();
      }

      ctx.restore();
    });
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    particlesRef.current = initParticles();

    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      const width = window.innerWidth;
      const height = window.innerHeight;

      canvas.width = width * dpr;
      canvas.height = height * dpr;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;

      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.scale(dpr, dpr);
    };

    const handleMouseMove = (e: MouseEvent) => {
      mouseRef.current = { x: e.clientX, y: e.clientY };
      isMouseInRef.current = true;
    };

    const handleMouseLeave = () => {
      isMouseInRef.current = false;
    };

    const handleMouseEnter = (e: MouseEvent) => {
      mouseRef.current = { x: e.clientX, y: e.clientY };
      smoothMouseRef.current = { x: e.clientX, y: e.clientY };
      isMouseInRef.current = true;
    };

    const animate = () => {
      timeRef.current += 0.016;

      // 마우스 위치 쫀득하게 따라오기
      const mouseLerp = 0.06;
      smoothMouseRef.current.x += (mouseRef.current.x - smoothMouseRef.current.x) * mouseLerp;
      smoothMouseRef.current.y += (mouseRef.current.y - smoothMouseRef.current.y) * mouseLerp;

      draw(ctx, timeRef.current);
      animationRef.current = requestAnimationFrame(animate);
    };

    resize();
    window.addEventListener('resize', resize);
    window.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseleave', handleMouseLeave);
    document.addEventListener('mouseenter', handleMouseEnter);

    animate();

    return () => {
      window.removeEventListener('resize', resize);
      window.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseleave', handleMouseLeave);
      document.removeEventListener('mouseenter', handleMouseEnter);
      cancelAnimationFrame(animationRef.current);
    };
  }, [initParticles, draw]);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 z-0"
      style={{
        background: 'transparent',
        pointerEvents: 'none',
      }}
    />
  );
}
