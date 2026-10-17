"use client";

import { useEffect, useRef, useState } from "react";
import styles from "./MeshGradientBackground.module.css";

interface MeshGradientBackgroundProps {
  seed: string;
  /** Three aura colours as hex, strongest first. */
  colors: [string, string, string];
  /** 0–1. Higher risk renders a stronger aura. */
  intensity: number;
}

const VERTEX_SHADER = `
attribute vec2 aPosition;
void main() { gl_Position = vec4(aPosition, 0.0, 1.0); }
`;

// Three gaussian auras anchored to the top of the card, a soft highlight, and a
// frost fade so the gradient never sits behind the numbers. A gentle domain warp,
// seeded per card, keeps every card moving slightly differently.
const FRAGMENT_SHADER = `
precision mediump float;
uniform vec2 uResolution;
uniform float uTime;
uniform vec2 uPointer;
uniform vec3 uColorA;
uniform vec3 uColorB;
uniform vec3 uColorC;
uniform float uIntensity;
uniform float uSeed;
uniform float uHover;

float aura(vec2 point, vec2 center, float radius) {
  vec2 delta = point - center;
  return exp(-dot(delta, delta) / (radius * radius));
}

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7)) + uSeed * 17.0) * 43758.5453);
}

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
}

void main() {
  vec2 uv = gl_FragCoord.xy / uResolution;
  uv.y = 1.0 - uv.y;
  float aspect = uResolution.x / uResolution.y;
  float t = uTime * (0.45 + fract(uSeed * 0.37) * 0.2);

  // Slight organic distortion: two noise octaves drifting in seed-dependent directions.
  vec2 drift = vec2(cos(uSeed), sin(uSeed * 1.3));
  vec2 warp = vec2(noise(uv * 2.6 + drift * t + uSeed), noise(uv * 2.6 - drift.yx * t + uSeed * 2.1)) - 0.5;
  warp += (vec2(noise(uv * 5.2 + t * 0.7), noise(uv * 5.2 - t * 0.6 + 3.7)) - 0.5) * 0.5;
  uv += warp * (0.12 + uHover * 0.22);

  // On hover a local swirl follows the pointer, like stirring a liquid.
  vec2 toPointer = (uv - uPointer) * vec2(aspect, 1.0);
  float near = exp(-dot(toPointer, toPointer) / 0.09);
  vec2 swirl = vec2(-toPointer.y, toPointer.x) / aspect;
  uv += swirl * near * uHover * (0.55 + 0.25 * sin(t * 2.0 + uSeed));
  uv += (vec2(noise(uv * 7.0 + t * 1.3), noise(uv * 7.0 - t * 1.1 + 5.3)) - 0.5) * near * uHover * 0.12;

  vec2 point = vec2(uv.x * aspect, uv.y);
  vec2 pull = (uPointer - 0.5) * vec2(0.22 * aspect, 0.16);

  vec2 centerA = vec2((0.70 + 0.07 * sin(t + uSeed)) * aspect, -0.06 + 0.06 * cos(t * 0.8 + uSeed)) + pull;
  vec2 centerB = vec2((0.22 + 0.08 * cos(t * 0.9 + uSeed * 1.7)) * aspect, -0.10 + 0.07 * sin(t * 1.1 + uSeed)) - pull * 0.7;
  vec2 centerC = vec2((0.86 + 0.06 * sin(t * 1.2 + uSeed * 0.5)) * aspect, 0.16 + 0.06 * cos(t + uSeed * 0.3)) + pull * 0.5;

  float breathe = 1.0 + 0.06 * sin(t * 1.4 + uSeed);
  float a = aura(point, centerA, 0.42 * aspect * breathe);
  float b = aura(point, centerB, 0.36 * aspect / breathe);
  float c = aura(point, centerC, 0.30 * aspect * breathe);
  float highlight = aura(point, centerA + vec2(-0.06 * aspect, 0.05), 0.16 * aspect);

  float weight = a + b + c + 0.0001;
  vec3 color = (uColorA * a + uColorB * b + uColorC * c) / weight;
  // Muted, pearly tones: pull the palette toward white so the card stays calm.
  color = mix(color, vec3(1.0), 0.3);
  color = mix(color, vec3(1.0), highlight * 0.5);

  float alpha = clamp(max(a, max(b, c)) * 1.1, 0.0, 1.0);
  alpha *= 1.0 - smoothstep(0.1, 0.62, uv.y);
  // Hover lifts the aura a little so the stirring is visible; at rest it stays quiet.
  alpha *= uIntensity * (1.0 + uHover * 0.3);
  gl_FragColor = vec4(color * alpha, alpha);
}
`;

const hexToRgb = (hex: string): [number, number, number] => {
  const value = Number.parseInt(hex.replace("#", ""), 16);
  return [(value >> 16 & 255) / 255, (value >> 8 & 255) / 255, (value & 255) / 255];
};

const seedToFloat = (seed: string) =>
  (seed.split("").reduce((sum, character) => (sum * 31 + character.charCodeAt(0)) >>> 0, 7) % 1000) / 100;

const compile = (gl: WebGLRenderingContext, type: number, source: string) => {
  const shader = gl.createShader(type);
  if (!shader) return null;
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  return gl.getShaderParameter(shader, gl.COMPILE_STATUS) ? shader : null;
};

