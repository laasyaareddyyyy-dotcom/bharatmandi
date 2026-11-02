import React from 'react';

interface BharatMandiLogoProps {
  className?: string;
  size?: number | string;
  showText?: boolean;
  variant?: 'full' | 'emblem' | 'badge';
  alt?: string;
}

export const BharatMandiLogo: React.FC<BharatMandiLogoProps> = ({
  className = '',
  size = 64,
  alt = 'भारत MANDI',
}) => {
  const dimensionStyle =
    typeof size === 'number'
      ? { width: `${size}px`, height: `${size}px` }
      : { width: size, height: size };

  return (
    <div
      className={`inline-flex items-center justify-center select-none bg-transparent ${className}`}
      style={dimensionStyle}
    >
      <img
        src="/bharat_mandi_logo.png"
        alt={alt}
        className="w-full h-full object-contain pointer-events-none drop-shadow-xs"
        referrerPolicy="no-referrer"
      />
    </div>
  );
};
