import React from 'react';

export const GlobalMotionOverlay = () => {
  return (
    <div className="fixed inset-0 pointer-events-none z-[-1] overflow-hidden">
      {/* Ambient Radial Glow Top Left */}
      <div className="absolute -top-[10%] -left-[10%] w-[40%] h-[40%] bg-brand/5 blur-[120px] rounded-full animate-pulse-soft" />
      
      {/* Ambient Radial Glow Bottom Right */}
      <div className="absolute -bottom-[10%] -right-[10%] w-[40%] h-[40%] bg-primary/5 blur-[120px] rounded-full animate-pulse-soft" 
           style={{ animationDelay: '2s' }} />
      
      {/* Dynamic Background Noise Texture (Subtle) */}
      <div className="absolute inset-0 opacity-[0.015] contrast-150 brightness-100 mix-blend-overlay"
           style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")` }} />
    </div>
  );
};
