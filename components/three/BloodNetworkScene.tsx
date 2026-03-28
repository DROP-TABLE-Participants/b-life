"use client";

import { motion } from "framer-motion";

interface BloodNetworkSceneProps {
  compact?: boolean;
}

const nodes = [
  { id: "n1", x: 18, y: 22, size: 24, color: "from-rose-400/45 to-rose-600/20" },
  { id: "n2", x: 72, y: 20, size: 18, color: "from-cyan-300/45 to-cyan-600/15" },
  { id: "n3", x: 34, y: 58, size: 30, color: "from-cyan-300/40 to-emerald-500/10" },
  { id: "n4", x: 78, y: 62, size: 20, color: "from-rose-400/45 to-rose-700/20" },
  { id: "n5", x: 52, y: 40, size: 15, color: "from-white/30 to-cyan-400/10" },
];

export function BloodNetworkScene({ compact = false }: BloodNetworkSceneProps) {
  return (
    <div
      className={`relative overflow-hidden rounded-3xl border border-white/10 bg-[radial-gradient(circle_at_20%_20%,rgba(239,68,68,0.18),transparent_45%),radial-gradient(circle_at_70%_30%,rgba(34,211,238,0.18),transparent_45%),#020617] ${
        compact ? "h-56" : "h-[420px]"
      }`}
    >
      <svg className="absolute inset-0 h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none">
        <defs>
          <linearGradient id="route" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#fb7185" stopOpacity="0.2" />
            <stop offset="100%" stopColor="#22d3ee" stopOpacity="0.6" />
          </linearGradient>
        </defs>
        <path d="M18 22 L52 40 L72 20" stroke="url(#route)" strokeWidth="0.45" fill="none" />
        <path d="M34 58 L52 40 L78 62" stroke="url(#route)" strokeWidth="0.45" fill="none" />
        <path d="M18 22 L34 58" stroke="url(#route)" strokeWidth="0.35" fill="none" />
      </svg>

      {nodes.map((node, index) => (
        <motion.div
          key={node.id}
          className={`absolute rounded-full bg-gradient-to-br ${node.color} backdrop-blur`}
          style={{ left: `${node.x}%`, top: `${node.y}%`, width: node.size, height: node.size }}
          animate={{ y: [0, -8, 0], opacity: [0.65, 1, 0.65], scale: [1, 1.08, 1] }}
          transition={{ duration: 4 + index, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut" }}
        />
      ))}

      <motion.div
        className="absolute h-2 w-2 rounded-full bg-rose-300 shadow-[0_0_20px_rgba(251,113,133,0.8)]"
        style={{ left: "18%", top: "22%" }}
        animate={{ left: ["18%", "52%", "72%"], top: ["22%", "40%", "20%"] }}
        transition={{ duration: 4.5, repeat: Number.POSITIVE_INFINITY, ease: "linear" }}
      />

      <motion.div
        className="absolute h-2 w-2 rounded-full bg-cyan-300 shadow-[0_0_20px_rgba(34,211,238,0.8)]"
        style={{ left: "34%", top: "58%" }}
        animate={{ left: ["34%", "52%", "78%"], top: ["58%", "40%", "62%"] }}
        transition={{ duration: 3.6, repeat: Number.POSITIVE_INFINITY, ease: "linear" }}
      />
    </div>
  );
}
