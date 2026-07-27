import React from 'react';

interface LogoProps {
  customLogoPath?: string;
  size?: number;
  className?: string;
}

export const Logo: React.FC<LogoProps> = ({ customLogoPath, size = 22, className = '' }) => {
  if (customLogoPath) {
    return (
      <img
        src={customLogoPath}
        alt="Crafted Studio Logo"
        style={{ width: size, height: size }}
        className={`object-contain ${className}`}
        onError={(e) => {
          (e.target as HTMLElement).style.display = 'none';
        }}
      />
    );
  }

  // Official Crafted Co organic shape logo emblem
  return (
    <div className={`relative flex items-center justify-center shrink-0 ${className}`}>
      <svg
        width={size}
        height={size}
        viewBox="0 0 91 96"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="transition-transform duration-300 hover:scale-105"
      >
        <path
          d="M12.05 46.6653C20.85 41.0653 20.6 28.1032 21.05 21.6653C22.0499 16.1653 28.0502 6.66529 40.5502 5.66529C50.5502 4.86529 62.1 11.6032 65.5502 15.6653C73.5502 24.9986 85.9502 48.4653 71.5502 67.6653C57.1502 86.8653 36.5502 82.6653 28.0502 78.1653L10.05 64.6653C7.05002 60.9986 3.25002 52.2653 12.05 46.6653Z"
          fill="url(#crafted_co_shape_gradient)"
        />
        <defs>
          <linearGradient
            id="crafted_co_shape_gradient"
            x1="24.1"
            y1="15.1032"
            x2="61.6"
            y2="77.6032"
            gradientUnits="userSpaceOnUse"
          >
            <stop stopColor="#433FA9" />
            <stop offset="0.5" stopColor="#A9452D" />
            <stop offset="1" stopColor="#4641A9" />
          </linearGradient>
        </defs>
      </svg>
    </div>
  );
};
