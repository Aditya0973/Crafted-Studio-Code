import React from 'react';

export const CraftedGlow: React.FC = () => {
  return (
    <div className="pointer-events-none fixed inset-0 overflow-hidden z-0">
      {/* Top Left Subtle Ambient Violet Glow */}
      <div className="absolute -top-40 -left-40 w-[500px] h-[500px] rounded-full bg-[#433FA9]/[0.07] blur-[140px]" />

      {/* Bottom Right Warm Rust/Coral Bloom Glow */}
      <div className="absolute -bottom-40 -right-40 w-[600px] h-[600px] rounded-full bg-[#A9452D]/[0.06] blur-[160px]" />
    </div>
  );
};
