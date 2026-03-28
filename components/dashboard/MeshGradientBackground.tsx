"use client";

import { useEffect, useMemo, useRef } from "react";
import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";
import type { CSSProperties } from "react";
import styles from "./MeshGradientBackground.module.css";

interface MeshGradientBackgroundProps {
  seed: string;
  colorA: string;
  colorB: string;
  colorC: string;
  accent: string;
}

interface MeshShapeLayout {
  top: string;
  left: string;
  width: string;
  height: string;
  radius: string;
}

interface MeshLayout {
  primary: MeshShapeLayout;
  secondary: MeshShapeLayout;
  tertiary: MeshShapeLayout;
  glow: MeshShapeLayout;
}

const hashSeed = (seed: string) =>
  seed.split("").reduce((accumulator, character, index) => {
    return (accumulator * 31 + character.charCodeAt(0) + index) >>> 0;
  }, 2166136261);

const createSeededRandom = (seed: string) => {
  let value = hashSeed(seed) || 1;

  return () => {
    value = (value * 1664525 + 1013904223) >>> 0;
    return value / 4294967295;
  };
};

const toPercent = (value: number) => `${value.toFixed(2)}%`;

const createRadius = (random: () => number) =>
  `${toPercent(38 + random() * 20)} ${toPercent(42 + random() * 18)} ${toPercent(40 + random() * 22)} ${toPercent(36 + random() * 20)}`;

const createLayout = (seed: string): MeshLayout => {
  const random = createSeededRandom(seed);

  return {
    primary: {
      top: toPercent(-24 + random() * 14),
      left: toPercent(-20 + random() * 18),
      width: toPercent(64 + random() * 18),
      height: toPercent(60 + random() * 18),
      radius: createRadius(random),
    },
    secondary: {
      top: toPercent(-2 + random() * 18),
      left: toPercent(2 + random() * 24),
      width: toPercent(56 + random() * 24),
      height: toPercent(54 + random() * 20),
      radius: createRadius(random),
    },
    tertiary: {
      top: toPercent(2 + random() * 18),
      left: toPercent(-8 + random() * 18),
      width: toPercent(48 + random() * 18),
      height: toPercent(46 + random() * 16),
      radius: createRadius(random),
    },
    glow: {
      top: toPercent(-6 + random() * 12),
      left: toPercent(0 + random() * 18),
      width: toPercent(40 + random() * 22),
      height: toPercent(38 + random() * 18),
      radius: "999px",
    },
  };
};

export function MeshGradientBackground({
  seed,
  colorA,
  colorB,
  colorC,
  accent,
}: MeshGradientBackgroundProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const pointerX = useMotionValue(0.5);
  const pointerY = useMotionValue(0.5);

  const springX = useSpring(pointerX, { stiffness: 90, damping: 18, mass: 0.4 });
  const springY = useSpring(pointerY, { stiffness: 90, damping: 18, mass: 0.4 });

  const blobOffsetX = useTransform(springX, [0, 1], [-34, 34]);
  const blobOffsetY = useTransform(springY, [0, 1], [-26, 26]);
  const glowOffsetX = useTransform(springX, [0, 1], [-42, 42]);
  const glowOffsetY = useTransform(springY, [0, 1], [-34, 34]);
  const blobSecondaryOffsetX = useTransform(blobOffsetX, (value) => value * -0.7);
  const blobSecondaryOffsetY = useTransform(blobOffsetY, (value) => value * 0.8);
  const blobTertiaryOffsetX = useTransform(blobOffsetX, (value) => value * 0.5);
  const blobTertiaryOffsetY = useTransform(blobOffsetY, (value) => value * -0.65);
  const layout = useMemo(() => createLayout(seed), [seed]);

  useEffect(() => {
    const hostElement = containerRef.current?.parentElement;
    if (!hostElement) return;

    const handlePointerMove = (event: PointerEvent) => {
      const bounds = hostElement.getBoundingClientRect();
      const nextX = (event.clientX - bounds.left) / bounds.width;
      const nextY = (event.clientY - bounds.top) / bounds.height;

      pointerX.set(Math.min(1, Math.max(0, nextX)));
      pointerY.set(Math.min(1, Math.max(0, nextY)));
    };

    const handlePointerLeave = () => {
      pointerX.set(0.5);
      pointerY.set(0.5);
    };

    hostElement.addEventListener("pointermove", handlePointerMove);
    hostElement.addEventListener("pointerleave", handlePointerLeave);

    return () => {
      hostElement.removeEventListener("pointermove", handlePointerMove);
      hostElement.removeEventListener("pointerleave", handlePointerLeave);
    };
  }, [pointerX, pointerY]);

  const style = {
    "--mesh-color-a": colorA,
    "--mesh-color-b": colorB,
    "--mesh-color-c": colorC,
    "--mesh-accent": accent,
  } as CSSProperties;

  return (
    <div
      ref={containerRef}
      className={styles.meshBackground}
      style={style}
      aria-hidden="true"
    >
      <motion.div
        className={`${styles.meshBlob} ${styles.meshBlobPrimary}`}
        animate={{ scale: [1, 1.14, 0.96, 1], rotate: [0, 12, -7, 0] }}
        transition={{ duration: 14, repeat: Infinity, ease: "easeInOut" }}
        style={{
          top: layout.primary.top,
          left: layout.primary.left,
          width: layout.primary.width,
          height: layout.primary.height,
          borderRadius: layout.primary.radius,
          x: blobOffsetX,
          y: blobOffsetY,
        }}
      />
      <motion.div
        className={`${styles.meshBlob} ${styles.meshBlobSecondary}`}
        animate={{ scale: [1, 0.92, 1.08, 1], rotate: [0, -14, 9, 0] }}
        transition={{ duration: 15, repeat: Infinity, ease: "easeInOut" }}
        style={{
          top: layout.secondary.top,
          left: layout.secondary.left,
          width: layout.secondary.width,
          height: layout.secondary.height,
          borderRadius: layout.secondary.radius,
          x: blobSecondaryOffsetX,
          y: blobSecondaryOffsetY,
        }}
      />
      <motion.div
        className={`${styles.meshBlob} ${styles.meshBlobTertiary}`}
        animate={{ scale: [1, 1.12, 0.9, 1], rotate: [0, 18, -11, 0] }}
        transition={{ duration: 17, repeat: Infinity, ease: "easeInOut" }}
        style={{
          top: layout.tertiary.top,
          left: layout.tertiary.left,
          width: layout.tertiary.width,
          height: layout.tertiary.height,
          borderRadius: layout.tertiary.radius,
          x: blobTertiaryOffsetX,
          y: blobTertiaryOffsetY,
        }}
      />
      <motion.div
        className={styles.meshGlow}
        style={{
          top: layout.glow.top,
          left: layout.glow.left,
          width: layout.glow.width,
          height: layout.glow.height,
          borderRadius: layout.glow.radius,
          x: glowOffsetX,
          y: glowOffsetY,
        }}
      />
    </div>
  );
}
