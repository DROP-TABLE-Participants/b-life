"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import { Float, OrbitControls } from "@react-three/drei";
import { useRef } from "react";
import type { Mesh } from "three";

function PulseRing({ color, radius }: { color: string; radius: number }) {
  const ref = useRef<Mesh>(null);

  useFrame((state) => {
    if (!ref.current) return;
    ref.current.rotation.z = state.clock.getElapsedTime() * 0.2;
  });

  return (
    <mesh ref={ref} rotation={[Math.PI / 2, 0, 0]}>
      <torusGeometry args={[radius, 0.03, 16, 80]} />
      <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.7} />
    </mesh>
  );
}

function Node({ position, color, scale }: { position: [number, number, number]; color: string; scale: number }) {
  return (
    <Float speed={2} floatIntensity={1.8}>
      <mesh position={position} scale={scale}>
        <icosahedronGeometry args={[0.3, 1]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.8} roughness={0.25} metalness={0.4} />
      </mesh>
    </Float>
  );
}

export function CommandCenterR3F() {
  return (
    <div className="h-72 overflow-hidden rounded-2xl border border-white/10 bg-slate-950">
      <Canvas camera={{ position: [0, 2.8, 6.5], fov: 45 }}>
        <ambientLight intensity={0.45} />
        <pointLight position={[2, 4, 2]} intensity={18} color="#22d3ee" />
        <pointLight position={[-2, 3, -2]} intensity={16} color="#fb7185" />

        <PulseRing radius={1.4} color="#22d3ee" />
        <PulseRing radius={2.2} color="#fb7185" />

        <Node position={[-1.5, 0.35, -0.8]} color="#22d3ee" scale={0.9} />
        <Node position={[1.2, 0.55, -1.1]} color="#fb7185" scale={1.05} />
        <Node position={[0.3, 0.25, 1.4]} color="#38bdf8" scale={0.75} />
        <Node position={[-0.4, 0.45, 0.15]} color="#f43f5e" scale={0.65} />

        <OrbitControls enablePan={false} enableZoom={false} autoRotate autoRotateSpeed={0.8} />
      </Canvas>
    </div>
  );
}
