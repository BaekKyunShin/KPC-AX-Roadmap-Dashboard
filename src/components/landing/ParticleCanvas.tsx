'use client';

import { useRef, useEffect, useState, useCallback } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { createNoise3D } from 'simplex-noise';

// 파티클 색상 (antigravity 스타일)
const COLORS = [
  [0.23, 0.51, 0.96], // blue
  [0.98, 0.45, 0.09], // orange
  [0.42, 0.45, 0.50], // gray
  [0.22, 0.26, 0.32], // darkGray
];

interface ParticleData {
  positions: Float32Array;
  colors: Float32Array;
  sizes: Float32Array;
  velocities: Float32Array;
  originalPositions: Float32Array;
}

function initializeParticles(count: number, width: number, height: number): ParticleData {
  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);
  const sizes = new Float32Array(count);
  const velocities = new Float32Array(count * 3);
  const originalPositions = new Float32Array(count * 3);

  for (let i = 0; i < count; i++) {
    const x = (Math.random() - 0.5) * width * 1.5;
    const y = (Math.random() - 0.5) * height * 1.5;
    const z = (Math.random() - 0.5) * 200;

    positions[i * 3] = x;
    positions[i * 3 + 1] = y;
    positions[i * 3 + 2] = z;

    originalPositions[i * 3] = x;
    originalPositions[i * 3 + 1] = y;
    originalPositions[i * 3 + 2] = z;

    velocities[i * 3] = 0;
    velocities[i * 3 + 1] = 0;
    velocities[i * 3 + 2] = 0;

    // 색상 선택
    const colorChoice = Math.random();
    let colorIndex = 0;
    if (colorChoice < 0.5) colorIndex = 0;
    else if (colorChoice < 0.75) colorIndex = 1;
    else if (colorChoice < 0.9) colorIndex = 2;
    else colorIndex = 3;

    const color = COLORS[colorIndex];
    colors[i * 3] = color[0];
    colors[i * 3 + 1] = color[1];
    colors[i * 3 + 2] = color[2];

    sizes[i] = Math.random() * 3 + 1;
  }

  return { positions, colors, sizes, velocities, originalPositions };
}

interface ParticleSystemProps {
  mouseX: number;
  mouseY: number;
  count: number;
}

function ParticleSystem({ mouseX, mouseY, count }: ParticleSystemProps) {
  const pointsRef = useRef<THREE.Points>(null);
  const dataRef = useRef<ParticleData | null>(null);
  const noise3DRef = useRef(createNoise3D());
  const { size } = useThree();
  const [isInitialized, setIsInitialized] = useState(false);

  // 초기화
  useEffect(() => {
    dataRef.current = initializeParticles(count, size.width, size.height);
    setIsInitialized(true);
  }, [count, size.width, size.height]);

  // 애니메이션 루프
  useFrame((state) => {
    if (!pointsRef.current || !dataRef.current) return;

    const { velocities, originalPositions } = dataRef.current;
    const noise3D = noise3DRef.current;
    const time = state.clock.elapsedTime;
    const positionAttribute = pointsRef.current.geometry.attributes.position as THREE.BufferAttribute;
    const posArray = positionAttribute.array as Float32Array;

    const mouseX3D = (mouseX - 0.5) * size.width;
    const mouseY3D = -(mouseY - 0.5) * size.height;

    for (let i = 0; i < count; i++) {
      const i3 = i * 3;

      const noiseX = noise3D(posArray[i3] * 0.002, posArray[i3 + 1] * 0.002, time * 0.2);
      const noiseY = noise3D(posArray[i3] * 0.002 + 100, posArray[i3 + 1] * 0.002, time * 0.2);

      const targetX = originalPositions[i3] + noiseX * 30;
      const targetY = originalPositions[i3 + 1] + noiseY * 30;

      const dx = posArray[i3] - mouseX3D;
      const dy = posArray[i3 + 1] - mouseY3D;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const mouseRadius = 150;

      if (dist < mouseRadius && dist > 0) {
        const force = (1 - dist / mouseRadius) * 2;
        velocities[i3] += (dx / dist) * force;
        velocities[i3 + 1] += (dy / dist) * force;
      }

      velocities[i3] *= 0.95;
      velocities[i3 + 1] *= 0.95;

      posArray[i3] += (targetX - posArray[i3]) * 0.02 + velocities[i3];
      posArray[i3 + 1] += (targetY - posArray[i3 + 1]) * 0.02 + velocities[i3 + 1];
    }

    positionAttribute.needsUpdate = true;
  });

  if (!isInitialized || !dataRef.current) {
    return null;
  }

  const { positions, colors, sizes } = dataRef.current;

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
        <bufferAttribute attach="attributes-color" args={[colors, 3]} />
        <bufferAttribute attach="attributes-size" args={[sizes, 1]} />
      </bufferGeometry>
      <shaderMaterial
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        vertexColors
        uniforms={{
          uPixelRatio: { value: typeof window !== 'undefined' ? Math.min(window.devicePixelRatio, 2) : 1 },
        }}
        vertexShader={`
          attribute float size;
          varying vec3 vColor;
          uniform float uPixelRatio;

          void main() {
            vColor = color;
            vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
            gl_PointSize = size * uPixelRatio * (300.0 / -mvPosition.z);
            gl_Position = projectionMatrix * mvPosition;
          }
        `}
        fragmentShader={`
          varying vec3 vColor;

          void main() {
            vec2 center = gl_PointCoord - vec2(0.5);
            float dist = length(center);

            if (dist > 0.5) discard;

            float alpha = 1.0 - smoothstep(0.2, 0.5, dist);
            gl_FragColor = vec4(vColor, alpha * 0.8);
          }
        `}
      />
    </points>
  );
}

export default function ParticleCanvas() {
  const [mousePosition, setMousePosition] = useState({ x: 0.5, y: 0.5 });
  const [particleCount, setParticleCount] = useState(8000);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    setMousePosition({
      x: e.clientX / window.innerWidth,
      y: e.clientY / window.innerHeight,
    });
  }, []);

  useEffect(() => {
    const updateParticleCount = () => {
      const width = window.innerWidth;
      if (width < 640) {
        setParticleCount(3000);
      } else if (width < 1024) {
        setParticleCount(5000);
      } else {
        setParticleCount(8000);
      }
    };

    updateParticleCount();
    window.addEventListener('resize', updateParticleCount);
    window.addEventListener('mousemove', handleMouseMove);

    return () => {
      window.removeEventListener('resize', updateParticleCount);
      window.removeEventListener('mousemove', handleMouseMove);
    };
  }, [handleMouseMove]);

  return (
    <div className="fixed inset-0 z-0 pointer-events-none">
      <Canvas
        camera={{
          position: [0, 0, 500],
          fov: 75,
          near: 1,
          far: 2000,
        }}
        dpr={[1, 2]}
        gl={{
          antialias: false,
          alpha: true,
          powerPreference: 'high-performance',
        }}
      >
        <ParticleSystem
          mouseX={mousePosition.x}
          mouseY={mousePosition.y}
          count={particleCount}
        />
      </Canvas>
    </div>
  );
}
