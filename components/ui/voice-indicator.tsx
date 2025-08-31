"use client";

import { useRef, useState } from "react";
import { Mic } from "lucide-react";
import { Button } from "@/components/ui/button";

interface VoiceIndicatorProps {
  isActive: boolean;
}

export const VoiceIndicator: React.FC<VoiceIndicatorProps> = ({ isActive }) => {
  const waveRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number | null>(null);

  // Simple fake waveform animation for UI demo
  const drawWave = () => {
    if (!waveRef.current) return;
    const canvas = waveRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    const time = Date.now() / 1000;

    ctx.clearRect(0, 0, width, height);
    ctx.strokeStyle = "#4f46e5";
    ctx.lineWidth = 2;
    ctx.beginPath();

    const centerX = width / 2;
    const centerY = height / 2;
    const radius = width / 3;

    for (let i = 0; i < 360; i += 5) {
      const angle = (i * Math.PI) / 180;
      const r = radius + Math.sin(angle * 4 + time * 6) * 8;
      const x = centerX + r * Math.cos(angle);
      const y = centerY + r * Math.sin(angle);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }

    ctx.closePath();
    ctx.stroke();
    animationRef.current = requestAnimationFrame(drawWave);
  };

  if (isActive && !animationRef.current) drawWave();
  if (!isActive && animationRef.current) {
    cancelAnimationFrame(animationRef.current);
    animationRef.current = null;
    if (waveRef.current) waveRef.current.getContext("2d")?.clearRect(0, 0, waveRef.current.width, waveRef.current.height);
  }

  return (
    <div className="relative w-12 h-12 flex items-center justify-center">
      <canvas
        ref={waveRef}
        width={48}
        height={48}
        className="absolute inset-0 w-full h-full"
      />
      {/* <Mic size={24} className="relative z-10 text-purple-600" /> */}
    </div>
  );
};
