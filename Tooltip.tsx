import React, { ReactNode, useId } from 'react';
import { useTheme } from '../context/ThemeContext';

interface TooltipProps {
  content: string;
  children: ReactNode;
  placement?: 'top' | 'bottom';
  className?: string;
}

export const Tooltip: React.FC<TooltipProps> = ({
  content,
  children,
  placement = 'bottom',
  className = ''
}) => {
  const { isDark } = useTheme();
  const tooltipId = useId();

  return (
    <span
      className={`chronos-tooltip chronos-tooltip-${placement} ${className}`}
      data-tooltip-content={content}
      data-tooltip-id={tooltipId}
      data-theme={isDark ? 'dark' : 'light'}
    >
      {children}
    </span>
  );
};