export function MeshGradientBackground({ seed, colors, intensity }: MeshGradientBackgroundProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [fallback, setFallback] = useState(false);
  const colorKey = colors.join(",");

  useEffect(() => {
    const canvas = canvasRef.current;
    const host = canvas?.parentElement;
    const gl = canvas?.getContext("webgl", { premultipliedAlpha: true, antialias: false });
    if (!canvas || !host || !gl || gl.isContextLost()) {
      setFallback(true);
      return;
    }

    const vertex = compile(gl, gl.VERTEX_SHADER, VERTEX_SHADER);
    const fragment = compile(gl, gl.FRAGMENT_SHADER, FRAGMENT_SHADER);
    const program = gl.createProgram();
    if (!vertex || !fragment || !program) {
      setFallback(true);
      return;
    }
    gl.attachShader(program, vertex);
    gl.attachShader(program, fragment);
    gl.linkProgram(program);
    gl.useProgram(program);

    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    const position = gl.getAttribLocation(program, "aPosition");
    gl.enableVertexAttribArray(position);
    gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);

    const uniform = (name: string) => gl.getUniformLocation(program, name);
    const [colorA, colorB, colorC] = colorKey.split(",").map(hexToRgb);
    gl.uniform3fv(uniform("uColorA"), colorA);
    gl.uniform3fv(uniform("uColorB"), colorB);
    gl.uniform3fv(uniform("uColorC"), colorC);
    gl.uniform1f(uniform("uIntensity"), intensity);
    gl.uniform1f(uniform("uSeed"), seedToFloat(seed));
    const resolutionLocation = uniform("uResolution");
    const timeLocation = uniform("uTime");
    const pointerLocation = uniform("uPointer");
    const hoverLocation = uniform("uHover");

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const target = { x: 0.5, y: 0.5 };
    const pointer = { x: 0.5, y: 0.5 };
    const hover = { target: 0, value: 0 };
    let frame = 0;
    let visible = true;
    const startedAt = performance.now();

    const resize = () => {
      const ratio = Math.min(window.devicePixelRatio || 1, 1.5);
      canvas.width = Math.max(1, Math.round(canvas.clientWidth * ratio));
      canvas.height = Math.max(1, Math.round(canvas.clientHeight * ratio));
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.uniform2f(resolutionLocation, canvas.width, canvas.height);
    };

    const draw = () => {
      pointer.x += (target.x - pointer.x) * 0.08;
      pointer.y += (target.y - pointer.y) * 0.08;
      hover.value += (hover.target - hover.value) * 0.06;
      gl.uniform1f(hoverLocation, reducedMotion ? 0 : hover.value);
      gl.uniform1f(timeLocation, reducedMotion ? 0 : (performance.now() - startedAt) / 1000);
      gl.uniform2f(pointerLocation, pointer.x, pointer.y);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    };

    const loop = () => {
      draw();
      frame = visible && !reducedMotion && !document.hidden ? requestAnimationFrame(loop) : 0;
    };
    const start = () => {
      if (!frame) frame = requestAnimationFrame(loop);
    };

    const onPointerMove = (event: PointerEvent) => {
      const bounds = host.getBoundingClientRect();
      target.x = Math.min(1, Math.max(0, (event.clientX - bounds.left) / bounds.width));
      target.y = Math.min(1, Math.max(0, (event.clientY - bounds.top) / bounds.height));
      hover.target = 1;
      if (reducedMotion) draw();
    };
    const onPointerLeave = () => {
      target.x = 0.5;
      target.y = 0.5;
      hover.target = 0;
    };

    const resizeObserver = new ResizeObserver(() => {
      resize();
      draw();
    });
    const visibilityObserver = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      if (visible) start();
    });
    const onVisibilityChange = () => {
      if (!document.hidden) start();
    };

    resize();
    draw();
    resizeObserver.observe(canvas);
    visibilityObserver.observe(canvas);
    host.addEventListener("pointermove", onPointerMove);
    host.addEventListener("pointerleave", onPointerLeave);
    document.addEventListener("visibilitychange", onVisibilityChange);
    start();

    return () => {
      cancelAnimationFrame(frame);
      resizeObserver.disconnect();
      visibilityObserver.disconnect();
      host.removeEventListener("pointermove", onPointerMove);
      host.removeEventListener("pointerleave", onPointerLeave);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      gl.deleteProgram(program);
      gl.deleteShader(vertex);
      gl.deleteShader(fragment);
      gl.deleteBuffer(buffer);
    };
  }, [seed, colorKey, intensity]);

  if (fallback) {
    return <div aria-hidden="true" className={styles.meshFallback} style={{
      opacity: intensity,
      background: `radial-gradient(60% 90% at 72% 0%, ${colors[0]} 0%, transparent 70%), radial-gradient(50% 80% at 20% 0%, ${colors[1]} 0%, transparent 70%)`,
    }} />;
  }

  // A fresh canvas per configuration. The context itself is not force-released on cleanup:
  // React Strict Mode re-runs effects on the same canvas, which would then get a lost context.
  return <canvas key={`${seed}:${colorKey}:${intensity}`} ref={canvasRef} aria-hidden="true" className={styles.meshCanvas} />;
}
