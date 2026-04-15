import React from 'react';
import { motion } from 'motion/react';

export function RadarBackground() {
  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none z-0 bg-[#020617]">
      {/* Mesh Gradient for depth */}
      <div className="absolute inset-0 opacity-30">
        <div className="absolute -top-[20%] -left-[10%] w-[70%] h-[70%] rounded-full bg-[#5a8c12]/10 blur-[120px]" />
        <div className="absolute -bottom-[20%] -right-[10%] w-[60%] h-[60%] rounded-full bg-[#5a8c12]/5 blur-[120px]" />
      </div>

      {/* Grid Lines */}
      <div 
        className="absolute inset-0 opacity-[0.03]" 
        style={{ 
          backgroundImage: `linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)`,
          backgroundSize: '80px 80px'
        }} 
      />

      {/* Subtle Radar Sweep */}
      <motion.div
        className="absolute top-1/2 left-1/2 w-[200vmax] h-[200vmax] origin-center"
        initial={{ rotate: 0, x: '-50%', y: '-50%' }}
        animate={{ rotate: 360 }}
        transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
        style={{
          background: 'conic-gradient(from 0deg at 50% 50%, rgba(90, 140, 18, 0.08) 0deg, transparent 60deg, transparent 360deg)'
        }}
      />

      {/* Circles */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center justify-center pointer-events-none opacity-[0.05]">
        <div className="w-[300px] h-[300px] border border-[#5a8c12] rounded-full" />
        <div className="absolute w-[600px] h-[600px] border border-[#5a8c12] rounded-full" />
        <div className="absolute w-[900px] h-[900px] border border-[#5a8c12] rounded-full" />
        <div className="absolute w-[1200px] h-[1200px] border border-[#5a8c12] rounded-full" />
      </div>

      {/* Subtle Grain/Noise */}
      <div 
        className="absolute inset-0 opacity-[0.02]"
        style={{ 
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")` 
        }}
      />
    </div>
  );
}
